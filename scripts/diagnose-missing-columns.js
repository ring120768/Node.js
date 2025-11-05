#!/usr/bin/env node
/**
 * DIAGNOSTIC SCRIPT - Check what's actually in the database
 * This will help us understand why columns aren't being added
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  console.log('\n🔍 DIAGNOSTIC REPORT\n');
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('Connected to database...\n');

  // Try to query the 3 specific columns
  console.log('📊 Checking for the 3 missing columns:\n');

  const columnsToCheck = [
    'nearestLandmark',
    'junctionType',
    'junctionControl'
  ];

  for (const column of columnsToCheck) {
    const { data, error } = await supabase
      .from('incident_reports')
      .select(column)
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log(`❌ ${column}: NOT FOUND`);
        console.log(`   Error: ${error.message}\n`);
      } else {
        console.log(`⚠️  ${column}: Error checking`);
        console.log(`   Error: ${error.message}\n`);
      }
    } else {
      console.log(`✅ ${column}: EXISTS (found ${data.length} rows)\n`);
    }
  }

  // List ALL columns in incident_reports
  console.log('\n📋 All columns currently in incident_reports table:\n');

  const { data: allData, error: allError } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(1);

  if (allError) {
    console.log('❌ Could not fetch columns:', allError.message);
  } else if (allData && allData.length > 0) {
    const columns = Object.keys(allData[0]).sort();
    console.log(`Total columns: ${columns.length}\n`);
    columns.forEach((col, i) => {
      console.log(`${(i + 1).toString().padStart(3, ' ')}. ${col}`);
    });
  } else {
    console.log('⚠️  No data in table to determine columns');
  }

  // Check if the columns exist in schema but with different case
  console.log('\n\n🔍 Checking for case sensitivity issues:\n');

  const caseVariants = [
    'nearestlandmark', 'nearest_landmark', 'NEARESTLANDMARK',
    'junctiontype', 'junction_type', 'JUNCTIONTYPE',
    'junctioncontrol', 'junction_control', 'JUNCTIONCONTROL'
  ];

  for (const variant of caseVariants) {
    const { error } = await supabase
      .from('incident_reports')
      .select(variant)
      .limit(1);

    if (!error) {
      console.log(`✅ Found: ${variant}`);
    }
  }

  console.log('\n✅ Diagnostic complete\n');
}

diagnose().catch(error => {
  console.error('\n❌ Diagnostic failed:', error.message);
  process.exit(1);
});
