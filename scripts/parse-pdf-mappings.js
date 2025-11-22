#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseMappings() {
  log('\n========================================', 'cyan');
  log('  PDF Mapping Parser', 'cyan');
  log('========================================\n', 'cyan');

  const filePath = path.join(__dirname, '..', 'lib/pdfGenerator.js');
  const code = fs.readFileSync(filePath, 'utf8');
  const lines = code.split('\n');

  const mappings = [];

  lines.forEach((line, lineNum) => {
    // Pattern 1: setFieldText('pdf_field', user.column) or setFieldText('pdf_field', incident.column)
    const textMatch = line.match(/setFieldText\(['"]([^'"]+)['"],\s*(?:user|incident|witness|vehicle|data)\.([a-z_0-9]+)/i);
    if (textMatch) {
      mappings.push({
        lineNum: lineNum + 1,
        pdfField: textMatch[1],
        dbColumn: textMatch[2],
        type: 'TextField'
      });
    }

    // Pattern 2: checkField('pdf_field', incident.column === ...)
    const checkMatch = line.match(/checkField\(['"]([^'"]+)['"],\s*(?:user|incident|witness|vehicle|data)\.([a-z_0-9]+)/i);
    if (checkMatch) {
      mappings.push({
        lineNum: lineNum + 1,
        pdfField: checkMatch[1],
        dbColumn: checkMatch[2],
        type: 'CheckBox'
      });
    }
  });

  log(`✅ Found ${mappings.length} field mappings\n`, 'green');

  const textFields = mappings.filter(m => m.type === 'TextField').length;
  const checkBoxes = mappings.filter(m => m.type === 'CheckBox').length;

  log(`  📝 Text Fields: ${textFields}`, 'cyan');
  log(`  ☑️  Checkboxes: ${checkBoxes}\n`, 'cyan');

  // Generate CSV
  const csv = 'Line,PDF Field,Database Column,Type\n' +
    mappings.map(m => `${m.lineNum},"${m.pdfField}","${m.dbColumn}","${m.type}"`).join('\n');

  const outputPath = path.join(__dirname, '..', 'PDF_MAPPINGS.csv');
  fs.writeFileSync(outputPath, csv, 'utf8');

  log(`✅ Saved: ${outputPath}\n`, 'green');

  log('First 15 mappings:', 'blue');
  mappings.slice(0, 15).forEach(m => {
    log(`  Line ${m.lineNum}: ${m.pdfField} ← ${m.dbColumn} (${m.type})`, 'cyan');
  });
  log(`  ... ${mappings.length - 15} more\n`, 'yellow');
}

parseMappings();
