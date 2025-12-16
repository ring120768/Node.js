/**
 * Extract all form field names from the PDF template
 * Outputs a CSV file with field details
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function extractFieldNames() {
  const templatePath = path.join(__dirname, '../pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');

  if (!fs.existsSync(templatePath)) {
    console.error('❌ PDF template not found at:', templatePath);
    process.exit(1);
  }

  console.log('📄 Loading PDF template...');
  const pdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  console.log('📋 Extracting form fields...');
  const fields = form.getFields();

  console.log(`\n✅ Found ${fields.length} form fields\n`);

  // Collect field data
  const fieldData = [];

  fields.forEach((field, index) => {
    const fieldName = field.getName();
    const fieldType = field.constructor.name.replace('PDF', '').replace('Field', '');

    // Try to get the page number
    let pageNumber = 'Unknown';
    try {
      const widgets = field.acroField.getWidgets();
      if (widgets.length > 0) {
        const widget = widgets[0];
        const pageRef = widget.P();
        if (pageRef) {
          const pages = pdfDoc.getPages();
          for (let i = 0; i < pages.length; i++) {
            if (pages[i].ref === pageRef) {
              pageNumber = i + 1;
              break;
            }
          }
        }
      }
    } catch (e) {
      // Page detection failed, leave as Unknown
    }

    // Get field value if any
    let currentValue = '';
    try {
      if (fieldType === 'Text') {
        currentValue = field.getText() || '';
      } else if (fieldType === 'CheckBox') {
        currentValue = field.isChecked() ? 'checked' : 'unchecked';
      } else if (fieldType === 'Dropdown') {
        currentValue = field.getSelected() || '';
      } else if (fieldType === 'RadioGroup') {
        currentValue = field.getSelected() || '';
      }
    } catch (e) {
      currentValue = '';
    }

    fieldData.push({
      index: index + 1,
      name: fieldName,
      type: fieldType,
      page: pageNumber,
      value: currentValue
    });
  });

  // Sort by field name for easier reading
  fieldData.sort((a, b) => a.name.localeCompare(b.name));

  // Generate CSV
  const csvHeader = 'Index,Field Name,Field Type,Page,Current Value';
  const csvRows = fieldData.map(f =>
    `${f.index},"${f.name}",${f.type},${f.page},"${f.value.replace(/"/g, '""')}"`
  );
  const csvContent = [csvHeader, ...csvRows].join('\n');

  // Write CSV
  const outputPath = path.join(__dirname, '../docs/pdf-actual-fields.csv');
  fs.writeFileSync(outputPath, csvContent);
  console.log(`📁 CSV saved to: ${outputPath}`);

  // Also print summary by type
  const typeCount = {};
  fieldData.forEach(f => {
    typeCount[f.type] = (typeCount[f.type] || 0) + 1;
  });

  console.log('\n📊 Field Type Summary:');
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

  // Print all field names for quick review
  console.log('\n📝 All Field Names (alphabetical):');
  console.log('─'.repeat(60));
  fieldData.forEach(f => {
    console.log(`   [${f.type.padEnd(10)}] ${f.name}`);
  });

  return fieldData;
}

extractFieldNames().catch(console.error);
