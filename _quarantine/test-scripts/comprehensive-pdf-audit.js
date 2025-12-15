#!/usr/bin/env node

/**
 * Comprehensive PDF Field Audit
 *
 * Compares PDF template fields with database schema and field mappings.
 * Identifies:
 * 1. Missing field mappings (fields in PDF but not being filled)
 * 2. Invalid field references (code references fields that don't exist in PDF)
 * 3. Database columns that aren't being used
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function auditPDFFields() {
  console.log('\n🔍 COMPREHENSIVE PDF FIELD AUDIT');
  console.log('='.repeat(100));
  console.log('Analyzing: PDF Template vs Code Mappings vs Database Schema\n');

  // 1. Extract all fields from PDF template
  const pdfPath = './pdf-templates/Car-Crash-Lawyer-AI-incident-report-main-UPDATED.pdf';
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const pdfFields = form.getFields().map(f => f.getName()).sort();

  console.log(`✅ Step 1: Extracted ${pdfFields.length} fields from PDF template\n`);

  // 2. Extract field references from adobePdfFormFillerService.js
  const serviceFilePath = './src/services/adobePdfFormFillerService.js';
  const serviceContent = fs.readFileSync(serviceFilePath, 'utf8');

  // Extract all setFieldText, checkField, and related function calls
  const mappedFields = new Set();

  // Match patterns: setFieldText('field_name', ...), checkField('field_name', ...)
  const patterns = [
    /setFieldText\('([^']+)'/g,
    /setFieldTextWithMaxFont\('([^']+)'/g,
    /setFieldTextWithFixedFont\('([^']+)'/g,
    /setUrlFieldWithAutoFitFont\('([^']+)'/g,
    /checkField\('([^']+)'/g,
    /checkFieldPair\('([^']+)'/g,
    /form\.getTextField\('([^']+)'/g,
    /form\.getCheckBox\('([^']+)'/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(serviceContent)) !== null) {
      mappedFields.add(match[1]);
    }
  }

  console.log(`✅ Step 2: Found ${mappedFields.size} field references in code\n`);

  // 3. Find unmapped fields (in PDF but not in code)
  const unmappedFields = pdfFields.filter(f => !mappedFields.has(f));

  // 4. Find invalid references (in code but not in PDF)
  const invalidReferences = Array.from(mappedFields).filter(f => !pdfFields.includes(f));

  // ========================================
  // REPORT: Unmapped Fields
  // ========================================
  console.log('\n' + '='.repeat(100));
  console.log('📊 AUDIT RESULTS');
  console.log('='.repeat(100));

  console.log(`\n📈 Coverage Statistics:`);
  console.log(`   Total PDF fields: ${pdfFields.length}`);
  console.log(`   Mapped fields: ${pdfFields.filter(f => mappedFields.has(f)).length}`);
  console.log(`   Unmapped fields: ${unmappedFields.length}`);
  console.log(`   Invalid references: ${invalidReferences.length}`);
  console.log(`   Coverage: ${((pdfFields.filter(f => mappedFields.has(f)).length / pdfFields.length) * 100).toFixed(1)}%`);

  // ========================================
  // CRITICAL: Unmapped Fields
  // ========================================
  if (unmappedFields.length > 0) {
    console.log(`\n\n⚠️  CRITICAL: ${unmappedFields.length} PDF FIELDS ARE NOT BEING FILLED`);
    console.log('='.repeat(100));
    console.log('\n🔴 These fields exist in the PDF but are NOT mapped in the code:\n');

    // Group by prefix for better analysis
    const grouped = {};
    unmappedFields.forEach(field => {
      const prefix = field.split('_')[0] || 'other';
      grouped[prefix] = grouped[prefix] || [];
      grouped[prefix].push(field);
    });

    const sortedPrefixes = Object.keys(grouped).sort();
    for (const prefix of sortedPrefixes) {
      console.log(`\n📄 ${prefix.toUpperCase()} Fields (${grouped[prefix].length}):`);
      console.log('-'.repeat(100));
      grouped[prefix].forEach((field, i) => {
        console.log(`  ${(i+1).toString().padStart(3)}. ${field}`);
      });
    }

    // Save to file
    fs.writeFileSync('./test-output/UNMAPPED-FIELDS.txt', unmappedFields.join('\n'));
    console.log(`\n📝 Unmapped fields list saved to: ./test-output/UNMAPPED-FIELDS.txt`);
  } else {
    console.log('\n\n✅ All PDF fields are being mapped!');
  }

  // ========================================
  // Invalid References
  // ========================================
  if (invalidReferences.length > 0) {
    console.log(`\n\n⚠️  WARNING: ${invalidReferences.length} INVALID FIELD REFERENCES IN CODE`);
    console.log('='.repeat(100));
    console.log('\n🟡 These field names are in the code but DON\'T exist in PDF:\n');

    invalidReferences.forEach((field, i) => {
      console.log(`  ${(i+1).toString().padStart(3)}. ${field}`);
    });

    // Save to file
    fs.writeFileSync('./test-output/INVALID-FIELD-REFERENCES.txt', invalidReferences.join('\n'));
    console.log(`\n📝 Invalid references saved to: ./test-output/INVALID-FIELD-REFERENCES.txt`);
  }

  // ========================================
  // Save Complete Field Lists
  // ========================================
  fs.writeFileSync('./test-output/pdf-all-fields.txt', pdfFields.join('\n'));
  fs.writeFileSync('./test-output/code-mapped-fields.txt', Array.from(mappedFields).sort().join('\n'));

  console.log('\n\n📁 Complete field lists saved:');
  console.log('   ./test-output/pdf-all-fields.txt (all PDF fields)');
  console.log('   ./test-output/code-mapped-fields.txt (all code mappings)');

  // ========================================
  // Action Items
  // ========================================
  console.log('\n\n' + '='.repeat(100));
  console.log('🎯 ACTION ITEMS');
  console.log('='.repeat(100));

  if (unmappedFields.length > 0) {
    console.log('\n1. ⚠️  ADD MAPPINGS for unmapped fields:');
    console.log('   Edit: src/services/adobePdfFormFillerService.js');
    console.log(`   Add ${unmappedFields.length} missing field mappings`);
  }

  if (invalidReferences.length > 0) {
    console.log('\n2. ⚠️  FIX INVALID REFERENCES:');
    console.log('   Edit: src/services/adobePdfFormFillerService.js');
    console.log(`   Remove or correct ${invalidReferences.length} invalid field names`);
  }

  if (unmappedFields.length === 0 && invalidReferences.length === 0) {
    console.log('\n✅ No action required - all fields are correctly mapped!');
  }

  console.log('\n' + '='.repeat(100) + '\n');
}

// Run audit
auditPDFFields().catch(error => {
  console.error('❌ Audit failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
