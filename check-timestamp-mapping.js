require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTimestamps() {
  const userId = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';

  const { data: signup } = await supabase
    .from('user_signup')
    .select('safety_status_timestamp, created_at')
    .eq('create_user_id', userId)
    .single();

  const { data: incident } = await supabase
    .from('incident_reports')
    .select('created_at, emergency_recording_timestamp')
    .eq('create_user_id', userId)
    .single();

  console.log('📅 Available Timestamps:\n');
  console.log('USER_SIGNUP:');
  console.log('  safety_status_timestamp:', signup?.safety_status_timestamp);
  console.log('  created_at:', signup?.created_at);
  
  console.log('\nINCIDENT_REPORTS:');
  console.log('  emergency_recording_timestamp:', incident?.emergency_recording_timestamp);
  console.log('  created_at:', incident?.created_at);
  
  console.log('\n💡 Recommendation:');
  console.log('  safety_status_timestamp could map to:');
  console.log('    - time_stamp (general timestamp)');
  console.log('    - emergency_recording_timestamp (if safety-related)');
}

checkTimestamps().catch(console.error);
