/**
 * Cleanup V2 Test Data
 *
 * Removes test users created during V2 signup flow testing:
 * - Deletes from auth.users (via admin API)
 * - Deletes from user_signup table
 *
 * Run: node scripts/cleanup-v2-test-data.js
 */

require('dotenv').config();
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanupV2TestData() {
  console.log('🧹 V2 Test Data Cleanup');
  console.log('─'.repeat(60));

  // Step 1: Find V2 test users in user_signup
  console.log('\n📊 Finding V2 test users in user_signup...');
  const { data: testSignups, error: signupError } = await supabase
    .from('user_signup')
    .select('create_user_id, email, name, surname, auth_pending, subscription_status, created_at')
    .like('email', 'v2-test-%@test-ccla.com')
    .order('created_at', { ascending: false });

  if (signupError) {
    console.error('❌ Error fetching test signups:', signupError.message);
    return false;
  }

  console.log(`   Found ${testSignups.length} V2 test record(s) in user_signup`);

  if (testSignups.length === 0) {
    console.log('\n✅ No V2 test data to clean up!');
    return true;
  }

  // Display what we're about to delete
  console.log('\n📋 Records to delete:');
  testSignups.forEach((signup, i) => {
    console.log(`   ${i + 1}. ${signup.email}`);
    console.log(`      - create_user_id: ${signup.create_user_id}`);
    console.log(`      - auth_pending: ${signup.auth_pending}`);
    console.log(`      - created_at: ${signup.created_at}`);
  });

  // Step 2: Delete auth users (only for completed signups where auth_pending=false)
  console.log('\n🗑️  Deleting auth accounts...');
  const completedSignups = testSignups.filter(s => !s.auth_pending);

  for (const signup of completedSignups) {
    try {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(signup.create_user_id);
      if (authDeleteError) {
        console.log(`   ⚠️  Could not delete auth user ${signup.email}: ${authDeleteError.message}`);
      } else {
        console.log(`   ✅ Deleted auth user: ${signup.email}`);
      }
    } catch (err) {
      console.log(`   ⚠️  Error deleting auth user ${signup.email}: ${err.message}`);
    }
  }

  // Step 3: Delete user_signup records
  console.log('\n🗑️  Deleting user_signup records...');
  const { error: deleteError, count } = await supabase
    .from('user_signup')
    .delete()
    .like('email', 'v2-test-%@test-ccla.com');

  if (deleteError) {
    console.error('❌ Error deleting user_signup records:', deleteError.message);
    return false;
  }

  console.log(`   ✅ Deleted ${testSignups.length} user_signup record(s)`);

  // Step 4: Verify cleanup
  console.log('\n📊 Verifying cleanup...');
  const { data: remaining } = await supabase
    .from('user_signup')
    .select('email')
    .like('email', 'v2-test-%@test-ccla.com');

  if (remaining && remaining.length > 0) {
    console.log(`   ⚠️  ${remaining.length} records still remain`);
  } else {
    console.log('   ✅ All V2 test data cleaned up successfully!');
  }

  console.log('\n' + '─'.repeat(60));
  console.log('🧹 Cleanup complete!');

  return true;
}

cleanupV2TestData().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
