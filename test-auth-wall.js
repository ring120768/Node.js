#!/usr/bin/env node

/**
 * Authentication Wall Test
 *
 * Tests that protected pages require authentication.
 * Run this after starting the server: npm run dev
 */

const http = require('http');

const SERVER_URL = 'http://localhost:3000';

const PAGES_TO_TEST = [
  { path: '/index.html', protected: false, name: 'Landing Page' },
  { path: '/login.html', protected: false, name: 'Login Page' },
  { path: '/signup-form.html', protected: false, name: 'Signup Page' },
  { path: '/demo.html', protected: false, name: 'Demo Page' },
  { path: '/dashboard.html', protected: true, name: 'Dashboard' },
  { path: '/incident.html', protected: true, name: 'Report Incident' },
  { path: '/transcription-status.html', protected: true, name: 'Transcription Status' },
  { path: '/incident-form-page1.html', protected: true, name: 'Incident Form Page 1' },
];

/**
 * Make HTTP request without authentication
 */
function testPage(page) {
  return new Promise((resolve) => {
    const url = new URL(page.path, SERVER_URL);

    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = {
          page: page.name,
          path: page.path,
          statusCode: res.statusCode,
          isRedirect: res.statusCode >= 300 && res.statusCode < 400,
          redirectLocation: res.headers.location,
          protected: page.protected
        };
        resolve(result);
      });
    }).on('error', (error) => {
      resolve({
        page: page.name,
        path: page.path,
        error: error.message
      });
    });
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('========================================');
  console.log('🔐 Authentication Wall Test');
  console.log('========================================');
  console.log('Testing server:', SERVER_URL);
  console.log('');

  console.log('Testing without authentication...');
  console.log('');

  let allPassed = true;

  for (const page of PAGES_TO_TEST) {
    const result = await testPage(page);

    if (result.error) {
      console.log(`❌ ${result.page} - ERROR: ${result.error}`);
      allPassed = false;
      continue;
    }

    // Expected behavior:
    // - Public pages (protected: false) should return 200 OK
    // - Protected pages (protected: true) should return 302 redirect to login

    let passed = false;
    let message = '';

    if (page.protected) {
      // Should redirect to login
      if (result.isRedirect && result.redirectLocation && result.redirectLocation.includes('login.html')) {
        passed = true;
        message = `✅ ${result.page} - PROTECTED (${result.statusCode} → ${result.redirectLocation})`;
      } else if (result.statusCode === 200) {
        passed = false;
        message = `❌ ${result.page} - NOT PROTECTED! (${result.statusCode}) - Expected 302 redirect`;
      } else {
        passed = false;
        message = `⚠️  ${result.page} - UNEXPECTED (${result.statusCode})`;
      }
    } else {
      // Should be accessible
      if (result.statusCode === 200) {
        passed = true;
        message = `✅ ${result.page} - PUBLIC (${result.statusCode})`;
      } else {
        passed = false;
        message = `❌ ${result.page} - UNEXPECTED (${result.statusCode}) - Expected 200 OK`;
      }
    }

    console.log(message);

    if (!passed) {
      allPassed = false;
    }
  }

  console.log('');
  console.log('========================================');

  if (allPassed) {
    console.log('✅ All tests PASSED - Authentication wall is working correctly!');
    console.log('');
    console.log('Summary:');
    console.log('- Public pages are accessible without login');
    console.log('- Protected pages redirect to login when not authenticated');
  } else {
    console.log('❌ Some tests FAILED - Authentication wall has issues!');
    console.log('');
    console.log('Issues found:');
    console.log('- Some protected pages are accessible without authentication');
    console.log('- OR some public pages are incorrectly protected');
  }

  console.log('========================================');

  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
