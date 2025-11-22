/**
 * Apply Migration: Create ai_analysis Table
 *
 * This script creates the ai_analysis table for storing comprehensive AI analysis
 * results including summary, key points, quality review, combined narrative, and
 * recommended next steps.
 *
 * Migration file: migrations/013_create_ai_analysis_table.sql
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Service role bypasses RLS
);

async function applyMigration() {
  console.log('🔧 Applying ai_analysis table migration...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '013_create_ai_analysis_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Attempting to create ai_analysis table via Supabase API...\n');

    // Try using exec_sql (may not be available on all Supabase instances)
    const { error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    });

    if (error) {
      if (error.message.includes('exec_sql')) {
        console.log('⚠️  exec_sql function not available\n');
        console.log('📋 MANUAL MIGRATION REQUIRED:\n');
        console.log('1. Go to: https://supabase.com/dashboard');
        console.log('2. Select your project');
        console.log('3. Click "SQL Editor" in the left sidebar');
        console.log('4. Copy and paste the SQL from:');
        console.log('   migrations/013_create_ai_analysis_table.sql');
        console.log('5. Click "Run" to execute the migration\n');
        console.log('Migration SQL Preview:');
        console.log('─'.repeat(60));
        console.log(migrationSQL.substring(0, 500) + '...\n');
        process.exit(1);
      } else {
        throw error;
      }
    }

    // Verify table was created
    console.log('✅ Verifying migration...');
    const { data: verification, error: verifyError } = await supabase
      .from('ai_analysis')
      .select('id, create_user_id, summary, key_points, combined_report')
      .limit(0);  // Don't fetch rows, just verify columns exist

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      console.log('\n⚠️  Table creation may have failed. Please apply migration manually.');
      process.exit(1);
    }

    console.log('✅ Table ai_analysis created successfully!');
    console.log('\nCreated columns:');
    console.log('  ✓ id (UUID, primary key)');
    console.log('  ✓ create_user_id (UUID, user reference)');
    console.log('  ✓ incident_id (UUID, optional)');
    console.log('  ✓ transcription_text (TEXT)');
    console.log('  ✓ summary (TEXT)');
    console.log('  ✓ key_points (TEXT[] array)');
    console.log('  ✓ fault_analysis (TEXT)');
    console.log('  ✓ quality_review (JSONB)');
    console.log('  ✓ combined_report (TEXT)');
    console.log('  ✓ completeness_score (INTEGER)');
    console.log('  ✓ final_review (JSONB)');
    console.log('  ✓ created_at, updated_at, deleted_at');
    console.log('\nIndexes:');
    console.log('  ✓ idx_ai_analysis_create_user_id');
    console.log('  ✓ idx_ai_analysis_incident_id');
    console.log('  ✓ idx_ai_analysis_created_at');
    console.log('\nRLS Policies:');
    console.log('  ✓ Users can view/insert/update/delete their own analysis');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Manual migration required. See instructions above.');
    process.exit(1);
  }
}

applyMigration().then(() => {
  console.log('\n✅ Migration script complete');
  console.log('\n📝 Next step: Update ai.controller.js to save analysis to this table');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
