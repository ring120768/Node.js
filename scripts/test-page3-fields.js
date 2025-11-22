require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPage3Fields() {
  console.log('🧪 Testing Page 3 Field Mappings (41 fields)...\n');

  const testUserId = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

  // Clean up existing test data
  console.log('🧹 Cleaning up existing test data...');
  await supabase.from('incident_reports').delete().eq('create_user_id', testUserId);
  console.log('✅ Cleanup complete\n');

  // Create comprehensive Page 3 test data (all 41 fields)
  const page3TestData = {
    // Date and time
    accident_date: '2025-10-15',
    accident_time: '14:30',

    // Weather conditions (12 checkboxes)
    weather_bright_sunlight: true,
    weather_clear: false,
    weather_cloudy: true,
    weather_raining: true,
    weather_heavy_rain: false,
    weather_drizzle: true,
    weather_fog: false,
    weather_snow: false,
    weather_ice: false,
    weather_windy: true,
    weather_hail: false,
    weather_thunder_lightning: false,

    // Road conditions (6 checkboxes)
    road_condition_dry: false,
    road_condition_wet: true,
    road_condition_icy: false,
    road_condition_snow_covered: false,
    road_condition_loose_surface: false,
    road_condition_slush_on_road: false,

    // Road types (7 checkboxes)
    road_type_motorway: true,
    road_type_a_road: false,
    road_type_b_road: false,
    road_type_urban_street: false,
    road_type_rural_road: false,
    road_type_car_park: false,
    road_type_private_road: false,

    // Speed
    speed_limit: '70 mph',
    your_speed: 65,

    // Traffic conditions (4 checkboxes)
    traffic_conditions_heavy: true,
    traffic_conditions_moderate: false,
    traffic_conditions_light: false,
    traffic_conditions_no_traffic: false,

    // Visibility (4 checkboxes)
    visibility_good: false,
    visibility_poor: true,
    visibility_very_poor: false,
    visibility_street_lights: false,

    // Road markings (3 checkboxes)
    road_markings_visible_yes: false,
    road_markings_visible_no: false,
    road_markings_visible_partially: true
  };

  console.log('📝 Creating test incident with Page 3 data...');
  const { data: incident, error: insertError } = await supabase
    .from('incident_reports')
    .insert([{
      create_user_id: testUserId,
      ...page3TestData
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
  console.log('🔍 Verifying all 41 Page 3 fields...\n');

  const expectedFields = Object.keys(page3TestData);
  let passCount = 0;
  let failCount = 0;
  const failures = [];

  for (const field of expectedFields) {
    const expected = page3TestData[field];
    const actual = incident[field];

    // Handle type conversions for comparison
    let matches = false;
    if (typeof expected === 'number') {
      matches = actual === expected || actual === String(expected);
    } else if (typeof expected === 'boolean') {
      matches = actual === expected;
    } else if (field === 'accident_time') {
      // PostgreSQL TIME type adds seconds (:00), so "14:30" becomes "14:30:00"
      matches = actual === expected || actual === expected + ':00';
    } else {
      matches = actual === expected;
    }

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

  if (failures.length > 0) {
    console.log('\n⚠️  Failed Fields:');
    failures.forEach(({ field, expected, actual }) => {
      console.log(`   - ${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    });
  }

  console.log('\n========================================');

  if (failCount === 0) {
    console.log('🎉 ALL PAGE 3 FIELDS VALIDATED SUCCESSFULLY!');
    console.log('✅ Controller → Database mapping is 100% correct');
    process.exit(0);
  } else {
    console.log('❌ Some fields failed validation');
    console.log('⚠️  Check controller mappings in buildIncidentData()');
    process.exit(1);
  }
}

testPage3Fields()
  .then(() => console.log('\n✅ Test complete'))
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
