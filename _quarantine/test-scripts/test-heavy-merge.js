#!/usr/bin/env node

/**
 * Test: Heavy field filling + merge
 * Try to reproduce XRef errors by filling 100+ fields
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const MANY_FIELDS = [
  'email', 'mobile', 'street', 'town', 'street_name_optional', 'postcode', 'country',
  'driving_license_number', 'car_registration_number', 'vehicle_model', 'vehicle_colour',
  'vehicle_condition', 'recovery_company', 'recovery_breakdown_number', 'insurance_company',
  'policy_number', 'cover_type', 'recovery_breakdown_email', 'policy_holder',
  'vehicle_picture_front', 'driving_license_picture', 'vehicle_picture_driver_side',
  'vehicle_picture_passenger_side', 'vehicle_picture_back', 'medical_how_are_you_feeling',
  'medical_attention_from_who', 'speed_limit', 'nearest_landmark',
  'other_driver_vehicle_marked_for_export', 'witness_name', 'witness_statement',
  'witness_statement_2', 'other_breath_test', 'Date69_af_date', 'name', 'surname', 'id',
  'date_of_birth', 'emergency_contact_name', 'emergency_contact_number',
  'medical_injury_severity', 'medical_injury_details', 'medical_hospital_name',
  'accident_date', 'accident_time', 'your_speed', 'what3words', 'location', 'vehicle_make',
  'other-full-name', 'other-contact-number', 'other-email-address',
  'other-vehicle-look-up-make', 'other-vehicle-registration', 'other-vehicle-look-up-model',
  'other-vehicle-look-up-colour', 'other-vehicle-look-up-fuel-type',
  'other-vehicle-look-up-year', 'other-vehicle-look-up-mot-status',
  'other-vehicle-look-up-tax-status', 'other-vehicle-look-up-mot-expiry-date',
  'other-driving-license-number', 'other-drivers-insurance-company',
  'other-vehicle-look-up-tax-due-date', 'other-drivers-policy-number',
  'other-drivers-policy-holder-name', 'other-drivers-policy-cover-type',
  'other-vehicle-look-up-insurance-status', 'describe-damage-to-vehicle',
  'witness_email_2', 'accident_ref_number', 'officer_name', 'police_force',
  'officer_badge', 'user_breath_test', 'seatbelt_reason', 'emergency_audio_transcription',
  'emergency_recording_timestamp', 'medical_treatment_recieved',
  'further_medical_attention_needed', 'junction_type', 'junction_control',
  'user_manoeuvre', 'traffic_light_status', 'additional_hazards', 'vehicle_license_plate',
  'dvla_make', 'dvla_model', 'dvla_colour', 'dvla_year', 'dvla_fuel_type',
  'dvla_mot_status', 'dvla_mot_expiry', 'dvla_tax_status', 'dvla_tax_due_date',
  'witness_mobile_number', 'witness_email_address', 'additional_witnesses',
  'witness_number', 'subscription_start_date'
]; // 100 fields

async function testHeavyMerge() {
  console.log('🧪 Testing Heavy Merge (100 fields + Puppeteer)\n');

  const formPath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const formBytes = await fs.readFile(formPath);
  const pdfDoc = await PDFDocument.load(formBytes);
  const form = pdfDoc.getForm();

  console.log(`Filling ${MANY_FIELDS.length} fields...`);
  let filled = 0;
  MANY_FIELDS.forEach((fieldName, i) => {
    try {
      form.getTextField(fieldName).setText(`Value ${i + 1}: This is test data for ${fieldName}`);
      filled++;
    } catch (err) {}
  });

  console.log(`✅ Successfully filled ${filled} fields\n`);

  // Now MERGE with Puppeteer page
  console.log('Merging with Puppeteer page...');
  const page13Path = path.join(__dirname, 'test-output', 'test-page13-direct.pdf');
  const page13Bytes = await fs.readFile(page13Path);
  const page13Pdf = await PDFDocument.load(page13Bytes);

  const mergedPdf = await PDFDocument.create();

  // Copy pages 1-12 from filled form
  const formPages = await mergedPdf.copyPages(pdfDoc, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  formPages.forEach(page => mergedPdf.addPage(page));

  // Add Puppeteer page
  const [htmlPage] = await mergedPdf.copyPages(page13Pdf, [0]);
  mergedPdf.addPage(htmlPage);

  // Add remaining pages
  const totalPages = pdfDoc.getPageCount();
  if (totalPages > 12) {
    const remaining = await mergedPdf.copyPages(pdfDoc, [12, 13, 14, 15, 16, 17].slice(0, totalPages - 12));
    remaining.forEach(page => mergedPdf.addPage(page));
  }

  const merged = await mergedPdf.save();
  const output = path.join(__dirname, 'test-output', 'test-100-fields-merged.pdf');
  await fs.writeFile(output, merged);

  console.log(`\n✅ Saved: ${output}`);
  console.log(`   Size: ${(merged.length / 1024).toFixed(2)} KB\n`);

  console.log('━'.repeat(60));
  console.log('\n📊 Check for errors with:');
  console.log('  pdftotext test-output/test-100-fields-merged.pdf /dev/null 2>&1 | head -20\n');
  console.log('Expected: If XRef errors appear, we reproduced the bug!');
}

testHeavyMerge().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
