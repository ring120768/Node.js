#!/usr/bin/env node

/**
 * Check User Authentication and Signup Status
 *
 * Verifies if a user has:
 * 1. Valid Supabase Auth account
 * 2. user_signup record
 * 3. Safety check completed (are_you_safe field)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

async function checkUserStatus() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║        USER AUTHENTICATION & SIGNUP STATUS CHECK               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`🎯 Checking User ID: ${USER_ID}\n`);

  try {
    // Step 1: Check Supabase Auth
    console.log('1️⃣  Checking Supabase Auth...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(USER_ID);

    if (authError) {
      console.log(`❌ Auth Error: ${authError.message}\n`);
    } else if (!authUser || !authUser.user) {
      console.log('❌ No Supabase Auth user found\n');
    } else {
      console.log('✅ Supabase Auth User EXISTS');
      console.log(`   Email: ${authUser.user.email}`);
      console.log(`   Created: ${new Date(authUser.user.created_at).toLocaleString()}\n`);
    }

    // Step 2: Check user_signup record
    console.log('2️⃣  Checking user_signup record...');
    const { data: signupData, error: signupError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', USER_ID)
      .single();

    if (signupError) {
      console.log(`❌ Signup Error: ${signupError.message}`);
      if (signupError.code === 'PGRST116') {
        console.log('   No user_signup record found - user needs to complete signup\n');
      }
    } else if (!signupData) {
      console.log('❌ No user_signup record found\n');
    } else {
      console.log('✅ user_signup Record EXISTS');
      console.log(`   Email: ${signupData.email}`);
      console.log(`   Name: ${signupData.name} ${signupData.surname}`);
      console.log(`   Created: ${new Date(signupData.created_at).toLocaleString()}`);
      console.log(`\n   Safety Check Status:`);
      console.log(`   - are_you_safe: ${signupData.are_you_safe === true ? '✅ TRUE' : signupData.are_you_safe === false ? '❌ FALSE' : '⚪ NULL (not completed)'}`);
      console.log(`   - safety_status: ${signupData.safety_status || 'NULL'}`);
      console.log(`   - safety_status_timestamp: ${signupData.safety_status_timestamp ? new Date(signupData.safety_status_timestamp).toLocaleString() : 'NULL'}\n`);
    }

    // Step 3: Summary and Recommendations
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                         DIAGNOSIS                              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const hasAuth = authUser && authUser.user;
    const hasSignup = signupData && !signupError;
    const hasSafetyCheck = hasSignup && signupData.are_you_safe === true;

    if (!hasAuth && !hasSignup) {
      console.log('🔴 CRITICAL: No authentication or signup record');
      console.log('\n📋 REQUIRED ACTIONS:');
      console.log('1. Complete signup flow (signup-auth.html)');
      console.log('2. Complete safety check (safety-check.html)');
      console.log('3. Then submit incident report\n');
    } else if (hasAuth && !hasSignup) {
      console.log('🟡 WARNING: Auth exists but no signup record');
      console.log('\n📋 REQUIRED ACTIONS:');
      console.log('1. Complete signup form pages (signup-form.html)');
      console.log('2. Complete safety check (safety-check.html)');
      console.log('3. Then submit incident report\n');
    } else if (hasSignup && !hasSafetyCheck) {
      console.log('🟡 WARNING: Signup exists but safety check not completed');
      console.log('\n📋 REQUIRED ACTIONS:');
      console.log('1. Complete safety check (safety-check.html)');
      console.log('2. Then submit incident report\n');
    } else if (hasSafetyCheck) {
      console.log('✅ ALL CHECKS PASSED');
      console.log('\nUser is ready to submit incident report!\n');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

checkUserStatus().catch(console.error);
