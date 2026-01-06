/**
 * Create auth account with temporary password
 * For users where decryption failed due to key mismatch
 *
 * Run: node scripts/create-auth-temp.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const email = 'ian.ring@sky.com';
const tempPassword = 'TempPass123!';

async function createAuthAccount() {
  console.log('🔧 Creating Auth Account for:', email);
  console.log('─'.repeat(50));

  // Get the signup record
  const { data: signup, error } = await supabase
    .from('user_signup')
    .select('email, create_user_id, name, surname, auth_pending')
    .eq('email', email)
    .single();

  if (error || !signup) {
    console.error('❌ Error getting signup:', error?.message || 'No record found');
    return false;
  }

  console.log('📋 Found signup record:');
  console.log('   Temp ID:', signup.create_user_id);
  console.log('   auth_pending:', signup.auth_pending);

  // Check if auth user already exists
  const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserById(signup.create_user_id);
  if (existingAuth?.user) {
    console.log('✅ Auth user already exists:', existingAuth.user.email);
    return true;
  }

  // Create auth account with temporary password
  console.log('\n🔐 Creating auth account with temporary password...');
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: signup.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: ((signup.name || '') + ' ' + (signup.surname || '')).trim(),
      signup_flow: 'v2_manual_fix_temp_password'
    }
  });

  if (authError) {
    console.error('❌ Auth creation FAILED:', authError.message);
    return false;
  }

  const newAuthUserId = authData.user.id;
  console.log('✅ Auth account created:', newAuthUserId);

  // Update signup record with real auth user ID
  const tempId = signup.create_user_id;
  const { error: updateError } = await supabase
    .from('user_signup')
    .update({
      create_user_id: newAuthUserId,
      pending_password: null,
      auth_pending: false
    })
    .eq('create_user_id', tempId);

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    return false;
  }

  console.log('✅ Signup record updated');

  // Update related tables
  await supabase
    .from('user_documents')
    .update({ create_user_id: newAuthUserId })
    .eq('create_user_id', tempId);

  await supabase
    .from('dvla_vehicle_info_new')
    .update({ create_user_id: newAuthUserId })
    .eq('create_user_id', tempId);

  console.log('\n' + '─'.repeat(50));
  console.log('✅ FIX COMPLETE!');
  console.log('\n⚠️  IMPORTANT: User needs to reset their password!');
  console.log('   They can log in with:');
  console.log('   Email:', email);
  console.log('   Temp Password:', tempPassword);
  console.log('\n   Or use "Forgot Password" to set their own password.');

  return true;
}

createAuthAccount().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
