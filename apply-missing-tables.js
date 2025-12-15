/**
 * Apply Missing Table Migrations
 *
 * This script applies:
 * - Migration 024: incident_witnesses table
 * - Migration 029: completed_incident_forms table
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSql(sql, migrationName) {
  console.log(`\n📋 Applying ${migrationName}...`);

  try {
    // Use Supabase's RPC to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct query (may work for simple queries)
      console.log('   Attempting direct execution...');

      // Split into individual statements and execute
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && s.toUpperCase() !== 'BEGIN' && s.toUpperCase() !== 'COMMIT');

      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('exec', { sql: statement });
        if (stmtError) {
          throw stmtError;
        }
      }
    }

    console.log(`✅ ${migrationName} applied successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Error applying ${migrationName}:`, error.message);
    console.error('   SQL:', sql.substring(0, 200) + '...');
    return false;
  }
}

async function applyMigrations() {
  console.log('\n🚀 APPLYING MISSING TABLE MIGRATIONS\n');
  console.log('=' .repeat(60));

  const results = {
    incident_witnesses: false,
    completed_incident_forms: false
  };

  try {
    // 1. Apply incident_witnesses migration
    const witnessesPath = join(__dirname, 'migrations', '024_create_incident_witnesses_table.sql');
    const witnessesSql = readFileSync(witnessesPath, 'utf8');
    results.incident_witnesses = await executeSql(witnessesSql, 'Migration 024: incident_witnesses');

    // 2. Apply completed_incident_forms migration
    const completedFormsPath = join(__dirname, 'migrations', '029_create_completed_incident_forms_table.sql');
    const completedFormsSql = readFileSync(completedFormsPath, 'utf8');
    results.completed_incident_forms = await executeSql(completedFormsSql, 'Migration 029: completed_incident_forms');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));

  console.log('\nTable Creation Results:');
  console.log(`   incident_witnesses: ${results.incident_witnesses ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`   completed_incident_forms: ${results.completed_incident_forms ? '✅ SUCCESS' : '❌ FAILED'}`);

  const allSuccess = Object.values(results).every(r => r === true);

  if (allSuccess) {
    console.log('\n✅ All migrations applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Verify tables exist: Check Supabase dashboard');
    console.log('   2. Test with app: Try creating incidents/witnesses');
    console.log('   3. Check RLS policies: Ensure proper access control');
  } else {
    console.log('\n⚠️  Some migrations failed. Manual intervention required.');
    console.log('\n🔧 Manual Application Steps:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Run migrations/024_create_incident_witnesses_table.sql');
    console.log('   3. Run migrations/029_create_completed_incident_forms_table.sql');
  }

  console.log('='.repeat(60) + '\n');
}

// Execute migrations
applyMigrations()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
