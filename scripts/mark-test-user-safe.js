/**
 * Mark Test User as Safe - Emergency Fix Script
 *
 * Purpose: Unblock test user from safety check trigger to verify Pages 5, 7, 9, 10 data mapping
 *
 * Usage:
 *   node scripts/mark-test-user-safe.js
 *
 * What it does:
 *   1. Updates user_signup table for test user
 *   2. Sets are_you_safe = TRUE
 *   3. Sets safety_status to safe option
 *   4. Sets timestamp
 *
 * Date: 2025-11-11
 * Issue: P0001 error blocking incident report submission
 * See: BUG_REPORT_PAGES_5_7_9_10_NOT_SAVING.md
 */

// Load environment variables
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const logger = require('../src/utils/logger');

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const TEST_USER_ID = '9db03736-74ac-4d00-9ae2-3639b58360a3';

async function markTestUserSafe() {
  try {
    console.log('================================================================================');
    console.log('🔧 EMERGENCY FIX: Mark Test User as Safe');
    console.log('================================================================================\n');

    // 1. Check current state
    console.log('📊 Step 1: Check current safety status...\n');
    const { data: beforeData, error: beforeError } = await supabase
      .from('user_signup')
      .select('create_user_id, email, are_you_safe, safety_status, safety_status_timestamp')
      .eq('create_user_id', TEST_USER_ID)
      .single();

    if (beforeError) {
      console.error('❌ Error fetching test user:', beforeError.message);
      process.exit(1);
    }

    if (!beforeData) {
      console.error('❌ Test user not found with ID:', TEST_USER_ID);
      process.exit(1);
    }

    console.log('Current state:');
    console.log('  Email:', beforeData.email);
    console.log('  are_you_safe:', beforeData.are_you_safe);
    console.log('  safety_status:', beforeData.safety_status || '(not set)');
    console.log('  safety_status_timestamp:', beforeData.safety_status_timestamp || '(not set)');
    console.log('');

    // 2. Update to safe status
    console.log('🔄 Step 2: Updating safety status to TRUE...\n');

    const updateData = {
      are_you_safe: true,
      safety_status: 'Yes, I\'m safe and can complete this form',
      safety_status_timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: afterData, error: updateError } = await supabase
      .from('user_signup')
      .update(updateData)
      .eq('create_user_id', TEST_USER_ID)
      .select('create_user_id, email, are_you_safe, safety_status, safety_status_timestamp')
      .single();

    if (updateError) {
      console.error('❌ Error updating test user:', updateError.message);
      process.exit(1);
    }

    // 3. Verify update
    console.log('✅ SUCCESS: Test user marked as safe!\n');
    console.log('New state:');
    console.log('  Email:', afterData.email);
    console.log('  are_you_safe:', afterData.are_you_safe);
    console.log('  safety_status:', afterData.safety_status);
    console.log('  safety_status_timestamp:', afterData.safety_status_timestamp);
    console.log('');

    console.log('================================================================================');
    console.log('✅ FIX COMPLETE');
    console.log('================================================================================\n');

    console.log('📋 Next Steps:');
    console.log('  1. Login with test user credentials');
    console.log('  2. Load mock data for pages 1-12');
    console.log('  3. Submit incident form (page 12)');
    console.log('  4. Verify Pages 5, 7, 9, 10 data is saved correctly\n');

    console.log('🔗 Test User Credentials:');
    console.log(`  Email: ${afterData.email}`);
    console.log('  Password: TestPass123!\n');

    logger.info('Test user marked as safe successfully', {
      userId: TEST_USER_ID,
      email: afterData.email,
      areYouSafe: afterData.are_you_safe
    });

    process.exit(0);

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    console.error(error.stack);
    logger.error('Failed to mark test user as safe', { error: error.message });
    process.exit(1);
  }
}

// Run the fix
markTestUserSafe();
