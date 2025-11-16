/**
 * Find unmapped PDF fields by comparing PDF template fields
 * against what we're actually setting in the service
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function findUnmappedFields() {
  const templatePath = path.join(__dirname, '../pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');

  const pdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const fields = form.getFields();
  const pdfFieldNames = fields.map(f => f.getName());

  console.log('📄 Total PDF fields:', pdfFieldNames.length);
  console.log('\n🔍 Checking for common unmapped fields...\n');

  const potentiallyUnmapped = [
    // Hyphenated field names (might be causing issues)
    'other-full-name',
    'other-contact-number',
    'other-email-address',
    'other-vehicle-registration',
    'other-vehicle-look-up-make',
    'other-vehicle-look-up-model',
    'other-vehicle-look-up-colour',
    'other-vehicle-look-up-fuel-type',
    'other-vehicle-look-up-year',
    'other-vehicle-look-up-mot-status',
    'other-vehicle-look-up-tax-status',
    'other-vehicle-look-up-mot-expiry-date',
    'other-vehicle-look-up-tax-due-date',
    'other-vehicle-look-up-insurance-status',
    'other-driving-license-number',
    'other-drivers-insurance-company',
    'other-drivers-policy-number',
    'other-drivers-policy-holder-name',
    'other-drivers-policy-cover-type',
    'describe-damage-to-vehicle',
    'no-visible-damage',

    // Potentially missing medical fields
    'medical_how_are_you_feeling',
    'medical_attention_from_who',
    'medical_treatment_recieved',  // Typo in PDF
    'further_medical_attention_needed',

    // AI/Emergency fields
    'ai_summary_of_accident_data_transcription',
    'detailed_account_of_what_happened',
    'file_url_record_detailed_account_of_what_happened',
    'ai_model_used',
    'emergency_audio_transcription',
    'emergency_recording_timestamp',

    // Other potentially missing
    'other_driver_vehicle_marked_for_export',
    'map_screenshot_captured',
    'additional_witnesses',
    'witness_number',
    'Date69_af_date'
  ];

  const existingFields = potentiallyUnmapped.filter(fieldName => pdfFieldNames.includes(fieldName));
  const missingFields = potentiallyUnmapped.filter(fieldName => !pdfFieldNames.includes(fieldName));

  console.log('✅ FIELDS THAT EXIST IN PDF:');
  existingFields.forEach(f => console.log(`   ${f}`));

  console.log('\n❌ FIELDS NOT FOUND IN PDF:');
  missingFields.forEach(f => console.log(`   ${f}`));

  console.log('\n💡 CRITICAL ISSUES TO FIX:\n');

  // Check if hyphenated versions exist
  const hyphenatedIssues = existingFields.filter(f => f.includes('-'));
  if (hyphenatedIssues.length > 0) {
    console.log('⚠️  HYPHEN VS UNDERSCORE MISMATCH:');
    console.log('   PDF uses hyphens, but our code uses underscores for:');
    hyphenatedIssues.forEach(f => {
      const underscore = f.replace(/-/g, '_');
      console.log(`   PDF: "${f}" vs Code: "${underscore}"`);
    });
  }
}

findUnmappedFields().catch(console.error);
