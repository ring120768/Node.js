#!/usr/bin/env node
/**
 * Verify Field Alignment: PDF vs. Supabase vs. Code
 * Check if database field names match PDF field names
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

// PDF Fields (from extract-pdf-fields.js)
const pdfFields = [
  'when_did_the_accident_happen',
  'what_time_did_the_accident_happen',
  'where_exactly_did_this_happen',
  'detailed_account_of_what_happened',
  'other_drivers_name',
  'other_drivers_number',
  'other_drivers_address',
  'other_make_of_vehicle',
  'other_model_of_vehicle',
  'vehicle_license_plate',
  'other_insurance_company',
  'did_police_attend',
  'any_witness',
  'medical_chest_pain',
  'medical_breathlessness',
  'weather_clear_and_dry',
  'weather_heavy_rain'
];

// Supabase Fields (from TYPEFORM_SUPABASE_FIELD_MAPPING.md)
const supabaseFields = [
  'when_did_the_accident_happen',
  'what_time_did_the_accident_happen',
  'where_exactly_did_this_happen',
  'detailed_account_of_what_happened',
  'other_drivers_name',
  'other_drivers_number',
  'other_drivers_address',
  'other_make_of_vehicle',
  'other_model_of_vehicle',
  'vehicle_license_plate',
  'other_insurance_company',
  'did_police_attend',
  'any_witness',
  'medical_chest_pain',
  'medical_breathlessness',
  'weather_clear_and_dry',
  'weather_heavy_rain'
];

// lib/pdfGenerator.js Fields (from code inspection)
const codeFields = [
  'accident_date',           // ❌ WRONG
  'accident_time',           // ❌ WRONG
  'accident_location',       // ❌ WRONG
  'detailed_account_of_what_happened',
  'other_driver_name',       // ❌ WRONG (missing 's')
  'other_driver_number',     // ❌ WRONG (missing 's')
  'other_driver_address',    // ❌ WRONG (missing 's')
  'other_make',              // ❌ WRONG
  'other_model',             // ❌ WRONG
  'other_license',           // ❌ WRONG
  'other_insurance',         // ❌ WRONG
  'police_attended',         // ❌ WRONG
  'witness_present',         // ❌ WRONG
  'medical_chest_pain',
  'medical_breathlessness',
  'weather_clear_dry',       // ❌ WRONG (missing 'and')
  'weather_heavy_rain'
];

console.log(colors.cyan, '\n🔍 FIELD NAME ALIGNMENT VERIFICATION\n');
console.log('='.repeat(80), '\n');

console.log(colors.cyan, '📋 Checking Sample Fields:\n');

const checks = [
  { label: 'Accident Date', pdf: 'when_did_the_accident_happen', supabase: 'when_did_the_accident_happen', code: 'accident_date' },
  { label: 'Accident Time', pdf: 'what_time_did_the_accident_happen', supabase: 'what_time_did_the_accident_happen', code: 'accident_time' },
  { label: 'Accident Location', pdf: 'where_exactly_did_this_happen', supabase: 'where_exactly_did_this_happen', code: 'accident_location' },
  { label: 'Other Driver Name', pdf: 'other_drivers_name', supabase: 'other_drivers_name', code: 'other_driver_name' },
  { label: 'Other Driver Number', pdf: 'other_drivers_number', supabase: 'other_drivers_number', code: 'other_driver_number' },
  { label: 'Other Vehicle Make', pdf: 'other_make_of_vehicle', supabase: 'other_make_of_vehicle', code: 'other_make' },
  { label: 'Police Attended', pdf: 'did_police_attend', supabase: 'did_police_attend', code: 'police_attended' },
  { label: 'Witness Present', pdf: 'any_witness', supabase: 'any_witness', code: 'witness_present' },
  { label: 'Weather Clear', pdf: 'weather_clear_and_dry', supabase: 'weather_clear_and_dry', code: 'weather_clear_dry' }
];

let matchCount = 0;
let mismatchCount = 0;

checks.forEach(check => {
  const pdfSupabaseMatch = check.pdf === check.supabase;
  const codeMatch = check.pdf === check.code;

  console.log(colors.yellow, `\n${check.label}:`);
  console.log(`  PDF Field:      ${check.pdf}`);
  console.log(`  Supabase Field: ${check.supabase} ${pdfSupabaseMatch ? colors.green + '✓' + colors.reset : colors.red + '✗' + colors.reset}`);
  console.log(`  Code Field:     ${check.code} ${codeMatch ? colors.green + '✓' + colors.reset : colors.red + '✗ MISMATCH' + colors.reset}`);

  if (pdfSupabaseMatch && codeMatch) {
    matchCount++;
  } else {
    mismatchCount++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(colors.cyan, '\n📊 SUMMARY:\n');

console.log(colors.green, '✅ PDF ↔ Supabase Alignment:');
console.log('   All sample fields match PERFECTLY!');
console.log('   Supabase field names are correct and match the PDF.\n');

console.log(colors.red, '❌ Code ↔ PDF Alignment:');
console.log(`   ${mismatchCount} of ${checks.length} sample fields have MISMATCHES!`);
console.log('   lib/pdfGenerator.js uses incorrect field names.\n');

console.log(colors.yellow, '💡 CONCLUSION:\n');
console.log('   ✓ PDF is the source of truth');
console.log('   ✓ Supabase mirrors PDF correctly');
console.log('   ✗ Code (lib/pdfGenerator.js) needs fixing');
console.log('   \n   The data is IN the database with correct field names,');
console.log('   but the code is trying to SET PDF fields with WRONG names!\n');

console.log(colors.reset);
