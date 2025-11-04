/**
 * Test Page 9 (Witnesses) Field Mapping
 *
 * Validates:
 * - Frontend collects all witness fields including witness_address
 * - Backend saves witnesses to incident_witnesses table
 * - Multiple witnesses are handled correctly
 * - PDF service queries incident_witnesses table
 * - Field mapping matches between frontend, backend, and database
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('🧪 PAGE 9 (WITNESSES) FIELD MAPPING TEST');
console.log('='.repeat(70) + '\n');

// Test counters
let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    if (details) console.log(`   ${details}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   ${details}`);
    failed++;
  }
}

// =====================================================
// 1. FRONTEND VALIDATION
// =====================================================

console.log('\n📝 1. Frontend Field Collection\n');

const htmlPath = path.join(__dirname, '../public/incident-form-page9-witnesses.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Check witness_address field exists
test(
  'witness_address input field exists in HTML',
  htmlContent.includes('id="witness-address"'),
  'Found: <input id="witness-address">'
);

// Check all required witness fields exist
const requiredFields = [
  'witness-name',
  'witness-phone',
  'witness-email',
  'witness-address',
  'witness-statement'
];

requiredFields.forEach(fieldId => {
  test(
    `Field "${fieldId}" exists in HTML`,
    htmlContent.includes(`id="${fieldId}"`),
    `Found: <input/textarea id="${fieldId}">`
  );
});

// Check witness_address is in DOM references
test(
  'witness_address has DOM reference',
  htmlContent.includes('witnessAddressInput') &&
  htmlContent.includes('getElementById(\'witness-address\')'),
  'Found: const witnessAddressInput = document.getElementById(\'witness-address\')'
);

// Check witness_address is in saveData() function
test(
  'witness_address included in saveData()',
  htmlContent.includes('witness_address:') &&
  htmlContent.includes('witnessAddressInput.value'),
  'Found: witness_address: witnessesPresent === \'yes\' ? witnessAddressInput.value.trim() : null'
);

// Check witness_address is in loadData() function
test(
  'witness_address included in loadData()',
  htmlContent.includes('if (data.witness_address)') &&
  htmlContent.includes('witnessAddressInput.value = data.witness_address'),
  'Found: if (data.witness_address) witnessAddressInput.value = data.witness_address'
);

// Check witness_address is in input event listeners
test(
  'witness_address in input event listeners',
  /\[.*witnessNameInput.*witnessAddressInput.*\]\.forEach/.test(htmlContent),
  'Found: witnessAddressInput in input event listeners array'
);

// Check witness_address is cleared when "No" selected
test(
  'witness_address cleared when no witnesses',
  /witnessAddressInput\.value = ''/.test(htmlContent),
  'Found: witnessAddressInput.value = \'\' in clearing logic'
);

// Check witness_address in "Add Another Witness" handler
test(
  'witness_address in add witness handler',
  htmlContent.includes('witness_address:') &&
  htmlContent.includes('currentWitnessData'),
  'Found: witness_address in currentWitnessData object'
);

// Check additional_witnesses included in saveData
test(
  'additional_witnesses included in saveData()',
  htmlContent.includes('additional_witnesses') &&
  htmlContent.includes('sessionStorage.getItem(\'additional_witnesses\')'),
  'Found: additional_witnesses read from sessionStorage and added to page9_data'
);

// =====================================================
// 2. BACKEND VALIDATION
// =====================================================

console.log('\n🔧 2. Backend Controller\n');

const controllerPath = path.join(__dirname, '../src/controllers/incidentForm.controller.js');
const controllerContent = fs.readFileSync(controllerPath, 'utf8');

// Check buildIncidentData doesn't have non-existent witness columns
test(
  'buildIncidentData removes non-existent witness columns',
  !controllerContent.match(/witness_name:.*page9\.witness_name/) &&
  !controllerContent.match(/witness_phone:.*page9\.witness_phone/) &&
  !controllerContent.match(/witness_address:.*page9\.witness_address/),
  'Confirmed: witness_name, witness_phone, witness_address NOT in buildIncidentData'
);

// Check buildIncidentData has correct witness fields
test(
  'buildIncidentData uses witnesses_present (plural)',
  controllerContent.includes('witnesses_present: page9.witnesses_present'),
  'Found: witnesses_present: page9.witnesses_present'
);

test(
  'buildIncidentData has any_witness boolean',
  controllerContent.includes('any_witness: page9.witnesses_present === \'yes\''),
  'Found: any_witness: page9.witnesses_present === \'yes\''
);

// Check incident_witnesses table insert logic exists
test(
  'Backend saves to incident_witnesses table',
  controllerContent.includes('.from(\'incident_witnesses\')') &&
  controllerContent.includes('.insert(witnesses)'),
  'Found: await supabase.from(\'incident_witnesses\').insert(witnesses)'
);

// Check primary witness fields are included
const witnessFields = [
  'incident_report_id',
  'create_user_id',
  'witness_number',
  'witness_name',
  'witness_phone',
  'witness_email',
  'witness_address',
  'witness_statement'
];

witnessFields.forEach(field => {
  test(
    `Backend includes ${field} field`,
    controllerContent.includes(`${field}:`),
    `Found: ${field}: in witness object`
  );
});

// Check additional witnesses handling
test(
  'Backend handles additional_witnesses array',
  controllerContent.includes('page9.additional_witnesses') &&
  controllerContent.includes('Array.isArray(page9.additional_witnesses)'),
  'Found: page9.additional_witnesses array processing logic'
);

// Check witness_number assignment
test(
  'Backend assigns correct witness_number',
  controllerContent.includes('witness_number: 1') &&
  controllerContent.includes('witness_number: index + 2'),
  'Found: witness_number: 1 for primary, index + 2 for additional'
);

// Check response includes witness results
test(
  'Response includes witness results',
  controllerContent.includes('witnesses: witnessResults'),
  'Found: witnesses: witnessResults in response JSON'
);

// =====================================================
// 3. PDF SERVICE VALIDATION
// =====================================================

console.log('\n📄 3. PDF Service (Data Fetcher)\n');

const dataFetcherPath = path.join(__dirname, '../lib/dataFetcher.js');
const dataFetcherContent = fs.readFileSync(dataFetcherPath, 'utf8');

// Check incident_witnesses query exists
test(
  'PDF service queries incident_witnesses table',
  dataFetcherContent.includes('.from(\'incident_witnesses\')'),
  'Found: await supabase.from(\'incident_witnesses\')'
);

// Check query uses correct foreign key
test(
  'Query uses incident_report_id (correct foreign key)',
  dataFetcherContent.includes('.eq(\'incident_report_id\', latestIncidentId)'),
  'Found: .eq(\'incident_report_id\', latestIncidentId)'
);

// Check witnesses ordered by witness_number
test(
  'Witnesses ordered by witness_number',
  dataFetcherContent.includes('.order(\'witness_number\''),
  'Found: .order(\'witness_number\', { ascending: true })'
);

// Check witnesses included in returned data
test(
  'Witnesses included in returned data object',
  dataFetcherContent.includes('witnesses: witnessesData'),
  'Found: witnesses: witnessesData in return object'
);

// =====================================================
// 4. DATABASE STRUCTURE VALIDATION
// =====================================================

console.log('\n🗄️  4. Database Structure\n');

// Check migration files exist
const migrationPath1 = path.join(__dirname, '../supabase/migrations/20251104000000_create_incident_witnesses_table.sql');
const migrationPath2 = path.join(__dirname, '../supabase/migrations/20251104000001_add_witness_2_address.sql');

test(
  'incident_witnesses table migration exists',
  fs.existsSync(migrationPath1),
  `Found: ${migrationPath1}`
);

if (fs.existsSync(migrationPath1)) {
  const migrationContent = fs.readFileSync(migrationPath1, 'utf8');

  // Check table has all required columns
  const dbColumns = [
    'id UUID PRIMARY KEY',
    'incident_report_id UUID',
    'create_user_id UUID',
    'witness_number INTEGER',
    'witness_name TEXT',
    'witness_phone TEXT',
    'witness_email TEXT',
    'witness_address TEXT',
    'witness_statement TEXT',
    'created_at TIMESTAMP',
    'updated_at TIMESTAMP'
  ];

  dbColumns.forEach(column => {
    test(
      `Table has ${column.split(' ')[0]} column`,
      migrationContent.includes(column.split(' ')[0]),
      `Found: ${column.split(' ')[0]} in CREATE TABLE statement`
    );
  });

  // Check foreign keys
  test(
    'Foreign key to incident_reports exists',
    migrationContent.includes('REFERENCES public.incident_reports(id)'),
    'Found: incident_report_id REFERENCES incident_reports(id)'
  );

  test(
    'Foreign key to auth.users exists',
    migrationContent.includes('REFERENCES auth.users(id)'),
    'Found: create_user_id REFERENCES auth.users(id)'
  );

  // Check RLS
  test(
    'Row Level Security enabled',
    migrationContent.includes('ENABLE ROW LEVEL SECURITY'),
    'Found: ALTER TABLE incident_witnesses ENABLE ROW LEVEL SECURITY'
  );

  test(
    'RLS policies created',
    migrationContent.match(/CREATE POLICY/g)?.length >= 4,
    'Found: 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)'
  );

  // Check indexes
  test(
    'Indexes created for performance',
    migrationContent.includes('CREATE INDEX') &&
    migrationContent.includes('incident_report_id') &&
    migrationContent.includes('witness_number'),
    'Found: Indexes on incident_report_id and witness_number'
  );
}

// =====================================================
// 5. FIELD MAPPING VERIFICATION
// =====================================================

console.log('\n🔗 5. Field Mapping Consistency\n');

// Frontend → Backend → Database mapping
const fieldMappings = [
  {
    frontend: 'witnessNameInput.value',
    backend: 'witness_name',
    database: 'witness_name TEXT'
  },
  {
    frontend: 'witnessPhoneInput.value',
    backend: 'witness_phone',
    database: 'witness_phone TEXT'
  },
  {
    frontend: 'witnessEmailInput.value',
    backend: 'witness_email',
    database: 'witness_email TEXT'
  },
  {
    frontend: 'witnessAddressInput.value',
    backend: 'witness_address',
    database: 'witness_address TEXT'
  },
  {
    frontend: 'witnessStatementTextarea.value',
    backend: 'witness_statement',
    database: 'witness_statement TEXT'
  }
];

fieldMappings.forEach(mapping => {
  const frontendExists = htmlContent.includes(mapping.frontend);
  const backendExists = controllerContent.includes(mapping.backend);

  test(
    `${mapping.backend} mapping consistent`,
    frontendExists && backendExists,
    `Frontend: ${mapping.frontend} → Backend: ${mapping.backend}`
  );
});

// =====================================================
// 6. SUMMARY
// =====================================================

console.log('\n' + '='.repeat(70));
console.log('📊 TEST RESULTS SUMMARY');
console.log('='.repeat(70));

const total = passed + failed;
const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

console.log(`\nTotal Tests: ${total}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${percentage}%\n`);

if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED! Page 9 witness field mapping is correctly implemented.\n');
  console.log('✅ Frontend collects all witness fields including witness_address');
  console.log('✅ Backend saves witnesses to incident_witnesses table');
  console.log('✅ Multiple witnesses handled via witness_number');
  console.log('✅ PDF service queries incident_witnesses correctly');
  console.log('✅ Field mapping is consistent across frontend, backend, and database\n');
} else {
  console.log(`⚠️  ${failed} test(s) failed. Please review the failures above.\n`);
}

console.log('='.repeat(70) + '\n');

// Exit with error code if tests failed
process.exit(failed > 0 ? 1 : 0);
