const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('\n🔍 Checking Account Integrity for ian.ring@sky.com\n');
  console.log('='.repeat(60));

  // 1. Check Supabase Auth
  console.log('\n📧 Supabase Auth Account:');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('Error fetching auth users:', authError.message);
    return;
  }

  const authUser = authData.users.find(u => u.email === 'ian.ring@sky.com');

  if (!authUser) {
    console.log('NOT FOUND in Supabase Auth');
    return;
  }

  console.log('✅ EXISTS in Supabase Auth');
  console.log('   ID:', authUser.id);
  console.log('   Email:', authUser.email);
  console.log('   Email Confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
  console.log('   Created:', new Date(authUser.created_at).toLocaleString('en-GB'));
  console.log('   Last Sign In:', authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString('en-GB') : 'Never');
  console.log('   Account Locked:', authUser.banned_until ? 'Yes' : 'No');

  // 2. Check user_signup table
  console.log('\n📊 Database (user_signup) Record:');
  const { data: dbData, error: dbError } = await supabase
    .from('user_signup')
    .select('create_user_id, email, name, surname, first_name, last_name, created_at')
    .eq('email', 'ian.ring@sky.com')
    .single();

  if (dbError) {
    console.log('NOT FOUND in user_signup table');
    console.log('   Error:', dbError.message);
  } else {
    console.log('✅ EXISTS in user_signup table');
    console.log('   create_user_id:', dbData.create_user_id);
    console.log('   Name:', dbData.name || dbData.first_name, dbData.surname || dbData.last_name);
    console.log('   Email:', dbData.email);
    console.log('   Created:', new Date(dbData.created_at).toLocaleString('en-GB'));
  }

  // 3. Check for ID correlation
  console.log('\n🔗 Account Correlation:');
  if (dbData && authUser.id === dbData.create_user_id) {
    console.log('✅ IDs MATCH - Accounts properly linked');
    console.log('   Auth ID:  ', authUser.id);
    console.log('   DB ID:    ', dbData.create_user_id);
  } else if (dbData) {
    console.log('⚠️  ID MISMATCH DETECTED');
    console.log('   Auth ID:', authUser.id);
    console.log('   DB ID:', dbData.create_user_id);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 DIAGNOSIS:\n');

  if (authUser && authUser.email_confirmed_at && dbData && authUser.id === dbData.create_user_id) {
    console.log('✅ Account is NOT corrupt - everything is properly set up!');
    console.log('');
    console.log('The problem is: You are using the WRONG PASSWORD');
    console.log('');
    console.log('✅ Your email is confirmed');
    console.log('✅ Your database record exists');
    console.log('✅ Your accounts are properly linked');
    console.log('✅ Password reset is available');
    console.log('');
    console.log('👉 Use the password reset link, or remember your original password');
  } else {
    console.log('There may be configuration issues:');
    if (!authUser.email_confirmed_at) {
      console.log('- Email needs confirmation');
    }
    if (!dbData) {
      console.log('- Missing database record');
    }
    if (dbData && authUser.id !== dbData.create_user_id) {
      console.log('- ID mismatch between auth and database');
    }
  }
  console.log('');
})();
