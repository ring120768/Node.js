require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🔍 Checking table structure...\n');

  // Check if incident_witnesses table exists
  const { data: witnesses, error: witnessError } = await supabase
    .from('incident_witnesses')
    .select('id')
    .limit(1);

  console.log('incident_witnesses table:', witnessError ? '❌ DOES NOT EXIST' : '✅ EXISTS');
  if (witnessError) console.log('   Error:', witnessError.message);

  // Check if incident_other_vehicles table exists
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('incident_other_vehicles')
    .select('id')
    .limit(1);

  console.log('incident_other_vehicles table:', vehiclesError ? '❌ DOES NOT EXIST' : '✅ EXISTS');
  if (vehiclesError) console.log('   Error:', vehiclesError.message);

  // Check witness fields in incident_reports
  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .select('witness_name, witness_mobile_number, witness_email_address, witness_statement, witnesses_present')
    .eq('create_user_id', 'adeedf9d-fe8e-43c9-80d1-30db3c226522')
    .limit(1)
    .single();

  console.log('\n✅ Witness fields in incident_reports table');
  if (!incidentError && incident) {
    const witnessFields = Object.entries(incident).filter(([k,v]) => v !== null && v !== undefined);
    console.log('   Found', witnessFields.length, 'witness fields with data:');
    witnessFields.forEach(([key, value]) => {
      const displayValue = typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value;
      console.log(`   - ${key}: ${displayValue}`);
    });
  }
}

checkTables().catch(console.error);
