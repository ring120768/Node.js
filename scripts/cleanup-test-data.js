/**
 * Cleanup Test Data Script
 *
 * Removes test signup records and related data for fresh testing.
 * Run: node scripts/cleanup-test-data.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_EMAIL = 'ian.ring@sky.com';

async function cleanup() {
  console.log('🧹 Cleaning up test data for:', TEST_EMAIL);
  console.log('─'.repeat(60));

  // 1. Get the user_signup record
  const { data: signup, error: signupError } = await supabase
    .from('user_signup')
    .select('create_user_id, email, auth_pending, subscription_status')
    .eq('email', TEST_EMAIL)
    .single();

  if (signupError || !signup) {
    console.log('No signup record found for', TEST_EMAIL);
    return;
  }

  const userId = signup.create_user_id;
  console.log('Found signup record:');
  console.log('  - create_user_id:', userId);
  console.log('  - auth_pending:', signup.auth_pending);
  console.log('  - subscription_status:', signup.subscription_status);

  // 2. Delete user_documents
  const { data: deletedDocs, error: docsError } = await supabase
    .from('user_documents')
    .delete()
    .eq('create_user_id', userId)
    .select('id');

  console.log('\n📄 Deleted user_documents:', deletedDocs?.length || 0, docsError?.message || '');

  // 3. Delete DVLA records
  const { data: deletedDvla, error: dvlaError } = await supabase
    .from('dvla_vehicle_info_new')
    .delete()
    .eq('create_user_id', userId)
    .select('id');

  console.log('🚗 Deleted dvla_vehicle_info_new:', deletedDvla?.length || 0, dvlaError?.message || '');

  // 4. Delete user_signup record
  const { data: deletedSignup, error: signupDelError } = await supabase
    .from('user_signup')
    .delete()
    .eq('email', TEST_EMAIL)
    .select('id');

  console.log('👤 Deleted user_signup:', deletedSignup?.length || 0, signupDelError?.message || '');

  // 5. Delete auth user if exists
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const matchingAuth = authUsers?.users?.filter(u => u.email === TEST_EMAIL);

    if (matchingAuth && matchingAuth.length > 0) {
      for (const authUser of matchingAuth) {
        const { error: authDelError } = await supabase.auth.admin.deleteUser(authUser.id);
        if (authDelError) {
          console.log('⚠️  Failed to delete auth user:', authUser.id, authDelError.message);
        } else {
          console.log('🔐 Deleted auth user:', authUser.id);
        }
      }
    } else {
      console.log('🔐 No auth users found for this email');
    }
  } catch (authError) {
    console.log('⚠️  Auth cleanup error:', authError.message);
  }

  console.log('\n─'.repeat(60));
  console.log('✅ Cleanup complete! Ready for fresh test.');
}

cleanup().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
