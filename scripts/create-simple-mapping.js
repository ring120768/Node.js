#!/usr/bin/env node
/**
 * SIMPLE UI → SUPABASE → PDF MAPPING
 * Creates a simple 3-column CSV showing what's mapped where
 */

const fs = require('fs');

function parseCSV(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, i) => {
      const value = (values[i] || '').trim();
      // Remove quotes if present
      obj[header.trim()] = value.replace(/^"(.*)"$/, '$1');
    });
    return obj;
  });
}

console.log('Creating simple UI → Supabase → PDF mapping...\n');

// Load data
const uiFields = parseCSV('UI_FORM_FIELDS.csv');
const dbSchema = parseCSV('SUPABASE_SCHEMA.csv');
const codeMappings = parseCSV('PDF_MAPPINGS.csv');

// Create sets for quick lookup
const dbColumns = new Set(dbSchema.map(f => f.Column || f.column));

// Create PDF mappings: DB column → PDF fields
const dbToPdf = new Map();
codeMappings.forEach(m => {
  const dbColumn = m['Database Column'];
  const pdfField = m['PDF Field'];
  if (dbColumn && pdfField) {
    if (!dbToPdf.has(dbColumn)) {
      dbToPdf.set(dbColumn, []);
    }
    dbToPdf.get(dbColumn).push(pdfField);
  }
});

// Build simple mapping
const mapping = [];

uiFields.forEach(field => {
  const uiFieldName = field['Field Name'] || field.field;

  // Check Supabase
  const hasSupabase = dbColumns.has(uiFieldName) ? 'Yes' : 'No';

  // Check PDF (if it exists in Supabase)
  let hasPdf = 'No';
  if (hasSupabase === 'Yes' && dbToPdf.has(uiFieldName)) {
    hasPdf = dbToPdf.get(uiFieldName).join('; ');
  }

  mapping.push({
    'UI Field': uiFieldName,
    'In Supabase': hasSupabase,
    'In PDF': hasPdf
  });
});

// Sort: Missing Supabase first, then missing PDF, then complete
mapping.sort((a, b) => {
  if (a['In Supabase'] === 'No' && b['In Supabase'] === 'Yes') return -1;
  if (a['In Supabase'] === 'Yes' && b['In Supabase'] === 'No') return 1;
  if (a['In PDF'] === 'No' && b['In PDF'] !== 'No') return -1;
  if (a['In PDF'] !== 'No' && b['In PDF'] === 'No') return 1;
  return a['UI Field'].localeCompare(b['UI Field']);
});

// Write CSV
const csvLines = [
  'UI Field,In Supabase,In PDF'
];

mapping.forEach(m => {
  csvLines.push(`${m['UI Field']},${m['In Supabase']},${m['In PDF']}`);
});

fs.writeFileSync('UI_SUPABASE_PDF_MAPPING.csv', csvLines.join('\n'));

// Print summary
console.log('✅ Created: UI_SUPABASE_PDF_MAPPING.csv\n');

const stats = {
  total: mapping.length,
  noSupabase: mapping.filter(m => m['In Supabase'] === 'No').length,
  hasSupabaseNoPdf: mapping.filter(m => m['In Supabase'] === 'Yes' && m['In PDF'] === 'No').length,
  complete: mapping.filter(m => m['In Supabase'] === 'Yes' && m['In PDF'] !== 'No').length
};

console.log('📊 Summary:');
console.log(`   Total UI fields: ${stats.total}`);
console.log(`   ❌ Missing Supabase: ${stats.noSupabase}`);
console.log(`   ⚠️  In Supabase but not in PDF: ${stats.hasSupabaseNoPdf}`);
console.log(`   ✅ Complete (UI → Supabase → PDF): ${stats.complete}`);
console.log('');
console.log('💡 Sorted order:');
console.log('   1. Fields missing from Supabase (fix these first!)');
console.log('   2. Fields in Supabase but not in PDF (add to PDF)');
console.log('   3. Complete fields (already working)');
console.log('');
