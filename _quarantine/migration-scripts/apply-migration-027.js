#!/usr/bin/env node

/**
 * Apply Migration 027: Remove Safety Check Trigger
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🚀 Applying Migration 027: Remove Safety Check Trigger\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, 'migrations', '027_remove_safety_check_trigger.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded:', migrationPath);
  console.log('📏 Migration size:', migrationSQL.length, 'bytes\n');

  try {
    // Execute the migration SQL directly
    console.log('⚙️  Executing migration...\n');

    // Split the SQL into individual statements (separated by semicolons outside of BEGIN/COMMIT)
    // For this migration, we can execute it as a single block since it's wrapped in BEGIN/COMMIT
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If rpc function doesn't exist, try alternative method
      if (error.code === 'PGRST202') {
        console.log('⚠️  RPC method not available, trying alternative...\n');

        // Use raw query method
        const pg = require('pg');
        const pool = new pg.Pool({
          connectionString: process.env.SUPABASE_URL.replace('https://', 'postgresql://postgres:') + process.env.SUPABASE_SERVICE_ROLE_KEY + '@' + process.env.SUPABASE_URL.replace('https://', '') + ':5432/postgres'
        });

        // Simpler approach: use the Supabase SQL editor or execute via psql
        console.log('❌ Cannot execute migration directly via API\n');
        console.log('📋 Please execute this migration manually using one of these methods:\n');
        console.log('1. Supabase Dashboard → SQL Editor → paste migration content');
        console.log('2. psql command line:');
        console.log('   psql "$DATABASE_URL" < migrations/027_remove_safety_check_trigger.sql\n');
        console.log('Migration file: migrations/027_remove_safety_check_trigger.sql\n');

        // Show the SQL content
        console.log('📄 Migration SQL:\n');
        console.log('─'.repeat(80));
        console.log(migrationSQL);
        console.log('─'.repeat(80));

        process.exit(1);
      }

      throw error;
    }

    console.log('✅ Migration executed successfully!\n');
    console.log('📊 Result:', JSON.stringify(data, null, 2));
    console.log('\n✅ Safety check trigger removed from database');
    console.log('✅ incident_reports table no longer enforces are_you_safe = TRUE\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

applyMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
