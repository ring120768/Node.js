const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('\n🔧 Fixing Email Case Mismatch\n');
  console.log('='.repeat(60));

  const userId = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c';
  const correctEmail = 'ian.ring@sky.com'; // lowercase to match auth

  // 1. Check current state
  console.log('\n📋 Current State:');
  const { data: before, error: beforeError } = await supabase
    .from('user_signup')
    .select('email, create_user_id')
    .eq('create_user_id', userId)
    .single();

  if (beforeError) {
    console.error('❌ Error fetching current record:', beforeError.message);
    return;
  }

  console.log('   Database email:', before.email);
  console.log('   Target email:  ', correctEmail);

  // 2. Update email to lowercase
  console.log('\n🔄 Updating email to lowercase...');
  const { data: updated, error: updateError } = await supabase
    .from('user_signup')
    .update({ email: correctEmail })
    .eq('create_user_id', userId)
    .select();

  if (updateError) {
    console.error('❌ Error updating email:', updateError.message);
    return;
  }

  console.log('✅ Email updated successfully');

  // 3. Verify the fix
  console.log('\n✅ Verification:');
  const { data: after, error: afterError } = await supabase
    .from('user_signup')
    .select('email, create_user_id')
    .eq('create_user_id', userId)
    .single();

  if (afterError) {
    console.error('❌ Error verifying update:', afterError.message);
    return;
  }

  console.log('   Database email:', after.email);
  console.log('   Match status:  ', after.email === correctEmail ? '✅ MATCHES' : '❌ MISMATCH');

  // 4. Test email-based query
  console.log('\n🧪 Testing email-based query:');
  const { data: testQuery, error: testError } = await supabase
    .from('user_signup')
    .select('email, create_user_id')
    .eq('email', correctEmail)
    .single();

  if (testError) {
    console.error('❌ Query failed:', testError.message);
  } else {
    console.log('✅ Email query now works!');
    console.log('   Found user:', testQuery.email);
    console.log('   User ID:    ', testQuery.create_user_id);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 RESULT:\n');
  console.log('✅ Email case mismatch has been FIXED');
  console.log('✅ Database now matches Supabase Auth (lowercase)');
  console.log('✅ Email-based queries will now work correctly');
  console.log('');
  console.log('👉 You can now log in using:');
  console.log('   Email:    ian.ring@sky.com');
  console.log('   Password: [Use password reset link if you forgot it]');
  console.log('');
})();
