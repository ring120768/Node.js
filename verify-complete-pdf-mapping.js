#!/usr/bin/env node

/**
 * Verifies that every PDF field in docs/field-mapping.csv is referenced in
 * src/services/adobePdfFormFillerService.js (including witness/vehicle append pages).
 * Fails (exit 1) if any mapped fields are missing. Extras are reported for awareness.
 */

const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/sync');

const csvPath = path.join(__dirname, 'docs/field-mapping.csv');
const servicePath = path.join(__dirname, 'src/services/adobePdfFormFillerService.js');

if (!fs.existsSync(csvPath)) {
  console.error(`❌ Mapping CSV not found: ${csvPath}`);
  process.exit(1);
}

if (!fs.existsSync(servicePath)) {
  console.error(`❌ PDF form filler service not found: ${servicePath}`);
  process.exit(1);
}

// Parse CSV (skip commented rows that start with "#")
const csvContent = fs.readFileSync(csvPath, 'utf8');
const records = parse.parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  comment: '#',
  relax_column_count: true,
  trim: true
});

const pdfFieldsFromCsv = new Set(
  records.map(r => r['PDF Field Name']).filter(Boolean)
);

// Extract every literal field name referenced in the service
const serviceContent = fs.readFileSync(servicePath, 'utf8');
const regexes = [
  /setFieldText(?:WithMaxFont|WithFixedFont)?\(\s*['"`]([^'"`]+)['"`]/g,
  /setUrlFieldWithAutoFitFont\(\s*['"`]([^'"`]+)['"`]/g,
  /checkField\(\s*['"`]([^'"`]+)['"`]/g,
  /checkFieldPair\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g,
  /form.getTextField\(\s*['"`]([^'"`]+)['"`]\)/g,
  /form.getCheckBox\(\s*['"`]([^'"`]+)['"`]\)/g,
  /setFieldValue\(form,\s*['"`]([^'"`]+)['"`]/g
];

const mappedFields = new Set();
for (const re of regexes) {
  let match;
  while ((match = re.exec(serviceContent))) {
    mappedFields.add(match[1]);
    if (match[2]) {
      mappedFields.add(match[2]);
    }
  }
}

const missing = [...pdfFieldsFromCsv].filter(f => !mappedFields.has(f));
const extras = [...mappedFields].filter(f => !pdfFieldsFromCsv.has(f));

console.log(`✅ CSV fields: ${pdfFieldsFromCsv.size}`);
console.log(`✅ Fields referenced in service: ${mappedFields.size}`);

if (missing.length > 0) {
  console.error('❌ Missing PDF fields in service:');
  missing.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
}

if (extras.length > 0) {
  console.log('ℹ️  Extra fields referenced (not in CSV, likely template-specific):');
  extras.forEach(f => console.log(`  - ${f}`));
}

console.log('🎉 PDF mapping verification passed (all CSV fields present).');
