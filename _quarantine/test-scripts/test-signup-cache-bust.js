#!/usr/bin/env node
/**
 * Test Signup Form Cache Busting and Version Detection
 *
 * Verifies that:
 * 1. Signup form is served with correct cache headers
 * 2. Latest version code is present (2.1.0-temp-upload)
 * 3. No old multipart code exists
 * 4. File contains JSON submission code
 *
 * Usage: node test-signup-cache-bust.js [url]
 */

const http = require('http');
const https = require('https');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

async function testSignupFormVersion(baseUrl = 'http://localhost:5000') {
  console.log(colors.cyan + colors.bold + '\n🧪 Testing Signup Form Cache Busting\n' + colors.reset);
  console.log(colors.cyan + `📍 URL: ${baseUrl}/signup-form.html\n` + colors.reset);

  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/signup-form.html`;
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }, (res) => {
      let html = '';

      res.on('data', (chunk) => {
        html += chunk;
      });

      res.on('end', () => {
        console.log(colors.bold + '📋 Cache Headers Check:\n' + colors.reset);

        // Check cache headers
        const cacheControl = res.headers['cache-control'];
        const pragma = res.headers['pragma'];
        const expires = res.headers['expires'];

        if (cacheControl && cacheControl.includes('no-cache') && cacheControl.includes('no-store')) {
          console.log(colors.green + '  ✅ Cache-Control: ' + cacheControl + colors.reset);
        } else {
          console.log(colors.red + '  ❌ Cache-Control: ' + (cacheControl || 'MISSING') + colors.reset);
        }

        if (pragma === 'no-cache') {
          console.log(colors.green + '  ✅ Pragma: ' + pragma + colors.reset);
        } else {
          console.log(colors.yellow + '  ⚠️  Pragma: ' + (pragma || 'MISSING') + colors.reset);
        }

        if (expires === '0') {
          console.log(colors.green + '  ✅ Expires: ' + expires + colors.reset);
        } else {
          console.log(colors.yellow + '  ⚠️  Expires: ' + (expires || 'MISSING') + colors.reset);
        }

        console.log(colors.bold + '\n🔍 Code Version Check:\n' + colors.reset);

        // Check for version string
        if (html.includes('FORM_VERSION = \'2.1.0-temp-upload\'')) {
          console.log(colors.green + '  ✅ Latest version detected: 2.1.0-temp-upload' + colors.reset);
        } else if (html.includes('FORM_VERSION')) {
          const versionMatch = html.match(/FORM_VERSION = '([^']+)'/);
          console.log(colors.yellow + '  ⚠️  Different version found: ' + (versionMatch ? versionMatch[1] : 'unknown') + colors.reset);
        } else {
          console.log(colors.red + '  ❌ No version string found' + colors.reset);
        }

        // Check for correct submission code
        if (html.includes('JSON.stringify(cleanedData)')) {
          console.log(colors.green + '  ✅ JSON submission code present' + colors.reset);
        } else {
          console.log(colors.red + '  ❌ JSON submission code MISSING' + colors.reset);
        }

        // Check for old multipart code
        if (html.includes('📎 Attached') || html.includes('multipart form data with images')) {
          console.log(colors.red + '  ❌ OLD multipart code detected (cache issue!)' + colors.reset);
        } else {
          console.log(colors.green + '  ✅ No old multipart code found' + colors.reset);
        }

        // Check for File object validation fix
        if (html.includes('typeof value !== \'string\'')) {
          console.log(colors.green + '  ✅ Validation fix present (checks for string temp paths)' + colors.reset);
        } else if (html.includes('!(file instanceof File)')) {
          console.log(colors.red + '  ❌ OLD validation code (checks for File objects)' + colors.reset);
        } else {
          console.log(colors.yellow + '  ⚠️  Validation code not found' + colors.reset);
        }

        // Check for defensive File object check
        if (html.includes('Found File objects in formData')) {
          console.log(colors.green + '  ✅ Defensive File object check present' + colors.reset);
        } else {
          console.log(colors.yellow + '  ⚠️  Defensive File object check MISSING' + colors.reset);
        }

        console.log(colors.bold + '\n📊 Summary:\n' + colors.reset);

        const checksPass =
          cacheControl && cacheControl.includes('no-cache') &&
          html.includes('FORM_VERSION = \'2.1.0-temp-upload\'') &&
          html.includes('JSON.stringify(cleanedData)') &&
          !html.includes('📎 Attached') &&
          html.includes('typeof value !== \'string\'');

        if (checksPass) {
          console.log(colors.green + colors.bold + '  ✅ ALL CHECKS PASSED - Form is up to date!\n' + colors.reset);
          resolve(true);
        } else {
          console.log(colors.yellow + colors.bold + '  ⚠️  SOME CHECKS FAILED - Review results above\n' + colors.reset);
          console.log(colors.cyan + '💡 If this is a cache issue, ask user to hard refresh:\n' + colors.reset);
          console.log('   • Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
          console.log('   • Firefox: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
          console.log('   • Safari: Cmd+Option+R\n');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error(colors.red + '❌ Test failed:', error.message + colors.reset);
      reject(error);
    });

    req.end();
  });
}

// Run test
const testUrl = process.argv[2] || 'http://localhost:5000';

testSignupFormVersion(testUrl)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
