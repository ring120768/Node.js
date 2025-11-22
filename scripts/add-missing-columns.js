const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addMissingColumns() {
  console.log('🔧 Adding missing database columns...\n');

  try {
    // Check current columns
    const { data: beforeData, error: beforeError } = await supabase
      .from('incident_reports')
      .select('*')
      .limit(1)
      .single();

    if (beforeData) {
      const hasSixPoint = 'six_point_safety_check_completed' in beforeData;
      const hasDusk = 'dusk' in beforeData;

      console.log('Current schema:');
      console.log('  six_point_safety_check_completed:', hasSixPoint ? '✅ EXISTS' : '❌ MISSING');
      console.log('  dusk:', hasDusk ? '✅ EXISTS' : '❌ MISSING');
      console.log();

      if (hasSixPoint && hasDusk) {
        console.log('✅ All columns already exist!');
        return;
      }
    }

    // Since Supabase client doesn't support DDL, we need to use REST API
    console.log('⚠️  Cannot add columns via Supabase JS client');
    console.log('Please add these columns manually in Supabase Dashboard:\n');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to Table Editor → incident_reports');
    console.log('4. Add these columns:\n');
    console.log('   Column: six_point_safety_check_completed');
    console.log('   Type: bool');
    console.log('   Default: false\n');
    console.log('   Column: dusk');
    console.log('   Type: bool');
    console.log('   Default: false\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addMissingColumns();
