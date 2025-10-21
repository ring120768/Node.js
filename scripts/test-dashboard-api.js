#!/usr/bin/env node

/**
 * Dashboard API Test Script
 * Tests all API endpoints used by the dashboard via HTTP
 * Requires: Server running on localhost:5000
 * Run: node scripts/test-dashboard-api.js [test_user_id]
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Configuration
const API_BASE = process.env.APP_URL || 'http://localhost:5000';
const TEST_USER_ID = process.argv[2];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(type, message, data = null) {
  const color = {
    'success': colors.green,
    'error': colors.red,
    'warning': colors.yellow,
    'info': colors.blue,
    'test': colors.cyan
  }[type] || colors.reset;

  console.log(`${color}[${type.toUpperCase()}]${colors.reset} ${message}`);
  if (data) {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }
}

function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(`${API_BASE}${endpoint}`);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: json
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testHealthCheck() {
  log('test', '========== Testing Health Check ==========');
  try {
    const response = await makeRequest('/healthz');
    if (response.status === 200) {
      log('success', 'Server is running');
      return true;
    } else {
      log('error', `Health check failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    log('error', 'Server is not responding', error.message);
    log('info', 'Please start the server: npm start');
    return false;
  }
}

async function testUserDocumentsAPI(userId) {
  log('test', '========== Testing User Documents API ==========');

  if (!userId) {
    log('warning', 'No user ID provided, skipping user-specific tests');
    return false;
  }

  try {
    // Test: List documents
    log('test', `GET /api/user-documents?user_id=${userId}`);
    const response = await makeRequest(`/api/user-documents?user_id=${userId}`);

    if (response.status === 200) {
      const docs = response.data.data?.documents || response.data.documents || [];
      log('success', `Found ${docs.length} documents`);

      // Separate images and videos
      const images = docs.filter(doc =>
        !doc.document_type?.toLowerCase().includes('video') &&
        !doc.document_type?.toLowerCase().includes('dashcam')
      );

      const videos = docs.filter(doc =>
        doc.document_type?.toLowerCase().includes('video') ||
        doc.document_type?.toLowerCase().includes('dashcam')
      );

      log('info', `  Images: ${images.length}`);
      log('info', `  Videos: ${videos.length}`);

      // Check for public URLs
      const withUrls = docs.filter(d => d.public_url).length;
      const withoutUrls = docs.length - withUrls;

      if (withoutUrls > 0) {
        log('warning', `  ${withoutUrls} documents missing public_url`);
      } else if (docs.length > 0) {
        log('success', '  All documents have public URLs');
      }

      // Check status
      const statusCounts = docs.reduce((acc, doc) => {
        const status = doc.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      log('info', '  Status counts:', statusCounts);

      // Check for failed documents
      const failed = docs.filter(d => d.status === 'failed');
      if (failed.length > 0) {
        log('warning', `  ${failed.length} failed documents found`);
      }

      return true;
    } else {
      log('error', `API returned status ${response.status}`, response.data);
      return false;
    }
  } catch (error) {
    log('error', 'User documents API failed', error.message);
    return false;
  }
}

async function testTranscriptionAPI(userId) {
  log('test', '========== Testing Transcription API ==========');

  if (!userId) {
    log('warning', 'No user ID provided, skipping user-specific tests');
    return false;
  }

  try {
    log('test', `GET /api/transcription/history?user_id=${userId}`);
    const response = await makeRequest(`/api/transcription/history?user_id=${userId}`);

    if (response.status === 200) {
      const transcriptions = response.data.transcriptions || response.data.data || [];
      log('success', `Found ${transcriptions.length} transcriptions`);

      if (transcriptions.length > 0) {
        const latest = transcriptions[0];
        log('info', '  Latest transcription:', {
          duration: latest.audio_duration,
          language: latest.language,
          created: latest.created_at
        });
      }

      return true;
    } else {
      log('error', `API returned status ${response.status}`, response.data);
      return false;
    }
  } catch (error) {
    log('error', 'Transcription API failed', error.message);
    return false;
  }
}

async function testPDFAPI(userId) {
  log('test', '========== Testing PDF API ==========');

  if (!userId) {
    log('warning', 'No user ID provided, skipping user-specific tests');
    return false;
  }

  try {
    log('test', `GET /api/pdf/status/${userId}`);
    const response = await makeRequest(`/api/pdf/status/${userId}`);

    if (response.status === 200) {
      const pdfs = Array.isArray(response.data) ? response.data : (response.data.pdfs || [response.data]);
      log('success', `Found ${pdfs.length} PDF reports`);

      if (pdfs.length > 0) {
        const latest = pdfs[0];
        log('info', '  Latest PDF:', {
          created: latest.created_at,
          email_sent: latest.email_sent_at ? 'Yes' : 'No',
          pdf_url: latest.pdf_url ? 'Available' : 'Missing'
        });
      }

      return true;
    } else if (response.status === 404) {
      log('info', 'No PDFs found (this is OK for new users)');
      return true;
    } else {
      log('error', `API returned status ${response.status}`, response.data);
      return false;
    }
  } catch (error) {
    log('error', 'PDF API failed', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n');
  log('info', '='.repeat(60));
  log('info', 'Car Crash Lawyer AI - Dashboard API Test');
  log('info', '='.repeat(60));
  console.log('\n');

  // Check server health
  const serverOk = await testHealthCheck();
  if (!serverOk) {
    log('error', 'Server health check failed');
    process.exit(1);
  }

  console.log('\n');

  if (!TEST_USER_ID) {
    log('warning', 'No test user ID provided');
    log('info', 'Usage: node scripts/test-dashboard-api.js [user_id]');
    log('info', 'Running limited tests without user-specific data...');
    console.log('\n');
  }

  // Run all tests
  const results = {
    userDocuments: await testUserDocumentsAPI(TEST_USER_ID),
    transcription: await testTranscriptionAPI(TEST_USER_ID),
    pdf: await testPDFAPI(TEST_USER_ID)
  };

  console.log('\n');

  // Summary
  log('info', '='.repeat(60));
  log('info', 'Test Results');
  log('info', '='.repeat(60));

  Object.entries(results).forEach(([test, passed]) => {
    if (passed !== null) {
      log(passed ? 'success' : 'error', `${test}: ${passed ? 'PASS' : 'FAIL'}`);
    }
  });

  const allPassed = Object.values(results).filter(r => r !== null).every(r => r === true);
  const someSkipped = Object.values(results).some(r => r === null);

  console.log('\n');
  log('info', '='.repeat(60));
  if (someSkipped) {
    log('warning', 'TESTS COMPLETED (some skipped)');
  } else {
    log(allPassed ? 'success' : 'error', allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗');
  }
  log('info', '='.repeat(60));
  console.log('\n');

  // Dashboard checklist
  log('info', '='.repeat(60));
  log('info', 'Manual Dashboard Audit Checklist');
  log('info', '='.repeat(60));
  console.log('\n');

  const checklist = [
    '1. Open http://localhost:5000/dashboard.html',
    '2. Login with a test user account',
    '3. Verify all 5 dashboard cards show correct counts:',
    '   - Incident Reports',
    '   - Images',
    '   - Dashcam Footage',
    '   - Audio Transcriptions',
    '   - Generated Reports',
    '4. Click into each section and verify data loads',
    '5. Test image viewing in modal',
    '6. Test download buttons',
    '7. Test delete buttons (with confirmation)',
    '8. Check "Back to Dashboard" navigation',
    '9. Verify responsive design on mobile (resize browser)',
    '10. Test logout functionality'
  ];

  checklist.forEach(item => log('info', item));

  console.log('\n');
  log('info', 'Dashboard Features Summary:');
  log('info', '✓ 5 content sections (Reports, Images, Videos, Transcriptions, PDFs)');
  log('info', '✓ Grid layout with hover effects');
  log('info', '✓ Count badges for each section');
  log('info', '✓ Breadcrumb navigation');
  log('info', '✓ Image modal with preview');
  log('info', '✓ Download and delete actions');
  log('info', '✓ Empty states with CTAs');
  log('info', '✓ Responsive design');
  log('info', '✓ User avatar and logout');
  console.log('\n');

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  log('error', 'Tests failed with error', error);
  process.exit(1);
});
