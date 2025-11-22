#!/usr/bin/env node

/**
 * Test: Production-scale field filling with realistic data
 * Goal: Reproduce XRef errors by matching production's:
 * - 200+ fields filled
 * - Long URLs and text (like Supabase Storage URLs, AI text)
 * - Double copyPages() pattern
 * - Merge with Puppeteer pages
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// Realistic long URL (like Supabase Storage signed URLs)
const LONG_IMAGE_URL = 'https://example.supabase.co/storage/v1/object/sign/user-documents/abc123-def456-ghi789/vehicle_damage_front.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ1c2VyLWRvY3VtZW50cy9hYmMxMjMtZGVmNDU2LWdoaTc4OS92ZWhpY2xlX2RhbWFnZV9mcm9udC5qcGciLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMzYwMH0.abcdefghijklmnopqrstuvwxyz1234567890';

// Realistic long medical text (like user might enter)
const LONG_MEDICAL_TEXT = 'I was feeling significant pain in my neck and lower back immediately after the collision. The impact caused my head to jerk forward violently against the seatbelt, and I experienced sharp pain radiating down my spine. I also noticed bruising developing on my chest from the seatbelt restraint. The pain intensified over the following hours, making it difficult to turn my head or bend forward. I would rate the pain as 8/10 in severity.';

// Realistic AI-generated analysis (like OpenAI GPT-4 output)
const LONG_AI_ANALYSIS = 'Based on the available evidence including witness statements, vehicle damage assessment, and traffic conditions at the time of incident, the liability appears to rest primarily with the other driver. The photographic evidence clearly shows significant rear-end damage to the claimant\'s vehicle, consistent with their account of being struck from behind while stationary at traffic lights. The other driver\'s admission at the scene that they "didn\'t brake in time" further supports this determination. Weather conditions (light rain) and road surface (wet tarmac) are noted but do not appear to be primary contributing factors given the straightforward nature of the collision.';

async function testProductionScale() {
  console.log('🧪 Testing Production-Scale PDF Generation\n');

  const formPath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const formBytes = await fs.readFile(formPath);
  const pdfDoc = await PDFDocument.load(formBytes);
  const form = pdfDoc.getForm();

  console.log('Filling 200+ fields with realistic data...');

  let textFieldsFilled = 0;
  let checkboxesFilled = 0;

  // Fill ALL text fields with realistic long data
  const textFields = [
    'email', 'mobile', 'street', 'town', 'street_name_optional', 'postcode', 'country',
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
    'other-vehicle-look-up-year', 'other-vehicle-look-up-mot-status',
    'other-vehicle-look-up-tax-status', 'other-vehicle-look-up-mot-expiry-date',
    'other-driving-license-number', 'other-drivers-insurance-company',
    'other-vehicle-look-up-tax-due-date', 'other-drivers-policy-number',
    'other-drivers-policy-holder-name', 'other-drivers-policy-cover-type',
    'other-vehicle-look-up-insurance-status', 'describe-damage-to-vehicle',
    'witness_email_2', 'accident_ref_number', 'officer_name', 'police_force',
    'officer_badge', 'user_breath_test', 'seatbelt_reason',
    'emergency_audio_transcription', 'emergency_recording_timestamp',
    'medical_treatment_recieved', 'further_medical_attention_needed',
    'junction_type', 'junction_control', 'user_manoeuvre', 'traffic_light_status',
    'additional_hazards', 'vehicle_license_plate', 'dvla_make', 'dvla_model',
    'dvla_colour', 'dvla_year', 'dvla_fuel_type', 'dvla_mot_status',
    'dvla_mot_expiry', 'dvla_tax_status', 'dvla_tax_due_date',
    'witness_mobile_number', 'witness_email_address', 'additional_witnesses',
    'witness_number', 'subscription_start_date'
  ];

  textFields.forEach((fieldName, i) => {
    try {
      const field = form.getTextField(fieldName);

      // Use different realistic data based on field type
      if (fieldName.includes('picture') || fieldName.includes('image')) {
        field.setText(LONG_IMAGE_URL);
      } else if (fieldName.includes('medical') || fieldName.includes('injury') || fieldName.includes('feeling')) {
        field.setText(LONG_MEDICAL_TEXT);
      } else if (fieldName.includes('transcription') || fieldName.includes('analysis') || fieldName.includes('statement')) {
        field.setText(LONG_AI_ANALYSIS);
      } else if (fieldName.includes('email')) {
        field.setText('test.user.with.a.very.long.email.address@example-domain-with-long-name.co.uk');
      } else if (fieldName.includes('mobile') || fieldName.includes('number')) {
        field.setText('+447700900123456');
      } else if (fieldName.includes('street') || fieldName.includes('location') || fieldName.includes('landmark')) {
        field.setText('123 Very Long Street Name With Multiple Words And Numbers, Near The Large Shopping Center');
      } else {
        field.setText(`Field ${i + 1}: ${fieldName} - This is realistic production-length data`);
      }
      textFieldsFilled++;
    } catch (err) {
      // Field doesn't exist, skip
    }
  });

  // Fill ALL checkboxes (check them all)
  const checkboxes = [
    'weather_heavy_rain', 'weather_fog', 'weather_snow', 'weather_thunder_lightening',
    'weather_drizzle', 'weather_raining', 'weather_windy', 'weather_dusk',
    'road_type_motorway', 'road_type_urban', 'road_type_rural', 'road_type_car_park',
    'traffic_conditions_heavy', 'road_type_private_road', 'traffic_conditions_moderate',
    'road_type_a_road', 'road_type_b_road', 'traffic_conditions_light',
    'traffic_conditions_no_traffic', 'driving_your_usual_vehicle_no',
    'no_it_needed_to_be_towed', 'unsure _did_not_attempt'
  ];

  checkboxes.forEach(fieldName => {
    try {
      const field = form.getCheckBox(fieldName);
      field.check();
      checkboxesFilled++;
    } catch (err) {
      // Field doesn't exist, skip
    }
  });

  console.log(`✅ Filled ${textFieldsFilled} text fields`);
  console.log(`✅ Checked ${checkboxesFilled} checkboxes`);
  console.log(`📊 Total fields filled: ${textFieldsFilled + checkboxesFilled}\n`);

  // Now MERGE using EXACT production pattern
  console.log('Merging with PRODUCTION pattern (double copyPages + Puppeteer)...');
  const mergedPdf = await PDFDocument.create();

  // FIRST copyPages() call - pages 1-12
  console.log('  📄 First copyPages(): pages 1-12...');
  const formPages1to12 = await mergedPdf.copyPages(pdfDoc, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  formPages1to12.forEach(page => mergedPdf.addPage(page));

  // Add Puppeteer pages (4 separate PDFs like production)
  console.log('  🎨 Adding Puppeteer pages 13-16...');
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
  console.log('  📄 Second copyPages() (SAME SOURCE): pages 17-18...');
  const formPages17to18 = await mergedPdf.copyPages(pdfDoc, [16, 17]);
  formPages17to18.forEach(page => mergedPdf.addPage(page));

  const merged = await mergedPdf.save();
  const output = path.join(__dirname, 'test-output', 'test-production-scale.pdf');
  await fs.writeFile(output, merged);

  console.log(`\n✅ Saved: ${output}`);
  console.log(`   Size: ${(merged.length / 1024).toFixed(2)} KB`);
  console.log(`   Pages: ${mergedPdf.getPageCount()}\n`);

  console.log('━'.repeat(60));
  console.log('\n📊 Check for XRef errors:');
  console.log('  pdftotext test-output/test-production-scale.pdf /dev/null 2>&1 | head -30\n');
  console.log('Expected: If XRef errors appear (like production), we reproduced it!');
  console.log('If only Tf errors, field COUNT/TYPE is not the issue.');
}

testProductionScale().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
