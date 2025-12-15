// Check vehicle data saving for user
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = '35a7475f-60ca-4c5d-bc48-d13a299f4309';

async function checkVehicleData() {
  console.log('🔍 Checking vehicle data for user:', USER_ID);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check user's vehicle (incident_reports table)
  console.log('📋 USER VEHICLE DATA (incident_reports):');
  const { data: incidents, error: incidentError } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', USER_ID);

  const incident = incidents && incidents[0];

  if (incidentError) {
    console.error('❌ Error fetching incident:', incidentError);
  } else {
    console.log('\n🚗 DVLA Vehicle Fields:');
    console.log('  dvla_make:', incident.dvla_make);
    console.log('  dvla_model:', incident.dvla_model);
    console.log('  dvla_colour:', incident.dvla_colour);
    console.log('  dvla_year:', incident.dvla_year);
    console.log('  dvla_fuel_type:', incident.dvla_fuel_type);
    console.log('  dvla_mot_status:', incident.dvla_mot_status);
    console.log('  dvla_mot_expiry:', incident.dvla_mot_expiry);
    console.log('  dvla_tax_status:', incident.dvla_tax_status);
    console.log('  dvla_tax_due_date:', incident.dvla_tax_due_date);

    console.log('\n🔧 Manual Vehicle Fields:');
    console.log('  manual_make:', incident.manual_make);
    console.log('  manual_model:', incident.manual_model);
    console.log('  manual_colour:', incident.manual_colour);
    console.log('  manual_year:', incident.manual_year);

    console.log('\n📝 Vehicle Registration:', incident.car_registration_number);
  }

  // Check other vehicles (incident_other_vehicles table)
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 OTHER VEHICLES DATA (incident_other_vehicles):');

  const { data: otherVehicles, error: otherError } = await supabase
    .from('incident_other_vehicles')
    .select('*')
    .eq('create_user_id', USER_ID);

  if (otherError) {
    console.error('❌ Error fetching other vehicles:', otherError);
  } else if (!otherVehicles || otherVehicles.length === 0) {
    console.log('⚠️  No other vehicles found in database');
  } else {
    otherVehicles.forEach((vehicle, idx) => {
      console.log(`\n🚙 Other Vehicle ${idx + 1}:`);
      console.log('  other_vehicle_registration:', vehicle.other_vehicle_registration);

      console.log('\n  🚗 DVLA Fields:');
      console.log('    other_vehicle_look_up_make:', vehicle.other_vehicle_look_up_make);
      console.log('    other_vehicle_look_up_model:', vehicle.other_vehicle_look_up_model);
      console.log('    other_vehicle_look_up_colour:', vehicle.other_vehicle_look_up_colour);
      console.log('    other_vehicle_look_up_year:', vehicle.other_vehicle_look_up_year);
      console.log('    other_vehicle_look_up_fuel_type:', vehicle.other_vehicle_look_up_fuel_type);
      console.log('    other_vehicle_look_up_mot_status:', vehicle.other_vehicle_look_up_mot_status);
      console.log('    other_vehicle_look_up_mot_expiry_date:', vehicle.other_vehicle_look_up_mot_expiry_date);
      console.log('    other_vehicle_look_up_tax_status:', vehicle.other_vehicle_look_up_tax_status);
      console.log('    other_vehicle_look_up_tax_due_date:', vehicle.other_vehicle_look_up_tax_due_date);

      console.log('\n  🔧 Manual Override Fields:');
      console.log('    other_vehicle_manual_make:', vehicle.other_vehicle_manual_make);
      console.log('    other_vehicle_manual_model:', vehicle.other_vehicle_manual_model);
      console.log('    other_vehicle_manual_colour:', vehicle.other_vehicle_manual_colour);
      console.log('    other_vehicle_manual_year:', vehicle.other_vehicle_manual_year);
    });
  }
}

checkVehicleData();
