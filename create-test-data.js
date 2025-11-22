require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestData() {
  console.log('🔨 Creating comprehensive test data...\n');

  // 1. Delete existing test data first
  const testUserId = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

  console.log('🧹 Cleaning up existing test data...');
  await supabase.from('incident_witnesses').delete().eq('create_user_id', testUserId);
  await supabase.from('incident_other_vehicles').delete().eq('create_user_id', testUserId);
  await supabase.from('incident_reports').delete().eq('create_user_id', testUserId);
  await supabase.from('user_signup').delete().eq('create_user_id', testUserId);
  console.log('✅ Cleanup complete\n');

  const userData = {
    create_user_id: testUserId,
    email: 'test@carcrashlaw.uk',
    name: 'John',
    surname: 'Smith',
    mobile: '+447700900123',
    street_address: '123 High Street',
    town: 'London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
    driving_license_number: 'SMITH751110JD9IJ',
    date_of_birth: '1975-11-10',  // Maps to driver_dob PDF field
    car_registration_number: 'AB12CDE',
    insurance_company: 'Direct Line',
    policy_number: 'DL123456789',
    gdpr_consent: true,
    created_at: new Date().toISOString()
  };

  const { data: user, error: userError } = await supabase
    .from('user_signup')
    .insert([userData])
    .select()
    .single();

  if (userError) {
    console.log('❌ Error creating user:', userError.message);
    return;
  }

  console.log('✅ Created user:', user.email);

  // 2. Create incident report with ALL new fields
  const incidentData = {
    create_user_id: testUserId,

    // Basic incident info
    when_did_the_accident_happen: '2025-11-01',
    what_time_did_the_accident_happen: '14:30',
    where_exactly_did_this_happen: 'High Street, London SW1A 1AA',

    // NEW: Medical fields
    ambulance_called: true,
    hospital_name: 'St Thomas\' Hospital',
    injury_severity: 'Minor whiplash',
    treatment_received: 'Neck brace and painkillers',
    medical_follow_up_needed: 'Physiotherapy appointment booked for next week',

    // Weather conditions (existing + 7 new)
    clear_and_dry: true,
    bright_daylight: true,
    weather_drizzle: false,
    weather_raining: false,
    weather_hail: false,
    weather_windy: false,
    weather_thunder: false,
    weather_slush_road: false,
    weather_loose_surface: false,

    // NEW: Traffic conditions (mutually exclusive)
    traffic_heavy: false,
    traffic_moderate: true,
    traffic_light: false,
    traffic_none: false,

    // NEW: Road markings (mutually exclusive)
    road_markings_yes: true,
    road_markings_partial: false,
    road_markings_no: false,

    // NEW: Visibility (mutually exclusive)
    visibility_good: true,
    visibility_poor: false,
    visibility_very_poor: false,

    // NEW: DVLA lookup results (your vehicle)
    dvla_lookup_reg: 'AB12CDE',
    dvla_vehicle_make: 'Ford',
    dvla_vehicle_model: 'Focus 1.0 EcoBoost',
    dvla_vehicle_color: 'Blue',
    dvla_vehicle_year: 2020,
    dvla_vehicle_fuel_type: 'Petrol',
    dvla_mot_status: 'Valid',
    dvla_mot_expiry_date: '2026-03-15',
    dvla_tax_status: 'Taxed',
    dvla_tax_due_date: '2026-01-01',

    created_at: new Date().toISOString()
  };

  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .insert([incidentData])
    .select()
    .single();

  if (incidentError) {
    console.log('❌ Error creating incident:', incidentError.message);
    return;
  }

  console.log('✅ Created incident report');

  // 3. Create other vehicle with NEW insurance and DVLA fields
  const otherVehicleData = {
    incident_id: incident.id,
    create_user_id: testUserId,

    // Driver info
    driver_name: 'Jane Doe',
    driver_mobile: '+447700900456',
    driver_email: 'jane.doe@email.com',
    driver_license_number: 'DOE851205JA7BC',

    // Vehicle details
    vehicle_make: 'Vauxhall',
    vehicle_model: 'Astra',
    vehicle_license_plate: 'XY98ZAB',
    vehicle_year: 2018,
    vehicle_colour: 'Silver',
    vehicle_fuel_type: 'Diesel',

    // NEW: DVLA status fields
    dvla_mot_status: 'Valid',
    dvla_mot_expiry_date: '2025-12-20',
    dvla_tax_status: 'Taxed',
    dvla_tax_due_date: '2025-11-30',
    dvla_insurance_status: 'Insured',
    dvla_export_marker: 'No',

    // NEW: Insurance fields
    insurance_company: 'Admiral',
    insurance_policy_number: 'ADM987654321',
    insurance_policy_holder: 'Jane Doe',

    // Damage
    no_visible_damage: false,
    describe_damage: 'Front bumper dented, headlight cracked',

    created_at: new Date().toISOString()
  };

  const { data: vehicle, error: vehicleError } = await supabase
    .from('incident_other_vehicles')
    .insert([otherVehicleData])
    .select()
    .single();

  if (vehicleError) {
    console.log('❌ Error creating other vehicle:', vehicleError.message);
    return;
  }

  console.log('✅ Created other vehicle');

  // 4. Create witnesses (with NEW witness 2 fields)
  const witness1Data = {
    incident_id: incident.id,
    create_user_id: testUserId,
    witness_name: 'Bob Johnson',
    witness_mobile: '+447700900789',
    witness_email: 'bob.johnson@email.com',
    witness_statement: 'I saw the whole thing. The car behind failed to stop in time and hit the car in front.',
    created_at: new Date().toISOString()
  };

  const witness2Data = {
    incident_id: incident.id,
    create_user_id: testUserId,

    // NEW: Witness 2 fields (different naming convention)
    witness_2_name: 'Sarah Williams',
    witness_2_mobile: '+447700900321',
    witness_2_email: 'sarah.williams@email.com',
    witness_2_statement: 'I was crossing the road when it happened. The traffic light was red and the car didn\'t brake.',

    created_at: new Date().toISOString()
  };

  const { error: witness1Error } = await supabase
    .from('incident_witnesses')
    .insert([witness1Data]);

  const { error: witness2Error } = await supabase
    .from('incident_witnesses')
    .insert([witness2Data]);

  if (witness1Error || witness2Error) {
    console.log('❌ Error creating witnesses:', witness1Error?.message || witness2Error?.message);
    return;
  }

  console.log('✅ Created 2 witnesses');

  // Summary
  console.log('\n========================================');
  console.log('✅ TEST DATA CREATED SUCCESSFULLY');
  console.log('========================================\n');
  console.log(`User ID: ${testUserId}`);
  console.log(`Email: ${user.email}`);
  console.log(`Name: ${user.name} ${user.surname}`);
  console.log(`\n📊 Data created:`);
  console.log(`   ✅ User signup`);
  console.log(`   ✅ Incident report (with 51 new fields)`);
  console.log(`   ✅ Other vehicle (with DVLA + insurance fields)`);
  console.log(`   ✅ 2 Witnesses (including witness_2_* fields)`);
  console.log(`\n📄 Ready to test PDF generation:`);
  console.log(`   node test-form-filling.js ${testUserId}`);
  console.log('');
}

createTestData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
