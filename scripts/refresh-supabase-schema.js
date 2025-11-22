#!/usr/bin/env node
/**
 * REFRESH SUPABASE SCHEMA
 * Queries actual database to get real column names (with correct case)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function refreshSchema() {
  console.log('\n🔄 Refreshing Supabase schema from live database...\n');

  const tables = ['incident_reports', 'incident_other_vehicles'];
  const allColumns = [];

  for (const table of tables) {
    console.log(`📊 Fetching columns from ${table}...`);

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.error(`❌ Error fetching ${table}:`, error.message);
      continue;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`   Found ${columns.length} columns`);

      columns.forEach(col => {
        allColumns.push({
          Table: table,
          Column: col
        });
      });
    }
  }

  // Write to CSV
  const csvHeader = 'Table,Column\n';
  const csvRows = allColumns.map(c => `${c.Table},${c.Column}`).join('\n');
  const csvContent = csvHeader + csvRows;

  fs.writeFileSync('SUPABASE_SCHEMA.csv', csvContent);

  console.log(`\n✅ Wrote ${allColumns.length} columns to SUPABASE_SCHEMA.csv`);
  console.log('   Schema refreshed with actual database column names\n');
}

refreshSchema().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
