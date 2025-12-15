/**
 * Apply Migration 028 with Clean Slate
 * Purpose: Drop existing ai_analysis table (if any) and recreate with correct schema
 * Usage: node apply-migration-028-clean.js
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🔄 Starting clean migration 028...\n');

  try {
    // Step 1: Rollback (drop existing table)
    console.log('📋 Step 1: Running rollback migration...');
    const rollbackSql = fs.readFileSync('migrations/028_create_ai_analysis_table_rollback.sql', 'utf8');

    const { error: rollbackError } = await supabase.rpc('exec_sql', { sql_query: rollbackSql });

    if (rollbackError) {
      console.log('ℹ️  Rollback note:', rollbackError.message);
      console.log('   (This is OK if table didn\'t exist yet)\n');
    } else {
      console.log('✅ Rollback complete\n');
    }

    // Step 2: Forward migration (create new table)
    console.log('📋 Step 2: Running forward migration...');
    const forwardSql = fs.readFileSync('migrations/028_create_ai_analysis_table.sql', 'utf8');

    const { error: forwardError } = await supabase.rpc('exec_sql', { sql_query: forwardSql });

    if (forwardError) {
      console.error('❌ Migration failed:', forwardError.message);
      process.exit(1);
    }

    console.log('✅ Forward migration complete\n');

    // Step 3: Verify table structure
    console.log('📋 Step 3: Verifying table structure...');
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'ai_analysis')
      .order('ordinal_position');

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      process.exit(1);
    }

    console.log('\n✅ Migration 028 Complete!\n');
    console.log('Table: ai_analysis');
    console.log('Columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n📝 Field Mapping:');
    console.log('  Page 13: voice_transcription, analysis_metadata, quality_review');
    console.log('  Page 14: ai_summary');
    console.log('  Page 15: closing_statement');
    console.log('  Page 16: final_review');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
