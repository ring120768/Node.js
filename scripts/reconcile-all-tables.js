#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
  magenta: '\x1b[35m'
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

function reconcileAllTables() {
  log('\n========================================', 'cyan');
  log('  Complete Database Reconciliation', 'cyan');
  log('========================================\n', 'cyan');

  // Load data
  const schema = loadCSV('SUPABASE_SCHEMA.csv');
  const mappings = loadCSV('PDF_MAPPINGS.csv');

  const tables = [
    'user_signup',
    'incident_reports',
    'incident_other_vehicles',
    'incident_witnesses',
    'ai_transcription',
    'user_documents'
  ];

  const allResults = [];
  let totalColumns = 0;
  let totalMapped = 0;
  let totalUnmapped = 0;

  tables.forEach(tableName => {
    const columns = schema
      .filter(row => row.Table === tableName)
      .map(row => row.Column);

    const mapped = [];
    const unmapped = [];

    columns.forEach(column => {
      const mapping = mappings.find(m => m['Database Column'] === column);

      if (mapping) {
        mapped.push({
          column,
          pdfField: mapping['PDF Field'],
          type: mapping.Type,
          line: mapping.Line
        });
      } else {
        unmapped.push(column);
      }
    });

    totalColumns += columns.length;
    totalMapped += mapped.length;
    totalUnmapped += unmapped.length;

    allResults.push({
      table: tableName,
      totalColumns: columns.length,
      mapped: mapped.length,
      unmapped: unmapped.length,
      mappedColumns: mapped,
      unmappedColumns: unmapped
    });

    // Display summary for this table
    const pct = columns.length > 0 ? Math.round((mapped.length / columns.length) * 100) : 0;
    log(`📊 ${tableName}`, 'blue');
    log(`   Total: ${columns.length} columns`, 'cyan');
    log(`   ✅ Mapped: ${mapped.length} (${pct}%)`, 'green');
    log(`   ❌ Unmapped: ${unmapped.length}\n`, 'red');
  });

  // Overall summary
  log('========================================', 'magenta');
  log('  OVERALL SUMMARY', 'magenta');
  log('========================================\n', 'magenta');

  const overallPct = Math.round((totalMapped / totalColumns) * 100);
  log(`  Total Database Columns:  ${totalColumns}`, 'blue');
  log(`  ✅ Mapped to PDF:        ${totalMapped} (${overallPct}%)`, 'green');
  log(`  ❌ Not Mapped:           ${totalUnmapped}\n`, 'red');

  // Generate detailed report
  let report = '# Complete Database Reconciliation Report\n\n';
  report += `Generated: ${new Date().toLocaleString('en-GB')}\n\n`;
  report += '## Summary\n\n';
  report += '| Table | Total Columns | Mapped | Unmapped | Coverage |\n';
  report += '|-------|---------------|--------|----------|----------|\n';

  allResults.forEach(r => {
    const pct = r.totalColumns > 0 ? Math.round((r.mapped / r.totalColumns) * 100) : 0;
    report += `| \`${r.table}\` | ${r.totalColumns} | ${r.mapped} | ${r.unmapped} | ${pct}% |\n`;
  });

  report += `\n**TOTAL** | ${totalColumns} | ${totalMapped} | ${totalUnmapped} | ${overallPct}% |\n\n`;

  // Detailed sections for each table
  allResults.forEach(r => {
    report += `## ${r.table}\n\n`;

    if (r.mappedColumns.length > 0) {
      report += '### ✅ Mapped Columns\n\n';
      report += '| Column | PDF Field | Type | Code Line |\n';
      report += '|--------|-----------|------|----------|\n';
      r.mappedColumns.forEach(m => {
        report += `| \`${m.column}\` | \`${m.pdfField}\` | ${m.type} | ${m.line} |\n`;
      });
      report += '\n';
    }

    if (r.unmappedColumns.length > 0) {
      report += '### ❌ Unmapped Columns\n\n';
      r.unmappedColumns.forEach(col => {
        report += `- \`${col}\`\n`;
      });
      report += '\n';
    }

    report += '---\n\n';
  });

  // Save report
  const reportPath = path.join(__dirname, '..', 'DATABASE_RECONCILIATION.md');
  fs.writeFileSync(reportPath, report, 'utf8');

  log(`✅ Saved detailed report: DATABASE_RECONCILIATION.md\n`, 'green');

  // Generate CSV for all tables
  const csvLines = ['Table,Column,Status,PDF Field,Type,Code Line'];

  allResults.forEach(r => {
    r.mappedColumns.forEach(m => {
      csvLines.push(`"${r.table}","${m.column}","Mapped","${m.pdfField}","${m.type}","${m.line}"`);
    });
    r.unmappedColumns.forEach(col => {
      csvLines.push(`"${r.table}","${col}","Unmapped","","",""`);
    });
  });

  const csvPath = path.join(__dirname, '..', 'DATABASE_RECONCILIATION.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');

  log(`✅ Saved CSV: DATABASE_RECONCILIATION.csv\n`, 'green');
}

reconcileAllTables();
