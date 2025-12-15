#!/usr/bin/env node

/**
 * Comprehensive Replit Image Display Test Suite
 * Tests all methods of displaying images when accessed from Replit domain
 */

const fetch = require('node-fetch');
const chalk = require('chalk');
const { createHash } = require('crypto');

// Test configuration
const TEST_USER_ID = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c';
const BASE_URL = process.env.REPLIT_URL || 'http://localhost:5000';
const API_BASE = process.env.NODE_ENV === 'production' ? BASE_URL : 'http://localhost:5000';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Helper to log with colors
const log = {
  success: (msg) => console.log(chalk.green('✅ ' + msg)),
  error: (msg) => console.log(chalk.red('❌ ' + msg)),
  warning: (msg) => console.log(chalk.yellow('⚠️  ' + msg)),
  info: (msg) => console.log(chalk.blue('ℹ️  ' + msg)),
  header: (msg) => console.log(chalk.cyan.bold('\n' + msg + '\n' + '='.repeat(msg.length)))
};

// Test helper
async function runTest(name, testFn) {
  process.stdout.write(chalk.gray(`Testing ${name}... `));

  try {
    const result = await testFn();

    if (result.success) {
      log.success(result.message || 'Passed');
      results.passed++;
      results.tests.push({ name, status: 'passed', message: result.message });
    } else {
      log.error(result.message || 'Failed');
      results.failed++;
      results.tests.push({ name, status: 'failed', message: result.message });
    }

    return result;
  } catch (error) {
    log.error(`Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'error', message: error.message });
    return { success: false, error: error.message };
  }
}

// Test 1: Check environment detection
async function testEnvironmentDetection() {
  const isReplit = !!process.env.REPL_ID;
  const replitUrl = process.env.REPLIT_URL;

  if (isReplit) {
    return {
      success: true,
      message: `Running on Replit (URL: ${replitUrl})`
    };
  } else {
    return {
      success: true,
      message: 'Running locally (not on Replit)'
    };
  }
}

// Test 2: Check CORS configuration
async function testCorsConfiguration() {
  const corsEnabled = process.env.CORS_ALLOW_REPLIT_SUBDOMAINS === 'true';

  if (corsEnabled) {
    return {
      success: true,
      message: 'CORS is enabled for Replit subdomains'
    };
  } else {
    return {
      success: false,
      message: 'CORS_ALLOW_REPLIT_SUBDOMAINS is not set to true'
    };
  }
}

// Test 3: Test API connectivity
async function testApiConnectivity() {
  try {
    const response = await fetch(`${API_BASE}/healthz`);

    if (response.ok) {
      return {
        success: true,
        message: `API is accessible (status: ${response.status})`
      };
    } else {
      return {
        success: false,
        message: `API returned status ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Cannot connect to API: ${error.message}`
    };
  }
}

// Test 4: Fetch user documents via API
async function testFetchUserDocuments() {
  try {
    const url = `${API_BASE}/api/user-documents?user_id=${TEST_USER_ID}&document_type=image`;
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        message: `API returned status ${response.status}`
      };
    }

    const data = await response.json();
    const images = data.data?.documents || data.documents || [];

    if (images.length > 0) {
      return {
        success: true,
        message: `Found ${images.length} images`,
        data: images
      };
    } else {
      return {
        success: false,
        message: 'No images found for test user'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to fetch documents: ${error.message}`
    };
  }
}

// Test 5: Test direct URL access
async function testDirectUrlAccess() {
  const docsResult = await testFetchUserDocuments();
  if (!docsResult.success || !docsResult.data) {
    return {
      success: false,
      message: 'Cannot test URLs - no images available'
    };
  }

  const images = docsResult.data;
  let successCount = 0;
  let failCount = 0;

  for (const image of images.slice(0, 3)) { // Test first 3 images
    const url = image.public_url || image.signed_url;

    if (url) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    } else {
      failCount++;
    }
  }

  if (successCount > 0) {
    return {
      success: failCount === 0,
      message: `${successCount} accessible, ${failCount} failed`
    };
  } else {
    return {
      success: false,
      message: 'No images are directly accessible'
    };
  }
}

// Test 6: Test proxy endpoint
async function testProxyEndpoint() {
  const docsResult = await testFetchUserDocuments();
  if (!docsResult.success || !docsResult.data) {
    return {
      success: false,
      message: 'Cannot test proxy - no images available'
    };
  }

  const images = docsResult.data;
  const testImage = images[0];

  if (!testImage || !testImage.id) {
    return {
      success: false,
      message: 'No valid image ID for proxy test'
    };
  }

  try {
    const proxyUrl = `${API_BASE}/api/images/${testImage.id}`;
    const response = await fetch(proxyUrl);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const blob = await response.blob();

      return {
        success: true,
        message: `Proxy works! Returned ${blob.size} bytes of ${contentType}`
      };
    } else {
      return {
        success: false,
        message: `Proxy returned status ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Proxy error: ${error.message}`
    };
  }
}

// Test 7: Test CORS headers
async function testCorsHeaders() {
  if (!process.env.REPL_ID) {
    return {
      success: true,
      message: 'Skipping CORS header test (not on Replit)'
    };
  }

  const origin = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

  try {
    const response = await fetch(`${API_BASE}/api/user-documents`, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET'
      }
    });

    const allowOrigin = response.headers.get('access-control-allow-origin');

    if (allowOrigin === origin || allowOrigin === '*') {
      return {
        success: true,
        message: `CORS allows origin: ${allowOrigin}`
      };
    } else {
      return {
        success: false,
        message: `CORS does not allow Replit origin (got: ${allowOrigin})`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `CORS test failed: ${error.message}`
    };
  }
}

// Test 8: Test specific dashboard pages
async function testDashboardPages() {
  const pages = [
    '/dashboard.html',
    '/dashboard-proxy.html',
    '/replit-test.html',
    '/test-image-direct.html'
  ];

  let accessible = 0;
  let failed = 0;

  for (const page of pages) {
    try {
      const response = await fetch(`${API_BASE}${page}`);
      if (response.ok) {
        accessible++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }
  }

  return {
    success: failed === 0,
    message: `${accessible}/${pages.length} pages accessible`
  };
}

// Main test runner
async function runAllTests() {
  console.clear();

  log.header('🚀 Replit Image Display Test Suite');
  log.info(`Testing with user: ${TEST_USER_ID}`);
  log.info(`Base URL: ${BASE_URL}`);
  log.info(`API URL: ${API_BASE}\n`);

  // Run tests
  await runTest('Environment Detection', testEnvironmentDetection);
  await runTest('CORS Configuration', testCorsConfiguration);
  await runTest('API Connectivity', testApiConnectivity);

  const docsResult = await runTest('Fetch User Documents', testFetchUserDocuments);

  if (docsResult.success) {
    await runTest('Direct URL Access', testDirectUrlAccess);
    await runTest('Proxy Endpoint', testProxyEndpoint);
  }

  await runTest('CORS Headers', testCorsHeaders);
  await runTest('Dashboard Pages', testDashboardPages);

  // Print summary
  log.header('📊 Test Summary');

  console.log(chalk.green(`Passed: ${results.passed}`));
  console.log(chalk.red(`Failed: ${results.failed}`));

  if (results.failed > 0) {
    log.header('❌ Failed Tests:');
    results.tests
      .filter(t => t.status === 'failed' || t.status === 'error')
      .forEach(t => {
        console.log(`  • ${t.name}: ${t.message}`);
      });
  }

  // Recommendations
  log.header('💡 Recommendations');

  if (results.failed === 0) {
    log.success('All tests passed! Images should display correctly on Replit.');
    log.info('Test the dashboard at: ' + BASE_URL + '/dashboard.html');
  } else {
    if (!process.env.CORS_ALLOW_REPLIT_SUBDOMAINS) {
      log.warning('Set CORS_ALLOW_REPLIT_SUBDOMAINS=true in environment');
    }

    const proxyTest = results.tests.find(t => t.name === 'Proxy Endpoint');
    if (proxyTest && proxyTest.status === 'passed') {
      log.info('✅ Proxy endpoint works - use /dashboard-proxy.html for most reliable display');
    }

    log.info('Run diagnostics: bash diagnose-images.sh');
    log.info('Check server logs for CORS rejection messages');
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// Run tests
runAllTests().catch(console.error);