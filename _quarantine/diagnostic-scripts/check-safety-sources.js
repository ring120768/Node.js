require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSafetySources() {
  const userId = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';

  console.log('🔍 Checking safety data sources...\n');

  // Check user_signup table
  const { data: signup } = await supabase
    .from('user_signup')
    .select('safety_status, safety_status_timestamp')
    .eq('create_user_id', userId)
    .single();

  console.log('📋 USER_SIGNUP table:');
  console.log('  safety_status:', signup?.safety_status);
  console.log('  safety_status_timestamp:', signup?.safety_status_timestamp);

  // Check incident_reports table
  const { data: incident } = await supabase
    .from('incident_reports')
    .select('are_you_safe_and_ready_to_complete_this_form, six_point_safety_check_completed')
    .eq('create_user_id', userId)
    .single();

  console.log('\n📋 INCIDENT_REPORTS table:');
  console.log('  are_you_safe_and_ready_to_complete_this_form:', incident?.are_you_safe_and_ready_to_complete_this_form);
  console.log('  six_point_safety_check_completed:', incident?.six_point_safety_check_completed);

  console.log('\n💡 Recommendation:');
  if (incident?.are_you_safe_and_ready_to_complete_this_form) {
    console.log('  ✅ incident_reports has safety data - use that (already mapped)');
  } else if (signup?.safety_status) {
    console.log('  ⚠️  Only user_signup has safety data - should add fallback mapping');
  }
}

checkSafetySources().catch(console.error);
