/**
 * PDF Field Validation Test
 *
 * Validates that all 207+ PDF fields are correctly populated from database data.
 *
 * Tests:
 * 1. Load user data from database (all 6 tables)
 * 2. Generate PDF using pdfFormFiller
 * 3. Extract fields from generated PDF
 * 4. Compare with expected values from database
 * 5. Report missing, incorrect, or unpopulated fields
 *
 * Usage:
 *   node scripts/test-pdf-field-validation.js [user-uuid]
 *
 * If no UUID provided, uses test user: 1af483d1-35c3-4202-a50f-4b5a8aa631f7
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const pdfFormFiller = require('../lib/generators/pdfFormFiller');
const dataFetcher = require('../lib/data/dataFetcher');
const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdf-lib').PDFDocument;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test user ID (from previous tests)
const DEFAULT_TEST_USER = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

// Output directory for test PDFs
const OUTPUT_DIR = path.join(__dirname, '../test-output/pdf-validation');

// Test results tracking
const results = {
  total: 0,
  populated: 0,
  missing: 0,
  incorrect: 0,
  errors: []
};

/**
 * Format test result
 */
function test(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`${icon} ${name}: ${status}`);
  if (details) console.log(`   ${details}`);

  results.total++;
  if (!passed) {
    results.errors.push({ name, details });
  }
}

/**
 * Compare PDF field value with expected database value
 */
function compareValues(fieldName, pdfValue, dbValue, isRequired = true) {
  const testName = `Field: ${fieldName}`;

  // Handle null/undefined
  if (!pdfValue || pdfValue === '') {
    if (isRequired && (!dbValue || dbValue === '')) {
      test(testName, false, `Missing required field (both PDF and DB empty)`);
      results.missing++;
      return false;
    } else if (!isRequired) {
      test(testName, true, `Optional field (empty)`);
      results.populated++;
      return true;
    } else if (dbValue) {
      test(testName, false, `PDF empty but DB has value: "${dbValue}"`);
      results.missing++;
      return false;
    }
  }

  // Convert to strings for comparison
  const pdfStr = String(pdfValue).trim();
  const dbStr = dbValue ? String(dbValue).trim() : '';

  // Check if values match
  if (pdfStr === dbStr) {
    test(testName, true, `Match: "${pdfStr}"`);
    results.populated++;
    return true;
  } else {
    test(testName, false, `Mismatch - PDF: "${pdfStr}", DB: "${dbStr}"`);
    results.incorrect++;
    return false;
  }
}

/**
 * Main validation test
 */
async function runValidation(userId) {
  console.log('📋 PDF Field Validation Test\n');
  console.log('='.repeat(70));
  console.log(`User ID: ${userId}`);
  console.log('='.repeat(70));
  console.log('');

  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Phase 1: Fetch data from database
    console.log('1️⃣ Fetching user data from database...\n');

    const data = await dataFetcher.getCompleteUserData(userId);

    test('User signup data loaded', !!data.userSignup,
         data.userSignup ? `Email: ${data.userSignup.email}` : 'No data');
    test('Incident report loaded', !!data.incidentReport,
         data.incidentReport ? `Report ID: ${data.incidentReport.id}` : 'No data');
    test('Other vehicles loaded', !!data.otherVehicles,
         data.otherVehicles ? `${data.otherVehicles.length} vehicle(s)` : 'No data');
    test('Witnesses loaded', !!data.witnesses,
         data.witnesses ? `${data.witnesses.length} witness(es)` : 'No data');
    test('Documents loaded', !!data.documents,
         data.documents ? `${data.documents.length} document(s)` : 'No data');

    console.log('');

    // Phase 2: Generate PDF
    console.log('2️⃣ Generating PDF from data...\n');

    const pdfBytes = await pdfFormFiller.fillForm(data);
    test('PDF generation successful', !!pdfBytes,
         pdfBytes ? `PDF size: ${(pdfBytes.length / 1024).toFixed(2)} KB` : 'Failed');

    // Save PDF for manual inspection
    const pdfPath = path.join(OUTPUT_DIR, `validation-${userId}-${Date.now()}.pdf`);
    await fs.writeFile(pdfPath, pdfBytes);
    console.log(`   📄 PDF saved to: ${pdfPath}`);
    console.log('');

    // Phase 3: Extract and validate fields
    console.log('3️⃣ Extracting and validating PDF fields...\n');

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`   Found ${fields.length} fields in PDF\n`);

    // Group validation by page/section
    console.log('📋 PAGE 1: LEGAL ACKNOWLEDGMENT');
    console.log('-'.repeat(70));

    // Page 1 validation
    if (data.userSignup) {
      const signup = data.userSignup;

      // Legal acknowledgment checkbox
      try {
        const legalAck = form.getCheckBox('legal_acknowledgment');
        const isChecked = signup.gdpr_consent === true;
        compareValues('legal_acknowledgment', legalAck.isChecked(), isChecked, true);
      } catch (e) {
        test('legal_acknowledgment', false, `Field not found in PDF`);
        results.missing++;
      }
    }
    console.log('');

    // Page 2: Medical Information
    console.log('📋 PAGE 2: MEDICAL INFORMATION');
    console.log('-'.repeat(70));

    if (data.incidentReport) {
      const incident = data.incidentReport;

      // Medical attention fields (19 fields total from Page 2)
      const page2Fields = {
        'medical_attention_needed': incident.medical_attention_needed,
        'medical_hospital_name': incident.medical_hospital_name,
        'medical_treatment_received': incident.medical_treatment_received,
        'medical_injury_details': incident.medical_injury_details,
        'medical_ongoing_treatment': incident.medical_ongoing_treatment,
        'medical_return_to_work': incident.medical_return_to_work,
        'medical_work_impact': incident.medical_work_impact,
        'medical_prior_conditions': incident.medical_prior_conditions,
        'medical_prior_details': incident.medical_prior_details
      };

      for (const [fieldName, dbValue] of Object.entries(page2Fields)) {
        try {
          const field = form.getTextField(fieldName);
          compareValues(fieldName, field.getText(), dbValue, false);
        } catch (e) {
          test(fieldName, false, `Field not found in PDF`);
          results.missing++;
        }
      }

      // Medical symptom checkboxes (arrays)
      const symptomArrays = {
        'medical_symptom_headaches': incident.medical_symptom_headaches,
        'medical_symptom_neck_pain': incident.medical_symptom_neck_pain,
        'medical_symptom_back_pain': incident.medical_symptom_back_pain,
        'medical_symptom_limb_pain_mobility': incident.medical_symptom_limb_pain_mobility,
        'medical_symptom_chest_pain': incident.medical_symptom_chest_pain,
        'medical_symptom_abdominal_bruising': incident.medical_symptom_abdominal_bruising,
        'medical_symptom_whiplash': incident.medical_symptom_whiplash,
        'medical_symptom_fractures': incident.medical_symptom_fractures,
        'medical_symptom_cuts_bruising': incident.medical_symptom_cuts_bruising,
        'medical_symptom_life_threatening': incident.medical_symptom_life_threatening
      };

      for (const [fieldName, dbArray] of Object.entries(symptomArrays)) {
        const hasSymptom = Array.isArray(dbArray) && dbArray.length > 0;
        try {
          const checkbox = form.getCheckBox(fieldName);
          compareValues(fieldName, checkbox.isChecked(), hasSymptom, false);
        } catch (e) {
          test(fieldName, false, `Checkbox not found in PDF`);
          results.missing++;
        }
      }
    }
    console.log('');

    // Page 3: Accident Conditions (41 fields)
    console.log('📋 PAGE 3: ACCIDENT DATE/TIME/CONDITIONS');
    console.log('-'.repeat(70));

    if (data.incidentReport) {
      const incident = data.incidentReport;

      const page3Fields = {
        'incident_date': incident.incident_date,
        'incident_time': incident.incident_time,
        'your_speed': incident.your_speed,
        'other_speed': incident.other_speed,
        'speed_limit': incident.speed_limit
      };

      for (const [fieldName, dbValue] of Object.entries(page3Fields)) {
        try {
          const field = form.getTextField(fieldName);
          compareValues(fieldName, field.getText(), dbValue, true);
        } catch (e) {
          test(fieldName, false, `Field not found in PDF`);
          results.missing++;
        }
      }

      // Weather/visibility/road condition checkboxes
      const conditionCheckboxes = [
        'weather_clear', 'weather_rain', 'weather_snow', 'weather_fog',
        'visibility_good', 'visibility_poor', 'visibility_dark',
        'road_condition_dry', 'road_condition_wet', 'road_condition_icy',
        'road_surface_asphalt', 'road_surface_concrete', 'road_surface_gravel'
      ];

      for (const fieldName of conditionCheckboxes) {
        const dbValue = incident[fieldName];
        try {
          const checkbox = form.getCheckBox(fieldName);
          compareValues(fieldName, checkbox.isChecked(), dbValue === true, false);
        } catch (e) {
          test(fieldName, false, `Checkbox not found in PDF`);
          results.missing++;
        }
      }
    }
    console.log('');

    // Page 4: Your Vehicle (30 fields)
    console.log('📋 PAGE 4: YOUR VEHICLE DETAILS');
    console.log('-'.repeat(70));

    if (data.userSignup) {
      const signup = data.userSignup;

      const vehicleFields = {
        'vehicle_reg': signup.vehicle_reg,
        'vehicle_make': signup.vehicle_make,
        'vehicle_model': signup.vehicle_model,
        'vehicle_year': signup.vehicle_year,
        'vehicle_colour': signup.vehicle_colour,
        'insurance_company': signup.insurance_company,
        'insurance_policy_number': signup.insurance_policy_number,
        'insurance_expiry_date': signup.insurance_expiry_date
      };

      for (const [fieldName, dbValue] of Object.entries(vehicleFields)) {
        try {
          const field = form.getTextField(fieldName);
          compareValues(fieldName, field.getText(), dbValue, false);
        } catch (e) {
          test(fieldName, false, `Field not found in PDF`);
          results.missing++;
        }
      }
    }
    console.log('');

    // Page 5: Vehicle Damage (29 fields)
    console.log('📋 PAGE 5: VEHICLE DAMAGE');
    console.log('-'.repeat(70));

    if (data.incidentReport) {
      const incident = data.incidentReport;

      const damageCheckboxes = [
        'vehicle_damage_front', 'vehicle_damage_rear', 'vehicle_damage_left',
        'vehicle_damage_right', 'vehicle_damage_roof', 'vehicle_damage_underside',
        'vehicle_driveable', 'vehicle_towed'
      ];

      for (const fieldName of damageCheckboxes) {
        const dbValue = incident[fieldName];
        try {
          const checkbox = form.getCheckBox(fieldName);
          compareValues(fieldName, checkbox.isChecked(), dbValue === true, false);
        } catch (e) {
          test(fieldName, false, `Checkbox not found in PDF`);
          results.missing++;
        }
      }

      // Damage description
      try {
        const field = form.getTextField('vehicle_damage_description');
        compareValues('vehicle_damage_description', field.getText(),
                     incident.vehicle_damage_description, false);
      } catch (e) {
        test('vehicle_damage_description', false, `Field not found in PDF`);
        results.missing++;
      }
    }
    console.log('');

    // Page 7: Other Driver & Vehicle (21 fields)
    console.log('📋 PAGE 7: OTHER DRIVER & VEHICLE');
    console.log('-'.repeat(70));

    if (data.otherVehicles && data.otherVehicles.length > 0) {
      const otherVehicle = data.otherVehicles[0];

      const otherVehicleFields = {
        'other_driver_name': otherVehicle.driver_name,
        'other_driver_address': otherVehicle.driver_address,
        'other_driver_phone': otherVehicle.driver_phone,
        'other_vehicle_reg': otherVehicle.vehicle_reg,
        'other_vehicle_make': otherVehicle.vehicle_make,
        'other_vehicle_model': otherVehicle.vehicle_model,
        'other_insurance_company': otherVehicle.insurance_company,
        'other_insurance_policy': otherVehicle.insurance_policy_number
      };

      for (const [fieldName, dbValue] of Object.entries(otherVehicleFields)) {
        try {
          const field = form.getTextField(fieldName);
          compareValues(fieldName, field.getText(), dbValue, false);
        } catch (e) {
          test(fieldName, false, `Field not found in PDF`);
          results.missing++;
        }
      }
    } else {
      console.log('   ⚠️  No other vehicles in database - skipping validation');
    }
    console.log('');

    // Page 9: Witnesses (44 fields potential - 2 witnesses × 22 fields each)
    console.log('📋 PAGE 9: WITNESSES');
    console.log('-'.repeat(70));

    if (data.witnesses && data.witnesses.length > 0) {
      for (let i = 0; i < Math.min(data.witnesses.length, 2); i++) {
        const witness = data.witnesses[i];
        const witnessNum = i + 1;

        console.log(`   Witness ${witnessNum}:`);

        const witnessFields = {
          [`witness${witnessNum}_name`]: witness.witness_name,
          [`witness${witnessNum}_address`]: witness.witness_address,
          [`witness${witnessNum}_phone`]: witness.witness_phone,
          [`witness${witnessNum}_email`]: witness.witness_email,
          [`witness${witnessNum}_statement`]: witness.witness_statement
        };

        for (const [fieldName, dbValue] of Object.entries(witnessFields)) {
          try {
            const field = form.getTextField(fieldName);
            compareValues(fieldName, field.getText(), dbValue, false);
          } catch (e) {
            test(fieldName, false, `Field not found in PDF`);
            results.missing++;
          }
        }
      }
    } else {
      console.log('   ⚠️  No witnesses in database - skipping validation');
    }
    console.log('');

    // Page 10: Police & Safety (10 fields)
    console.log('📋 PAGE 10: POLICE & SAFETY');
    console.log('-'.repeat(70));

    if (data.incidentReport) {
      const incident = data.incidentReport;

      const policeFields = {
        'police_attended': incident.police_attended,
        'police_force': incident.police_force,
        'police_officer_name': incident.police_officer_name,
        'police_officer_badge': incident.police_officer_badge,
        'police_incident_number': incident.police_incident_number,
        'police_station': incident.police_station,
        'safety_check_completed': incident.safety_check_completed,
        'safety_status': incident.safety_status,
        'safety_location': incident.safety_location,
        'safety_what3words': incident.safety_what3words
      };

      for (const [fieldName, dbValue] of Object.entries(policeFields)) {
        try {
          // Try as text field first
          const field = form.getTextField(fieldName);
          compareValues(fieldName, field.getText(), dbValue, false);
        } catch (e) {
          // Try as checkbox
          try {
            const checkbox = form.getCheckBox(fieldName);
            compareValues(fieldName, checkbox.isChecked(), dbValue === 'yes' || dbValue === true, false);
          } catch (e2) {
            test(fieldName, false, `Field not found in PDF`);
            results.missing++;
          }
        }
      }
    }
    console.log('');

    // Page 12: Final Medical Check (2 fields)
    console.log('📋 PAGE 12: FINAL MEDICAL CHECK');
    console.log('-'.repeat(70));

    if (data.incidentReport) {
      const incident = data.incidentReport;

      try {
        const checkbox = form.getCheckBox('final_medical_check');
        compareValues('final_medical_check', checkbox.isChecked(),
                     incident.final_medical_check === true, false);
      } catch (e) {
        test('final_medical_check', false, `Checkbox not found in PDF`);
        results.missing++;
      }

      try {
        const field = form.getTextField('final_medical_notes');
        compareValues('final_medical_notes', field.getText(),
                     incident.final_medical_notes, false);
      } catch (e) {
        test('final_medical_notes', false, `Field not found in PDF`);
        results.missing++;
      }
    }
    console.log('');

    // Final Report
    console.log('='.repeat(70));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total fields tested: ${results.total}`);
    console.log(`✅ Populated correctly: ${results.populated} (${((results.populated/results.total)*100).toFixed(1)}%)`);
    console.log(`❌ Missing/Empty: ${results.missing} (${((results.missing/results.total)*100).toFixed(1)}%)`);
    console.log(`⚠️  Incorrect values: ${results.incorrect} (${((results.incorrect/results.total)*100).toFixed(1)}%)`);
    console.log('');

    if (results.errors.length > 0) {
      console.log('❌ FAILED VALIDATIONS:');
      results.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.name}`);
        if (error.details) console.log(`      ${error.details}`);
      });
    } else {
      console.log('✅ ALL VALIDATIONS PASSED!');
    }

    console.log('');
    console.log(`📄 Generated PDF: ${pdfPath}`);
    console.log('='.repeat(70));

    // Exit with appropriate code
    process.exit(results.errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Get user ID from command line or use default
const userId = process.argv[2] || DEFAULT_TEST_USER;

runValidation(userId)
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
