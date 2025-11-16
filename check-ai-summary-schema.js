const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== CHECKING ai_summary TABLE SCHEMA ===\n');
  
  const { data, error } = await supabase
    .from('ai_summary')
    .select('*')
    .limit(1);
    
  if (error) {
    console.log(`❌ Error querying table: ${error.message}`);
  } else if (data && data.length > 0) {
    console.log('Table columns:');
    Object.keys(data[0]).forEach(col => console.log(`  - ${col}`));
  } else {
    console.log('⚠️  No records found, cannot determine schema');
    console.log('Attempting to get table info from incident_reports instead...');
    
    const { data: incident } = await supabase
      .from('incident_reports')
      .select('id, create_user_id, ai_summary_of_data_collected')
      .limit(1)
      .single();
      
    if (incident) {
      console.log('\nFound fallback field in incident_reports:');
      console.log('  - ai_summary_of_data_collected (TEXT column)');
    }
  }
})();
