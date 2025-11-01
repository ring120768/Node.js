#!/usr/bin/env node

/**
 * PDF Field Extractor
 *
 * Automatically extracts all form field names from a fillable PDF
 * and generates a structured JSON file for mapping to database/code.
 *
 * Usage:
 *   node scripts/extract-pdf-fields.js
 *   node scripts/extract-pdf-fields.js /path/to/custom.pdf
 *
 * Output:
 *   - field-list.json (complete field inventory)
 *   - Console summary with statistics
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const logger = {
  info: (msg) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m✗\x1b[0m ${msg}`),
  header: (msg) => console.log(`\n${'═'.repeat(70)}\n${msg}\n${'═'.repeat(70)}`),
};

// Default PDF path (user's completed fillable PDF)
const DEFAULT_PDF_PATH = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report.pdf';

// Output file path
const OUTPUT_PATH = path.join(__dirname, '../field-list.json');

/**
 * Extract all form fields from PDF
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<Array>} Array of field objects
 */
async function extractPdfFields(pdfPath) {
  logger.info(`Reading PDF: ${pdfPath}`);

  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    const fields = form.getFields();
    logger.success(`Found ${fields.length} total form fields\n`);

    const fieldData = fields.map((field, index) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;

      // Extract additional properties based on field type
      let properties = {
        name: fieldName,
        type: fieldType,
        index: index + 1
      };

      // Add type-specific properties
      try {
        if (fieldType === 'PDFTextField') {
          const textField = field;
          properties.multiline = textField.isMultiline();
          properties.maxLength = textField.getMaxLength();
          properties.alignment = textField.getAlignment();
        } else if (fieldType === 'PDFCheckBox') {
          // Checkbox fields
          properties.checked = false; // Default state
        } else if (fieldType === 'PDFRadioGroup') {
          // Radio button groups
          properties.options = field.getOptions();
        } else if (fieldType === 'PDFDropdown') {
          // Dropdown fields
          properties.options = field.getOptions();
        }
      } catch (error) {
        // Some properties may not be available - that's okay
      }

      return properties;
    });

    return fieldData;

  } catch (error) {
    logger.error(`Error reading PDF: ${error.message}`);
    throw error;
  }
}

/**
 * Categorize fields by type
 * @param {Array} fields - Field data array
 * @returns {Object} Categorized field statistics
 */
function categorizeFields(fields) {
  const stats = {
    total: fields.length,
    byType: {},
    multiline: 0,
    checkboxes: 0,
    dropdowns: 0,
    radioGroups: 0,
    textFields: 0
  };

  fields.forEach(field => {
    // Count by type
    stats.byType[field.type] = (stats.byType[field.type] || 0) + 1;

    // Count specific categories
    if (field.type === 'PDFTextField') {
      stats.textFields++;
      if (field.multiline) stats.multiline++;
    } else if (field.type === 'PDFCheckBox') {
      stats.checkboxes++;
    } else if (field.type === 'PDFDropdown') {
      stats.dropdowns++;
    } else if (field.type === 'PDFRadioGroup') {
      stats.radioGroups++;
    }
  });

  return stats;
}

/**
 * Print field statistics
 * @param {Object} stats - Field statistics
 */
function printStats(stats) {
  console.log('\n📊 Field Statistics:\n');
  console.log(`Total Fields: ${stats.total}`);
  console.log(`Text Fields: ${stats.textFields}`);
  console.log(`  - Multiline: ${stats.multiline}`);
  console.log(`  - Single line: ${stats.textFields - stats.multiline}`);
  console.log(`Checkboxes: ${stats.checkboxes}`);
  console.log(`Dropdowns: ${stats.dropdowns}`);
  console.log(`Radio Groups: ${stats.radioGroups}`);
  console.log('\nBreakdown by PDF Type:');
  Object.entries(stats.byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
}

/**
 * Save field data to JSON file
 * @param {Array} fields - Field data
 * @param {string} outputPath - Output file path
 */
function saveFieldList(fields, outputPath) {
  const output = {
    extracted_at: new Date().toISOString(),
    total_fields: fields.length,
    pdf_path: process.argv[2] || DEFAULT_PDF_PATH,
    fields: fields
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  logger.success(`Saved field list to: ${outputPath}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get PDF path from command line or use default
    const pdfPath = process.argv[2] || DEFAULT_PDF_PATH;

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      logger.error(`PDF file not found: ${pdfPath}`);
      console.log('\nUsage: node scripts/extract-pdf-fields.js [path-to-pdf]');
      console.log(`\nDefault path: ${DEFAULT_PDF_PATH}\n`);
      process.exit(1);
    }

    logger.header('🚀 PDF FIELD EXTRACTOR');

    // Extract fields
    const fields = await extractPdfFields(pdfPath);

    // Categorize and display stats
    const stats = categorizeFields(fields);
    printStats(stats);

    // Save to file
    saveFieldList(fields, OUTPUT_PATH);

    console.log('\n✅ Extraction complete!\n');
    console.log('Next steps:');
    console.log('1. Review field-list.json');
    console.log('2. Run: node scripts/generate-mapping-code.js');
    console.log('3. Review generated database schema and mapping code\n');

  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractPdfFields, categorizeFields };
