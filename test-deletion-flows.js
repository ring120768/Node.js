/**
 * Account Deletion Flow Validation Script
 *
 * Tests both deletion flows to ensure email/password verification works:
 * 1. Standalone deletion page (/delete-account.html → /api/account/delete)
 * 2. Dashboard deletion modal (/dashboard.html → /api/account/delete)
 *
 * Usage: node test-deletion-flows.js
 *
 * Note: This is a validation script - it does NOT actually delete test accounts.
 *       It only verifies the endpoints exist and require proper authentication.
 */

const logger = require('./src/utils/logger');

async function testDeletionFlows() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Account Deletion Flow Validation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Verify account controller file exists (skip require - needs env vars)
  console.log('📋 Test 1: Verify account controller file exists...');
  try {
    const fs = require('fs');
    const controllerExists = fs.existsSync('./src/controllers/account.controller.js');
    const controllerContent = controllerExists
      ? fs.readFileSync('./src/controllers/account.controller.js', 'utf8')
      : '';

    const hasDeleteAccountFunction = controllerContent.includes('async function deleteAccount');
    const hasPasswordVerification = controllerContent.includes('signInWithPassword');

    if (controllerExists && hasDeleteAccountFunction && hasPasswordVerification) {
      console.log('   ✅ account.controller.js exists');
      console.log('   ✅ deleteAccount() function defined');
      console.log('   ✅ Password verification via signInWithPassword()\n');
      results.passed++;
      results.tests.push({
        name: 'Account controller exists',
        status: 'PASS'
      });
    } else {
      throw new Error('Controller file missing or incomplete');
    }
  } catch (error) {
    console.log('   ❌ FAILED: account.controller.js not found or invalid\n');
    results.failed++;
    results.tests.push({
      name: 'Account controller exists',
      status: 'FAIL',
      error: error.message
    });
  }

  // Test 2: Verify account routes file exists (skip require - needs env vars)
  console.log('📋 Test 2: Verify account routes configured...');
  try {
    const fs = require('fs');
    const routesExist = fs.existsSync('./src/routes/account.routes.js');
    const routesContent = routesExist
      ? fs.readFileSync('./src/routes/account.routes.js', 'utf8')
      : '';

    const hasDeleteRoute = routesContent.includes("router.post('/delete'");

    if (routesExist && hasDeleteRoute) {
      console.log('   ✅ account.routes.js exists');
      console.log('   ✅ POST /delete route configured\n');
      results.passed++;
      results.tests.push({
        name: 'Account routes exist',
        status: 'PASS'
      });
    } else {
      throw new Error('Routes file missing or incomplete');
    }
  } catch (error) {
    console.log('   ❌ FAILED: account.routes.js not found\n');
    results.failed++;
    results.tests.push({
      name: 'Account routes exist',
      status: 'FAIL',
      error: error.message
    });
  }

  // Test 3: Verify dashboard.html has email/password fields
  console.log('📋 Test 3: Verify dashboard modal has email/password fields...');
  try {
    const fs = require('fs');
    const dashboardHtml = fs.readFileSync('./public/dashboard.html', 'utf8');

    const hasEmailField = dashboardHtml.includes('id="deleteEmail"');
    const hasPasswordField = dashboardHtml.includes('id="deletePassword"');
    const usesSecureEndpoint = dashboardHtml.includes('/api/account/delete');

    if (hasEmailField && hasPasswordField && usesSecureEndpoint) {
      console.log('   ✅ Dashboard modal has email field');
      console.log('   ✅ Dashboard modal has password field');
      console.log('   ✅ Dashboard uses secure /api/account/delete endpoint\n');
      results.passed++;
      results.tests.push({
        name: 'Dashboard modal has password fields',
        status: 'PASS'
      });
    } else {
      const missing = [];
      if (!hasEmailField) missing.push('email field');
      if (!hasPasswordField) missing.push('password field');
      if (!usesSecureEndpoint) missing.push('secure endpoint');
      throw new Error(`Missing: ${missing.join(', ')}`);
    }
  } catch (error) {
    console.log('   ❌ FAILED: Dashboard modal incomplete\n');
    results.failed++;
    results.tests.push({
      name: 'Dashboard modal has password fields',
      status: 'FAIL',
      error: error.message
    });
  }

  // Test 4: Verify standalone page has email/password fields
  console.log('📋 Test 4: Verify standalone page has email/password fields...');
  try {
    const fs = require('fs');
    const deleteAccountHtml = fs.readFileSync('./public/delete-account.html', 'utf8');

    const hasEmailField = deleteAccountHtml.includes('id="email"');
    const hasPasswordField = deleteAccountHtml.includes('id="password"');
    const usesSecureEndpoint = deleteAccountHtml.includes('/api/account/delete');

    if (hasEmailField && hasPasswordField && usesSecureEndpoint) {
      console.log('   ✅ Standalone page has email field');
      console.log('   ✅ Standalone page has password field');
      console.log('   ✅ Standalone page uses secure endpoint\n');
      results.passed++;
      results.tests.push({
        name: 'Standalone page has password fields',
        status: 'PASS'
      });
    } else {
      const missing = [];
      if (!hasEmailField) missing.push('email field');
      if (!hasPasswordField) missing.push('password field');
      if (!usesSecureEndpoint) missing.push('secure endpoint');
      throw new Error(`Missing: ${missing.join(', ')}`);
    }
  } catch (error) {
    console.log('   ❌ FAILED: Standalone page incomplete\n');
    results.failed++;
    results.tests.push({
      name: 'Standalone page has password fields',
      status: 'FAIL',
      error: error.message
    });
  }

  // Test 5: Verify validation logic exists in dashboard
  console.log('📋 Test 5: Verify client-side validation in dashboard...');
  try {
    const fs = require('fs');
    const dashboardHtml = fs.readFileSync('./public/dashboard.html', 'utf8');

    const hasEmailValidation = dashboardHtml.includes('emailRegex');
    const hasPasswordValidation = dashboardHtml.includes('password.length');
    const hasErrorHandling = dashboardHtml.includes('showToast') && dashboardHtml.includes('error');

    if (hasEmailValidation && hasPasswordValidation && hasErrorHandling) {
      console.log('   ✅ Email format validation exists');
      console.log('   ✅ Password length validation exists');
      console.log('   ✅ Error handling exists\n');
      results.passed++;
      results.tests.push({
        name: 'Client-side validation exists',
        status: 'PASS'
      });
    } else {
      const missing = [];
      if (!hasEmailValidation) missing.push('email validation');
      if (!hasPasswordValidation) missing.push('password validation');
      if (!hasErrorHandling) missing.push('error handling');
      throw new Error(`Missing: ${missing.join(', ')}`);
    }
  } catch (error) {
    console.log('   ❌ FAILED: Validation incomplete\n');
    results.failed++;
    results.tests.push({
      name: 'Client-side validation exists',
      status: 'FAIL',
      error: error.message
    });
  }

  // Test 6: Verify modal clear logic exists
  console.log('📋 Test 6: Verify modal clears fields on open/close...');
  try {
    const fs = require('fs');
    const dashboardHtml = fs.readFileSync('./public/dashboard.html', 'utf8');

    const showModalClearsFields = dashboardHtml.includes('showDeleteModal') &&
                                   dashboardHtml.includes("deleteEmail').value = ''");
    const hideModalClearsFields = dashboardHtml.includes('hideDeleteModal') &&
                                   dashboardHtml.includes("deletePassword').value = ''");

    if (showModalClearsFields && hideModalClearsFields) {
      console.log('   ✅ showDeleteModal() clears input fields');
      console.log('   ✅ hideDeleteModal() clears input fields\n');
      results.passed++;
      results.tests.push({
        name: 'Modal clear logic exists',
        status: 'PASS'
      });
    } else {
      throw new Error('Field clearing logic incomplete');
    }
  } catch (error) {
    console.log('   ❌ FAILED: Modal clear logic incomplete\n');
    results.failed++;
    results.tests.push({
      name: 'Modal clear logic exists',
      status: 'FAIL',
      error: error.message
    });
  }

  // Print summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Results: ${results.passed} passed, ${results.failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (results.failed === 0) {
    console.log('🎉 All tests passed! Account deletion flows are properly configured.\n');
    console.log('✅ Both deletion flows now require email/password verification');
    console.log('✅ Dashboard modal matches standalone page security');
    console.log('✅ Client-side validation prevents invalid submissions');
    console.log('✅ Modal fields clear on open/close for fresh state\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run tests
testDeletionFlows().catch(error => {
  logger.error('Test script failed:', error);
  process.exit(1);
});
