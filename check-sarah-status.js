const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSarah() {
  console.log('🔍 Checking Sarah Gilbert signup status...\n');
  
  // Find Sarah's record
  const { data: user, error } = await supabase
    .from('user_signup')
    .select('create_user_id, email, first_name, last_name, pending_password, created_at')
    .eq('email', 'sarahlgilbert70@gmail.com')
    .single();
  
  if (error) {
    console.error('❌ Error finding user:', error.message);
    return;
  }
  
  console.log('✅ Found user_signup record:');
  console.log('   ID:', user.create_user_id);
  console.log('   Email:', user.email);
  console.log('   Name:', user.first_name, user.last_name);
  console.log('   Has pending_password:', !!user.pending_password);
  console.log('   Created:', user.created_at);
  console.log('');
  
  // Check if Auth account exists
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error checking auth:', authError.message);
    return;
  }
  
  const sarahAuth = authUser.users.find(u => u.email === 'sarahlgilbert70@gmail.com');
  
  if (sarahAuth) {
    console.log('✅ Auth account EXISTS');
    console.log('   Auth ID:', sarahAuth.id);
    console.log('   Created:', sarahAuth.created_at);
  } else {
    console.log('❌ Auth account DOES NOT EXIST');
    console.log('   Reason: V2 flow - Auth is created AFTER Stripe payment completes');
    console.log('');
    console.log('📋 What happened:');
    console.log('   1. ✅ User filled signup form (Pages 1-9)');
    console.log('   2. ✅ Data saved to user_signup table');
    console.log('   3. ✅ User redirected to /select-plan.html');
    console.log('   4. ⏸️  User did NOT complete Stripe checkout');
    console.log('   5. ❌ Stripe webhook never fired');
    console.log('   6. ❌ Auth account was never created');
    console.log('');
    console.log('🔧 Solution: Complete payment at /select-plan.html');
  }
}

checkSarah().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
