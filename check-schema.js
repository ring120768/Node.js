#!/usr/bin/env node
/**
 * Check database schema for missing columns
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  // Check incident_reports columns
  console.log('=== incident_reports table ===');
  const { data: incidentData, error: incidentErr } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(1);

  if (incidentErr) {
    console.log('❌ Error accessing incident_reports:', incidentErr.message);
  } else if (incidentData && incidentData.length > 0) {
    const columns = Object.keys(incidentData[0]);
    console.log(`✅ Table exists with ${columns.length} columns\n`);

    // Check for specific fields mentioned in the issue
    console.log('=== Key fields check ===');
    const keyFields = [
      'special_conditions_animals',
      'usual_vehicle',
      'vehicle_license_plate',
      'incident_description',
      'make_of_car',
      'model_of_car',
      'dvla_make',
      'dvla_model',
      'dvla_colour',
      'manual_make',
      'manual_model'
    ];

    keyFields.forEach(field => {
      const exists = columns.includes(field);
      console.log(`  ${field}: ${exists ? '✅' : '❌'}`);
    });

    // List all columns containing 'vehicle'
    console.log('\n=== All vehicle-related columns ===');
    columns.filter(col => col.includes('vehicle')).sort().forEach(col => {
      console.log(`  ${col}`);
    });
  } else {
    console.log('⚠️ Table exists but no data');
  }

  // Check ai_transcription table
  console.log('\n=== ai_transcription table ===');
  const { data: aiData, error: aiErr } = await supabase
    .from('ai_transcription')
    .select('*')
    .limit(1);

  if (aiErr) {
    console.log('❌ Error accessing ai_transcription:', aiErr.message);
  } else if (aiData) {
    const columns = Object.keys(aiData[0] || {});
    console.log(`✅ Table exists with ${columns.length} columns`);
    console.log('Columns:', columns.sort().join(', '));

    // Check for incident_id
    console.log(`\nincident_id column: ${columns.includes('incident_id') ? '✅' : '❌'}`);
  }

  // Check if ai_analysis table exists
  console.log('\n=== ai_analysis table ===');
  const { data: analysisData, error: analysisErr } = await supabase
    .from('ai_analysis')
    .select('*')
    .limit(1);

  if (analysisErr) {
    console.log('❌ Table does not exist or no access');
    console.log('Error:', analysisErr.message);
    console.log('Code:', analysisErr.code);
  } else {
    console.log('✅ Table exists');
    if (analysisData && analysisData.length > 0) {
      const columns = Object.keys(analysisData[0]);
      console.log(`Columns (${columns.length}):`, columns.join(', '));
    } else {
      console.log('Table exists but no data yet');
    }
  }
}

checkSchema()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  });
