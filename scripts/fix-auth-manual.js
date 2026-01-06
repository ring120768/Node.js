/**
 * Manual fix for V2 signup where auth account wasn't created
 *
 * Run: node scripts/fix-auth-manual.js ian.ring@sky.com
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { decryptPassword } = require('../lib/encryption');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/fix-auth-manual.js <email>');
  process.exit(1);
}

async function fixAuth() {
  console.log('🔧 Manual Auth Fix for:', email);
  console.log('─'.repeat(50));

  // Get the signup record
  const { data: signup, error } = await supabase
    .from('user_signup')
    .select('email, create_user_id, name, surname, pending_password, auth_pending')
    .eq('email', email)
    .single();

  if (error) {
    console.error('❌ Error getting signup:', error.message);
    return false;
  }

  if (!signup) {
    console.error('❌ No signup record found for:', email);
    return false;
  }

  console.log('📋 Found signup record:');
  console.log('   Temp ID:', signup.create_user_id);
  console.log('   auth_pending:', signup.auth_pending);
  console.log('   Has password:', signup.pending_password ? 'YES' : 'NO');

  if (!signup.auth_pending) {
    console.log('\n⚠️  auth_pending is false - auth may already exist');
    // Check if auth user exists
    const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserById(signup.create_user_id);
    if (existingAuth?.user) {
      console.log('✅ Auth user already exists:', existingAuth.user.email);
      return true;
    }
  }

  if (!signup.pending_password) {
    console.error('❌ No pending_password stored - cannot create auth account');
    console.log('   User will need to use password reset flow');
    return false;
  }

  // Try to decrypt password
  let plainPassword;
  try {
    plainPassword = decryptPassword(signup.pending_password);
    console.log('\n✅ Password decrypted successfully');
  } catch (decryptError) {
    console.error('\n❌ Decryption FAILED:', decryptError.message);
    console.log('   This usually means SIGNUP_ENCRYPTION_KEY is different');
    return false;
  }

  // Create auth account
  console.log('\n🔐 Creating auth account...');
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: signup.email,
    password: plainPassword,
    email_confirm: true,
    user_metadata: {
      full_name: ((signup.name || '') + ' ' + (signup.surname || '')).trim(),
      signup_flow: 'v2_manual_fix'
    }
  });

  if (authError) {
    console.error('❌ Auth creation FAILED:', authError.message);
    return false;
  }

  const newAuthUserId = authData.user.id;
  console.log('✅ Auth account created:', newAuthUserId);

  // Update signup record
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
  console.log('\nUser can now log in with:');
  console.log('   Email:', signup.email);
  console.log('   Password: (the one they entered during signup)');

  return true;
}

fixAuth().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
