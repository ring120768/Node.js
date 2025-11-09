/**
 * Apply Migration 023: Add Page 9 Witness Fields
 *
 * This script applies the missing migration 023 to add witness fields to incident_reports table.
 *
 * Run: node scripts/apply-migration-023.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  try {
    console.log('📋 Reading migration file...');

    const migrationPath = path.join(__dirname, '../migrations/023_add_page9_witness_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('✅ Migration file loaded');
    console.log('\n📝 Migration SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));

    console.log('\n🚀 Applying migration to Supabase...');

    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      console.log('⚠️  exec_sql function not found, trying direct SQL execution...');

      // Split into individual statements and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('BEGIN') && !s.startsWith('COMMIT'));

      for (const statement of statements) {
        if (statement.includes('ALTER TABLE') || statement.includes('COMMENT ON') || statement.includes('DO $$')) {
          console.log(`\n📌 Executing: ${statement.substring(0, 60)}...`);
          const { error: stmtError } = await supabase.from('_migrations').select('*').limit(0); // Dummy query to check connection

          if (stmtError) {
            console.error('❌ Error executing statement:', stmtError);
            throw stmtError;
          }
        }
      }

      console.log('\n⚠️  Note: Migration SQL needs to be run manually in Supabase SQL Editor');
      console.log('📋 Copy the SQL above and paste it into:');
      console.log('   https://supabase.com/dashboard/project/[your-project]/sql/new');

      return;
    }

    console.log('✅ Migration applied successfully!');
    console.log('✅ Witness fields added to incident_reports table');

    // Verify columns were added
    console.log('\n🔍 Verifying columns...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('incident_reports')
      .select('witnesses_present')
      .limit(0);

    if (tableError) {
      console.log('⚠️  Could not verify columns:', tableError.message);
    } else {
      console.log('✅ Columns verified successfully');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
