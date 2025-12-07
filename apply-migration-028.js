/**
 * Apply Migration 028: Add form_data_summary fields
 * Adds Phase 1 AI analysis storage to incident_reports table
 *
 * Run: node apply-migration-028.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyMigration() {
  console.log('🚀 Starting Migration 028...');
  console.log('📋 Purpose: Add form_data_summary fields for Phase 1 AI analysis');
  console.log('');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '028_add_form_data_summary.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL loaded from:', migrationPath);
    console.log('');

    // Execute migration using Supabase client
    // Note: We'll execute the SQL statements individually to get better error reporting

    // Step 1: Add form_data_summary column
    console.log('⚙️  Step 1/3: Adding form_data_summary column...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS form_data_summary TEXT;'
    });

    if (error1) {
      // If RPC doesn't exist, try direct query (for local development)
      console.log('   ℹ️  exec_sql RPC not available, using direct query...');

      // For production Supabase, we need to use the REST API with raw SQL
      // This is a workaround since direct DDL isn't exposed via the JS client
      console.log('');
      console.log('⚠️  MANUAL MIGRATION REQUIRED');
      console.log('');
      console.log('The Supabase JavaScript client does not support DDL statements.');
      console.log('Please apply the migration manually using one of these methods:');
      console.log('');
      console.log('METHOD 1: Supabase Dashboard SQL Editor');
      console.log('─────────────────────────────────────────');
      console.log('1. Go to: https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Click "SQL Editor" in the left sidebar');
      console.log('4. Paste the following SQL:');
      console.log('');
      console.log('-- Migration 028: Add form_data_summary fields');
      console.log('ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS form_data_summary TEXT;');
      console.log('ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS form_data_summary_metadata JSONB;');
      console.log('');
      console.log('COMMENT ON COLUMN incident_reports.form_data_summary IS');
      console.log("  'AI-generated summary of structured form data (pages 1-12) before transcription - Phase 1 of two-phase AI analysis architecture.';");
      console.log('');
      console.log('COMMENT ON COLUMN incident_reports.form_data_summary_metadata IS');
      console.log("  'Metadata for Phase 1 form data summary: model version, token usage, generation timestamp, etc.';");
      console.log('');
      console.log('5. Click "Run" to execute');
      console.log('');
      console.log('METHOD 2: psql Command Line');
      console.log('───────────────────────────');
      console.log('1. Get your database connection string from Supabase Dashboard > Project Settings > Database');
      console.log('2. Run: psql "YOUR_CONNECTION_STRING"');
      console.log('3. Paste the SQL from migrations/028_add_form_data_summary.sql');
      console.log('');
      console.log('After manually applying the migration, verify with:');
      console.log('SELECT column_name, data_type FROM information_schema.columns');
      console.log('WHERE table_name = \'incident_reports\' AND column_name LIKE \'form_data_%\';');
      console.log('');
      console.log('Expected result:');
      console.log('  form_data_summary          | text');
      console.log('  form_data_summary_metadata | jsonb');
      console.log('');

      process.exit(0);
    }

    // Step 2: Add form_data_summary_metadata column
    console.log('✅ Step 1 complete');
    console.log('⚙️  Step 2/3: Adding form_data_summary_metadata column...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS form_data_summary_metadata JSONB;'
    });

    if (error2) {
      throw new Error(`Failed to add form_data_summary_metadata: ${error2.message}`);
    }

    // Step 3: Add column comments
    console.log('✅ Step 2 complete');
    console.log('⚙️  Step 3/3: Adding column comments...');

    const comment1 = `COMMENT ON COLUMN incident_reports.form_data_summary IS 'AI-generated summary of structured form data (pages 1-12) before transcription - Phase 1 of two-phase AI analysis architecture.';`;
    const comment2 = `COMMENT ON COLUMN incident_reports.form_data_summary_metadata IS 'Metadata for Phase 1 form data summary: model version, token usage, generation timestamp, etc.';`;

    await supabase.rpc('exec_sql', { query: comment1 });
    await supabase.rpc('exec_sql', { query: comment2 });

    console.log('✅ Step 3 complete');
    console.log('');
    console.log('✨ Migration 028 completed successfully!');
    console.log('');
    console.log('📊 Columns added:');
    console.log('   - form_data_summary (TEXT)');
    console.log('   - form_data_summary_metadata (JSONB)');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Test Phase 1: node test-form-summary.js');
    console.log('   2. Test Phase 2: node test-form-filling.js [user-uuid]');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('📋 Error details:', error);
    console.error('');
    console.error('To rollback this migration:');
    console.error('   node rollback-migration-028.js');
    console.error('');
    process.exit(1);
  }
}

// Run the migration
applyMigration();
