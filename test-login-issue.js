/**
 * Test script to diagnose login issues
 * Tests if user exists and validates authentication flow
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLogin() {
  const testEmail = 'ian.ring@sky.com';

  console.log('🔍 Login Diagnostics\n');
  console.log('Testing email:', testEmail);
  console.log('========================================\n');

  // 1. Check if user exists in Auth
  console.log('1. Checking Auth table...');
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError);
    return;
  }

  const user = users.users.find(u => u.email === testEmail);

  if (!user) {
    console.log('❌ User NOT FOUND in Auth');
    console.log('\n📋 All registered users:');
    users.users.forEach(u => {
      console.log(`   - ${u.email} (created: ${u.created_at})`);
    });
    console.log('\n💡 Solution: User needs to sign up first at /signup-auth.html');
    return;
  }

  console.log('✅ User exists in Auth');
  console.log('   User ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Created:', user.created_at);
  console.log('   Email confirmed:', user.email_confirmed_at ? 'YES' : 'NO');
  console.log('   Last sign in:', user.last_sign_in_at || 'Never');

  if (user.user_metadata) {
    console.log('   Metadata:', JSON.stringify(user.user_metadata, null, 2));
  }

  // 2. Check user_signup table
  console.log('\n2. Checking user_signup table...');
  const { data: signup, error: signupError } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', user.id)
    .single();

  if (signupError && signupError.code !== 'PGRST116') {
    console.error('❌ Error querying user_signup:', signupError);
  } else if (!signup) {
    console.log('⚠️  No profile in user_signup table (Auth-only user)');
    console.log('   This is OK - user can still login');
  } else {
    console.log('✅ Profile exists in user_signup');
    console.log('   Full name:', signup.full_name || 'N/A');
    console.log('   Phone:', signup.phone_number || 'N/A');
  }

  // 3. Test login attempt
  console.log('\n3. Testing login with correct password...');
  console.log('⚠️  Cannot test password from backend (security)');
  console.log('   User must test login via browser at:');
  console.log('   → http://localhost:3000/login-improved.html');

  // 4. Common issues
  console.log('\n4. Common Login Issues:');
  console.log('   a) Wrong password → User needs to reset password');
  console.log('   b) Email not confirmed → Check email_confirmed_at above');
  console.log('   c) Account disabled → Check if banned_until field is set');
  console.log('   d) Cookie issues → Check sameSite=none, secure=true');

  // 5. Reset password link
  if (user && !user.email_confirmed_at) {
    console.log('\n⚠️  EMAIL NOT CONFIRMED!');
    console.log('   User must confirm email before logging in');
    console.log('   Check spam folder or resend confirmation email');
  }

  console.log('\n========================================');
  console.log('✅ Diagnostic complete');
  console.log('\n💡 Next Steps:');
  console.log('1. Visit: http://localhost:3000/login-improved.html');
  console.log('2. Try logging in with:', testEmail);
  console.log('3. Check browser console for detailed errors');
  console.log('4. If password forgotten, use "Forgot Password" link');
}

testLogin().catch(console.error);
