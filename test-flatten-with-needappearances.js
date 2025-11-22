#!/usr/bin/env node

/**
 * Test: Does form.flatten() + NeedAppearances + merge cause XRef corruption?
 *
 * Production code (line 184) has form.flatten() commented out with note:
 * "DIAGNOSTIC TEST: Temporarily disable flattening to check if it causes XRef errors"
 *
 * This suggests flatten() is NORMALLY enabled but was disabled for testing.
 *
 * Hypothesis: The combination of:
 * 1. Filling fields
 * 2. Setting NeedAppearances flag (forces PDF readers to regenerate appearances)
 * 3. Calling form.flatten() (converts fields to static content)
 * 4. Merging with copyPages()
 *
 * ...may create the XRef corruption seen in production.
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');

async function testFlattenWithNeedAppearances() {
  console.log('🧪 Testing form.flatten() + NeedAppearances + Merge\n');
  console.log('Testing the EXACT production pattern:\n');
  console.log('  1. Fill fields (realistic data)');
  console.log('  2. Set NeedAppearances flag');
  console.log('  3. Call form.flatten()');
  console.log('  4. Merge with double copyPages pattern\n');

  const formPath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const formBytes = await fs.readFile(formPath);
  const pdfDoc = await PDFDocument.load(formBytes);
  const form = pdfDoc.getForm();

  // Step 1: Fill fields with realistic production-scale data
  console.log('📝 Step 1: Filling 50 fields with realistic data...');
  const fields = [
    'email', 'mobile', 'street', 'town', 'postcode', 'country',
    'driving_license_number', 'car_registration_number', 'vehicle_model', 'vehicle_colour',
    'vehicle_condition', 'recovery_company', 'recovery_breakdown_number', 'insurance_company',
    'policy_number', 'cover_type', 'recovery_breakdown_email', 'policy_holder',
    'vehicle_picture_front', 'driving_license_picture', 'vehicle_picture_driver_side',
    'vehicle_picture_passenger_side', 'vehicle_picture_back',
    'medical_how_are_you_feeling', 'medical_attention_from_who',
    'speed_limit', 'nearest_landmark', 'witness_name', 'witness_statement',
    'name', 'surname', 'date_of_birth', 'emergency_contact_name',
    'accident_date', 'accident_time', 'your_speed', 'location', 'vehicle_make',
    'other-full-name', 'other-contact-number', 'other-email-address',
    'other-vehicle-look-up-make', 'other-vehicle-registration',
    'describe-damage-to-vehicle', 'accident_ref_number', 'officer_name',
    'medical_treatment_recieved', 'junction_type', 'user_manoeuvre',
    'additional_hazards', 'dvla_make', 'dvla_model', 'dvla_colour'
  ];

  const longUrl = 'https://example.supabase.co/storage/v1/object/sign/user-documents/abc123-def456/vehicle_damage_front.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
  const longText = 'I was feeling significant pain in my neck and lower back immediately after the collision. The impact caused my head to jerk forward violently against the seatbelt.';

  let filled = 0;
  fields.forEach((fieldName, i) => {
    try {
      const field = form.getTextField(fieldName);
      if (fieldName.includes('picture') || fieldName.includes('image')) {
        field.setText(longUrl);
      } else if (fieldName.includes('medical') || fieldName.includes('feeling') || fieldName.includes('statement')) {
        field.setText(longText);
      } else {
        field.setText(`Test ${i + 1}: ${fieldName}`);
      }
      filled++;
    } catch (err) {
      // Field doesn't exist, skip
    }
  });

  // Fill checkboxes
  const checkboxes = [
    'weather_heavy_rain', 'weather_dusk', 'road_type_motorway',
    'traffic_conditions_heavy', 'no_it_needed_to_be_towed'
  ];

  let checked = 0;
  checkboxes.forEach(fieldName => {
    try {
      form.getCheckBox(fieldName).check();
      checked++;
    } catch (err) {
      // Field doesn't exist, skip
    }
  });

  console.log(`   ✅ Filled ${filled} text fields, checked ${checked} checkboxes\n`);

  // Step 2: Set NeedAppearances flag (production pattern from lines 130-145)
  console.log('🔧 Step 2: Setting NeedAppearances flag...');
  try {
    const acroForm = pdfDoc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
    if (acroForm) {
      acroForm.set(PDFName.of('NeedAppearances'), pdfDoc.context.obj(true));
      console.log('   ✅ NeedAppearances flag set to true\n');
    }
  } catch (e) {
    console.log(`   ⚠️ Failed to set NeedAppearances flag: ${e.message}\n`);
  }

  // Step 3: FLATTEN the form (production normally does this at line 184)
  console.log('🔨 Step 3: Calling form.flatten() [CRITICAL TEST]...');
  try {
    form.flatten();
    console.log('   ✅ Form flattened (fields converted to static content)\n');
  } catch (e) {
    console.log(`   ⚠️ Failed to flatten form: ${e.message}\n`);
  }

  // Step 4: Merge with Puppeteer using double copyPages pattern
  console.log('🔄 Step 4: Merging with double copyPages pattern...');
  const mergedPdf = await PDFDocument.create();

  // FIRST copyPages() call - pages 1-12
  console.log('   📄 First copyPages(): pages 1-12...');
  const formPages1to12 = await mergedPdf.copyPages(pdfDoc, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  formPages1to12.forEach(page => mergedPdf.addPage(page));

  // Add Puppeteer pages (4 separate PDFs)
  console.log('   🎨 Adding Puppeteer pages 13-16...');
  const page13Path = path.join(__dirname, 'test-output', 'test-page13-direct.pdf');
  const page13Bytes = await fs.readFile(page13Path);

  const page13Pdf = await PDFDocument.load(page13Bytes);
  const page14Pdf = await PDFDocument.load(page13Bytes);
  const page15Pdf = await PDFDocument.load(page13Bytes);
  const page16Pdf = await PDFDocument.load(page13Bytes);

  const [htmlPage13] = await mergedPdf.copyPages(page13Pdf, [0]);
  const [htmlPage14] = await mergedPdf.copyPages(page14Pdf, [0]);
  const [htmlPage15] = await mergedPdf.copyPages(page15Pdf, [0]);
  const [htmlPage16] = await mergedPdf.copyPages(page16Pdf, [0]);

  mergedPdf.addPage(htmlPage13);
  mergedPdf.addPage(htmlPage14);
  mergedPdf.addPage(htmlPage15);
  mergedPdf.addPage(htmlPage16);

  // SECOND copyPages() call on THE SAME SOURCE - pages 17-18
  console.log('   📄 Second copyPages() (SAME SOURCE): pages 17-18...');
  const formPages17to18 = await mergedPdf.copyPages(pdfDoc, [16, 17]);
  formPages17to18.forEach(page => mergedPdf.addPage(page));

  const merged = await mergedPdf.save();
  const output = path.join(__dirname, 'test-output', 'test-flatten-needappearances.pdf');
  await fs.writeFile(output, merged);

  console.log(`\n✅ Saved: ${output}`);
  console.log(`   Size: ${(merged.length / 1024).toFixed(2)} KB`);
  console.log(`   Pages: ${mergedPdf.getPageCount()}\n`);

  console.log('━'.repeat(60));
  console.log('\n📊 CRITICAL TEST RESULTS:\n');
  console.log('Check for XRef errors:');
  console.log('  pdftotext test-output/test-flatten-needappearances.pdf /dev/null 2>&1 | head -30\n');
  console.log('Expected outcomes:');
  console.log('  ✅ If XRef entry errors appear → We reproduced production bug!');
  console.log('  ✅ If SubType warnings appear → We reproduced production bug!');
  console.log('  ❌ If only Tf errors appear → flatten() is NOT the cause');
  console.log('  ❌ If no errors → Something else in production is causing it\n');
  console.log('Production errors we\'re looking for:');
  console.log('  - "Invalid XRef entry [number]"');
  console.log('  - "SubType on non-terminal field, invalid document?"');
}

testFlattenWithNeedAppearances().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
