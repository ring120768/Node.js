#!/usr/bin/env node
/**
 * POSTBOX VALIDATION
 *
 * Validates the UI → Supabase → PDF flow
 *
 * Success = UI can send to Supabase addresses that PDF reads from
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

  return lines.slice(1).map(line => {
    // Handle quoted CSV properly
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

function validatePostbox() {
  log('\n========================================', 'cyan');
  log('  📬 POSTBOX VALIDATION', 'cyan');
  log('========================================\n', 'cyan');

  log('🏤 The Postbox Analogy:', 'magenta');
  log('  UI (sender) → Supabase (postbox) → PDF (receiver)\n', 'reset');
  log('✅ Success = All letters reach their destination\n', 'green');

  // Load data
  const uiFields = parseCSV('UI_FORM_FIELDS.csv');
  const dbSchema = parseCSV('SUPABASE_SCHEMA.csv');
  const pdfFields = parseCSV('ALL_PDF_FIELDS.csv');
  const codeMappings = parseCSV('PDF_MAPPINGS.csv');

  // Extract unique field names
  const uiFieldNames = new Set(uiFields.map(f => f['Field Name'] || f.field));
  const dbColumns = new Set(dbSchema.map(f => f.Column || f.column));
  const pdfFieldNames = new Set(pdfFields.map(f => f['Field Name'] || f.name).filter(n => n && n !== 'Main Incident Report'));

  // Code mappings show PDF field → DB column
  const pdfToDb = new Map();
  const dbToPdf = new Map();
  codeMappings.forEach(m => {
    const pdfField = m['PDF Field'];
    const dbColumn = m['Database Column'];
    if (pdfField && dbColumn) {
      pdfToDb.set(pdfField, dbColumn);
      if (!dbToPdf.has(dbColumn)) {
        dbToPdf.set(dbColumn, []);
      }
      dbToPdf.get(dbColumn).push(pdfField);
    }
  });

  log('📊 Data Loaded:', 'cyan');
  log(`  UI Fields: ${uiFieldNames.size}`, 'reset');
  log(`  Supabase Columns: ${dbColumns.size}`, 'reset');
  log(`  PDF Fields: ${pdfFieldNames.size}`, 'reset');
  log(`  Code Mappings: ${codeMappings.length}\n`, 'reset');

  // ========================================
  // GAP 1: UI sends but Supabase has no address (DATA LOST) 🚨
  // ========================================
  log('========================================', 'red');
  log('🚨 GAP 1: UI sends but no Supabase column', 'red');
  log('========================================\n', 'red');
  log('These are BROKEN - user fills form but data goes nowhere!\n', 'yellow');

  const gap1 = [];
  uiFieldNames.forEach(field => {
    if (!dbColumns.has(field)) {
      gap1.push(field);
    }
  });

  if (gap1.length === 0) {
    log('✅ No gaps! All UI fields have Supabase columns.\n', 'green');
  } else {
    gap1.forEach(field => {
      log(`  ❌ UI field: ${field}`, 'red');
    });
    log(`\n⚠️  ${gap1.length} UI fields have NO Supabase column (data lost!)\n`, 'yellow');
  }

  // ========================================
  // GAP 2: PDF expects but Supabase has no data (EMPTY BOXES) 📭
  // ========================================
  log('========================================', 'red');
  log('📭 GAP 2: PDF expects but no Supabase column', 'red');
  log('========================================\n', 'red');
  log('These are EMPTY BOXES in PDF - can never be filled!\n', 'yellow');

  const gap2 = [];
  pdfToDb.forEach((dbColumn, pdfField) => {
    if (!dbColumns.has(dbColumn)) {
      gap2.push({ pdfField, dbColumn });
    }
  });

  if (gap2.length === 0) {
    log('✅ No gaps! All mapped PDF fields have Supabase columns.\n', 'green');
  } else {
    gap2.forEach(({ pdfField, dbColumn }) => {
      log(`  ❌ PDF: ${pdfField} ← DB: ${dbColumn} (missing!)`, 'red');
    });
    log(`\n⚠️  ${gap2.length} PDF fields expect non-existent columns!\n`, 'yellow');
  }

  // ========================================
  // GAP 3: Complete Flow (UI → Supabase → PDF) ✅
  // ========================================
  log('========================================', 'green');
  log('✅ WORKING FLOW: UI → Supabase → PDF', 'green');
  log('========================================\n', 'green');
  log('These fields have complete end-to-end connections!\n', 'yellow');

  const workingFlow = [];
  uiFieldNames.forEach(uiField => {
    // Check if UI field has Supabase column
    if (dbColumns.has(uiField)) {
      // Check if that column is read by PDF
      if (dbToPdf.has(uiField)) {
        const pdfFields = dbToPdf.get(uiField);
        workingFlow.push({
          uiField,
          dbColumn: uiField,
          pdfFields: pdfFields.join(', ')
        });
      }
    }
  });

  log(`  ${workingFlow.length} complete flows found\n`, 'green');

  workingFlow.slice(0, 10).forEach(flow => {
    log(`  ✅ UI: ${flow.uiField.padEnd(40)} → PDF: ${flow.pdfFields}`, 'green');
  });

  if (workingFlow.length > 10) {
    log(`  ... and ${workingFlow.length - 10} more\n`, 'cyan');
  }

  // ========================================
  // WASTED: UI → Supabase but PDF never reads 🗑️
  // ========================================
  log('========================================', 'yellow');
  log('🗑️  WASTED: UI sends but PDF never reads', 'yellow');
  log('========================================\n', 'yellow');
  log('Data stored in Supabase but never appears in PDF\n', 'reset');

  const wasted = [];
  uiFieldNames.forEach(uiField => {
    if (dbColumns.has(uiField)) {
      if (!dbToPdf.has(uiField)) {
        wasted.push(uiField);
      }
    }
  });

  if (wasted.length === 0) {
    log('✅ No waste! All UI data is used by PDF.\n', 'green');
  } else {
    wasted.slice(0, 10).forEach(field => {
      log(`  ⚠️  ${field}`, 'yellow');
    });
    if (wasted.length > 10) {
      log(`  ... and ${wasted.length - 10} more`, 'cyan');
    }
    log(`\n📊 ${wasted.length} fields collected but not in PDF\n`, 'yellow');
  }

  // ========================================
  // SUMMARY
  // ========================================
  log('========================================', 'cyan');
  log('📊 POSTBOX VALIDATION SUMMARY', 'cyan');
  log('========================================\n', 'cyan');

  const totalUIFields = uiFieldNames.size;
  const gap1Count = gap1.length;
  const gap2Count = gap2.length;
  const workingCount = workingFlow.length;
  const wastedCount = wasted.length;

  log(`UI Fields: ${totalUIFields}`, 'reset');
  log(`  🚨 Missing Supabase column: ${gap1Count} (${((gap1Count/totalUIFields)*100).toFixed(1)}%)`, gap1Count > 0 ? 'red' : 'green');
  log(`  ✅ Have Supabase column: ${totalUIFields - gap1Count} (${(((totalUIFields - gap1Count)/totalUIFields)*100).toFixed(1)}%)`, 'green');
  log(`  ✅ Complete flow to PDF: ${workingCount} (${((workingCount/totalUIFields)*100).toFixed(1)}%)`, 'green');
  log(`  ⚠️  Stored but not in PDF: ${wastedCount} (${((wastedCount/totalUIFields)*100).toFixed(1)}%)\n`, 'yellow');

  log(`PDF Fields Mapped: ${pdfToDb.size}`, 'reset');
  log(`  📭 Missing Supabase column: ${gap2Count}`, gap2Count > 0 ? 'red' : 'green');
  log(`  ✅ Have Supabase column: ${pdfToDb.size - gap2Count}\n`, 'green');

  // Success metric
  const successRate = ((workingCount / totalUIFields) * 100).toFixed(1);
  log(`🎯 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
  log(`   (UI fields with complete flow to PDF)\n`, 'cyan');

  // Save results
  const report = {
    gap1_ui_no_db: gap1,
    gap2_pdf_no_db: gap2,
    working_flow: workingFlow,
    wasted: wasted
  };

  fs.writeFileSync('POSTBOX_VALIDATION.json', JSON.stringify(report, null, 2));
  log('💾 Detailed report saved: POSTBOX_VALIDATION.json\n', 'cyan');

  // Recommendations
  log('========================================', 'magenta');
  log('💡 RECOMMENDATIONS', 'magenta');
  log('========================================\n', 'magenta');

  if (gap1Count > 0) {
    log(`1. FIX CRITICAL: Add ${gap1Count} missing Supabase columns`, 'red');
    log(`   These UI fields lose data when submitted!\n`, 'yellow');
  }

  if (gap2Count > 0) {
    log(`2. FIX MAPPINGS: Fix ${gap2Count} PDF field mappings`, 'yellow');
    log(`   These expect non-existent database columns\n`, 'yellow');
  }

  if (wastedCount > 0) {
    log(`3. OPTIMIZE: ${wastedCount} fields collected but unused`, 'cyan');
    log(`   Consider mapping these to PDF (or remove from UI)\n`, 'cyan');
  }

  if (gap1Count === 0 && gap2Count === 0) {
    log('✅ POSTBOX WORKING PERFECTLY!', 'green');
    log('   All UI → Supabase → PDF connections are valid.\n', 'green');
  }
}

validatePostbox();
