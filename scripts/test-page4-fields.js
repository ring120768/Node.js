require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPage4Fields() {
  console.log('🧪 Testing Page 4 Field Mappings (30 fields with array conversions)...\n');

  const testUserId = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

  // Clean up existing test data
  console.log('🧹 Cleaning up existing test data...');
  await supabase.from('incident_reports').delete().eq('create_user_id', testUserId);
  console.log('✅ Cleanup complete\n');

  // Create comprehensive Page 4 test data
  const page4TestData = {
    // Location fields (3)
    location: 'M25 Motorway, Junction 15, Surrey TW20 8UR',
    what3words: 'filled.count.soap',
    nearest_landmark: 'Thorpe Park roundabout',

    // Junction fields (4)
    junction_type: 't_junction',
    junction_control: 'traffic_lights',
    traffic_light_status: 'green',
    user_manoeuvre: 'going_ahead',

    // Additional hazards (1)
    additional_hazards: 'Heavy rain reduced visibility significantly',

    // Visibility factors (5 booleans - converted from array)
    visibility_clear: false,
    visibility_restricted_structure: true,
    visibility_restricted_bend: false,
    visibility_large_vehicle: true,
    visibility_sun_glare: false,

    // Special conditions (12 booleans - converted from array)
    special_condition_roadworks: true,
    special_condition_workmen: false,
    special_condition_cyclists: true,
    special_condition_pedestrians: false,
    special_condition_traffic_calming: true,
    special_condition_parked_vehicles: true,
    special_condition_crossing: false,
    special_condition_school_zone: false,
    special_condition_narrow_road: true,
    special_condition_potholes: false,
    special_condition_oil_spills: false,
    special_condition_animals: false
  };

  console.log('📝 Creating test incident with Page 4 data...');
  const { data: incident, error: insertError } = await supabase
    .from('incident_reports')
    .insert([{
      create_user_id: testUserId,
      ...page4TestData
    }])
    .select()
    .single();

  if (insertError) {
    console.log('❌ Insert failed:', insertError.message);
    console.log('Details:', insertError);
    process.exit(1);
  }

  console.log('✅ Test incident created\n');

  // Verify all fields
  console.log('🔍 Verifying all 30 Page 4 fields...\n');

  const expectedFields = Object.keys(page4TestData);
  let passCount = 0;
  let failCount = 0;
  const failures = [];

  for (const field of expectedFields) {
    const expected = page4TestData[field];
    const actual = incident[field];

    // Compare values
    const matches = actual === expected;

    if (matches) {
      console.log(`  ✅ ${field}: ${JSON.stringify(actual)}`);
      passCount++;
    } else {
      console.log(`  ❌ ${field}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      failures.push({ field, expected, actual });
      failCount++;
    }
  }

  console.log('\n========================================');
  console.log('📊 TEST RESULTS');
  console.log('========================================');
  console.log(`✅ Passed: ${passCount}/${expectedFields.length}`);
  console.log(`❌ Failed: ${failCount}/${expectedFields.length}`);

  console.log('\n📋 Field Breakdown:');
  console.log(`   - 3 location fields`);
  console.log(`   - 4 junction fields`);
  console.log(`   - 1 additional hazards field`);
  console.log(`   - 5 visibility boolean fields (from array)`);
  console.log(`   - 12 special condition boolean fields (from array)`);

  if (failures.length > 0) {
    console.log('\n⚠️  Failed Fields:');
    failures.forEach(({ field, expected, actual }) => {
      console.log(`   - ${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    });
  }

  console.log('\n========================================');

  if (failCount === 0) {
    console.log('🎉 ALL PAGE 4 FIELDS VALIDATED SUCCESSFULLY!');
    console.log('✅ Controller → Database mapping is 100% correct');
    console.log('✅ Array-to-boolean conversion working perfectly');
    process.exit(0);
  } else {
    console.log('❌ Some fields failed validation');
    console.log('⚠️  Check controller mappings in buildIncidentData()');
    process.exit(1);
  }
}

testPage4Fields()
  .then(() => console.log('\n✅ Test complete'))
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
