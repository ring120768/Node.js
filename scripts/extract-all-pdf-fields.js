#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function extractFieldsFromPDF(pdfPath, templateName) {
  log(`\n📄 Analyzing: ${templateName}`, 'cyan');

  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const fieldData = [];
    let textFieldCount = 0;
    let checkboxCount = 0;

    fields.forEach(field => {
      const name = field.getName();
      let type = 'Unknown';
      let defaultValue = '';

      const constructor = field.constructor.name;

      if (constructor.includes('TextField')) {
        type = 'TextField';
        textFieldCount++;
        try {
          defaultValue = field.getText() || '';
        } catch (e) {
          defaultValue = '';
        }
      } else if (constructor.includes('CheckBox')) {
        type = 'CheckBox';
        checkboxCount++;
        try {
          defaultValue = field.isChecked() ? 'Yes' : 'No';
        } catch (e) {
          defaultValue = '';
        }
      } else {
        type = constructor;
      }

      fieldData.push({
        template: templateName,
        name,
        type,
        defaultValue: defaultValue.toString().replace(/,/g, ';')
      });
    });

    log(`  ✅ ${fields.length} fields (${textFieldCount} text, ${checkboxCount} checkboxes)`, 'green');

    return fieldData;

  } catch (error) {
    log(`  ❌ Error: ${error.message}`, 'red');
    return [];
  }
}

async function extractAllPDFs() {
  log('\n========================================', 'cyan');
  log('  Multi-PDF Field Extractor', 'cyan');
  log('========================================\n', 'cyan');

  const templatesDir = path.join(__dirname, '../pdf-templates');

  const pdfs = [
    {
      name: 'Main Incident Report',
      file: 'Car-Crash-Lawyer-AI-incident-report-main.pdf'
    },
    {
      name: 'Other Vehicle 1',
      file: 'Car-Crash-Lawyer-AI-Incident-Report-Other-Vehicle-1.pdf'
    },
    {
      name: 'Other Vehicles 2-4',
      file: 'Car-Crash-Lawyer-AI-Incident-Report-Other-Vehicles-2-4.pdf'
    },
    {
      name: 'Witnesses 3-4',
      file: 'Car-Crash-Lawyer-AI-Incident-Report-Witnesses-3-4.pdf'
    }
  ];

  const allFields = [];

  for (const pdf of pdfs) {
    const pdfPath = path.join(templatesDir, pdf.file);
    if (fs.existsSync(pdfPath)) {
      const fields = await extractFieldsFromPDF(pdfPath, pdf.name);
      allFields.push(...fields);
    } else {
      log(`⚠️  File not found: ${pdf.file}`, 'yellow');
    }
  }

  // Generate summary
  log('\n========================================', 'cyan');
  log('  Summary by Template', 'cyan');
  log('========================================\n', 'cyan');

  const byTemplate = {};
  allFields.forEach(f => {
    if (!byTemplate[f.template]) {
      byTemplate[f.template] = { total: 0, text: 0, checkbox: 0 };
    }
    byTemplate[f.template].total++;
    if (f.type === 'TextField') byTemplate[f.template].text++;
    if (f.type === 'CheckBox') byTemplate[f.template].checkbox++;
  });

  Object.keys(byTemplate).forEach(template => {
    const stats = byTemplate[template];
    log(`${template}:`, 'blue');
    log(`  Total: ${stats.total} (${stats.text} text, ${stats.checkbox} checkboxes)`, 'cyan');
  });

  log(`\n📊 GRAND TOTAL: ${allFields.length} fields across all PDFs\n`, 'green');

  // Save to CSV
  const csv = 'Template,Field Name,Field Type,Default Value\n' +
    allFields.map(f => `"${f.template}","${f.name}","${f.type}","${f.defaultValue}"`).join('\n');

  const outputPath = path.join(__dirname, '..', 'ALL_PDF_FIELDS.csv');
  fs.writeFileSync(outputPath, csv, 'utf8');

  log(`✅ Saved: ALL_PDF_FIELDS.csv\n`, 'green');
}

extractAllPDFs()
  .then(() => process.exit(0))
  .catch(error => {
    log('\n❌ Unexpected error:', 'red');
    console.error(error);
    process.exit(1);
  });
