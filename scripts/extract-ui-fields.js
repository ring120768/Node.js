#!/usr/bin/env node
/**
 * Extract all form field names from HTML forms
 * This shows what the UI actually collects from users
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function extractFieldsFromHTML(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const fields = new Set();

  // Match input fields: <input ... name="field_name" ...>
  const inputMatches = html.matchAll(/<input[^>]+name=["']([^"']+)["'][^>]*>/gi);
  for (const match of inputMatches) {
    fields.add(match[1]);
  }

  // Match select fields: <select ... name="field_name" ...>
  const selectMatches = html.matchAll(/<select[^>]+name=["']([^"']+)["'][^>]*>/gi);
  for (const match of selectMatches) {
    fields.add(match[1]);
  }

  // Match textarea fields: <textarea ... name="field_name" ...>
  const textareaMatches = html.matchAll(/<textarea[^>]+name=["']([^"']+)["'][^>]*>/gi);
  for (const match of textareaMatches) {
    fields.add(match[1]);
  }

  return Array.from(fields).sort();
}

function analyzeUIForms() {
  log('\n========================================', 'cyan');
  log('  UI Form Fields Extractor', 'cyan');
  log('========================================\n', 'cyan');
  log('Analyzing what the UI actually collects from users\n', 'yellow');

  const publicDir = path.join(__dirname, '../public');

  // Incident form pages
  const incidentForms = [
    'incident-form-page1.html',
    'incident-form-page2.html',
    'incident-form-page3.html',
    'incident-form-page4.html',
    'incident-form-page4a-location-photos.html',
    'incident-form-page5-vehicle.html',
    'incident-form-page6-vehicle-images.html',
    'incident-form-page7-other-vehicle.html',
    'incident-form-page8-other-damage-images.html',
    'incident-form-page9-witnesses.html',
    'incident-form-page10-police-details.html',
    'incident-form-page12-final-medical-check.html'
  ];

  const allFields = [];

  log('📋 Incident Report Forms:\n', 'cyan');

  for (const formFile of incidentForms) {
    const filePath = path.join(publicDir, formFile);

    if (!fs.existsSync(filePath)) {
      log(`  ⚠️  ${formFile} - Not found`, 'yellow');
      continue;
    }

    const fields = extractFieldsFromHTML(filePath);
    log(`  ✅ ${formFile.padEnd(45)} → ${fields.length.toString().padStart(3)} fields`, 'green');

    fields.forEach(field => {
      allFields.push({
        page: formFile,
        field: field
      });
    });
  }

  // Remove duplicates and sort
  const uniqueFields = [...new Set(allFields.map(f => f.field))].sort();

  log(`\n📊 Summary:`, 'cyan');
  log(`  Total unique fields: ${uniqueFields.length}`, 'green');

  // Save to CSV
  const csv = 'Page,Field Name\n' +
    allFields.map(f => `"${f.page}","${f.field}"`).join('\n');

  const outputPath = path.join(__dirname, '..', 'UI_FORM_FIELDS.csv');
  fs.writeFileSync(outputPath, csv, 'utf8');

  log(`  Output: UI_FORM_FIELDS.csv\n`, 'green');

  // Show sample
  log('📝 Sample fields collected by UI:\n', 'cyan');
  uniqueFields.slice(0, 20).forEach(field => {
    log(`  - ${field}`, 'reset');
  });

  if (uniqueFields.length > 20) {
    log(`  ... and ${uniqueFields.length - 20} more\n`, 'yellow');
  }

  return uniqueFields;
}

analyzeUIForms();
