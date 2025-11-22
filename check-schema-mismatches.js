require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchemaMismatches() {
  const userId = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';

  const { data: incident } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  const allColumns = Object.keys(incident);

  console.log('🔍 CHECKING FOR COLUMN NAME MISMATCHES:\n');

  // Controller uses these names - check if they exist
  const controllerFields = {
    'seatbelts_worn': 'seatbelt_worn',  // plural vs singular?
    'airbags_deployed': 'airbags_deployed',
    'emergency_contact_name': 'emergency_contact_name',
    'emergency_contact_number': 'emergency_contact_number',
    'six_point_safety_check_completed': 'six_point_safety_check',
    'vehicle_driveable': 'vehicle_drivable',
  };

  Object.entries(controllerFields).forEach(([controllerName, altName]) => {
    const exactMatch = allColumns.includes(controllerName);
    const altMatch = allColumns.includes(altName);

    if (exactMatch) {
      console.log(`✅ ${controllerName}: EXISTS`);
    } else if (altMatch) {
      console.log(`⚠️  ${controllerName}: NOT FOUND, but ${altName} EXISTS`);
    } else {
      console.log(`❌ ${controllerName}: NOT FOUND (check if ${altName} exists)`);
    }
  });

  console.log('\n🔍 ACTUAL COLUMN NAMES (seatbelt/airbag related):\n');
  const relevantColumns = allColumns.filter(col => 
    col.includes('seatbelt') || 
    col.includes('airbag') ||
    col.includes('emergency_contact') ||
    col.includes('six_point') ||
    col.includes('vehicle_driv')
  );
  relevantColumns.forEach(col => console.log(`  - ${col}`));
}

checkSchemaMismatches().catch(console.error);
