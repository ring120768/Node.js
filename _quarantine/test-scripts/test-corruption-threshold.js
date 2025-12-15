#!/usr/bin/env node

/**
 * Test Corruption Threshold
 * Find at what point PDFLib form filling creates XRef errors
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const FIELD_NAMES = [
  'email', 'mobile', 'street', 'town', 'postcode', 'country',
  'driving_license_number', 'car_registration_number', 'vehicle_model', 'vehicle_colour',
  'vehicle_condition', 'recovery_company', 'recovery_breakdown_number', 'insurance_company',
  'policy_number', 'cover_type', 'recovery_breakdown_email', 'policy_holder',
  'medical_how_are_you_feeling', 'medical_attention_from_who', 'speed_limit', 'nearest_landmark',
  'other_driver_vehicle_marked_for_export', 'witness_name', 'street_name_optional',
  'vehicle_picture_front', 'driving_license_picture', 'vehicle_picture_driver_side',
  'vehicle_picture_passenger_side', 'vehicle_picture_back'
];

async function testWithFieldCount(count, testName) {
  console.log(`\nTest: Fill ${count} fields...`);

  const formPath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const formBytes = await fs.readFile(formPath);
  const pdfDoc = await PDFDocument.load(formBytes);
  const form = pdfDoc.getForm();

  // Fill the specified number of fields
  for (let i = 0; i < Math.min(count, FIELD_NAMES.length); i++) {
    try {
      const field = form.getTextField(FIELD_NAMES[i]);
      field.setText(`Test value ${i + 1}`);
    } catch (err) {
      console.log(`  ⚠️  Field "${FIELD_NAMES[i]}" not found, skipping`);
    }
  }

  const filled = await pdfDoc.save();
  const outputPath = path.join(__dirname, 'test-output', `test-${testName}-fields.pdf`);
  await fs.writeFile(outputPath, filled);

  console.log(`  ✅ Saved: ${outputPath}`);
  console.log(`  📊 Size: ${(filled.length / 1024).toFixed(2)} KB`);

  return outputPath;
}

async function testCorruptionThreshold() {
  console.log('🧪 Testing Form Filling Corruption Threshold\n');
  console.log('━'.repeat(60));

  const tests = [
    { count: 10, name: '10' },
    { count: 25, name: '25' },
    { count: 30, name: '30' },  // Test around 30 (all field names we have)
  ];

  for (const test of tests) {
    await testWithFieldCount(test.count, test.name);
  }

  console.log('\n' + '━'.repeat(60));
  console.log('📊 Tests Complete\n');
  console.log('Now check for XRef errors:');
  console.log('  pdftotext test-output/test-10-fields.pdf - 2>&1 | grep -i "error\\|warning" | head -5');
  console.log('  pdftotext test-output/test-25-fields.pdf - 2>&1 | grep -i "error\\|warning" | head -5');
  console.log('  pdftotext test-output/test-30-fields.pdf - 2>&1 | grep -i "error\\|warning" | head -5\n');
  console.log('Expected pattern:');
  console.log('  - 10 fields: Likely CLEAN');
  console.log('  - 25 fields: May start showing errors');
  console.log('  - 30 fields: Will show if threshold is reached');
}

testCorruptionThreshold().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
