#!/usr/bin/env node

/**
 * PDF Field Importer from CSV
 *
 * Automatically creates form fields in a PDF from a CSV mapping file.
 * Saves hours of manual field creation in Adobe Acrobat Pro.
 *
 * Usage:
 *   node scripts/import-fields-from-csv.js
 *   node scripts/import-fields-from-csv.js /path/to/custom.csv /path/to/pdf
 *
 * Input:
 *   - CSV file with columns: Page, Field Name PDF, Field Name Supabase, Field Type
 *   - Source PDF (template without fields)
 *
 * Output:
 *   - Fillable PDF with all fields created
 */

const { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const logger = {
  info: (msg) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m✗\x1b[0m ${msg}`),
  header: (msg) => console.log(`\n${'═'.repeat(70)}\n${msg}\n${'═'.repeat(70)}`),
};

// Default paths
const DEFAULT_CSV_PATH = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/supabase_fields.csv';
const DEFAULT_PDF_PATH = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report.pdf';
const OUTPUT_PDF_PATH = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report-FILLABLE.pdf';

/**
 * Parse CSV file and extract field definitions
 * @param {string} csvPath - Path to CSV file
 * @returns {Array} Array of field definitions
 */
function parseFieldsCsv(csvPath) {
  logger.info(`Reading CSV: ${csvPath}`);

  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV with header row
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  logger.success(`Parsed ${records.length} field definitions`);

  // Transform to our format
  const fields = records.map((record, index) => ({
    page: parseInt(record.Page) || 1,
    pdfName: record['Field Name PDF']?.trim() || `field_${index}`,
    supabaseName: record['Field Name Supabase']?.trim() || record['Field Name PDF']?.trim(),
    type: record['Field Type']?.trim() || 'String',
    index: index + 1
  }));

  return fields;
}

/**
 * Calculate field position on page
 * @param {number} pageIndex - Page index (0-based)
 * @param {number} fieldIndex - Field index on page
 * @param {Object} pageSize - Page dimensions
 * @returns {Object} Position {x, y, width, height}
 */
function calculateFieldPosition(pageIndex, fieldIndex, pageSize) {
  // PDF coordinates: origin at bottom-left
  // Standard A4 page: 595 x 842 points

  const margin = 50;
  const fieldHeight = 20;
  const fieldSpacing = 5;
  const defaultWidth = 200;

  // Arrange fields in columns
  const fieldsPerColumn = 30;
  const columnIndex = Math.floor(fieldIndex / fieldsPerColumn);
  const rowIndex = fieldIndex % fieldsPerColumn;

  const x = margin + (columnIndex * (defaultWidth + 20));
  const y = pageSize.height - margin - (rowIndex * (fieldHeight + fieldSpacing)) - fieldHeight;

  return {
    x: Math.max(margin, Math.min(x, pageSize.width - defaultWidth - margin)),
    y: Math.max(margin, y),
    width: defaultWidth,
    height: fieldHeight
  };
}

/**
 * Create form field in PDF
 * @param {PDFForm} form - PDF form object
 * @param {PDFPage} page - PDF page object
 * @param {Object} fieldDef - Field definition
 * @param {number} pageIndex - Page index
 * @param {number} fieldIndex - Field index on page
 */
function createFormField(form, page, fieldDef, pageIndex, fieldIndex) {
  const pageSize = page.getSize();
  const position = calculateFieldPosition(pageIndex, fieldIndex, pageSize);

  try {
    // Determine field type
    const fieldType = fieldDef.type.toLowerCase();

    if (fieldType === 'boolean') {
      // Create checkbox
      const checkbox = form.createCheckBox(fieldDef.pdfName);
      checkbox.addToPage(page, {
        x: position.x,
        y: position.y,
        width: 15,
        height: 15
      });

    } else if (fieldType === 'date' || fieldType === 'time' || fieldType.includes('timestamp')) {
      // Create date/time text field
      const textField = form.createTextField(fieldDef.pdfName);
      textField.addToPage(page, position);
      textField.enableReadOnly(); // Optional: make read-only if auto-filled

    } else if (fieldType === 'integer' || fieldType === 'number') {
      // Create numeric text field
      const textField = form.createTextField(fieldDef.pdfName);
      textField.addToPage(page, position);

    } else if (fieldDef.pdfName.toLowerCase().includes('email')) {
      // Create email field
      const textField = form.createTextField(fieldDef.pdfName);
      textField.addToPage(page, position);

    } else if (fieldDef.pdfName.toLowerCase().includes('description') ||
               fieldDef.pdfName.toLowerCase().includes('notes') ||
               fieldDef.pdfName.toLowerCase().includes('narrative')) {
      // Create multiline text field
      const textField = form.createTextField(fieldDef.pdfName);
      textField.addToPage(page, {
        ...position,
        height: 100 // Taller for multiline
      });
      textField.enableMultiline();

    } else {
      // Default: create single-line text field
      const textField = form.createTextField(fieldDef.pdfName);
      textField.addToPage(page, position);
    }

  } catch (error) {
    logger.warn(`Failed to create field "${fieldDef.pdfName}": ${error.message}`);
  }
}

/**
 * Create all form fields in PDF
 * @param {PDFDocument} pdfDoc - PDF document
 * @param {Array} fields - Field definitions
 */
function createAllFields(pdfDoc, fields) {
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();

  // Group fields by page
  const fieldsByPage = {};
  fields.forEach(field => {
    const pageNum = field.page;
    if (!fieldsByPage[pageNum]) {
      fieldsByPage[pageNum] = [];
    }
    fieldsByPage[pageNum].push(field);
  });

  logger.info(`Creating fields across ${Object.keys(fieldsByPage).length} pages...`);

  let totalCreated = 0;
  let totalFailed = 0;

  // Create fields on each page
  Object.entries(fieldsByPage).forEach(([pageNum, pageFields]) => {
    const pageIndex = parseInt(pageNum) - 1; // Convert to 0-based index

    if (pageIndex < 0 || pageIndex >= pages.length) {
      logger.warn(`Page ${pageNum} doesn't exist (PDF has ${pages.length} pages), skipping ${pageFields.length} fields`);
      totalFailed += pageFields.length;
      return;
    }

    const page = pages[pageIndex];
    logger.info(`Page ${pageNum}: Creating ${pageFields.length} fields...`);

    pageFields.forEach((field, fieldIndex) => {
      try {
        createFormField(form, page, field, pageIndex, fieldIndex);
        totalCreated++;
      } catch (error) {
        logger.error(`Failed to create "${field.pdfName}": ${error.message}`);
        totalFailed++;
      }
    });
  });

  return { totalCreated, totalFailed };
}

/**
 * Main execution
 */
async function main() {
  try {
    logger.header('🚀 PDF FIELD IMPORTER FROM CSV');

    // Get paths from command line or use defaults
    const csvPath = process.argv[2] || DEFAULT_CSV_PATH;
    const pdfPath = process.argv[3] || DEFAULT_PDF_PATH;
    const outputPath = process.argv[4] || OUTPUT_PDF_PATH;

    // Validate input files
    if (!fs.existsSync(csvPath)) {
      logger.error(`CSV file not found: ${csvPath}`);
      console.log('\nUsage: node scripts/import-fields-from-csv.js [csv-path] [pdf-path] [output-path]\n');
      process.exit(1);
    }

    if (!fs.existsSync(pdfPath)) {
      logger.error(`PDF file not found: ${pdfPath}`);
      process.exit(1);
    }

    // Parse CSV
    const fields = parseFieldsCsv(csvPath);

    // Statistics
    const stats = {
      total: fields.length,
      byType: {},
      byPage: {}
    };

    fields.forEach(field => {
      stats.byType[field.type] = (stats.byType[field.type] || 0) + 1;
      stats.byPage[field.page] = (stats.byPage[field.page] || 0) + 1;
    });

    console.log('\n📊 Field Statistics:\n');
    console.log(`Total Fields: ${stats.total}`);
    console.log('\nBy Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log('\nBy Page:');
    Object.entries(stats.byPage)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([page, count]) => {
        console.log(`  Page ${page}: ${count} fields`);
      });

    // Load PDF
    logger.info(`\nLoading PDF: ${pdfPath}`);
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    logger.success(`PDF loaded (${pdfDoc.getPageCount()} pages)`);

    // Create fields
    logger.info('\nCreating form fields...');
    const result = createAllFields(pdfDoc, fields);

    console.log('\n✅ Field Creation Summary:\n');
    console.log(`  Created: ${result.totalCreated} fields`);
    console.log(`  Failed: ${result.totalFailed} fields`);
    console.log(`  Success Rate: ${((result.totalCreated / stats.total) * 100).toFixed(1)}%`);

    // Save PDF
    logger.info(`\nSaving fillable PDF: ${outputPath}`);
    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, modifiedPdfBytes);
    logger.success(`Saved: ${outputPath}`);

    const fileSizeMB = (modifiedPdfBytes.length / 1024 / 1024).toFixed(2);
    console.log(`File size: ${fileSizeMB} MB`);

    console.log('\n✅ Import complete!\n');
    console.log('Next steps:');
    console.log(`1. Open in Adobe Acrobat Pro: ${path.basename(outputPath)}`);
    console.log('2. Adjust field positions/sizes visually (Tools → Prepare Form)');
    console.log('3. Run extraction: node scripts/extract-pdf-fields.js');
    console.log('4. Generate mapping: node scripts/generate-mapping-code.js\n');

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

module.exports = { parseFieldsCsv, createAllFields };
