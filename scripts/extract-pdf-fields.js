#!/usr/bin/env node

/**
 * Extract all form field names from the PDF template
 *
 * This script reads the main PDF template and extracts:
 * - Field names
 * - Field types (text, checkbox, radio, dropdown)
 * - Default values (if any)
 *
 * Output: CSV file with all field details for mapping analysis
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function extractPdfFields() {
  log('\n========================================', 'cyan');
  log('  PDF Form Field Extractor', 'cyan');
  log('========================================\n', 'cyan');

  // Path to the main PDF template
  const pdfPath = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-Incident-Report-Main.pdf';

  log('📄 Loading PDF template...', 'blue');
  log(`   ${pdfPath}\n`, 'cyan');

  try {
    // Read the PDF file
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    log('✅ PDF loaded successfully\n', 'green');

    // Get the form
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    log(`📊 Found ${fields.length} form fields\n`, 'blue');

    // Extract field information
    const fieldData = [];
    let textFieldCount = 0;
    let checkboxCount = 0;
    let radioCount = 0;
    let dropdownCount = 0;
    let otherCount = 0;

    fields.forEach(field => {
      const name = field.getName();
      let type = 'Unknown';
      let defaultValue = '';

      // Determine field type
      const constructor = field.constructor.name;

      if (constructor.includes('TextField')) {
        type = 'Text';
        textFieldCount++;
        try {
          defaultValue = field.getText() || '';
        } catch (e) {
          defaultValue = '';
        }
      } else if (constructor.includes('CheckBox')) {
        type = 'Checkbox';
        checkboxCount++;
        try {
          defaultValue = field.isChecked() ? 'Yes' : 'No';
        } catch (e) {
          defaultValue = '';
        }
      } else if (constructor.includes('RadioGroup')) {
        type = 'Radio';
        radioCount++;
        try {
          defaultValue = field.getSelected() || '';
        } catch (e) {
          defaultValue = '';
        }
      } else if (constructor.includes('Dropdown')) {
        type = 'Dropdown';
        dropdownCount++;
        try {
          defaultValue = field.getSelected().join(', ') || '';
        } catch (e) {
          defaultValue = '';
        }
      } else {
        type = constructor;
        otherCount++;
      }

      fieldData.push({
        name,
        type,
        defaultValue: defaultValue.toString().replace(/,/g, ';') // Escape commas for CSV
      });
    });

    // Sort by field name
    fieldData.sort((a, b) => a.name.localeCompare(b.name));

    // Generate CSV content
    const csvHeader = 'Field Name,Field Type,Default Value\n';
    const csvRows = fieldData.map(field =>
      `"${field.name}","${field.type}","${field.defaultValue}"`
    ).join('\n');
    const csvContent = csvHeader + csvRows;

    // Save to file
    const outputPath = path.join(__dirname, '..', 'EXTRACTED_PDF_FIELDS.csv');
    fs.writeFileSync(outputPath, csvContent, 'utf8');

    // Display summary
    log('========================================', 'cyan');
    log('  Field Type Summary', 'cyan');
    log('========================================\n', 'cyan');

    log(`📝 Text Fields:     ${textFieldCount}`, 'green');
    log(`☑️  Checkboxes:      ${checkboxCount}`, 'green');
    log(`🔘 Radio Buttons:   ${radioCount}`, 'green');
    log(`📋 Dropdowns:       ${dropdownCount}`, 'green');
    if (otherCount > 0) {
      log(`❓ Other:           ${otherCount}`, 'yellow');
    }
    log(`\n📊 Total Fields:    ${fields.length}`, 'blue');

    log('\n========================================', 'cyan');
    log('  Output Saved', 'cyan');
    log('========================================\n', 'cyan');

    log(`✅ CSV file created:`, 'green');
    log(`   ${outputPath}\n`, 'cyan');

    // Show first 10 fields as preview
    log('📋 First 10 fields:', 'blue');
    fieldData.slice(0, 10).forEach((field, i) => {
      log(`   ${i + 1}. ${field.name} (${field.type})`, 'cyan');
    });

    if (fieldData.length > 10) {
      log(`   ... and ${fieldData.length - 10} more\n`, 'yellow');
    }

    log('\n💡 Next Steps:', 'yellow');
    log('   1. Open EXTRACTED_PDF_FIELDS.csv to see all fields', 'yellow');
    log('   2. Compare against lib/pdfGenerator.js field mappings', 'yellow');
    log('   3. Identify unmapped fields', 'yellow');
    log('   4. Update pdfGenerator.js with correct field names\n', 'yellow');

  } catch (error) {
    log('\n❌ Error extracting fields:', 'red');
    console.error(error);

    log('\n💡 Troubleshooting:', 'yellow');
    log('   → Check PDF path is correct', 'yellow');
    log('   → Ensure PDF is a valid form document', 'yellow');
    log('   → Verify PDF is not corrupted or encrypted\n', 'yellow');

    process.exit(1);
  }
}

// Run extraction
extractPdfFields()
  .then(() => process.exit(0))
  .catch(error => {
    log('\n❌ Unexpected error:', 'red');
    console.error(error);
    process.exit(1);
  });
