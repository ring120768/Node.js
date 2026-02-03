require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSarah() {
  console.log('🔍 Investigating Sarah Gilbert authentication issue\n');
  console.log('═══════════════════════════════════════════════════\n');

  // Find Sarah's record
  const { data: user, error } = await supabase
    .from('user_signup')
    .select('create_user_id, email, name, pending_password, created_at')
    .eq('email', 'sarahlgilbert70@gmail.com')
    .single();

  if (error) {
    console.error('❌ Database record not found:', error.message);
    return;
  }

  console.log('✅ STEP 1: Database Record (user_signup table)');
  console.log('   User ID:', user.create_user_id);
  console.log('   Email:', user.email);
  console.log('   Name:', user.name || 'Not set');
  console.log('   Has password (encrypted):', user.pending_password ? 'YES' : 'NO');
  console.log('   Created:', user.created_at);
  console.log('');

  // Check if Auth account exists
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error checking auth:', authError.message);
    return;
  }

  const sarahAuth = authData.users.find(u => u.email === 'sarahlgilbert70@gmail.com');

  if (sarahAuth) {
    console.log('✅ STEP 2: Supabase Auth Account');
    console.log('   Status: EXISTS ✓');
    console.log('   Auth ID:', sarahAuth.id);
    console.log('   Created:', sarahAuth.created_at);
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ DIAGNOSIS: USER CAN LOG IN');
    console.log('   Auth account exists and is active');
    console.log('   Login should work at /login.html');
    console.log('═══════════════════════════════════════════════════');
  } else {
    console.log('❌ STEP 2: Supabase Auth Account');
    console.log('   Status: DOES NOT EXIST');
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 ROOT CAUSE: V2 Signup Flow (auth-after-payment)');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('Flow progression:');
    console.log('  1. ✅ User completed signup form (Pages 1-9)');
    console.log('  2. ✅ Data saved to user_signup table');
    console.log('  3. ✅ Password encrypted (pending_password)');
    console.log('  4. ✅ Redirected to /select-plan.html');
    console.log('  5. ⏸️  Payment NOT completed');
    console.log('  6. ❌ Stripe webhook never fired');
    console.log('  7. ❌ Auth account not created');
    console.log('');
    console.log('🔧 SOLUTIONS:');
    console.log('───────────────────────────────────────────────────');
    console.log('A) Complete payment (production flow):');
    console.log('   → URL: http://localhost:3000/select-plan.html?signup_id=' + user.create_user_id + '&email=' + encodeURIComponent(user.email));
    console.log('   → Select plan → Complete Stripe checkout');
    console.log('   → Webhook creates Auth account');
    console.log('');
    console.log('B) Manual Auth creation (dev/testing only):');
    console.log('   → Run: node create-test-auth.js');
    console.log('   → Creates Auth account immediately');
    console.log('   → Use for testing only');
    console.log('═══════════════════════════════════════════════════');
  }
}

checkSarah().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
