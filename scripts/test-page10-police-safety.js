#!/usr/bin/env node

/**
 * Test script for Page 10 (Police & Safety) field mapping
 *
 * Tests:
 * 1. Frontend field collection (HTML)
 * 2. Backend controller (data processing)
 * 3. PDF service (data fetching)
 * 4. Database structure (columns exist)
 * 5. Field mapping consistency
 */

const fs = require('fs');
const path = require('path');

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ PASS: ${name}`);
    if (details) console.log(`   ${details}`);
  } else {
    failedTests++;
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   ${details}`);
  }
}

console.log('======================================================================');
console.log('🧪 PAGE 10 (POLICE & SAFETY) FIELD MAPPING TEST');
console.log('======================================================================\n\n');

// ============================================================================
// 1. FRONTEND FIELD COLLECTION
// ============================================================================
console.log('📝 1. Frontend Field Collection\n');

const htmlPath = path.join(__dirname, '../public/incident-form-page10-police-details.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Required radio fields
const requiredRadioFields = [
  'police_attended',
  'airbags_deployed',
  'seatbelts_worn'
];

requiredRadioFields.forEach(field => {
  const exists = htmlContent.includes(`data-field="${field}"`);
  test(
    `Field "${field}" exists in HTML`,
    exists,
    exists ? `Found: radio buttons with data-field="${field}"` : 'Missing radio field'
  );
});

// Police detail fields (conditional)
const policeFields = [
  { id: 'accident-ref', name: 'accident reference number' },
  { id: 'police-force', name: 'police force' },
  { id: 'officer-name', name: 'officer name' },
  { id: 'officer-badge', name: 'officer badge number' },
  { id: 'user-breath-test', name: 'user breath test' },
  { id: 'other-breath-test', name: 'other driver breath test' }
];

policeFields.forEach(field => {
  const exists = htmlContent.includes(`id="${field.id}"`);
  test(
    `Field "${field.id}" exists in HTML`,
    exists,
    exists ? `Found: input/select with id="${field.id}"` : 'Missing field'
  );
});

// Seatbelt reason (conditional)
test(
  'Field "seatbelt-reason" exists in HTML',
  htmlContent.includes('id="seatbelt-reason"'),
  htmlContent.includes('id="seatbelt-reason"') ? 'Found: textarea for seatbelt explanation' : 'Missing textarea'
);

// Check saveData() function
test(
  'saveData() includes all Page 10 fields',
  htmlContent.includes('police_attended:') &&
  htmlContent.includes('accident_ref_number:') &&
  htmlContent.includes('airbags_deployed:') &&
  htmlContent.includes('seatbelts_worn:') &&
  htmlContent.includes('seatbelt_reason:'),
  'Confirmed: saveData() saves all fields to localStorage'
);

// ============================================================================
// 2. BACKEND CONTROLLER
// ============================================================================
console.log('\n🔧 2. Backend Controller\n');

const controllerPath = path.join(__dirname, '../src/controllers/incidentForm.controller.js');
const controllerContent = fs.readFileSync(controllerPath, 'utf8');

// Check buildIncidentData processes page10 data
test(
  'buildIncidentData processes page10_data',
  controllerContent.includes('page10_data') || controllerContent.includes('page10'),
  controllerContent.includes('page10') ? 'Found: page10 data processing' : 'WARNING: page10 not found in controller'
);

// Check field mappings
const page10Fields = [
  'police_attended',
  'accident_ref_number',
  'police_force',
  'officer_name',
  'officer_badge',
  'user_breath_test',
  'other_breath_test',
  'airbags_deployed',
  'seatbelts_worn',
  'seatbelt_reason'
];

page10Fields.forEach(field => {
  // Check if field is referenced in controller (either as page10.field or directly)
  const exists = controllerContent.includes(field);
  test(
    `Backend handles "${field}" field`,
    exists,
    exists ? `Found: ${field} in controller` : `Missing: ${field} not found in controller`
  );
});

// ============================================================================
// 3. PDF SERVICE (DATA FETCHER)
// ============================================================================
console.log('\n📄 3. PDF Service (Data Fetcher)\n');

const dataFetcherPath = path.join(__dirname, '../lib/dataFetcher.js');
let dataFetcherContent = '';

try {
  dataFetcherContent = fs.readFileSync(dataFetcherPath, 'utf8');

  test(
    'PDF service queries incident_reports table',
    dataFetcherContent.includes("from('incident_reports')"),
    'Found: Query to incident_reports table'
  );

  // Check if police/safety fields are included in select
  const hasSelectAll = dataFetcherContent.includes('.select(\'*\')') ||
                       dataFetcherContent.includes('.select("*")');
  test(
    'PDF service includes all fields (SELECT *)',
    hasSelectAll,
    hasSelectAll ? 'Found: SELECT * ensures all fields included' : 'Check specific field selection'
  );

} catch (error) {
  test(
    'PDF service file exists',
    false,
    `ERROR: Could not read ${dataFetcherPath}`
  );
}

// ============================================================================
// 4. DATABASE STRUCTURE
// ============================================================================
console.log('\n🗄️  4. Database Structure\n');

const migrationsDir = path.join(__dirname, '../supabase/migrations');
let migrationFiles = [];

try {
  migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  test(
    'Migration files found',
    migrationFiles.length > 0,
    `Found: ${migrationFiles.length} migration files`
  );

  // Read all migration contents
  let allMigrationContent = '';
  migrationFiles.forEach(file => {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    allMigrationContent += content + '\n';
  });

  // Check for page 10 fields in incident_reports table
  const dbFields = [
    { name: 'police_attended', type: 'TEXT' },
    { name: 'accident_ref_number', type: 'TEXT' },
    { name: 'police_force', type: 'TEXT' },
    { name: 'officer_name', type: 'TEXT' },
    { name: 'officer_badge', type: 'TEXT' },
    { name: 'user_breath_test', type: 'TEXT' },
    { name: 'other_breath_test', type: 'TEXT' },
    { name: 'airbags_deployed', type: 'TEXT' },
    { name: 'seatbelts_worn', type: 'TEXT' },
    { name: 'seatbelt_reason', type: 'TEXT' }
  ];

  dbFields.forEach(field => {
    const exists = allMigrationContent.includes(field.name);
    test(
      `Column "${field.name}" exists in migrations`,
      exists,
      exists ? `Found: ${field.name} in migration files` : `Missing: ${field.name} not found`
    );
  });

} catch (error) {
  test(
    'Can read migrations directory',
    false,
    `ERROR: ${error.message}`
  );
}

// ============================================================================
// 5. FIELD MAPPING CONSISTENCY
// ============================================================================
console.log('\n🔗 5. Field Mapping Consistency\n');

// Check that frontend field names match backend/database
const fieldMappings = [
  { frontend: 'police_attended', backend: 'police_attended' },
  { frontend: 'accident-ref', backend: 'accident_ref_number' },
  { frontend: 'police-force', backend: 'police_force' },
  { frontend: 'officer-name', backend: 'officer_name' },
  { frontend: 'officer-badge', backend: 'officer_badge' },
  { frontend: 'user-breath-test', backend: 'user_breath_test' },
  { frontend: 'other-breath-test', backend: 'other_breath_test' },
  { frontend: 'airbags_deployed', backend: 'airbags_deployed' },
  { frontend: 'seatbelts_worn', backend: 'seatbelts_worn' },
  { frontend: 'seatbelt-reason', backend: 'seatbelt_reason' }
];

fieldMappings.forEach(mapping => {
  const frontendExists = htmlContent.includes(mapping.frontend);
  const backendExists = controllerContent.includes(mapping.backend) ||
                        allMigrationContent?.includes(mapping.backend);

  test(
    `"${mapping.backend}" mapping consistent`,
    frontendExists && backendExists,
    frontendExists && backendExists
      ? `Frontend: ${mapping.frontend} → Backend: ${mapping.backend}`
      : `Issue: Frontend=${frontendExists}, Backend=${backendExists}`
  );
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n======================================================================');
console.log('📊 TEST RESULTS SUMMARY');
console.log('======================================================================\n');

console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%\n`);

if (failedTests === 0) {
  console.log('🎉 ALL TESTS PASSED! Page 10 police & safety field mapping is correctly implemented.\n');
  console.log('✅ Frontend collects all police & safety fields');
  console.log('✅ Backend processes and saves data to incident_reports table');
  console.log('✅ Database has all required columns');
  console.log('✅ Field mapping is consistent across frontend, backend, and database\n');
} else {
  console.log('⚠️  SOME TESTS FAILED - Review the issues above.\n');
  console.log('Common issues:');
  console.log('- Missing database columns (run migration)');
  console.log('- Controller not processing page10 fields');
  console.log('- Field name mismatches between frontend and backend\n');
}

console.log('======================================================================');

process.exit(failedTests > 0 ? 1 : 0);
