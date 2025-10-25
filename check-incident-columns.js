#!/usr/bin/env node
/**
 * Check incident_reports table columns in Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  console.log('\n🔍 Checking incident_reports table schema...\n');

  try {
    // Try to get a record to see the structure
    const { data, error } = await supabase
      .from('incident_reports')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`✅ Found ${columns.length} columns:\n`);

      // Search for statement/witness/transcription related columns
      const relevantColumns = columns.filter(col =>
        col.includes('statement') ||
        col.includes('witness') ||
        col.includes('transcription') ||
        col.includes('record') ||
        col.includes('account')
      );

      console.log('📝 Statement/Witness/Recording related columns:');
      relevantColumns.forEach(col => console.log(`  - ${col}`));

      console.log('\n📋 All columns:');
      columns.sort().forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('⚠️  No records found in table');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkColumns().catch(console.error);
