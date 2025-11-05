require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createMinimalTestData() {
  console.log('🔨 Creating MINIMAL test data (only NEW fields from migration)...\n');

  const testUserId = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

  // Clean up
  console.log('🧹 Cleaning up...');
  await supabase.from('incident_witnesses').delete().eq('create_user_id', testUserId);
  await supabase.from('incident_other_vehicles').delete().eq('create_user_id', testUserId);
  await supabase.from('incident_reports').delete().eq('create_user_id', testUserId);
  await supabase.from('user_signup').delete().eq('create_user_id', testUserId);
  console.log('✅ Cleanup complete\n');

  // 1. User (minimal core fields only)
  const { data: user, error: userError } = await supabase
    .from('user_signup')
    .insert([{
      create_user_id: testUserId,
      email: 'test@carcrashlaw.uk',
      name: 'John',
      surname: 'Smith',
      mobile: '+447700900123',
      date_of_birth: '1975-11-10',
      gdpr_consent: true
    }])
    .select()
    .single();

  if (userError) {
    console.log('❌ Error creating user:', userError.message);
    return;
  }
  console.log('✅ Created user');

  // 2. Incident - ONLY NEW FIELDS from migration 001
  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .insert([{
      create_user_id: testUserId,

      // NEW: Medical fields
      ambulance_called: true,
      hospital_name: 'St Thomas\' Hospital',
      injury_severity: 'Minor whiplash',
      treatment_received: 'Neck brace and painkillers',
      medical_follow_up_needed: 'Physiotherapy appointment booked',

      // NEW: Weather checkboxes (can select multiple - no DB constraint)
      weather_drizzle: true,
      weather_raining: false,
      weather_hail: false,
      weather_windy: true,
      weather_thunder: false,
      weather_slush_road: false,
      weather_loose_surface: false,

      // NEW: Traffic checkboxes (DB constraint: only 1 can be true)
      traffic_heavy: false,
      traffic_moderate: true,
      traffic_light: false,
      traffic_none: false,

      // NEW: Road markings checkboxes (DB constraint: only 1 can be true)
      road_markings_yes: true,
      road_markings_partial: false,
      road_markings_no: false,

      // NEW: Visibility checkboxes (DB constraint: only 1 can be true)
      visibility_good: true,
      visibility_poor: false,
      visibility_very_poor: false,

      // NEW: DVLA lookup
      dvla_lookup_reg: 'AB12CDE',
      dvla_vehicle_make: 'Ford',
      dvla_vehicle_model: 'Focus',
      dvla_vehicle_color: 'Blue',
      dvla_vehicle_year: 2020,
      dvla_vehicle_fuel_type: 'Petrol',
      dvla_mot_status: 'Valid',
      dvla_mot_expiry_date: '2026-03-15',
      dvla_tax_status: 'Taxed',
      dvla_tax_due_date: '2026-01-01'
    }])
    .select()
    .single();

  if (incidentError) {
    console.log('❌ Error creating incident:', incidentError.message);
    return;
  }
  console.log('✅ Created incident with 51 NEW fields');

  // 3. Other vehicle - ONLY NEW FIELDS
  const { error: vehicleError } = await supabase
    .from('incident_other_vehicles')
    .insert([{
      incident_id: incident.id,
      create_user_id: testUserId,

      // Required field
      vehicle_license_plate: 'XY98ZAB',

      // NEW: DVLA fields
      dvla_mot_status: 'Valid',
      dvla_mot_expiry_date: '2025-12-20',
      dvla_tax_status: 'Taxed',
      dvla_tax_due_date: '2025-11-30',
      dvla_insurance_status: 'Insured',
      dvla_export_marker: 'No',

      // NEW: Insurance fields
      insurance_company: 'Admiral',
      insurance_policy_number: 'ADM987654321',
      insurance_policy_holder: 'Jane Doe'
    }]);

  if (vehicleError) {
    console.log('❌ Error creating vehicle:', vehicleError.message);
    return;
  }
  console.log('✅ Created other vehicle with 9 NEW fields');

  // 4. Witnesses - ONLY NEW FIELDS
  const { error: witnessError } = await supabase
    .from('incident_witnesses')
    .insert([{
      incident_id: incident.id,
      create_user_id: testUserId,

      // Required field (witness 1)
      witness_name: 'Bob Johnson',

      // NEW: Witness 2 fields
      witness_2_name: 'Sarah Williams',
      witness_2_mobile: '+447700900321',
      witness_2_email: 'sarah.williams@email.com',
      witness_2_statement: 'I saw the whole accident happen'
    }]);

  if (witnessError) {
    console.log('❌ Error creating witness:', witnessError.message);
    return;
  }
  console.log('✅ Created witness with 4 NEW fields');

  console.log('\n========================================');
  console.log('✅ MINIMAL TEST DATA CREATED');
  console.log('========================================\n');
  console.log(`User ID: ${testUserId}`);
  console.log(`\n📊 Data created:`);
  console.log(`   ✅ User signup`);
  console.log(`   ✅ Incident (${51} new fields)`);
  console.log(`   ✅ Other vehicle (9 new fields)`);
  console.log(`   ✅ Witness (4 new fields)`);
  console.log(`\n📄 Ready to test PDF:`);
  console.log(`   node test-form-filling.js ${testUserId}\n`);
}

createMinimalTestData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
