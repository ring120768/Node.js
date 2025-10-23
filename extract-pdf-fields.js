#!/usr/bin/env node
/**
 * Extract all form field names from the PDF templates
 * This helps us understand what fields the PDFs actually have
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

async function extractPdfFields(pdfPath, label) {
  console.log(colors.cyan, `\n📄 Analyzing: ${label}`);
  console.log(`   Path: ${pdfPath}\n`);

  try {
    // Read the PDF
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the form
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(colors.green, `✅ Found ${fields.length} form fields\n`);

    // Group fields by type
    const fieldsByType = {
      text: [],
      checkbox: [],
      dropdown: [],
      radio: [],
      button: [],
      signature: [],
      other: []
    };

    fields.forEach(field => {
      const name = field.getName();
      const type = field.constructor.name;

      if (type.includes('Text')) {
        fieldsByType.text.push(name);
      } else if (type.includes('CheckBox')) {
        fieldsByType.checkbox.push(name);
      } else if (type.includes('Dropdown')) {
        fieldsByType.dropdown.push(name);
      } else if (type.includes('Radio')) {
        fieldsByType.radio.push(name);
      } else if (type.includes('Button')) {
        fieldsByType.button.push(name);
      } else if (type.includes('Signature')) {
        fieldsByType.signature.push(name);
      } else {
        fieldsByType.other.push({ name, type });
      }
    });

    // Display summary
    console.log(colors.magenta, '📊 Fields by Type:\n');

    if (fieldsByType.text.length > 0) {
      console.log(colors.cyan, `  Text Fields (${fieldsByType.text.length}):`);
      fieldsByType.text.sort().forEach(name => console.log(`    - ${name}`));
      console.log();
    }

    if (fieldsByType.checkbox.length > 0) {
      console.log(colors.cyan, `  Checkbox Fields (${fieldsByType.checkbox.length}):`);
      fieldsByType.checkbox.sort().forEach(name => console.log(`    - ${name}`));
      console.log();
    }

    if (fieldsByType.dropdown.length > 0) {
      console.log(colors.cyan, `  Dropdown Fields (${fieldsByType.dropdown.length}):`);
      fieldsByType.dropdown.sort().forEach(name => console.log(`    - ${name}`));
      console.log();
    }

    if (fieldsByType.radio.length > 0) {
      console.log(colors.cyan, `  Radio Fields (${fieldsByType.radio.length}):`);
      fieldsByType.radio.sort().forEach(name => console.log(`    - ${name}`));
      console.log();
    }

    if (fieldsByType.signature.length > 0) {
      console.log(colors.cyan, `  Signature Fields (${fieldsByType.signature.length}):`);
      fieldsByType.signature.sort().forEach(name => console.log(`    - ${name}`));
      console.log();
    }

    if (fieldsByType.other.length > 0) {
      console.log(colors.yellow, `  Other Fields (${fieldsByType.other.length}):`);
      fieldsByType.other.forEach(({ name, type }) => console.log(`    - ${name} (${type})`));
      console.log();
    }

    return {
      total: fields.length,
      byType: fieldsByType
    };

  } catch (error) {
    console.log(colors.red, `❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log(colors.cyan, '\n🔍 PDF FORM FIELD EXTRACTION\n');
  console.log('='.repeat(80), '\n');

  const pdfDir = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF';

  // Extract fields from main incident report
  const mainPdf = path.join(pdfDir, 'Car-Crash-Lawyer-AI-incident-report.pdf');
  const mainResults = await extractPdfFields(mainPdf, 'Main Incident Report');

  console.log('\n' + '='.repeat(80) + '\n');

  // Extract fields from additional vehicles/witnesses PDF
  const additionalPdf = path.join(pdfDir, 'Car Crash Lawyer AI Incident Report other vehicles and witness.pdf');
  const additionalResults = await extractPdfFields(additionalPdf, 'Additional Vehicles/Witnesses');

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(colors.magenta, '\n📈 TOTAL SUMMARY\n');

  if (mainResults) {
    console.log(colors.cyan, `Main PDF: ${mainResults.total} fields`);
    console.log(`  - Text: ${mainResults.byType.text.length}`);
    console.log(`  - Checkboxes: ${mainResults.byType.checkbox.length}`);
    console.log(`  - Dropdowns: ${mainResults.byType.dropdown.length}`);
    console.log(`  - Radio: ${mainResults.byType.radio.length}`);
    console.log(`  - Signatures: ${mainResults.byType.signature.length}`);
  }

  console.log();

  if (additionalResults) {
    console.log(colors.cyan, `Additional PDF: ${additionalResults.total} fields`);
    console.log(`  - Text: ${additionalResults.byType.text.length}`);
    console.log(`  - Checkboxes: ${additionalResults.byType.checkbox.length}`);
    console.log(`  - Dropdowns: ${additionalResults.byType.dropdown.length}`);
    console.log(`  - Radio: ${additionalResults.byType.radio.length}`);
    console.log(`  - Signatures: ${additionalResults.byType.signature.length}`);
  }

  console.log('\n');
}

main().catch(console.error);
