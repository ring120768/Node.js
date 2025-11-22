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

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function loadCSV(filename) {
  const filepath = path.join(__dirname, '..', filename);
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

function createMatrix() {
  log('\n========================================', 'cyan');
  log('  3-Way Mapping Matrix', 'cyan');
  log('========================================\n', 'cyan');

  const dbSchema = loadCSV('SUPABASE_SCHEMA.csv');
  const pdfFields = loadCSV('PDF_FIELDS_LOCAL.csv');
  const mappings = loadCSV('PDF_MAPPINGS.csv');

  log(`📊 Loaded data:`, 'blue');
  log(`  Database: ${dbSchema.length} columns`, 'cyan');
  log(`  PDF: ${pdfFields.length} fields`, 'cyan');
  log(`  Mappings: ${mappings.length} mappings\n`, 'cyan');

  // Create lookup sets
  const dbColumns = new Set(dbSchema.map(d => d.Column));
  const pdfFieldNames = new Set(pdfFields.map(p => p['Field Name']));

  const issues = {
    pdfTypos: [],
    missingDbColumns: [],
    unmappedPdfFields: [],
    unmappedDbColumns: [],
    perfectMatches: []
  };

  const mappedPdfFields = new Set();
  const mappedDbColumns = new Set();

  // Check mappings
  mappings.forEach(m => {
    const pdfField = m['PDF Field'];
    const dbColumn = m['Database Column'];
    
    mappedPdfFields.add(pdfField);
    mappedDbColumns.add(dbColumn);

    if (!pdfFieldNames.has(pdfField)) {
      issues.pdfTypos.push({ line: m.Line, pdfField, dbColumn });
    } else if (!dbColumns.has(dbColumn)) {
      issues.missingDbColumns.push({ line: m.Line, pdfField, dbColumn });
    } else {
      issues.perfectMatches.push({ line: m.Line, pdfField, dbColumn });
    }
  });

  // Unmapped PDF fields
  pdfFields.forEach(p => {
    if (!mappedPdfFields.has(p['Field Name'])) {
      issues.unmappedPdfFields.push({ field: p['Field Name'], type: p['Field Type'] });
    }
  });

  // Unmapped DB columns
  const relevant = ['user_signup', 'incident_reports', 'incident_other_vehicles', 'incident_witnesses'];
  const excludeCols = ['id', 'created_at', 'updated_at', 'deleted_at', 'create_user_id', 'incident_id'];
  
  dbSchema.forEach(d => {
    if (relevant.includes(d.Table) && !excludeCols.includes(d.Column) && !mappedDbColumns.has(d.Column)) {
      issues.unmappedDbColumns.push({ table: d.Table, column: d.Column });
    }
  });

  // Summary
  log('========================================', 'cyan');
  log('  Results', 'cyan');
  log('========================================\n', 'cyan');

  log(`✅ Perfect: ${issues.perfectMatches.length}`, 'green');
  log(`❌ PDF Typos: ${issues.pdfTypos.length}`, 'red');
  log(`❌ Missing DB: ${issues.missingDbColumns.length}`, 'red');
  log(`⚠️  Unmapped PDF: ${issues.unmappedPdfFields.length}`, 'yellow');
  log(`⚠️  Unmapped DB: ${issues.unmappedDbColumns.length}\n`, 'yellow');

  // Generate report
  let report = '# Field Mapping Audit Report\n\n';
  report += `Generated: ${new Date().toLocaleString('en-GB')}\n\n`;
  report += '## Summary\n\n';
  report += `- ✅ **Perfect Matches**: ${issues.perfectMatches.length}\n`;
  report += `- ❌ **PDF Typos**: ${issues.pdfTypos.length}\n`;
  report += `- ❌ **Missing DB Columns**: ${issues.missingDbColumns.length}\n`;
  report += `- ⚠️  **Unmapped PDF Fields**: ${issues.unmappedPdfFields.length}\n`;
  report += `- ⚠️  **Unmapped DB Columns**: ${issues.unmappedDbColumns.length}\n\n`;

  if (issues.pdfTypos.length > 0) {
    report += '## ❌ PDF Field Typos (CRITICAL)\n\n';
    report += 'Mappings in pdfGenerator.js that point to non-existent PDF fields:\n\n';
    report += '| Line | PDF Field (Code) | DB Column | Status |\n|------|-----------------|-----------|--------|\n';
    issues.pdfTypos.forEach(i => {
      report += `| ${i.line} | \`${i.pdfField}\` | \`${i.dbColumn}\` | ❌ Not in PDF |\n`;
    });
    report += '\n**Action**: Correct these field names in lib/pdfGenerator.js or fix typos in PDF.\n\n';
  }

  if (issues.missingDbColumns.length > 0) {
    report += '## ❌ Missing Database Columns\n\n';
    report += '| Line | PDF Field | DB Column | Status |\n|------|-----------|-----------|--------|\n';
    issues.missingDbColumns.forEach(i => {
      report += `| ${i.line} | \`${i.pdfField}\` | \`${i.dbColumn}\` | ❌ Not in DB |\n`;
    });
    report += '\n';
  }

  if (issues.unmappedPdfFields.length > 0) {
    report += `## ⚠️ Unmapped PDF Fields (${issues.unmappedPdfFields.length})\n\n`;
    report += 'PDF fields with no data source:\n\n';
    report += '| PDF Field | Type |\n|-----------|------|\n';
    issues.unmappedPdfFields.slice(0, 30).forEach(i => {
      report += `| \`${i.field}\` | ${i.type} |\n`;
    });
    if (issues.unmappedPdfFields.length > 30) {
      report += `\n_... and ${issues.unmappedPdfFields.length - 30} more_\n`;
    }
    report += '\n';
  }

  if (issues.unmappedDbColumns.length > 0) {
    report += `## ⚠️ Unmapped Database Columns (${issues.unmappedDbColumns.length})\n\n`;
    report += 'Database columns not being used:\n\n';
    report += '| Table | Column |\n|-------|--------|\n';
    issues.unmappedDbColumns.slice(0, 30).forEach(i => {
      report += `| \`${i.table}\` | \`${i.column}\` |\n`;
    });
    if (issues.unmappedDbColumns.length > 30) {
      report += `\n_... and ${issues.unmappedDbColumns.length - 30} more_\n`;
    }
    report += '\n';
  }

  fs.writeFileSync(path.join(__dirname, '..', 'FIELD_MAPPING_AUDIT.md'), report, 'utf8');
  log(`✅ Report: FIELD_MAPPING_AUDIT.md\n`, 'green');

  // Save typos CSV
  if (issues.pdfTypos.length > 0) {
    const csv = 'Line,PDF Field (Wrong),DB Column\n' +
      issues.pdfTypos.map(i => `${i.line},"${i.pdfField}","${i.dbColumn}"`).join('\n');
    fs.writeFileSync(path.join(__dirname, '..', 'PDF_TYPOS.csv'), csv, 'utf8');
    log(`✅ Typos: PDF_TYPOS.csv\n`, 'green');
  }
}

createMatrix();
