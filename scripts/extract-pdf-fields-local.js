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

async function extractPdfFields() {
  const pdfPath = path.join(__dirname, '..', 'pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Main.pdf');
  
  log('\n========================================', 'cyan');
  log('  PDF Field Extractor (LOCAL)', 'cyan');
  log('========================================\n', 'cyan');
  log(`📄 ${pdfPath}\n`, 'blue');

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  log(`Found ${fields.length} fields\n`, 'green');

  const fieldData = [];
  fields.forEach(field => {
    const name = field.getName();
    const type = field.constructor.name.replace('PDF', '');
    fieldData.push({ name, type });
  });

  fieldData.sort((a, b) => a.name.localeCompare(b.name));

  const csv = 'Field Name,Field Type\n' + 
    fieldData.map(f => `"${f.name}","${f.type}"`).join('\n');

  const outputPath = path.join(__dirname, '..', 'PDF_FIELDS_LOCAL.csv');
  fs.writeFileSync(outputPath, csv, 'utf8');

  log(`✅ Saved: ${outputPath}\n`, 'green');
  log('First 15 fields:', 'cyan');
  fieldData.slice(0, 15).forEach((f, i) => {
    log(`  ${i+1}. ${f.name} (${f.type})`, 'blue');
  });
  log(`  ... ${fieldData.length - 15} more\n`, 'yellow');
}

extractPdfFields().then(() => process.exit(0)).catch(console.error);
