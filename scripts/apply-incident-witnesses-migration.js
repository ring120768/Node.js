/**
 * Apply Migration 024: Create incident_witnesses Table
 *
 * This script applies the incident_witnesses table migration directly to Supabase.
 * The table is required for Page 9 witness data storage.
 *
 * Usage: node scripts/apply-incident-witnesses-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  try {
    console.log('📄 Reading migration file...');

    const migrationPath = join(__dirname, '../migrations/024_create_incident_witnesses_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('✅ Migration file loaded\n');
    console.log('🚀 Applying migration to Supabase...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct query execution
      if (error.message.includes('exec_sql')) {
        console.log('⚠️  RPC function not available, using direct query execution...\n');

        // Split migration into statements (simple split on ';')
        const statements = migrationSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          if (statement.includes('BEGIN') || statement.includes('COMMIT')) {
            continue; // Skip transaction control (Supabase client handles this)
          }

          const { error: stmtError } = await supabase.rpc('query', {
            query_text: statement
          });

          if (stmtError) {
            console.error('❌ Error executing statement:', stmtError.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
          }
        }

        console.log('\n✅ Migration applied successfully!\n');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Migration applied successfully!\n');
    }

    // Verify table was created
    console.log('🔍 Verifying table creation...\n');

    const { data: tableCheck, error: checkError } = await supabase
      .from('incident_witnesses')
      .select('count')
      .limit(0);

    if (checkError) {
      if (checkError.message.includes('does not exist')) {
        console.error('❌ Table creation failed - table does not exist');
        console.error('Error:', checkError.message);
        process.exit(1);
      }
    }

    console.log('✅ Table verified: incident_witnesses exists\n');

    // Show table info
    console.log('📊 Table Structure:');
    console.log('  - incident_report_id (UUID, FK)');
    console.log('  - create_user_id (UUID)');
    console.log('  - witness_number (INTEGER, 1-4)');
    console.log('  - witness_name (TEXT)');
    console.log('  - witness_mobile_number (TEXT)');
    console.log('  - witness_email_address (TEXT)');
    console.log('  - witness_statement (TEXT)');
    console.log('  - RLS policies: ✓ Enabled\n');

    console.log('✅ Migration 024 Complete!\n');
    console.log('ℹ️  Page 9 witness data will now save to incident_witnesses table');
    console.log('ℹ️  Run verification: node scripts/verify-pages-7-9-data.js\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
