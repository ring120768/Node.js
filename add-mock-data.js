const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const userId = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

  console.log('=== Adding Mock Data to Empty Fields ===\n');

  // Update incident_reports with mock data
  const { error: incidentError } = await supabase
    .from('incident_reports')
    .update({
      describle_the_damage: 'Significant damage to front bumper, bonnet crumpled, nearside headlight smashed. Front grille broken. Damage to nearside wing panel.',
      six_point_safety_check_completed: true,
      any_witness: 'yes',
      manual_make: 'Toyota',
      manual_model: 'Corolla',
      manual_colour: 'Silver',
      manual_year: '2019',
      dvla_insurance_status: 'Insured'
    })
    .eq('create_user_id', userId);

  if (incidentError) {
    console.log('Error updating incident:', incidentError.message);
  } else {
    console.log('✅ Updated incident_reports with mock data');
  }

  // Check if other_vehicles exist
  const { data: vehicles } = await supabase
    .from('incident_other_vehicles')
    .select('*')
    .eq('create_user_id', userId);

  if (!vehicles || vehicles.length === 0) {
    // Create mock other vehicle
    const { error: vehicleError } = await supabase
      .from('incident_other_vehicles')
      .insert({
        create_user_id: userId,
        vehicle_index: 1,
        registration: 'AB21 XYZ',
        make: 'Ford',
        model: 'Focus',
        colour: 'Blue',
        year: 2021,
        damage_description: 'Rear bumper dented, offside rear light cluster broken, scratch along passenger door.',
        driver_name: 'Sarah Johnson',
        driver_address: '45 Oak Lane, Manchester, M15 4PQ',
        driver_phone: '07700 900456',
        insurance_company: 'Direct Line',
        insurance_policy: 'DL-987654321'
      });

    if (vehicleError) {
      console.log('Error creating vehicle:', vehicleError.message);
    } else {
      console.log('✅ Created mock other vehicle data');
    }
  } else {
    console.log('✅ Other vehicle data already exists (' + vehicles.length + ' vehicles)');
  }

  // Check if witnesses exist
  const { data: witnesses } = await supabase
    .from('incident_witnesses')
    .select('*')
    .eq('create_user_id', userId);

  if (!witnesses || witnesses.length === 0) {
    // Create mock witnesses
    const { error: witnessError } = await supabase
      .from('incident_witnesses')
      .insert([
        {
          create_user_id: userId,
          witness_index: 1,
          name: 'John Smith',
          address: '12 High Street, London, SW1A 1AA',
          phone: '07700 900123',
          email: 'john.smith@example.co.uk',
          statement: 'I saw the blue Ford run the red light and collide with the silver Toyota. The Toyota had right of way.'
        },
        {
          create_user_id: userId,
          witness_index: 2,
          name: 'Emma Davies',
          address: '78 Park Road, Birmingham, B15 2TU',
          phone: '07700 900789',
          email: 'emma.davies@example.co.uk',
          statement: 'I was waiting at the bus stop and witnessed the entire incident. The blue car definitely went through a red light.'
        }
      ]);

    if (witnessError) {
      console.log('Error creating witnesses:', witnessError.message);
    } else {
      console.log('✅ Created 2 mock witnesses');
    }
  } else {
    console.log('✅ Witness data already exists (' + witnesses.length + ' witnesses)');
  }

  console.log('\n=== Mock Data Added Successfully ===');
})();
