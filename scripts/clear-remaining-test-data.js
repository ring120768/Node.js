/**
 * Clear Remaining Test Data
 * Removes temp_uploads and user_signup records
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearRemainingData() {
  console.log('🗑️  Clearing remaining test data...\n');

  // 1. Clear temp_uploads
  console.log('📦 Clearing temp_uploads...');
  const { data: tempUploads, error: tempError } = await supabase
    .from('temp_uploads')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (tempError) {
    console.error('❌ Error clearing temp_uploads:', tempError.message);
  } else {
    console.log('✅ Cleared all temp_uploads records\n');
  }

  // 2. Clear user_signup
  console.log('📦 Clearing user_signup...');
  const { data: signups, error: signupError } = await supabase
    .from('user_signup')
    .delete()
    .neq('create_user_id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (signupError) {
    console.error('❌ Error clearing user_signup:', signupError.message);
  } else {
    console.log('✅ Cleared all user_signup records\n');
  }

  // 3. Delete auth user
  console.log('📦 Deleting auth user...');
  const { data: { users } } = await supabase.auth.admin.listUsers();

  for (const user of users) {
    console.log(`   Deleting: ${user.email} (${user.id})`);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error(`   ❌ Error deleting ${user.email}:`, deleteError.message);
    } else {
      console.log(`   ✅ Deleted ${user.email}`);
    }
  }

  console.log('\n✅ All remaining test data cleared!');
}

clearRemainingData().catch(console.error);
