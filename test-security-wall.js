#!/usr/bin/env node

/**
 * Test Security Wall (Page Authentication Middleware)
 *
 * Tests that protected pages require authentication at the server level.
 * Verifies the "security wall" is working correctly.
 *
 * Usage: node test-security-wall.js
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m'
};

async function testSecurityWall() {
  console.log(colors.cyan + colors.bold, '\n🔒 Testing Security Wall (Page Auth Middleware)\n');
  console.log(colors.reset + '='.repeat(60));

  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
  console.log(colors.cyan, `\nUsing base URL: ${baseUrl}\n`);

  const protectedPages = [
    '/dashboard.html',
    '/transcription-status.html',
    '/incident.html'
  ];

  const publicPages = [
    '/index.html',
    '/login.html',
    '/signup-form.html',
    '/privacy-policy.html',
    '/payment-success.html'
  ];

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Check server is running
  console.log(colors.cyan, '📡 Test 1: Checking if server is running...\n');

  try {
    const healthResponse = await fetch(`${baseUrl}/healthz`);
    if (healthResponse.ok) {
      console.log(colors.green, '✅ Server is running');
      passedTests++;
    } else {
      console.log(colors.red, `❌ Server returned: ${healthResponse.status}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(colors.red, '❌ Server not responding:', error.message);
    console.log(colors.yellow, '\n💡 Start server with: npm start\n');
    process.exit(1);
  }

  // Test 2: Protected pages should return 401 without auth
  console.log(colors.cyan, '\n🔒 Test 2: Protected pages without authentication...\n');

  for (const page of protectedPages) {
    try {
      const response = await fetch(`${baseUrl}${page}`, {
        redirect: 'manual' // Don't follow redirects
      });

      if (response.status === 401) {
        console.log(colors.green, `✅ ${page} - Correctly blocked (401)`);
        passedTests++;

        // Check if response includes redirect instruction
        try {
          const body = await response.json();
          if (body.redirect && body.redirect.includes('/login.html')) {
            console.log(colors.green, `   → Redirect to login: ${body.redirect}`);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      } else {
        console.log(colors.red, `❌ ${page} - Should be blocked but got ${response.status}`);
        failedTests++;
      }
    } catch (error) {
      console.log(colors.red, `❌ ${page} - Request failed:`, error.message);
      failedTests++;
    }
  }

  // Test 3: Public pages should be accessible
  console.log(colors.cyan, '\n🌐 Test 3: Public pages (should be accessible)...\n');

  for (const page of publicPages) {
    try {
      const response = await fetch(`${baseUrl}${page}`);

      if (response.ok) {
        console.log(colors.green, `✅ ${page} - Accessible (${response.status})`);
        passedTests++;
      } else {
        console.log(colors.yellow, `⚠️  ${page} - Status ${response.status} (may not exist yet)`);
      }
    } catch (error) {
      console.log(colors.red, `❌ ${page} - Request failed:`, error.message);
      failedTests++;
    }
  }

  // Test 4: Protected pages with valid session token
  console.log(colors.cyan, '\n🔑 Test 4: Protected pages with authentication...\n');
  console.log(colors.yellow, '⚠️  Skipping - requires valid Supabase session token');
  console.log(colors.reset, '   (Manual test: Login via browser, then try accessing dashboard)');

  // Summary
  console.log(colors.cyan + colors.bold, '\n📊 TEST SUMMARY\n');
  console.log(colors.reset + '='.repeat(60));
  console.log(colors.green, `✅ Passed: ${passedTests}`);
  if (failedTests > 0) {
    console.log(colors.red, `❌ Failed: ${failedTests}`);
  }

  console.log(colors.cyan, '\n🔒 Security Wall Status:');
  if (failedTests === 0) {
    console.log(colors.green, '✅ WORKING - Protected pages require authentication\n');
  } else {
    console.log(colors.red, '❌ ISSUES DETECTED - Some tests failed\n');
  }

  // Manual testing instructions
  console.log(colors.yellow, '📝 Manual Testing Steps:\n');
  console.log(colors.reset, '1. Open browser to http://localhost:5000/dashboard.html');
  console.log('   → Should see 401 error or login redirect\n');
  console.log('2. Login at http://localhost:5000/login.html');
  console.log('   → Enter valid credentials\n');
  console.log('3. Try http://localhost:5000/dashboard.html again');
  console.log('   → Should now load dashboard\n');
  console.log('4. Logout and try dashboard again');
  console.log('   → Should be blocked with 401\n');

  // Exit code
  process.exit(failedTests > 0 ? 1 : 0);
}

testSecurityWall().catch(err => {
  console.error(colors.red, '\n❌ Fatal error:', err.message);
  console.error(colors.reset, err.stack);
  process.exit(1);
});
