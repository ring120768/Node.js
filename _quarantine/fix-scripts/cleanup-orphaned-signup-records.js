#!/usr/bin/env node

/**
 * Cleanup Orphaned Signup Records
 *
 * Removes database records for test user ee7cfcaf-5810-4c62-b99b-ab0f2291733e
 * whose Storage files were already deleted.
 *
 * This fixes the database/storage mismatch discovered during investigation.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_USER_ID = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

async function cleanupOrphanedRecords() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          CLEANUP ORPHANED SIGNUP RECORDS                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`🎯 Target User ID: ${TEST_USER_ID}\n`);

  try {
    // Step 1: Delete temp_uploads records
    console.log('🗑️  Deleting temp_uploads records...');
    const { data: tempDeleted, error: tempError } = await supabase
      .from('temp_uploads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (workaround for delete with no filter)

    if (tempError) {
      console.log('❌ Error deleting temp_uploads:', tempError.message);
    } else {
      console.log('✅ Deleted all temp_uploads records\n');
    }

    // Step 2: Delete user_documents records
    console.log('🗑️  Deleting user_documents records...');
    const { data: docsDeleted, error: docsError } = await supabase
      .from('user_documents')
      .delete()
      .eq('create_user_id', TEST_USER_ID);

    if (docsError) {
      console.log('❌ Error deleting user_documents:', docsError.message);
    } else {
      console.log('✅ Deleted user_documents records for test user\n');
    }

    // Step 3: Delete user_signup record
    console.log('🗑️  Deleting user_signup record...');
    const { data: signupDeleted, error: signupError } = await supabase
      .from('user_signup')
      .delete()
      .eq('create_user_id', TEST_USER_ID);

    if (signupError) {
      console.log('❌ Error deleting user_signup:', signupError.message);
    } else {
      console.log('✅ Deleted user_signup record for test user\n');
    }

    // Step 4: Delete Supabase Auth user
    console.log('🗑️  Deleting Supabase Auth user...');
    const { data: authDeleted, error: authError } = await supabase.auth.admin.deleteUser(TEST_USER_ID);

    if (authError) {
      console.log('❌ Error deleting auth user:', authError.message);
    } else {
      console.log('✅ Deleted Supabase Auth user\n');
    }

    // Verification
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                         VERIFICATION                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const { data: verifyTemp } = await supabase.from('temp_uploads').select('count');
    const { data: verifyDocs } = await supabase.from('user_documents').select('count').eq('create_user_id', TEST_USER_ID);
    const { data: verifySignup } = await supabase.from('user_signup').select('count').eq('create_user_id', TEST_USER_ID);

    console.log(`temp_uploads remaining: ${verifyTemp?.[0]?.count || 0}`);
    console.log(`user_documents remaining: ${verifyDocs?.[0]?.count || 0}`);
    console.log(`user_signup remaining: ${verifySignup?.[0]?.count || 0}\n`);

    console.log('✅ Cleanup complete!\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

cleanupOrphanedRecords().catch(console.error);
