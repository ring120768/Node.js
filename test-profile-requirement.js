#!/usr/bin/env node

/**
 * Test Profile Requirement Fix
 *
 * Validates that:
 * 1. Users with auth but no profile are redirected to signup-profile.html
 * 2. Users with profiles can access incident forms normally
 * 3. API endpoints return 403 for users without profiles
 *
 * Usage:
 *   node test-profile-requirement.js
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test user credentials
const TEST_EMAIL = `test-profile-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

let testUserId = null;
let testAccessToken = null;

console.log('🧪 Testing Profile Requirement Fix\n');
console.log('='.repeat(60));

/**
 * Test 1: Create authenticated user (no profile)
 */
async function test1_createAuthUser() {
  console.log('\n📝 Test 1: Create authenticated user without profile');
  console.log('-'.repeat(60));

  try {
    // Create auth user via Supabase Auth API
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true
    });

    if (error) throw error;

    testUserId = data.user.id;
    console.log(`✅ Created auth user: ${testUserId}`);
    console.log(`   Email: ${TEST_EMAIL}`);

    // Sign in to get access token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (signInError) throw signInError;

    testAccessToken = signInData.session.access_token;
    console.log(`✅ Obtained access token`);

    // Verify no profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_signup')
      .select('create_user_id')
      .eq('create_user_id', testUserId)
      .single();

    if (profile) {
      throw new Error('Profile already exists - test setup failed');
    }

    console.log(`✅ Confirmed: No user_signup record exists`);
    return true;
  } catch (error) {
    console.error(`❌ Test 1 failed:`, error.message);
    return false;
  }
}

/**
 * Test 2: Verify HTML redirect for user without profile
 */
async function test2_testHtmlRedirect() {
  console.log('\n📝 Test 2: Verify HTML page redirects to profile form');
  console.log('-'.repeat(60));

  try {
    // Try to access incident form page 1
    const response = await axios.get(
      `${BASE_URL}/incident-form-page1.html`,
      {
        headers: {
          'Cookie': `access_token=${testAccessToken}`
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      }
    ).catch(error => error.response);

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, response.headers);

    // Should be 302 redirect
    if (response.status !== 302) {
      throw new Error(`Expected 302 redirect, got ${response.status}`);
    }

    const location = response.headers.location;
    console.log(`Redirect location: ${location}`);

    // Should redirect to signup-profile.html with query params
    if (!location.includes('/signup-profile.html')) {
      throw new Error(`Expected redirect to signup-profile.html, got ${location}`);
    }

    if (!location.includes('incomplete=true')) {
      throw new Error(`Expected ?incomplete=true in redirect URL`);
    }

    console.log(`✅ Correctly redirected to profile form with context`);
    return true;
  } catch (error) {
    console.error(`❌ Test 2 failed:`, error.message);
    return false;
  }
}

/**
 * Test 3: Verify API returns 403 for user without profile
 */
async function test3_testApiError() {
  console.log('\n📝 Test 3: Verify API returns 403 for user without profile');
  console.log('-'.repeat(60));

  try {
    // Try to submit incident form via API
    const response = await axios.post(
      `${BASE_URL}/api/incident-form/submit`,
      {
        page1: {
          incident_date: '2025-01-01',
          incident_time: '14:30',
          location_address: 'Test Street'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${testAccessToken}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on any status
      }
    );

    console.log(`Response status: ${response.status}`);
    console.log(`Response body:`, JSON.stringify(response.data, null, 2));

    // Should be 403 Forbidden
    if (response.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${response.status}`);
    }

    // Should have error message
    if (!response.data.error || response.data.error !== 'Profile Incomplete') {
      throw new Error(`Expected 'Profile Incomplete' error message`);
    }

    // Should have redirectTo field
    if (!response.data.redirectTo || !response.data.redirectTo.includes('signup-profile.html')) {
      throw new Error(`Expected redirectTo field pointing to signup-profile.html`);
    }

    console.log(`✅ API correctly returned 403 with proper error details`);
    return true;
  } catch (error) {
    console.error(`❌ Test 3 failed:`, error.message);
    return false;
  }
}

/**
 * Test 4: Create profile and verify access granted
 */
async function test4_createProfileAndTestAccess() {
  console.log('\n📝 Test 4: Create profile and verify access granted');
  console.log('-'.repeat(60));

  try {
    // Create user_signup record
    const { error: insertError } = await supabase
      .from('user_signup')
      .insert({
        create_user_id: testUserId,
        email: TEST_EMAIL,
        name: 'Test',
        surname: 'User',
        mobile: '+447700900000',
        license_plate: 'TEST123'
      });

    if (insertError) throw insertError;

    console.log(`✅ Created user_signup record`);

    // Try to access incident form again
    const response = await axios.get(
      `${BASE_URL}/incident-form-page1.html`,
      {
        headers: {
          'Cookie': `access_token=${testAccessToken}`
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      }
    ).catch(error => error.response);

    console.log(`Response status: ${response.status}`);

    // Should be 200 OK now
    if (response.status !== 200) {
      throw new Error(`Expected 200 OK, got ${response.status}`);
    }

    console.log(`✅ Successfully accessed incident form with profile`);
    return true;
  } catch (error) {
    console.error(`❌ Test 4 failed:`, error.message);
    return false;
  }
}

/**
 * Cleanup: Delete test user
 */
async function cleanup() {
  console.log('\n🧹 Cleanup: Deleting test user');
  console.log('-'.repeat(60));

  try {
    if (testUserId) {
      // Delete user_signup record
      await supabase
        .from('user_signup')
        .delete()
        .eq('create_user_id', testUserId);

      // Delete auth user
      await supabase.auth.admin.deleteUser(testUserId);

      console.log(`✅ Deleted test user: ${testUserId}`);
    }
  } catch (error) {
    console.error(`⚠️ Cleanup warning:`, error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  const results = [];

  try {
    // Run tests in sequence
    results.push(await test1_createAuthUser());
    results.push(await test2_testHtmlRedirect());
    results.push(await test3_testApiError());
    results.push(await test4_createProfileAndTestAccess());

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(60));

    const passed = results.filter(r => r).length;
    const failed = results.filter(r => !r).length;

    console.log(`✅ Passed: ${passed}/4`);
    console.log(`❌ Failed: ${failed}/4`);

    if (failed === 0) {
      console.log('\n🎉 All tests passed! Profile requirement fix is working correctly.\n');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some tests failed. Please review the output above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
