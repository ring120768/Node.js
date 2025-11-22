require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createMinimalTestData() {
  console.log('🔨 Creating MINIMAL test data (existing schema fields only)...\n');

  const testUserId = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

  // Clean up
  console.log('🧹 Cleaning up...');
  await supabase.from('incident_reports').delete().eq('create_user_id', testUserId);
  await supabase.from('user_signup').delete().eq('create_user_id', testUserId);
  console.log('✅ Cleanup complete\n');

  // 1. User (ONLY existing fields - confirmed working)
  const { data: user, error: userError} = await supabase
    .from('user_signup')
    .insert([{
      create_user_id: testUserId,
      email: 'test@carcrashlaw.uk',
      name: 'Sarah',
      surname: 'Johnson',
      mobile: '+447700900123',
      street_address: 'M25 Motorway, Junction 15',
      town: 'Thorpe',
      postcode: 'TW20 8UR',
      country: 'United Kingdom',
      driving_license_number: 'JOHNS851203SJ9IJ',
      date_of_birth: '1985-12-03',
      car_registration_number: 'AB12XYZ',
      insurance_company: 'Direct Line',
      policy_number: 'DL987654321',
      gdpr_consent: true,
      are_you_safe: true,
      six_point_safety_check: true
    }])
    .select()
    .single();

  if (userError) {
    console.log('❌ Error creating user:', userError.message);
    console.log('Details:', userError);
    return;
  }
  console.log('✅ Created user:', user.email);

  // 2. Incident - ONLY existing confirmed fields
  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .insert([{
      create_user_id: testUserId,
      when_did_the_accident_happen: '2025-10-15',
      what_time_did_the_accident_happen: '14:30',
      where_exactly_did_this_happen: 'M25 Motorway, Junction 15, Surrey',
      describe_accident: 'Simple rear-end collision. Traffic slowed suddenly due to incident ahead. Other vehicle (BMW X5) failed to brake in time and collided with rear of my vehicle.',
      clear_and_dry: true,
      bright_daylight: true,
      type_of_road: 'Motorway',
      speed_limit: '70 mph'
    }])
    .select()
    .single();

  if (incidentError) {
    console.log('❌ Error creating incident:', incidentError.message);
    console.log('Details:', incidentError);
    return;
  }
  console.log('✅ Created incident report');

  console.log('\n========================================');
  console.log('✅ MINIMAL TEST DATA CREATED');
  console.log('========================================\n');
  console.log(`User ID: ${testUserId}`);
  console.log(`Email: ${user.email}`);
  console.log(`Name: ${user.name} ${user.surname}`);
  console.log(`\n📊 Data created:`);
  console.log(`   ✅ User signup (with six_point_safety_check = TRUE)`);
  console.log(`   ✅ Incident report (existing fields only)`);
  console.log(`\n📄 Ready to test PDF generation:`);
  console.log(`   node test-form-filling.js ${testUserId}\n`);
}

createMinimalTestData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
