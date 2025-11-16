const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFieldValues() {
  console.log('\n🔍 Checking field values for test user...\n');

  const userId = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

  const { data, error } = await supabase
    .from('incident_reports')
    .select(`
      six_point_safety_check_completed,
      dusk,
      usual_vehicle,
      vehicle_driveable,
      describe_damage_to_vehicle,
      describle_the_damage,
      impact_point_undercarriage
    `)
    .eq('create_user_id', userId)
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data) {
    console.log('❌ No data found for user:', userId);
    return;
  }

  console.log('Database values:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`six_point_safety_check_completed: "${data.six_point_safety_check_completed}"`);
  console.log(`dusk: "${data.dusk}"`);
  console.log(`usual_vehicle: "${data.usual_vehicle}"`);
  console.log(`vehicle_driveable: "${data.vehicle_driveable}"`);
  console.log(`describe_damage_to_vehicle: "${data.describe_damage_to_vehicle}"`);
  console.log(`describle_the_damage: "${data.describle_the_damage}"`);
  console.log(`impact_point_undercarriage: "${data.impact_point_undercarriage}"`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check other vehicles table
  console.log('🚗 Checking other vehicles table...\n');
  const { data: vehicles, error: vError } = await supabase
    .from('incident_other_vehicles')
    .select('damage_description')
    .eq('create_user_id', userId)
    .order('vehicle_index', { ascending: true });

  if (vehicles && vehicles.length > 0) {
    vehicles.forEach((v, i) => {
      console.log(`Vehicle ${i + 1} damage_description: "${v.damage_description}"`);
    });
  } else {
    console.log('No other vehicles data found');
  }
}

checkFieldValues().catch(console.error);
