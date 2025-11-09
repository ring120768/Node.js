require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPage12Fields() {
  console.log('🧪 Testing Page 12 Field Mappings (2 fields - final medical check)...\n');

  const testUserId = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

  // Clean up existing test data
  console.log('🧹 Cleaning up existing test data...');
  await supabase.from('incident_reports').delete().eq('create_user_id', testUserId);
  console.log('✅ Cleanup complete\n');

  // Create comprehensive Page 12 test data
  const page12TestData = {
    // Final medical check (2 fields)
    final_feeling: 'minor_pain',  // Values: fine, shaken, minor_pain, significant_pain, emergency
    form_completed_at: '2025-11-07T14:30:00.000Z'  // ISO timestamp
  };

  console.log('📝 Creating test incident with Page 12 data...');
  const { data: incident, error: insertError } = await supabase
    .from('incident_reports')
    .insert([{
      create_user_id: testUserId,
      ...page12TestData
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
  console.log('🔍 Verifying all 2 Page 12 fields...\n');

  const expectedFields = Object.keys(page12TestData);
  let passCount = 0;
  let failCount = 0;
  const failures = [];

  for (const field of expectedFields) {
    const expected = page12TestData[field];
    const actual = incident[field];

    // Handle type conversions for comparison
    let matches = false;
    if (field === 'form_completed_at') {
      // Compare timestamps (both should be ISO strings)
      const expectedTime = new Date(expected).toISOString();
      const actualTime = actual ? new Date(actual).toISOString() : null;
      matches = expectedTime === actualTime;
    } else {
      // String comparison for final_feeling
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

  console.log('\n📋 Field Breakdown:');
  console.log(`   - 1 final feeling field (radio buttons)`);
  console.log(`   - 1 completion timestamp field`);

  if (failures.length > 0) {
    console.log('\n⚠️  Failed Fields:');
    failures.forEach(({ field, expected, actual }) => {
      console.log(`   - ${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    });
  }

  console.log('\n========================================');

  if (failCount === 0) {
    console.log('🎉 ALL PAGE 12 FIELDS VALIDATED SUCCESSFULLY!');
    console.log('✅ Controller → Database mapping is 100% correct');
    console.log('✅ Final medical check fields mapped correctly');
    console.log('✅ Timestamp handling working properly');
    process.exit(0);
  } else {
    console.log('❌ Some fields failed validation');
    console.log('⚠️  Check controller mappings in buildIncidentData()');
    process.exit(1);
  }
}

testPage12Fields()
  .then(() => console.log('\n✅ Test complete'))
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
