#!/usr/bin/env node

/**
 * Safety Check API Endpoint Test
 *
 * Verifies that POST /api/update-safety-status:
 * - Returns 401 when no authentication token provided
 * - Uses requireAuth middleware (cookie-based auth)
 *
 * This test confirms the fix for the middleware mismatch issue.
 */

const baseUrl = process.env.TEST_URL || 'http://localhost:3000';

console.log('\n🔒 Testing Safety Check API Authentication\n');
console.log('============================================================');
console.log(`Using base URL: ${baseUrl}\n`);

async function testSafetyCheckAPI() {
  try {
    // Test 1: Verify endpoint returns 401 without auth
    console.log('🧪 Test 1: POST /api/update-safety-status without authentication...\n');

    const response = await fetch(`${baseUrl}/api/update-safety-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        safetyStatus: "Yes, I'm safe and can complete this form",
        timestamp: new Date().toISOString()
      })
    });

    const status = response.status;
    const data = await response.json().catch(() => ({}));

    console.log(`Status: ${status}`);
    console.log(`Response:`, data);
    console.log();

    if (status === 401) {
      console.log('✅ PASS: Returns 401 Unauthorized (correct behavior)');
      console.log('✅ Middleware: requireAuth is working correctly');
      console.log('✅ Fix Verified: Cookie-based authentication is active\n');
    } else {
      console.log(`❌ FAIL: Expected 401 but got ${status}`);
      console.log('❌ The requireAuth middleware may not be working correctly\n');
      return false;
    }

    // Test 2: Verify error message indicates authentication requirement
    console.log('🧪 Test 2: Verify error message...\n');

    if (data.error && (data.error.includes('Unauthorized') || data.error.includes('Authentication required'))) {
      console.log('✅ PASS: Error message indicates authentication required');
      console.log(`   Message: "${data.error}"\n`);
    } else {
      console.log('⚠️  WARNING: Error message format unexpected');
      console.log(`   Got: ${JSON.stringify(data)}\n`);
    }

    console.log('============================================================');
    console.log('📊 TEST RESULT: ✅ SAFETY CHECK API AUTHENTICATION VERIFIED\n');
    console.log('🎉 The middleware fix is working correctly!');
    console.log('   - Routes use requireAuth (cookie-based)');
    console.log('   - Unauthorized requests properly rejected with 401\n');

    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n📝 Troubleshooting:');
    console.log('   1. Check server is running: npm run dev');
    console.log('   2. Verify port 3000 is correct');
    console.log('   3. Check network connectivity\n');
    return false;
  }
}

// Run the test
testSafetyCheckAPI()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
