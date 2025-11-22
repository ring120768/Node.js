#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function extractSchema() {
  log('\n========================================', 'cyan');
  log('  Supabase Schema Extractor', 'cyan');
  log('========================================\n', 'cyan');

  const tables = [
    'user_signup',
    'incident_reports',
    'incident_other_vehicles',
    'incident_witnesses',
    'ai_transcription',
    'user_documents'
  ];

  const allColumns = [];

  for (const tableName of tables) {
    log(`📊 Analyzing ${tableName}...`, 'blue');

    try {
      // Fetch one row to get column structure
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) throw error;

      const columns = data && data[0] ? Object.keys(data[0]) : [];
      
      log(`  ✅ ${columns.length} columns`, 'green');

      columns.forEach(col => {
        allColumns.push({ table: tableName, column: col });
      });

    } catch (err) {
      log(`  ❌ ${err.message}`, 'red');
    }
  }

  // Generate CSV
  const csv = 'Table,Column\n' + 
    allColumns.map(c => `"${c.table}","${c.column}"`).join('\n');

  const outputPath = path.join(__dirname, '..', 'SUPABASE_SCHEMA.csv');
  fs.writeFileSync(outputPath, csv, 'utf8');

  log(`\n✅ Saved: ${outputPath}\n`, 'green');

  // Summary
  log('========================================', 'cyan');
  tables.forEach(table => {
    const count = allColumns.filter(c => c.table === table).length;
    log(`  ${table}: ${count} columns`, 'cyan');
  });
  log(`\n  TOTAL: ${allColumns.length} columns\n`, 'blue');
}

extractSchema().then(() => process.exit(0)).catch(console.error);
