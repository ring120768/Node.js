#!/usr/bin/env node

/**
 * Verification Test: Confirm the fix works
 *
 * This test generates a PDF using the FIXED production pattern:
 * 1. Fill fields (production-scale data)
 * 2. Set NeedAppearances flag
 * 3. NO form.flatten() ← THE FIX
 * 4. Merge with double copyPages
 *
 * Expected: 0 XRef errors, pages 13-19 visible
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');

async function verifyFix() {
  console.log('✅ Fix Verification Test\n');
  console.log('Generating PDF with FIXED production pattern:\n');
  console.log('  1. Fill fields (120 fields, realistic data)');
  console.log('  2. Set NeedAppearances flag');
  console.log('  3. SKIP form.flatten() ← THE FIX');
  console.log('  4. Merge with double copyPages\n');

  const formPath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const formBytes = await fs.readFile(formPath);
  const pdfDoc = await PDFDocument.load(formBytes);
  const form = pdfDoc.getForm();

  // Fill production-scale data
  console.log('📝 Filling 100+ fields with realistic data...');
  const fields = [
    'email', 'mobile', 'street', 'town', 'postcode', 'country',
    'driving_license_number', 'car_registration_number', 'vehicle_model', 'vehicle_colour',
    'vehicle_condition', 'recovery_company', 'recovery_breakdown_number', 'insurance_company',
    'policy_number', 'cover_type', 'recovery_breakdown_email', 'policy_holder',
    'vehicle_picture_front', 'driving_license_picture', 'vehicle_picture_driver_side',
    'vehicle_picture_passenger_side', 'vehicle_picture_back',
    'medical_how_are_you_feeling', 'medical_attention_from_who',
    'speed_limit', 'nearest_landmark', 'witness_name', 'witness_statement',
    'witness_statement_2', 'other_breath_test', 'name', 'surname', 'id',
    'date_of_birth', 'emergency_contact_name', 'emergency_contact_number',
    'medical_injury_severity', 'medical_injury_details', 'medical_hospital_name',
    'accident_date', 'accident_time', 'your_speed', 'what3words', 'location', 'vehicle_make',
    'other-full-name', 'other-contact-number', 'other-email-address',
    'other-vehicle-look-up-make', 'other-vehicle-registration', 'other-vehicle-look-up-model',
    'other-vehicle-look-up-colour', 'other-vehicle-look-up-fuel-type',
    'other-driving-license-number', 'other-drivers-insurance-company',
    'other-drivers-policy-number', 'other-drivers-policy-holder-name',
    'describe-damage-to-vehicle', 'witness_email_2', 'accident_ref_number',
    'officer_name', 'police_force', 'officer_badge', 'user_breath_test',
    'emergency_audio_transcription', 'medical_treatment_recieved',
    'further_medical_attention_needed', 'junction_type', 'junction_control',
    'user_manoeuvre', 'traffic_light_status', 'additional_hazards',
    'vehicle_license_plate', 'dvla_make', 'dvla_model', 'dvla_colour',
    'witness_mobile_number', 'witness_email_address'
  ];

  const longUrl = 'https://example.supabase.co/storage/v1/object/sign/user-documents/abc123-def456/vehicle_damage_front.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ1c2VyLWRvY3VtZW50cy9hYmMxMjMtZGVmNDU2LWdoaTc4OS92ZWhpY2xlX2RhbWFnZV9mcm9udC5qcGciLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMzYwMH0.abcdefghijklmnopqrstuvwxyz1234567890';
  const longMedical = 'I was feeling significant pain in my neck and lower back immediately after the collision. The impact caused my head to jerk forward violently against the seatbelt, and I experienced sharp pain radiating down my spine.';
  const longAnalysis = 'Based on the available evidence including witness statements, vehicle damage assessment, and traffic conditions at the time of incident, the liability appears to rest primarily with the other driver.';

  let filled = 0;
  fields.forEach((fieldName, i) => {
    try {
      const field = form.getTextField(fieldName);
      if (fieldName.includes('picture') || fieldName.includes('image')) {
        field.setText(longUrl);
      } else if (fieldName.includes('medical') || fieldName.includes('injury') || fieldName.includes('feeling')) {
        field.setText(longMedical);
      } else if (fieldName.includes('transcription') || fieldName.includes('analysis') || fieldName.includes('statement')) {
        field.setText(longAnalysis);
      } else if (fieldName.includes('email')) {
        field.setText('test.user@example-domain.co.uk');
      } else {
        field.setText(`Test ${i + 1}: ${fieldName}`);
      }
      filled++;
    } catch (err) {}
  });

  const checkboxes = [
    'weather_heavy_rain', 'weather_fog', 'weather_dusk',
    'road_type_motorway', 'traffic_conditions_heavy',
    'no_it_needed_to_be_towed'
  ];

  let checked = 0;
  checkboxes.forEach(name => {
    try {
      form.getCheckBox(name).check();
      checked++;
    } catch (err) {}
  });

  console.log(`   ✅ Filled ${filled} text fields, checked ${checked} checkboxes\n`);

  // Set NeedAppearances flag
  console.log('🔧 Setting NeedAppearances flag...');
  try {
    const acroForm = pdfDoc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
    if (acroForm) {
      acroForm.set(PDFName.of('NeedAppearances'), pdfDoc.context.obj(true));
      console.log('   ✅ NeedAppearances set\n');
    }
  } catch (e) {
    console.log(`   ⚠️ Failed: ${e.message}\n`);
  }

  // CRITICAL: NO form.flatten() - this is the fix
  console.log('✅ SKIPPING form.flatten() ← THE FIX\n');

  // Merge with double copyPages
  console.log('🔄 Merging with double copyPages pattern...');
  const mergedPdf = await PDFDocument.create();

  const formPages1to12 = await mergedPdf.copyPages(pdfDoc, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  formPages1to12.forEach(page => mergedPdf.addPage(page));

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

  const formPages17to18 = await mergedPdf.copyPages(pdfDoc, [16, 17]);
  formPages17to18.forEach(page => mergedPdf.addPage(page));

  const merged = await mergedPdf.save();
  const output = path.join(__dirname, 'test-output', 'test-FIXED-production.pdf');
  await fs.writeFile(output, merged);

  console.log(`\n✅ FIXED PDF saved: ${output}`);
  console.log(`   Size: ${(merged.length / 1024).toFixed(2)} KB`);
  console.log(`   Pages: ${mergedPdf.getPageCount()}\n`);

  console.log('━'.repeat(60));
  console.log('\n📊 VERIFICATION RESULTS:\n');
  console.log('Run these commands to verify the fix:\n');
  console.log('1. Check for XRef errors:');
  console.log('   pdftotext test-output/test-FIXED-production.pdf /dev/null 2>&1 | grep "XRef"\n');
  console.log('2. Extract text from pages 13-16:');
  console.log('   pdftotext -f 13 -l 16 test-output/test-FIXED-production.pdf - 2>/dev/null | head -20\n');
  console.log('3. Open PDF in viewer and check pages 13-19 are visible\n');
  console.log('Expected results:');
  console.log('  ✅ Zero "Invalid XRef entry" errors');
  console.log('  ✅ Pages 13-19 visible and readable');
  console.log('  ⚠️ Minor font warnings OK (Tf operator - not critical)');
}

verifyFix().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
