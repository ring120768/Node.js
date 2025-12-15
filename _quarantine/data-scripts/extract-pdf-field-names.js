/**
 * Extract all fillable field names from PDF template
 *
 * This script reads the Car Crash Lawyer AI PDF template and extracts:
 * - All fillable field names
 * - Field types (text, checkbox, radio, etc.)
 * - Field properties
 *
 * Output: JSON file with complete field inventory for reconciliation
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

const PDF_TEMPLATE_PATH = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report-main.pdf';
const OUTPUT_JSON = path.join(__dirname, 'pdf-template-fields.json');
const OUTPUT_TXT = path.join(__dirname, 'pdf-template-fields.txt');

async function extractPdfFieldNames() {
  try {
    console.log('📄 Reading PDF template...');
    console.log(`Path: ${PDF_TEMPLATE_PATH}`);

    // Read PDF file
    const pdfBytes = await fs.readFile(PDF_TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    console.log('✅ PDF loaded successfully');
    console.log(`Pages: ${pdfDoc.getPageCount()}`);

    // Get the form
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`\n📊 Total fillable fields found: ${fields.length}`);

    // Extract field details
    const fieldInventory = [];
    const fieldsByType = {
      text: [],
      checkbox: [],
      radio: [],
      dropdown: [],
      button: [],
      other: []
    };

    fields.forEach((field) => {
      const fieldName = field.getName();
      let fieldType = 'other';
      let fieldDetails = {
        name: fieldName,
        type: 'unknown'
      };

      try {
        // Determine field type
        if (field.constructor.name.includes('PDFTextField')) {
          fieldType = 'text';
          const textField = form.getTextField(fieldName);
          fieldDetails = {
            name: fieldName,
            type: 'text',
            maxLength: textField.getMaxLength() || 'unlimited',
            multiline: textField.isMultiline(),
            readOnly: textField.isReadOnly()
          };
        } else if (field.constructor.name.includes('PDFCheckBox')) {
          fieldType = 'checkbox';
          const checkbox = form.getCheckBox(fieldName);
          fieldDetails = {
            name: fieldName,
            type: 'checkbox',
            checked: checkbox.isChecked(),
            readOnly: checkbox.isReadOnly()
          };
        } else if (field.constructor.name.includes('PDFRadioGroup')) {
          fieldType = 'radio';
          const radioGroup = form.getRadioGroup(fieldName);
          fieldDetails = {
            name: fieldName,
            type: 'radio',
            options: radioGroup.getOptions(),
            selected: radioGroup.getSelected(),
            readOnly: radioGroup.isReadOnly()
          };
        } else if (field.constructor.name.includes('PDFDropdown')) {
          fieldType = 'dropdown';
          const dropdown = form.getDropdown(fieldName);
          fieldDetails = {
            name: fieldName,
            type: 'dropdown',
            options: dropdown.getOptions(),
            selected: dropdown.getSelected(),
            readOnly: dropdown.isReadOnly()
          };
        } else if (field.constructor.name.includes('PDFButton')) {
          fieldType = 'button';
          fieldDetails = {
            name: fieldName,
            type: 'button'
          };
        }
      } catch (error) {
        console.warn(`⚠️ Error processing field ${fieldName}:`, error.message);
      }

      fieldInventory.push(fieldDetails);
      fieldsByType[fieldType].push(fieldDetails);
    });

    // Sort fields by name for easier reading
    fieldInventory.sort((a, b) => a.name.localeCompare(b.name));

    // Generate summary statistics
    const summary = {
      totalFields: fields.length,
      byType: {
        text: fieldsByType.text.length,
        checkbox: fieldsByType.checkbox.length,
        radio: fieldsByType.radio.length,
        dropdown: fieldsByType.dropdown.length,
        button: fieldsByType.button.length,
        other: fieldsByType.other.length
      },
      extractedAt: new Date().toISOString(),
      pdfPath: PDF_TEMPLATE_PATH,
      pageCount: pdfDoc.getPageCount()
    };

    // Prepare output data
    const outputData = {
      summary,
      fieldInventory,
      fieldsByType
    };

    // Write JSON output
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(outputData, null, 2));
    console.log(`\n✅ JSON output written to: ${OUTPUT_JSON}`);

    // Write human-readable text output
    let txtOutput = '═══════════════════════════════════════════════════════════\n';
    txtOutput += '  PDF TEMPLATE FIELD INVENTORY\n';
    txtOutput += '  Car Crash Lawyer AI - Incident Report\n';
    txtOutput += '═══════════════════════════════════════════════════════════\n\n';

    txtOutput += `📄 PDF: ${PDF_TEMPLATE_PATH}\n`;
    txtOutput += `📊 Total Pages: ${summary.pageCount}\n`;
    txtOutput += `📝 Total Fields: ${summary.totalFields}\n\n`;

    txtOutput += '─── Field Types ───\n';
    txtOutput += `  Text fields:     ${summary.byType.text}\n`;
    txtOutput += `  Checkboxes:      ${summary.byType.checkbox}\n`;
    txtOutput += `  Radio groups:    ${summary.byType.radio}\n`;
    txtOutput += `  Dropdowns:       ${summary.byType.dropdown}\n`;
    txtOutput += `  Buttons:         ${summary.byType.button}\n`;
    txtOutput += `  Other:           ${summary.byType.other}\n\n`;

    // List all fields by type
    Object.entries(fieldsByType).forEach(([type, fields]) => {
      if (fields.length > 0) {
        txtOutput += `\n${'═'.repeat(60)}\n`;
        txtOutput += `${type.toUpperCase()} FIELDS (${fields.length})\n`;
        txtOutput += `${'═'.repeat(60)}\n\n`;

        fields.forEach((field, index) => {
          txtOutput += `${index + 1}. ${field.name}\n`;

          if (field.type === 'text') {
            txtOutput += `   Type: Text | MaxLength: ${field.maxLength} | Multiline: ${field.multiline}\n`;
          } else if (field.type === 'checkbox') {
            txtOutput += `   Type: Checkbox | Checked: ${field.checked}\n`;
          } else if (field.type === 'radio') {
            txtOutput += `   Type: Radio | Options: ${field.options.join(', ')}\n`;
          } else if (field.type === 'dropdown') {
            txtOutput += `   Type: Dropdown | Options: ${field.options.join(', ')}\n`;
          }

          txtOutput += '\n';
        });
      }
    });

    // Alphabetical list for easy searching
    txtOutput += `\n${'═'.repeat(60)}\n`;
    txtOutput += `ALPHABETICAL FIELD LIST (${fieldInventory.length})\n`;
    txtOutput += `${'═'.repeat(60)}\n\n`;

    fieldInventory.forEach((field, index) => {
      txtOutput += `${String(index + 1).padStart(3, ' ')}. ${field.name} (${field.type})\n`;
    });

    txtOutput += `\n${'═'.repeat(60)}\n`;
    txtOutput += `Extracted: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}\n`;
    txtOutput += `${'═'.repeat(60)}\n`;

    await fs.writeFile(OUTPUT_TXT, txtOutput);
    console.log(`✅ Text output written to: ${OUTPUT_TXT}`);

    // Print summary to console
    console.log('\n📊 Summary:');
    console.log('─'.repeat(60));
    console.log(`Text fields:     ${summary.byType.text}`);
    console.log(`Checkboxes:      ${summary.byType.checkbox}`);
    console.log(`Radio groups:    ${summary.byType.radio}`);
    console.log(`Dropdowns:       ${summary.byType.dropdown}`);
    console.log(`Buttons:         ${summary.byType.button}`);
    console.log(`Other:           ${summary.byType.other}`);
    console.log('─'.repeat(60));

    // Show first 10 field names as preview
    console.log('\n📝 Field Name Preview (first 10):');
    fieldInventory.slice(0, 10).forEach((field, index) => {
      console.log(`  ${index + 1}. ${field.name} (${field.type})`);
    });

    if (fieldInventory.length > 10) {
      console.log(`  ... and ${fieldInventory.length - 10} more fields`);
    }

    console.log('\n✅ Extraction complete!');
    console.log(`\n📁 Output files:`);
    console.log(`   JSON: ${OUTPUT_JSON}`);
    console.log(`   Text: ${OUTPUT_TXT}`);

    return outputData;

  } catch (error) {
    console.error('❌ Error extracting PDF fields:', error);
    throw error;
  }
}

// Run extraction
extractPdfFieldNames()
  .then(() => {
    console.log('\n🎉 PDF field extraction successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 PDF field extraction failed:', error);
    process.exit(1);
  });
