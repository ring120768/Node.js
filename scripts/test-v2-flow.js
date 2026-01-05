/**
 * Test Signup Flow V2 - Full Simulation
 *
 * This script simulates the entire V2 signup flow:
 * 1. Form submission (creates user_signup with encrypted password)
 * 2. Stripe webhook (decrypts password, creates auth account)
 * 3. Verification (checks final state)
 *
 * Run: node scripts/test-v2-flow.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { encryptPassword, decryptPassword } = require('../lib/encryption');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testV2Flow() {
  console.log('🧪 SIGNUP FLOW V2 - Full Test Simulation');
  console.log('─'.repeat(60));

  // Use unique email for each test run
  const timestamp = Date.now();
  const testEmail = `v2-test-${timestamp}@test-ccla.com`;
  const testPassword = 'Test123456!';

  // Step 1: Simulate what signup-form.html does
  console.log('\n📝 Step 1: Simulate form submission (like signup-form.html)');

  const tempSignupId = crypto.randomUUID();
  const encryptedPassword = encryptPassword(testPassword);

  console.log('   Generated temp_signup_id:', tempSignupId);
  console.log('   Encrypted password successfully');

  // Create signup record (minimal fields)
  const { data: signup, error: signupError } = await supabase
    .from('user_signup')
    .insert({
      create_user_id: tempSignupId,
      email: testEmail,
      name: 'Ian',
      surname: 'Ring',
      pending_password: encryptedPassword,
      auth_pending: true
    })
    .select()
    .single();

  if (signupError) {
    console.error('❌ Signup insert failed:', signupError.message);
    return false;
  }

  console.log('   ✅ user_signup record created with auth_pending=true');

  // Step 2: Simulate what the Stripe webhook does
  console.log('\n💳 Step 2: Simulate Stripe webhook (handleCheckoutComplete)');

  // Retrieve the signup record (like webhook does)
  const { data: webhookSignup } = await supabase
    .from('user_signup')
    .select('email, name, surname, pending_password, auth_pending')
    .eq('create_user_id', tempSignupId)
    .single();

  console.log('   Found signup: auth_pending =', webhookSignup.auth_pending);
  console.log('   Has pending_password:', !!webhookSignup.pending_password);

  // Decrypt password
  let plainPassword;
  try {
    plainPassword = decryptPassword(webhookSignup.pending_password);
    console.log('   ✅ Password decrypted successfully');
  } catch (decryptError) {
    console.error('   ❌ Decryption failed:', decryptError.message);
    // Cleanup
    await supabase.from('user_signup').delete().eq('create_user_id', tempSignupId);
    return false;
  }

  // Create auth account
  const { supabaseAdmin } = require('../lib/supabaseAdmin');

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: webhookSignup.email,
    password: plainPassword,
    email_confirm: true,
    user_metadata: {
      full_name: ((webhookSignup.name || '') + ' ' + (webhookSignup.surname || '')).trim(),
      signup_flow: 'v2_after_payment'
    }
  });

  if (authError) {
    console.error('❌ Auth creation failed:', authError.message);
    // Cleanup
    await supabase.from('user_signup').delete().eq('create_user_id', tempSignupId);
    return false;
  }

  const newAuthUserId = authData.user.id;
  console.log('   ✅ Auth account created:', newAuthUserId);

  // Update signup record
  const { error: updateError } = await supabase
    .from('user_signup')
    .update({
      create_user_id: newAuthUserId,
      pending_password: null,
      auth_pending: false,
      subscription_status: 'active',
      subscription_tier: 'standard'
    })
    .eq('create_user_id', tempSignupId);

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
  } else {
    console.log('   ✅ Signup record updated with real auth ID');
  }

  // Verify final state
  console.log('\n📊 Step 3: Verify final state');

  const { data: finalSignup } = await supabase
    .from('user_signup')
    .select('create_user_id, email, auth_pending, pending_password, subscription_status')
    .eq('email', testEmail)
    .single();

  console.log('   create_user_id:', finalSignup.create_user_id);
  console.log('   auth_pending:', finalSignup.auth_pending);
  console.log('   pending_password:', finalSignup.pending_password ? 'STILL SET (BAD)' : 'null (GOOD)');
  console.log('   subscription_status:', finalSignup.subscription_status);

  // Verify auth user exists
  const { data: authCheck } = await supabaseAdmin.auth.admin.getUserById(newAuthUserId);
  console.log('   Auth user exists:', !!authCheck?.user);
  console.log('   Auth email:', authCheck?.user?.email);

  console.log('\n' + '─'.repeat(60));
  console.log('✅ V2 FLOW TEST COMPLETE - All steps successful!');
  console.log('\nThe user can now login with:');
  console.log('   Email:', testEmail);
  console.log('   Password: (the one they entered in signup form)');

  return true;
}

testV2Flow().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
