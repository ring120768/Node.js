/**
 * Fix Safety Status
 * Sets are_you_safe = TRUE for the correct user
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSafetyStatus() {
  const correctUUID = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';

  console.log('🔧 Updating safety status...\n');

  const { data, error } = await supabase
    .from('user_signup')
    .update({
      are_you_safe: true,
      safety_status: "Yes, I'm safe and can complete this form",
      safety_status_timestamp: new Date().toISOString()
    })
    .eq('create_user_id', correctUUID)
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ Safety status updated successfully!');
  console.log('   Email:', data[0].email);
  console.log('   UUID:', data[0].create_user_id);
  console.log('   are_you_safe:', data[0].are_you_safe);
  console.log('   safety_status:', data[0].safety_status);
  console.log('\n✅ User can now submit incident reports!');
}

fixSafetyStatus();
