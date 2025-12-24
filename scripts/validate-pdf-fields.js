#!/usr/bin/env node
/**
 * PDF Field Validation Script
 *
 * Validates that all fields in pdfFieldConstants.js exist in the PDF template
 * and identifies any unmapped fields in the PDF that aren't in our constants.
 *
 * Usage: node scripts/validate-pdf-fields.js
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Import our field constants (use array exports for validation)
const {
  TEXT_FIELDS_ARRAY,
  CHECKBOX_FIELDS_ARRAY,
  SIGNATURE_FIELDS_ARRAY,
  ALL_FIELDS,
  EXPECTED_COUNTS,
  PDF_TYPOS
} = require('../src/config/pdfFieldConstants');

const PDF_TEMPLATE_PATH = path.join(__dirname, '../pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');

async function validatePdfFields() {
  console.log('='.repeat(60));
  console.log('PDF FIELD VALIDATION');
  console.log('='.repeat(60));
  console.log();

  // Check if PDF template exists
  if (!fs.existsSync(PDF_TEMPLATE_PATH)) {
    console.error('ERROR: PDF template not found at:', PDF_TEMPLATE_PATH);
    process.exit(1);
  }

  // Load the PDF
  console.log('Loading PDF template...');
  const pdfBytes = fs.readFileSync(PDF_TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const pdfFields = form.getFields();

  console.log(`PDF loaded: ${pdfDoc.getPageCount()} pages`);
  console.log();

  // Extract field names and types from PDF
  const pdfFieldMap = new Map();
  pdfFields.forEach(field => {
    const name = field.getName();
    const type = field.constructor.name;
    pdfFieldMap.set(name, type);
  });

  const pdfFieldNames = Array.from(pdfFieldMap.keys());

  // Stats
  console.log('-'.repeat(60));
  console.log('FIELD COUNTS');
  console.log('-'.repeat(60));
  console.log(`PDF Template Fields:     ${pdfFieldNames.length}`);
  console.log(`Constants Defined:       ${ALL_FIELDS.length}`);
  console.log(`  - Text fields:         ${TEXT_FIELDS_ARRAY.length}`);
  console.log(`  - Checkbox fields:     ${CHECKBOX_FIELDS_ARRAY.length}`);
  console.log(`  - Signature fields:    ${SIGNATURE_FIELDS_ARRAY.length}`);
  console.log();

  // Find orphaned constants (defined in constants but not in PDF)
  const orphanedConstants = ALL_FIELDS.filter(field => !pdfFieldMap.has(field));

  // Find unmapped fields (in PDF but not in constants)
  const unmappedFields = pdfFieldNames.filter(field => !ALL_FIELDS.includes(field));

  // Find type mismatches
  const typeMismatches = [];
  TEXT_FIELDS_ARRAY.forEach(field => {
    const pdfType = pdfFieldMap.get(field);
    if (pdfType && pdfType !== 'PDFTextField') {
      typeMismatches.push({ field, expected: 'Text', actual: pdfType });
    }
  });
  CHECKBOX_FIELDS_ARRAY.forEach(field => {
    const pdfType = pdfFieldMap.get(field);
    if (pdfType && pdfType !== 'PDFCheckBox') {
      typeMismatches.push({ field, expected: 'Checkbox', actual: pdfType });
    }
  });
  SIGNATURE_FIELDS_ARRAY.forEach(field => {
    const pdfType = pdfFieldMap.get(field);
    if (pdfType && pdfType !== 'PDFSignature') {
      typeMismatches.push({ field, expected: 'Signature', actual: pdfType });
    }
  });

  // Report results
  let hasErrors = false;

  // Orphaned Constants
  console.log('-'.repeat(60));
  console.log('ORPHANED CONSTANTS (defined but not in PDF)');
  console.log('-'.repeat(60));
  if (orphanedConstants.length === 0) {
    console.log('None - All constants exist in PDF template');
  } else {
    hasErrors = true;
    console.log(`Found ${orphanedConstants.length} orphaned constant(s):`);
    orphanedConstants.forEach(field => {
      console.log(`  - ${field}`);
    });
  }
  console.log();

  // Unmapped Fields
  console.log('-'.repeat(60));
  console.log('UNMAPPED FIELDS (in PDF but not in constants)');
  console.log('-'.repeat(60));
  if (unmappedFields.length === 0) {
    console.log('None - All PDF fields are mapped in constants');
  } else {
    hasErrors = true;
    console.log(`Found ${unmappedFields.length} unmapped field(s):`);
    unmappedFields.forEach(field => {
      const type = pdfFieldMap.get(field);
      console.log(`  - ${field} (${type})`);
    });
  }
  console.log();

  // Type Mismatches
  console.log('-'.repeat(60));
  console.log('TYPE MISMATCHES');
  console.log('-'.repeat(60));
  if (typeMismatches.length === 0) {
    console.log('None - All field types match');
  } else {
    hasErrors = true;
    console.log(`Found ${typeMismatches.length} type mismatch(es):`);
    typeMismatches.forEach(({ field, expected, actual }) => {
      console.log(`  - ${field}: expected ${expected}, got ${actual}`);
    });
  }
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));

  const matchedFields = ALL_FIELDS.filter(field => pdfFieldMap.has(field)).length;
  const coveragePercent = ((matchedFields / pdfFieldNames.length) * 100).toFixed(1);

  console.log(`Matched Fields:          ${matchedFields}/${pdfFieldNames.length} (${coveragePercent}%)`);
  console.log(`Orphaned Constants:      ${orphanedConstants.length}`);
  console.log(`Unmapped PDF Fields:     ${unmappedFields.length}`);
  console.log(`Type Mismatches:         ${typeMismatches.length}`);
  console.log();

  if (hasErrors) {
    console.log('STATUS: VALIDATION FAILED');
    console.log();
    console.log('To fix orphaned constants:');
    console.log('  - Remove them from src/config/pdfFieldConstants.js');
    console.log('  - Or add the field to the PDF template');
    console.log();
    console.log('To fix unmapped fields:');
    console.log('  - Add them to src/config/pdfFieldConstants.js');
    console.log('  - Ensure they are in the correct category (TEXT_FIELDS, CHECKBOX_FIELDS, etc.)');
    process.exit(1);
  } else {
    console.log('STATUS: VALIDATION PASSED');
    console.log('All PDF fields are properly mapped in constants.');
  }

  // Show known typos for documentation
  console.log();
  console.log('-'.repeat(60));
  console.log('KNOWN PDF TYPOS (documented in constants)');
  console.log('-'.repeat(60));
  const typoCount = Object.keys(PDF_TYPOS).length;
  console.log(`Found ${typoCount} field(s) with typos in PDF template:`);
  Object.entries(PDF_TYPOS).forEach(([field, correction]) => {
    console.log(`  - ${field}`);
    console.log(`    ${correction}`);
  });
  console.log();
  console.log('NOTE: These typos are in the PDF template. Constants use correct');
  console.log('      logical names but map to the typo-ridden actual field names.');
}

// Run validation
validatePdfFields().catch(error => {
  console.error('Validation failed:', error.message);
  process.exit(1);
});
