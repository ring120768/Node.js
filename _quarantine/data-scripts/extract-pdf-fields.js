#!/usr/bin/env node
/**
 * Extract field VALUES from a filled PDF
 * Specifically looks for location/what3words/URL fields to verify they contain data
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

async function extractFilledPdfValues(pdfPath) {
  console.log(colors.cyan, `\n📄 Extracting field values from filled PDF`);
  console.log(`   Path: ${pdfPath}\n`);

  try {
    // Read the PDF
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the form
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(colors.green, `✅ Found ${fields.length} form fields\n`);

    // Look for location/what3words related fields
    console.log(colors.magenta, '🔍 Searching for location/what3words/map fields...\n');

    const locationFields = fields.filter(field => {
      const name = field.getName().toLowerCase();
      return name.includes('location') ||
             name.includes('what3') ||
             name.includes('map') ||
             name.includes('screenshot');
    });

    if (locationFields.length > 0) {
      console.log(colors.cyan, `🗺️  Found ${locationFields.length} location-related fields:\n`);

      locationFields.forEach(field => {
        const name = field.getName();
        const type = field.constructor.name;
        let value = '';

        try {
          if (type.includes('Text')) {
            value = field.getText() || '[EMPTY]';
          } else if (type.includes('CheckBox')) {
            value = field.isChecked() ? 'CHECKED' : 'UNCHECKED';
          } else {
            value = `[${type}]`;
          }
        } catch (e) {
          value = `[ERROR: ${e.message}]`;
        }

        console.log(colors.green, `  📌 Field: ${name}`);
        console.log(colors.cyan, `     Type: ${type}`);

        if (value.length > 200) {
          console.log(colors.yellow, `     Value (${value.length} chars):`);
          console.log(`     ${value.substring(0, 200)}...`);
          console.log(`     ...${value.substring(value.length - 50)}`);
        } else {
          console.log(colors.yellow, `     Value (${value.length} chars): ${value}`);
        }
        console.log();
      });
    } else {
      console.log(colors.yellow, '⚠️  No location-related fields found\n');
      console.log(colors.cyan, '🔗 Searching for URL fields instead...\n');

      const urlFields = fields.filter(field => {
        const name = field.getName().toLowerCase();
        return name.includes('url') || name.includes('_url');
      });

      if (urlFields.length > 0) {
        console.log(colors.cyan, `Found ${urlFields.length} URL fields:\n`);

        urlFields.forEach(field => {
          const name = field.getName();
          const type = field.constructor.name;
          let value = '';

          try {
            if (type.includes('Text')) {
              value = field.getText() || '[EMPTY]';
            }
          } catch (e) {
            value = `[ERROR: ${e.message}]`;
          }

          console.log(colors.green, `  🔗 ${name}`);
          if (value.length > 150) {
            console.log(colors.yellow, `     (${value.length} chars) ${value.substring(0, 150)}...`);
          } else {
            console.log(colors.yellow, `     ${value}`);
          }
          console.log();
        });
      } else {
        console.log(colors.red, '❌ No URL fields found either\n');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log(colors.magenta, '\n📊 SUMMARY\n');
    console.log(colors.cyan, `Total fields in PDF: ${fields.length}`);
    console.log(colors.cyan, `Location-related fields: ${locationFields.length}`);

    const filledLocationFields = locationFields.filter(field => {
      try {
        const value = field.constructor.name.includes('Text') ? field.getText() : '';
        return value && value.length > 0 && value !== '[EMPTY]';
      } catch (e) {
        return false;
      }
    });

    console.log(colors.green, `Filled location fields: ${filledLocationFields.length}`);
    console.log();

    return {
      total: fields.length,
      locationFields: locationFields.length,
      filledLocationFields: filledLocationFields.length
    };

  } catch (error) {
    console.log(colors.red, `❌ Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  const pdfPath = process.argv[2] || './test-output/filled-form-35a7475f-60ca-4c5d-bc48-d13a299f4309.pdf';

  console.log(colors.cyan, '\n🔍 PDF FIELD VALUE EXTRACTION\n');
  console.log('='.repeat(80));

  try {
    await extractFilledPdfValues(pdfPath);
    console.log(colors.green, '✅ Extraction complete\n');
  } catch (error) {
    console.log(colors.red, `\n❌ Failed: ${error.message}\n`);
    process.exit(1);
  }
}

main().catch(console.error);
