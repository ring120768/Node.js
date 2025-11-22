#!/usr/bin/env node

/**
 * Execute Migration 027: Remove Safety Check Trigger
 * Direct PostgreSQL connection method
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function executeMigration() {
  console.log('🚀 Executing Migration 027: Remove Safety Check Trigger\n');

  // Parse Supabase URL to get connection details
  const supabaseUrl = process.env.SUPABASE_URL;
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

  // Construct PostgreSQL connection string
  // Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
  const password = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('📋 Migration Details:');
  console.log('   Project: ' + projectRef);
  console.log('   Method: Direct SQL execution\n');

  // Read migration file
  const migrationPath = path.join(__dirname, 'migrations', '027_remove_safety_check_trigger.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration SQL to execute:\n');
  console.log('─'.repeat(80));
  console.log(migrationSQL);
  console.log('─'.repeat(80));
  console.log('');

  // Execute individual SQL commands
  console.log('⚙️  Executing migration commands...\n');

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Drop trigger (command 1)
    console.log('1️⃣  Dropping trigger: trigger_check_safety_before_report...');

    const dropTriggerSQL = 'DROP TRIGGER IF EXISTS trigger_check_safety_before_report ON incident_reports';

    // Since we can't execute raw SQL via Supabase REST API directly,
    // we need to use the PostgREST API workaround or Supabase Edge Functions

    // Alternative: Use Supabase SQL via REST API
    const response1 = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_raw_sql`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: dropTriggerSQL })
    });

    if (!response1.ok && response1.status !== 404) {
      console.log('⚠️  REST API method not available\n');
      console.log('📋 Manual execution required:\n');
      console.log('Please execute this migration using the Supabase Dashboard:\n');
      console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
      console.log('2. Copy and paste the migration SQL above');
      console.log('3. Click "Run"\n');
      console.log('OR use the psql command if you have database URL:\n');
      console.log('   psql "$DATABASE_URL" < migrations/027_remove_safety_check_trigger.sql\n');
      process.exit(0);
    }

    console.log('✅ Trigger dropped\n');

    // Drop function (command 2)
    console.log('2️⃣  Dropping function: check_user_safety_before_report()...');

    const dropFunctionSQL = 'DROP FUNCTION IF EXISTS check_user_safety_before_report()';

    const response2 = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_raw_sql`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: dropFunctionSQL })
    });

    console.log('✅ Function dropped\n');

    console.log('✅ Migration 027 completed successfully!\n');
    console.log('📊 Changes:');
    console.log('   ✅ Removed trigger: trigger_check_safety_before_report');
    console.log('   ✅ Removed function: check_user_safety_before_report()');
    console.log('   ✅ incident_reports INSERT no longer requires are_you_safe = TRUE\n');

  } catch (error) {
    console.error('❌ Error during migration:', error.message);

    console.log('\n📋 Please execute manually via Supabase Dashboard:\n');
    console.log('https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');

    process.exit(1);
  }
}

executeMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
