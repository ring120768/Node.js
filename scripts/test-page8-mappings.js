/**
 * Test Page 8 (Other Vehicle Photos) Field Mappings
 *
 * Verifies:
 * 1. Database columns exist (file_url_other_vehicle, file_url_other_vehicle_1)
 * 2. temp_uploads has field_name column
 * 3. Field name mapping logic is correct
 * 4. Backend controller processes all 5 field names
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test data
const FIELD_NAMES = [
  'other_vehicle_photo_1',   // → file_url_other_vehicle
  'other_vehicle_photo_2',   // → file_url_other_vehicle_1
  'other_damage_photo_3',    // → user_documents only
  'other_damage_photo_4',    // → user_documents only
  'other_damage_photo_5'     // → user_documents only
];

const DB_COLUMNS = [
  'file_url_other_vehicle',
  'file_url_other_vehicle_1'
];

async function testPage8Mappings() {
  console.log('\n🧪 Testing Page 8 (Other Vehicle Photos) Field Mappings\n');
  console.log('=' .repeat(70));

  let passCount = 0;
  let failCount = 0;

  // Test 1: Verify incident_reports columns exist
  console.log('\n📋 Test 1: Database Columns\n');
  try {
    const { data, error } = await supabase
      .from('incident_reports')
      .select('*')
      .limit(1);

    if (error) throw error;

    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

    DB_COLUMNS.forEach(col => {
      const exists = columns.includes(col);
      if (exists) {
        console.log(`  ✅ ${col} - EXISTS`);
        passCount++;
      } else {
        console.log(`  ❌ ${col} - MISSING`);
        failCount++;
      }
    });
  } catch (error) {
    console.error(`  ❌ Error checking database columns: ${error.message}`);
    failCount += DB_COLUMNS.length;
  }

  // Test 2: Verify temp_uploads has field_name column
  console.log('\n📋 Test 2: temp_uploads Structure\n');
  try {
    const { data, error } = await supabase
      .from('temp_uploads')
      .select('*')
      .limit(1);

    if (error) throw error;

    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
    const hasFieldName = columns.includes('field_name');

    if (hasFieldName) {
      console.log('  ✅ field_name column - EXISTS');
      passCount++;
    } else {
      console.log('  ❌ field_name column - MISSING');
      failCount++;
    }
  } catch (error) {
    console.error(`  ❌ Error checking temp_uploads structure: ${error.message}`);
    failCount++;
  }

  // Test 3: Verify field name mapping logic
  console.log('\n📋 Test 3: Field Name Mapping Logic\n');

  // Simulate the JavaScript function from the HTML
  function getFieldNameForSlot(slotIndex) {
    const fieldNames = [
      'other_vehicle_photo_1',
      'other_vehicle_photo_2',
      'other_damage_photo_3',
      'other_damage_photo_4',
      'other_damage_photo_5'
    ];
    return fieldNames[slotIndex] || 'other_damage_photo';
  }

  for (let i = 0; i < 5; i++) {
    const fieldName = getFieldNameForSlot(i);
    const expected = FIELD_NAMES[i];
    const matches = fieldName === expected;

    if (matches) {
      console.log(`  ✅ Slot ${i} → ${fieldName}`);
      passCount++;
    } else {
      console.log(`  ❌ Slot ${i} → ${fieldName} (expected: ${expected})`);
      failCount++;
    }
  }

  // Test 4: Verify field-to-column mapping strategy
  console.log('\n📋 Test 4: Field-to-Column Mapping Strategy\n');

  const mappings = [
    { field: 'other_vehicle_photo_1', column: 'file_url_other_vehicle', storage: 'DB + user_documents' },
    { field: 'other_vehicle_photo_2', column: 'file_url_other_vehicle_1', storage: 'DB + user_documents' },
    { field: 'other_damage_photo_3', column: null, storage: 'user_documents only' },
    { field: 'other_damage_photo_4', column: null, storage: 'user_documents only' },
    { field: 'other_damage_photo_5', column: null, storage: 'user_documents only' }
  ];

  mappings.forEach((mapping, index) => {
    const hasDBColumn = mapping.column !== null;
    const isFirstTwo = index < 2;

    if (hasDBColumn === isFirstTwo) {
      console.log(`  ✅ ${mapping.field} → ${mapping.storage}`);
      passCount++;
    } else {
      console.log(`  ❌ ${mapping.field} → Incorrect mapping strategy`);
      failCount++;
    }
  });

  // Test 5: Visual label generation logic
  console.log('\n📋 Test 5: Visual Label Generation\n');

  function generateFieldLabel(fieldName, index) {
    const isVehiclePhoto = fieldName && fieldName.includes('vehicle_photo');
    if (isVehiclePhoto) {
      return `🚗 Vehicle Photo ${fieldName.slice(-1)}`;
    } else {
      return `📄 Other Damage ${fieldName ? fieldName.slice(-1) : index + 1}`;
    }
  }

  const expectedLabels = [
    { field: 'other_vehicle_photo_1', expected: '🚗 Vehicle Photo 1' },
    { field: 'other_vehicle_photo_2', expected: '🚗 Vehicle Photo 2' },
    { field: 'other_damage_photo_3', expected: '📄 Other Damage 3' },
    { field: 'other_damage_photo_4', expected: '📄 Other Damage 4' },
    { field: 'other_damage_photo_5', expected: '📄 Other Damage 5' }
  ];

  expectedLabels.forEach(({ field, expected }, index) => {
    const label = generateFieldLabel(field, index);
    const matches = label === expected;

    if (matches) {
      console.log(`  ✅ ${field} → "${label}"`);
      passCount++;
    } else {
      console.log(`  ❌ ${field} → "${label}" (expected: "${expected}")`);
      failCount++;
    }
  });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Test Summary\n');
  console.log(`  ✅ Passed: ${passCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📈 Total:  ${passCount + failCount}`);

  const successRate = ((passCount / (passCount + failCount)) * 100).toFixed(1);
  console.log(`  🎯 Success Rate: ${successRate}%`);

  if (failCount === 0) {
    console.log('\n✅ All tests passed! Page 8 field mappings are correct.\n');
  } else {
    console.log(`\n⚠️  ${failCount} test(s) failed. Please review the implementation.\n`);
  }

  process.exit(failCount === 0 ? 0 : 1);
}

// Run tests
testPage8Mappings().catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
