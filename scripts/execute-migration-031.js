/**
 * Execute Migration 031 via Supabase REST API
 *
 * Attempts to create the pdf_generation_queue table via Supabase's SQL execution.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeStatements() {
  console.log('🔧 PDF Generation Queue - Migration 031\n');

  // First check if table already exists
  const { error: checkError } = await supabase
    .from('pdf_generation_queue')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ Table pdf_generation_queue already exists!');
    return true;
  }

  if (!checkError.message.includes('does not exist')) {
    console.log('Table check result:', checkError.message);
  }

  console.log('❌ Table does not exist. Attempting to create via individual statements...\n');

  // Try to create using the postgres function if available
  try {
    // First, let's try to create the enum type
    console.log('1. Creating pdf_job_status enum type...');

    // We can't execute raw SQL via Supabase JS client
    // Let's try the REST API directly

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Try using the SQL REST endpoint if available
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: 'SELECT 1' })
    });

    const result = await response.text();
    console.log('RPC test result:', result);

    if (response.ok) {
      console.log('✅ SQL execution available via RPC');
      // Now execute the actual migration
      const migrationPath = path.join(__dirname, '../migrations/031_create_pdf_generation_queue.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      const migrationResponse = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: migrationSQL })
      });

      if (migrationResponse.ok) {
        console.log('✅ Migration executed successfully!');
        return true;
      } else {
        console.log('Migration failed:', await migrationResponse.text());
      }
    } else {
      console.log('❌ exec_sql RPC function not available');
    }

  } catch (e) {
    console.log('RPC approach failed:', e.message);
  }

  // Fall back to manual instructions
  console.log('\n' + '═'.repeat(80));
  console.log('📋 MANUAL MIGRATION REQUIRED');
  console.log('═'.repeat(80));
  console.log('\nThe migration must be applied manually via the Supabase SQL Editor:\n');
  console.log('🔗 URL: https://supabase.com/dashboard/project/kctlcmbjmhcfoobmkfrs/sql/new');
  console.log('\nCopy the SQL from: migrations/031_create_pdf_generation_queue.sql');
  console.log('\nPaste into the SQL Editor and click "Run"');
  console.log('\n' + '═'.repeat(80));

  return false;
}

executeStatements().then(success => {
  if (success) {
    console.log('\n✅ Migration complete - PDF queue system is ready!');
  } else {
    console.log('\n⚠️  Manual migration required (see instructions above)');
  }
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
