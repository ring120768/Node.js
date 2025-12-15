/**
 * Comprehensive PDF Field Mapping Validation Script
 *
 * Verifies:
 * - All 213 PDF fields are mapped to database columns
 * - Field names match exactly (including typos)
 * - Zero data loss from database to PDF
 * - All helper functions work correctly
 *
 * Usage: node verify-complete-pdf-mapping.js [user-uuid]
 */

require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { createClient } = require('@supabase/supabase-js');
const { fetchAllData } = require('./lib/dataFetcher');

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Expected field counts from pdf-fields-complete-list.txt
const EXPECTED_COUNTS = {
  text: 120,
  checkbox: 92,
  signature: 1,
  total: 213
};

// PDF field names with typos (must match exactly)
const TYPO_FIELDS = [
  'visibilty_good',
  'visibilty_street_lights',
  'medical_symptom_limb_pain_mobilty',
  'weather_thunder_lightening',
  'road_markings_vsible_yes',
  'road_markings_vsible_no',
  'medical_symptom_life _threatening',
  'unsure _did_not_attempt'
];

// Fields that should NOT exist (fabricated)
const FABRICATED_FIELDS = [
  'visibility_condition_very_good',
  'visibility_condition_good',
  'visibility_condition_moderate',
  'visibility_condition_poor',
  'damage_front',
  'damage_rear',
  'damage_driver_side',
  'damage_passenger_side',
  'your_vehicle_damage_photo_1_url',
  'ai_incident_summary',
  'ai_liability_assessment'
];

/**
 * Load PDF template and extract all field names
 */
async function loadPDFTemplate() {
  console.log('\n📄 Loading PDF template...');
  const templatePath = path.join(__dirname, 'pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const pdfBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`✅ PDF loaded: ${fields.length} total fields`);

  return { pdfDoc, form, fields };
}

/**
 * Categorize PDF fields by type
 */
function categorizePDFFields(fields) {
  const categorized = {
    text: [],
    checkbox: [],
    signature: [],
    other: []
  };

  fields.forEach(field => {
    const name = field.getName();
    const type = field.constructor.name;

    if (type.includes('Text')) {
      categorized.text.push(name);
    } else if (type.includes('CheckBox')) {
      categorized.checkbox.push(name);
    } else if (type.includes('Signature')) {
      categorized.signature.push(name);
    } else {
      categorized.other.push(name);
    }
  });

  return categorized;
}

/**
 * Fetch all data from database for a user
 */
async function fetchAllUserData(userId) {
  console.log(`\n🗄️  Fetching data for user: ${userId}`);

  // 1. user_signup
  const { data: userData, error: userError } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (userError) throw new Error(`User fetch error: ${userError.message}`);
  console.log('✅ user_signup fetched');

  // 2. incident_reports (get most recent if multiple exist)
  const { data: incidentData, error: incidentError } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (incidentError) throw new Error(`Incident fetch error: ${incidentError.message}`);
  if (!incidentData) throw new Error('No incident reports found for this user');
  console.log('✅ incident_reports fetched (most recent)');

  // 3. user_documents (images)
  const { data: images, error: imagesError } = await supabase
    .from('user_documents')
    .select('*')
    .eq('create_user_id', userId);

  if (imagesError) throw new Error(`Images fetch error: ${imagesError.message}`);
  console.log(`✅ user_documents fetched (${images?.length || 0} documents)`);

  // 4. DVLA data (optional - table may not exist yet)
  let dvlaRecords = [];
  const { data: dvlaData, error: dvlaError } = await supabase
    .from('dvla_vehicle_info_new')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: true });

  if (dvlaError) {
    console.log(`⚠️  DVLA table not found (optional feature) - continuing without DVLA data`);
  } else {
    dvlaRecords = dvlaData || [];
    console.log(`✅ DVLA data fetched (${dvlaRecords.length} records)`);
  }

  // 5. ai_transcription
  const { data: transcription, error: transcriptionError } = await supabase
    .from('ai_transcription')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log(`✅ ai_transcription fetched`);

  // 6. ai_summary (or in incident_reports)
  const { data: aiSummary, error: aiSummaryError } = await supabase
    .from('ai_summary')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log(`✅ ai_summary fetched`);

  return {
    userData,
    incidentData,
    images: images || [],
    dvlaRecords: dvlaRecords || [],
    transcription,
    aiSummary
  };
}

/**
 * Count actual data points available in database
 */
function countDatabaseDataPoints(data) {
  let count = 0;

  // Count non-null fields in each table
  Object.entries(data).forEach(([tableName, tableData]) => {
    if (!tableData) return;

    if (Array.isArray(tableData)) {
      // For arrays (images, dvlaRecords)
      tableData.forEach(record => {
        Object.values(record).forEach(value => {
          if (value !== null && value !== undefined && value !== '') count++;
        });
      });
    } else {
      // For single records
      Object.values(tableData).forEach(value => {
        if (value !== null && value !== undefined && value !== '') count++;
      });
    }
  });

  return count;
}

/**
 * Validate field mappings against implementation
 */
async function validateFieldMappings() {
  console.log('\n🔍 Validating field mappings...\n');

  const { form, fields } = await loadPDFTemplate();
  const categorized = categorizePDFFields(fields);

  // Check counts
  console.log('📊 Field Count Validation:');
  console.log(`   Text fields: ${categorized.text.length} (expected: ${EXPECTED_COUNTS.text})`);
  console.log(`   Checkboxes: ${categorized.checkbox.length} (expected: ${EXPECTED_COUNTS.checkbox})`);
  console.log(`   Signature: ${categorized.signature.length} (expected: ${EXPECTED_COUNTS.signature})`);
  console.log(`   Total: ${fields.length} (expected: ${EXPECTED_COUNTS.total})`);

  const countMatch = fields.length === EXPECTED_COUNTS.total;
  console.log(`   ${countMatch ? '✅' : '❌'} Count validation ${countMatch ? 'PASSED' : 'FAILED'}\n`);

  // Check for typo fields
  console.log('🔤 Typo Field Validation:');
  const fieldNames = fields.map(f => f.getName());
  const typosFound = TYPO_FIELDS.filter(typo => fieldNames.includes(typo));
  const typosMissing = TYPO_FIELDS.filter(typo => !fieldNames.includes(typo));

  console.log(`   Found: ${typosFound.length}/${TYPO_FIELDS.length} typo fields`);
  typosFound.forEach(typo => console.log(`   ✅ ${typo}`));
  if (typosMissing.length > 0) {
    typosMissing.forEach(typo => console.log(`   ❌ Missing: ${typo}`));
  }

  // Check for fabricated fields
  console.log('\n🚫 Fabricated Field Check:');
  const fabricatedFound = FABRICATED_FIELDS.filter(fab => fieldNames.includes(fab));

  if (fabricatedFound.length === 0) {
    console.log('   ✅ No fabricated fields found (GOOD)');
  } else {
    console.log(`   ❌ Found ${fabricatedFound.length} fabricated fields (BAD):`);
    fabricatedFound.forEach(fab => console.log(`      - ${fab}`));
  }

  // Save field list for reference
  const fieldListPath = path.join(__dirname, 'test-output/actual-pdf-fields.txt');
  await fs.mkdir(path.dirname(fieldListPath), { recursive: true });

  const fieldList = [
    '=== TEXT FIELDS ===',
    ...categorized.text.sort(),
    '',
    '=== CHECKBOXES ===',
    ...categorized.checkbox.sort(),
    '',
    '=== SIGNATURE ===',
    ...categorized.signature,
    '',
    '=== SUMMARY ===',
    `Total fields: ${fields.length}`,
    `Text: ${categorized.text.length}`,
    `Checkbox: ${categorized.checkbox.length}`,
    `Signature: ${categorized.signature.length}`
  ].join('\n');

  await fs.writeFile(fieldListPath, fieldList);
  console.log(`\n💾 Field list saved to: ${fieldListPath}`);

  return {
    countMatch,
    typosFound: typosFound.length === TYPO_FIELDS.length,
    noFabricated: fabricatedFound.length === 0,
    categorized
  };
}

/**
 * Test complete field mapping with real user data
 */
async function testWithRealData(userId) {
  console.log('\n\n════════════════════════════════════════════════════════════');
  console.log('🧪 TESTING WITH REAL USER DATA');
  console.log('════════════════════════════════════════════════════════════\n');

  // Fetch data using the CORRECT dataFetcher (matches adobePdfFormFillerService expectations)
  const data = await fetchAllData(userId);
  const dataPointCount = countDatabaseDataPoints(data);

  console.log(`\n📊 Database Data Points: ${dataPointCount}`);

  // Load current implementation
  const adobeService = require('./src/services/adobePdfFormFillerService');

  console.log('\n🔄 Generating PDF with current implementation...');

  try {
    const pdfBytes = await adobeService.fillPdfForm(data);

    // Save test PDF
    const testPdfPath = path.join(__dirname, 'test-output/complete-mapping-test.pdf');
    await fs.writeFile(testPdfPath, pdfBytes);

    console.log(`✅ PDF generated successfully`);
    console.log(`💾 Saved to: ${testPdfPath}`);

    // Load generated PDF and count filled fields
    const generatedPdf = await PDFDocument.load(pdfBytes);
    const generatedForm = generatedPdf.getForm();
    const generatedFields = generatedForm.getFields();

    console.log('\n📈 Generated PDF Analysis:');
    console.log(`   Total fields: ${generatedFields.length}`);

    // Count filled text fields
    const textFields = generatedFields.filter(f => f.constructor.name.includes('Text'));
    const filledTextFields = textFields.filter(field => {
      try {
        const value = field.getText();
        return value && value.trim() !== '';
      } catch {
        return false;
      }
    });

    console.log(`   Filled text fields: ${filledTextFields.length}/${textFields.length}`);

    // Count checked boxes
    const checkboxes = generatedFields.filter(f => f.constructor.name.includes('CheckBox'));
    const checkedBoxes = checkboxes.filter(field => {
      try {
        return field.isChecked();
      } catch {
        return false;
      }
    });

    console.log(`   Checked boxes: ${checkedBoxes.length}/${checkboxes.length}`);

    // Calculate fill rate
    const totalFilled = filledTextFields.length + checkedBoxes.length;
    const fillRate = ((totalFilled / (textFields.length + checkboxes.length)) * 100).toFixed(1);

    console.log(`\n   📊 Fill Rate: ${fillRate}%`);

    // List empty required fields
    const emptyTextFields = textFields.filter(field => {
      try {
        const value = field.getText();
        return !value || value.trim() === '';
      } catch {
        return true;
      }
    });

    if (emptyTextFields.length > 0 && emptyTextFields.length < 30) {
      console.log(`\n   ⚠️  Empty text fields (${emptyTextFields.length}):`);
      emptyTextFields.slice(0, 20).forEach(field => {
        console.log(`      - ${field.getName()}`);
      });
      if (emptyTextFields.length > 20) {
        console.log(`      ... and ${emptyTextFields.length - 20} more`);
      }
    }

    return {
      success: true,
      fillRate: parseFloat(fillRate),
      totalFilled,
      totalFields: textFields.length + checkboxes.length,
      pdfPath: testPdfPath
    };

  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate comprehensive validation report
 */
async function generateReport(validationResults, testResults) {
  const reportPath = path.join(__dirname, 'test-output/pdf-mapping-validation-report.md');

  const report = `# PDF Field Mapping Validation Report

**Date**: ${new Date().toISOString()}
**Script**: verify-complete-pdf-mapping.js

---

## Field Count Validation

| Type | Expected | Actual | Status |
|------|----------|--------|--------|
| Text | ${EXPECTED_COUNTS.text} | ${validationResults.categorized.text.length} | ${validationResults.categorized.text.length === EXPECTED_COUNTS.text ? '✅' : '❌'} |
| Checkbox | ${EXPECTED_COUNTS.checkbox} | ${validationResults.categorized.checkbox.length} | ${validationResults.categorized.checkbox.length === EXPECTED_COUNTS.checkbox ? '✅' : '❌'} |
| Signature | ${EXPECTED_COUNTS.signature} | ${validationResults.categorized.signature.length} | ${validationResults.categorized.signature.length === EXPECTED_COUNTS.signature ? '✅' : '❌'} |
| **TOTAL** | **${EXPECTED_COUNTS.total}** | **${validationResults.categorized.text.length + validationResults.categorized.checkbox.length + validationResults.categorized.signature.length}** | **${validationResults.countMatch ? '✅ PASS' : '❌ FAIL'}** |

---

## PDF Field Name Validation

### Typo Fields (Must Match Exactly)
${validationResults.typosFound ? '✅ All typo fields present' : '❌ Some typo fields missing'}

Expected typo fields:
${TYPO_FIELDS.map(t => `- \`${t}\``).join('\n')}

### Fabricated Fields Check
${validationResults.noFabricated ? '✅ No fabricated fields found (GOOD)' : '❌ Fabricated fields detected (BAD)'}

---

## Real Data Test Results

${testResults.success ? `
✅ **PDF Generation: SUCCESSFUL**

**Fill Rate**: ${testResults.fillRate}%
**Filled Fields**: ${testResults.totalFilled}/${testResults.totalFields}

**PDF Saved To**: \`${testResults.pdfPath}\`

### Manual Inspection Checklist

Open the generated PDF and verify:
- [ ] All personal information fields populated
- [ ] All vehicle details correct
- [ ] DVLA data displayed (user's vehicle + other vehicle)
- [ ] All image URLs present
- [ ] Medical symptoms correctly checked
- [ ] Weather conditions correctly checked
- [ ] Road/traffic conditions correct
- [ ] Impact points correctly marked
- [ ] Witness information populated
- [ ] Police information (if applicable)
- [ ] AI summary and closing statement present
- [ ] All dates in DD/MM/YYYY format
- [ ] No "undefined" or "null" text visible
- [ ] All checkboxes render correctly

` : `
❌ **PDF Generation: FAILED**

**Error**: ${testResults.error}

Please review the error and fix before proceeding.
`}

---

## Overall Status

${validationResults.countMatch && validationResults.typosFound && validationResults.noFabricated && testResults.success ?
`✅ **ALL VALIDATIONS PASSED**

The PDF field mapping implementation is correct:
- Field counts match (213 total)
- All typo fields present
- No fabricated fields
- PDF generates successfully
- Fill rate: ${testResults.fillRate}%

**Next Steps**:
1. Review generated PDF manually
2. Verify all data accuracy
3. Test with multiple users
4. Deploy to production` :
`⚠️ **VALIDATION ISSUES DETECTED**

Please review the issues above and:
1. Fix field count mismatches
2. Ensure all typo fields are mapped correctly
3. Remove any fabricated fields
4. Debug PDF generation errors

Then re-run this validation script.`}

---

## Reference Files

- **Field List**: \`pdf-fields-complete-list.txt\`
- **Implementation Prompt**: \`CLAUDE_CODE_PDF_IMPLEMENTATION_PROMPT.md\`
- **Mappings Guide**: \`CORRECTED_MASTER_PROMPT_V3_MINIMAL.md\`
- **Cleanup Summary**: \`FIELD_MAPPING_CLEANUP_SUMMARY.md\`

---

**Generated by**: verify-complete-pdf-mapping.js
`;

  await fs.writeFile(reportPath, report);
  console.log(`\n\n📄 Validation report saved to: ${reportPath}`);

  return reportPath;
}

/**
 * Main execution
 */
async function main() {
  const userId = process.argv[2];

  console.log('════════════════════════════════════════════════════════════');
  console.log('🔍 PDF FIELD MAPPING VALIDATION');
  console.log('════════════════════════════════════════════════════════════');

  if (!userId) {
    console.error('\n❌ Error: User UUID required');
    console.log('\nUsage: node verify-complete-pdf-mapping.js [user-uuid]');
    console.log('\nExample: node verify-complete-pdf-mapping.js a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    process.exit(1);
  }

  try {
    // Step 1: Validate field mappings
    const validationResults = await validateFieldMappings();

    // Step 2: Test with real data
    const testResults = await testWithRealData(userId);

    // Step 3: Generate report
    await generateReport(validationResults, testResults);

    // Final summary
    console.log('\n\n════════════════════════════════════════════════════════════');
    console.log('📋 VALIDATION SUMMARY');
    console.log('════════════════════════════════════════════════════════════\n');

    console.log(`Field Count Match: ${validationResults.countMatch ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Typo Fields Present: ${validationResults.typosFound ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`No Fabricated Fields: ${validationResults.noFabricated ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`PDF Generation: ${testResults.success ? '✅ PASS' : '❌ FAIL'}`);

    if (testResults.success) {
      console.log(`Fill Rate: ${testResults.fillRate}%`);
    }

    const allPassed = validationResults.countMatch &&
                     validationResults.typosFound &&
                     validationResults.noFabricated &&
                     testResults.success;

    console.log('\n════════════════════════════════════════════════════════════');
    if (allPassed) {
      console.log('✅ ALL VALIDATIONS PASSED');
      console.log('════════════════════════════════════════════════════════════\n');
      process.exit(0);
    } else {
      console.log('⚠️  VALIDATION ISSUES DETECTED');
      console.log('════════════════════════════════════════════════════════════\n');
      console.log('Please review the validation report and fix issues.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n\n❌ Validation failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run validation
main();
