#!/usr/bin/env node
/**
 * Extract ALL UI fields from ALL incident form pages
 */

const fs = require('fs');
const glob = require('glob');

console.log('Extracting UI fields from ALL incident form pages...\n');

const files = glob.sync('public/incident-form-page*.html');
files.sort();

const allFields = [];
let totalFields = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');

  // Only match name attributes on form elements (input, select, textarea)
  const inputPattern = /<(?:input|select|textarea)[^>]*name="([^"]+)"[^>]*>/g;
  const matches = [];
  let match;

  while ((match = inputPattern.exec(content)) !== null) {
    matches.push(match[1]);
  }

  const fields = [...new Set(matches)];
  const pageName = file.replace('public/', '');

  fields.forEach(field => {
    allFields.push({
      page: pageName,
      field: field
    });
  });

  totalFields += fields.length;
  console.log(`  ${pageName}: ${fields.length} fields`);
});

console.log(`\n✅ Total: ${totalFields} unique fields across ${files.length} pages\n`);

// Write CSV
const csvLines = ['Page,Field Name'];
allFields.forEach(f => {
  csvLines.push(`"${f.page}","${f.field}"`);
});

fs.writeFileSync('UI_FORM_FIELDS.csv', csvLines.join('\n'));

console.log('✅ Created: UI_FORM_FIELDS.csv\n');
