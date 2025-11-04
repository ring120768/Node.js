/**
 * Test Page 7 Field Mappings
 * Validates all HTML elements, JavaScript references, and data structure
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Page 7 (Other Vehicle) Field Mappings...\n');

// Read the HTML file
const htmlPath = path.join(__dirname, '../public/incident-form-page7-other-vehicle.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Expected field mappings from CSV
const expectedFields = {
  // Driver fields
  'other-full-name': { type: 'input', name: 'other_full_name' },
  'other-contact-number': { type: 'input', name: 'other_contact_number' },
  'other-email-address': { type: 'input', name: 'other_email_address' },
  'other-driving-license-number': { type: 'input', name: 'other_driving_license_number' },

  // Vehicle registration
  'other-vehicle-registration': { type: 'input', name: 'other_vehicle_registration' },

  // DVLA lookup display fields (span elements)
  'other-vehicle-look-up-make': { type: 'span', name: null },
  'other-vehicle-look-up-model': { type: 'span', name: null },
  'other-vehicle-look-up-colour': { type: 'span', name: null },
  'other-vehicle-look-up-year': { type: 'span', name: null },
  'other-vehicle-look-up-fuel-type': { type: 'span', name: null },
  'other-vehicle-look-up-mot-status': { type: 'span', name: null },
  'other-vehicle-look-up-mot-expiry-date': { type: 'span', name: null },
  'other-vehicle-look-up-tax-status': { type: 'span', name: null },
  'other-vehicle-look-up-tax-due-date': { type: 'span', name: null },
  'other-vehicle-look-up-insurance-status': { type: 'span', name: null },

  // Insurance fields
  'other-drivers-insurance-company': { type: 'input', name: 'other_drivers_insurance_company' },
  'other-drivers-policy-number': { type: 'input', name: 'other_drivers_policy_number' },
  'other-drivers-policy-holder-name': { type: 'input', name: 'other_drivers_policy_holder_name' },
  'other-drivers-policy-cover-type': { type: 'select', name: 'other_drivers_policy_cover_type' },

  // Damage fields
  'no-visible-damage-checkbox': { type: 'input', name: 'no_visible_damage' },
  'describe-damage-to-vehicle': { type: 'textarea', name: 'describe_damage_to_vehicle' },
  'damage-description-count': { type: 'span', name: null }
};

// Old field names that should NOT exist anymore
const deprecatedFields = [
  'other-driver-name',
  'other-driver-phone',
  'other-driver-email',
  'other-driver-license',
  'other-license-plate',
  'vehicle-make',
  'vehicle-model',
  'vehicle-colour',
  'vehicle-year',
  'vehicle-fuel',
  'other-mot-status',
  'other-mot-expiry',
  'other-tax-status',
  'other-tax-due',
  'other-insurance-company',
  'other-policy-number',
  'other-policy-holder',
  'other-policy-cover',
  'other-point-of-impact',
  'other-impact-count',
  'no-damage-checkbox'
];

let passCount = 0;
let failCount = 0;
const errors = [];
const warnings = [];

console.log('📋 Test 1: HTML Element Existence\n');

// Test 1: Check all expected fields exist in HTML
for (const [fieldId, fieldInfo] of Object.entries(expectedFields)) {
  const patterns = [
    new RegExp(`id="${fieldId}"`, 'g'),
    new RegExp(`id='${fieldId}'`, 'g')
  ];

  const found = patterns.some(pattern => pattern.test(htmlContent));

  if (found) {
    console.log(`  ✅ ${fieldId}`);
    passCount++;
  } else {
    console.log(`  ❌ ${fieldId} - NOT FOUND`);
    errors.push(`HTML element with id="${fieldId}" not found`);
    failCount++;
  }
}

console.log('\n📋 Test 2: Deprecated Fields Removed\n');

// Test 2: Ensure old field names are gone
for (const oldFieldId of deprecatedFields) {
  const pattern = new RegExp(`id=["']${oldFieldId}["']`, 'g');
  const found = pattern.test(htmlContent);

  if (!found) {
    console.log(`  ✅ ${oldFieldId} - correctly removed`);
    passCount++;
  } else {
    console.log(`  ⚠️  ${oldFieldId} - STILL EXISTS (should be removed)`);
    warnings.push(`Deprecated field "${oldFieldId}" still found in HTML`);
    failCount++;
  }
}

console.log('\n📋 Test 3: JavaScript getElementById References\n');

// Test 3: Check JavaScript uses correct IDs
const jsGetElementByIdPatterns = Object.keys(expectedFields).map(fieldId => {
  return new RegExp(`getElementById\\(['"]${fieldId}['"]\\)`, 'g');
});

for (const [fieldId] of Object.entries(expectedFields)) {
  const pattern = new RegExp(`getElementById\\(['"]${fieldId}['"]\\)`, 'g');
  const matches = htmlContent.match(pattern) || [];

  if (matches.length > 0) {
    console.log(`  ✅ ${fieldId} - found ${matches.length} reference(s)`);
    passCount++;
  } else {
    console.log(`  ⚠️  ${fieldId} - no JavaScript references (might be OK for display-only fields)`);
    // Don't count as fail for display-only fields
    if (expectedFields[fieldId].type !== 'span') {
      warnings.push(`No getElementById reference found for "${fieldId}"`);
    }
  }
}

console.log('\n📋 Test 4: JavaScript Variable References\n');

// Test 4: Check key JavaScript variables
const jsVariables = [
  'describeDamageToVehicle',
  'damageDescriptionCount',
  'noDamageCheckbox'
];

const deprecatedVariables = [
  'otherPointOfImpact',
  'otherImpactCount'
];

for (const varName of jsVariables) {
  const pattern = new RegExp(`\\b${varName}\\b`, 'g');
  const matches = htmlContent.match(pattern) || [];

  if (matches.length > 0) {
    console.log(`  ✅ ${varName} - found ${matches.length} reference(s)`);
    passCount++;
  } else {
    console.log(`  ❌ ${varName} - NOT FOUND`);
    errors.push(`JavaScript variable "${varName}" not found`);
    failCount++;
  }
}

console.log('\n📋 Test 5: Deprecated JavaScript Variables\n');

for (const varName of deprecatedVariables) {
  const pattern = new RegExp(`\\b${varName}\\b`, 'g');
  const matches = htmlContent.match(pattern) || [];

  if (matches.length === 0) {
    console.log(`  ✅ ${varName} - correctly removed`);
    passCount++;
  } else {
    console.log(`  ⚠️  ${varName} - STILL EXISTS (${matches.length} reference(s))`);
    warnings.push(`Deprecated variable "${varName}" still found ${matches.length} time(s)`);
    failCount++;
  }
}

console.log('\n📋 Test 6: Data Collection Structure\n');

// Test 6: Check "Add Another Vehicle" data collection
const dataStructureFields = [
  'other_full_name',
  'other_contact_number',
  'other_email_address',
  'other_driving_license_number',
  'other_vehicle_registration',
  'other_vehicle_look_up_make',
  'other_vehicle_look_up_model',
  'other_vehicle_look_up_colour',
  'other_vehicle_look_up_year',
  'other_vehicle_look_up_fuel_type',
  'other_vehicle_look_up_mot_status',
  'other_vehicle_look_up_mot_expiry_date',
  'other_vehicle_look_up_tax_status',
  'other_vehicle_look_up_tax_due_date',
  'other_vehicle_look_up_insurance_status',
  'other_drivers_insurance_company',
  'other_drivers_policy_number',
  'other_drivers_policy_holder_name',
  'other_drivers_policy_cover_type',
  'describe_damage_to_vehicle',
  'no_visible_damage'
];

for (const fieldName of dataStructureFields) {
  const pattern = new RegExp(`${fieldName}:`, 'g');
  const found = pattern.test(htmlContent);

  if (found) {
    console.log(`  ✅ ${fieldName}`);
    passCount++;
  } else {
    console.log(`  ❌ ${fieldName} - NOT IN DATA STRUCTURE`);
    errors.push(`Field "${fieldName}" not found in data collection structure`);
    failCount++;
  }
}

console.log('\n📋 Test 7: Backward Compatibility\n');

// Test 7: Check backward compatibility in loadSavedData
const backwardCompatFields = [
  'other_driver_name',
  'other_driver_phone',
  'other_driver_email',
  'other_driver_license',
  'other_license_plate',
  'other_insurance_company',
  'other_policy_number',
  'other_policy_holder',
  'other_policy_cover',
  'other_point_of_impact'
];

let backwardCompatFound = 0;
for (const fieldName of backwardCompatFields) {
  const pattern = new RegExp(`data\\.${fieldName}`, 'g');
  if (pattern.test(htmlContent)) {
    backwardCompatFound++;
  }
}

if (backwardCompatFound >= backwardCompatFields.length) {
  console.log(`  ✅ Backward compatibility implemented (${backwardCompatFound}/${backwardCompatFields.length} old fields supported)`);
  passCount++;
} else {
  console.log(`  ⚠️  Partial backward compatibility (${backwardCompatFound}/${backwardCompatFields.length} old fields supported)`);
  warnings.push('Not all old field names supported in loadSavedData()');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`⚠️  Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.log('\n❌ ERRORS:');
  errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Page 7 field mappings are correct.');
  process.exit(0);
} else if (errors.length === 0) {
  console.log('\n✅ All critical tests passed. Some warnings to review.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please review the errors above.');
  process.exit(1);
}
