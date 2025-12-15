require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTypes() {
  // Try to insert a test row to see what fails
  const testData = {
    create_user_id: '00000000-0000-0000-0000-000000000000',
    police_attended: true,  // boolean
    airbags_deployed: true, // boolean
    accident_date: '2025-01-01',
    accident_time: '12:00:00'
  };

  const { data, error } = await supabase
    .from('incident_reports')
    .insert([testData])
    .select();

  if (error) {
    console.log('❌ Insert failed:');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);
    console.log('   Details:', error.details);
    console.log('   Hint:', error.hint);
  } else {
    console.log('✅ Insert succeeded');
    // Clean up test row
    await supabase.from('incident_reports').delete().eq('id', data[0].id);
  }
}

checkTypes().catch(console.error);
