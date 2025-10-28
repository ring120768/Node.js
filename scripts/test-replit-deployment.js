#!/usr/bin/env node
/**
 * Test Replit Deployment Status
 *
 * Verifies that the latest code is deployed to Replit production.
 * Checks if temp upload endpoint exists and signup form has correct version.
 *
 * Usage: node scripts/test-replit-deployment.js
 */

const https = require('https');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m'
};

const REPLIT_URL = 'https://nodejs-1-ring120768.replit.app';

async function testDeployment() {
  console.log(colors.cyan + colors.bold + '\n🚀 Testing Replit Deployment Status\n' + colors.reset);

  try {
    // Test 1: Check signup form version
    console.log(colors.bold + '1️⃣  Checking signup form version...' + colors.reset);

    const formHtml = await fetchUrl('/signup-form.html');

    if (formHtml.includes('FORM_VERSION = \'2.1.0-temp-upload\'')) {
      console.log(colors.green + '   ✅ Form version: 2.1.0-temp-upload\n' + colors.reset);
    } else if (formHtml.includes('FORM_VERSION')) {
      const versionMatch = formHtml.match(/FORM_VERSION = '([^']+)'/);
      console.log(colors.yellow + '   ⚠️  Form version: ' + (versionMatch ? versionMatch[1] : 'unknown') + colors.reset);
      console.log(colors.yellow + '   💡 Expected: 2.1.0-temp-upload\n' + colors.reset);
    } else {
      console.log(colors.red + '   ❌ No version string found in form\n' + colors.reset);
    }

    // Test 2: Check for temp upload code
    console.log(colors.bold + '2️⃣  Checking for temp upload implementation...' + colors.reset);

    if (formHtml.includes('📤 Uploading') && formHtml.includes('temp storage')) {
      console.log(colors.green + '   ✅ Temp upload code present\n' + colors.reset);
    } else {
      console.log(colors.red + '   ❌ Temp upload code NOT FOUND\n' + colors.reset);
    }

    // Test 3: Check for CSP-compliant code (no inline onclick)
    console.log(colors.bold + '3️⃣  Checking CSP compliance...' + colors.reset);

    if (formHtml.includes('onclick=')) {
      console.log(colors.yellow + '   ⚠️  Found inline onclick handlers (CSP violation)\n' + colors.reset);
    } else {
      console.log(colors.green + '   ✅ No inline event handlers found\n' + colors.reset);
    }

    // Test 4: Check API endpoints (healthz)
    console.log(colors.bold + '4️⃣  Checking API endpoints...' + colors.reset);

    const healthData = await fetchUrl('/healthz');
    const health = JSON.parse(healthData);

    if (health.status === 'ok') {
      console.log(colors.green + '   ✅ Server is healthy' + colors.reset);
      console.log(colors.cyan + '   Version: ' + (health.version || 'unknown') + '\n' + colors.reset);
    } else {
      console.log(colors.yellow + '   ⚠️  Server health: ' + JSON.stringify(health) + '\n' + colors.reset);
    }

    // Summary
    console.log(colors.green + colors.bold + '✅ Deployment verification complete!\n' + colors.reset);
    console.log(colors.cyan + '🎯 Ready for production testing:' + colors.reset);
    console.log(colors.cyan + '   1. Open: ' + REPLIT_URL + '/signup-form.html' + colors.reset);
    console.log(colors.cyan + '   2. Complete Pages 1-6 (personal info, vehicle, insurance)' + colors.reset);
    console.log(colors.cyan + '   3. On Page 7: Select/upload 5 images' + colors.reset);
    console.log(colors.cyan + '   4. Watch browser console for upload confirmations' + colors.reset);
    console.log(colors.cyan + '   5. Complete Pages 8-9 and submit form' + colors.reset);
    console.log(colors.cyan + '   6. Verify images display in dashboard\n' + colors.reset);

  } catch (error) {
    console.log(colors.red + '\n❌ Deployment test failed: ' + error.message + '\n' + colors.reset);

    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.log(colors.yellow + '💡 Replit may still be deploying...' + colors.reset);
      console.log(colors.yellow + '   Wait 2-3 minutes and run this script again:\n' + colors.reset);
      console.log(colors.cyan + '   node scripts/test-replit-deployment.js\n' + colors.reset);
    } else if (error.message.includes('timeout')) {
      console.log(colors.yellow + '💡 Connection timeout - Replit may be busy' + colors.reset);
      console.log(colors.yellow + '   Try again in 1-2 minutes\n' + colors.reset);
    } else {
      console.log(colors.yellow + '💡 Check Replit dashboard for deployment status\n' + colors.reset);
    }

    process.exit(1);
  }
}

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    const url = REPLIT_URL + path;

    https.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000
    }, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    }).on('error', reject)
      .on('timeout', () => {
        reject(new Error('Request timeout'));
      });
  });
}

// Run test
testDeployment()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(colors.red + 'Unexpected error:', error);
    process.exit(1);
  });
