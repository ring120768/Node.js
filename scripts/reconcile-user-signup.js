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

function reconcileUserSignup() {
  log('\n========================================', 'cyan');
  log('  user_signup Table Reconciliation', 'cyan');
  log('========================================\n', 'cyan');

  // Load data
  const schema = loadCSV('SUPABASE_SCHEMA.csv');
  const mappings = loadCSV('PDF_MAPPINGS.csv');

  // Get user_signup columns
  const userSignupColumns = schema
    .filter(row => row.Table === 'user_signup')
    .map(row => row.Column);

  log(`📊 user_signup table has ${userSignupColumns.length} columns\n`, 'blue');

  // Find which columns are mapped
  const mapped = [];
  const unmapped = [];

  userSignupColumns.forEach(column => {
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

  // Display results
  log('========================================', 'green');
  log(`  ✅ MAPPED COLUMNS (${mapped.length})`, 'green');
  log('========================================\n', 'green');

  if (mapped.length > 0) {
    mapped.forEach(m => {
      log(`  ${m.column}`, 'cyan');
      log(`    → PDF Field: ${m.pdfField}`, 'yellow');
      log(`    → Type: ${m.type}`, 'yellow');
      log(`    → Code Line: ${m.line}\n`, 'yellow');
    });
  }

  log('========================================', 'red');
  log(`  ❌ UNMAPPED COLUMNS (${unmapped.length})`, 'red');
  log('========================================\n', 'red');

  if (unmapped.length > 0) {
    unmapped.forEach(col => {
      log(`  ${col}`, 'yellow');
    });
    log('', 'reset');
  }

  // Generate CSV report
  const csvReport = 'Column Name,Status,PDF Field,Type,Code Line\n' +
    userSignupColumns.map(col => {
      const m = mapped.find(x => x.column === col);
      if (m) {
        return `"${col}","Mapped","${m.pdfField}","${m.type}","${m.line}"`;
      } else {
        return `"${col}","Unmapped","","",""`;
      }
    }).join('\n');

  const outputPath = path.join(__dirname, '..', 'USER_SIGNUP_RECONCILIATION.csv');
  fs.writeFileSync(outputPath, csvReport, 'utf8');

  log('========================================', 'cyan');
  log('  Summary', 'cyan');
  log('========================================\n', 'cyan');

  log(`  Total Columns:   ${userSignupColumns.length}`, 'blue');
  log(`  ✅ Mapped:       ${mapped.length} (${Math.round(mapped.length/userSignupColumns.length*100)}%)`, 'green');
  log(`  ❌ Unmapped:     ${unmapped.length} (${Math.round(unmapped.length/userSignupColumns.length*100)}%)`, 'red');

  log(`\n✅ Saved: USER_SIGNUP_RECONCILIATION.csv\n`, 'green');
}

reconcileUserSignup();
