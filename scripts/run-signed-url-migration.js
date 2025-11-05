#!/usr/bin/env node
/**
 * Run signed_url migration on user_documents table
 * Usage: node scripts/run-signed-url-migration.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

async function runMigration() {
  console.log(colors.cyan, '\n🔧 Running signed_url migration...\n', colors.reset);

  try {
    // Read migration SQL
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add-signed-url-to-user-documents.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('🔍 Checking current schema...\n');

    // Check if columns already exist
    const { data: before, error: beforeError } = await supabase
      .from('user_documents')
      .select('id, storage_path, signed_url, signed_url_expires_at')
      .limit(1);

    if (beforeError && beforeError.message.includes('signed_url')) {
      console.log(colors.yellow, '⚠️  signed_url columns do not exist yet (expected)', colors.reset);
    } else if (!beforeError) {
      console.log(colors.green, '✅ Columns already exist, migration may have run previously', colors.reset);
      console.log('\nSample record:');
      console.log(JSON.stringify(before[0], null, 2));
      return;
    }

    // Run migration via Supabase SQL editor or direct execution
    console.log(colors.cyan, '\n📝 Please run the following SQL in Supabase SQL Editor:', colors.reset);
    console.log(colors.cyan, '   https://supabase.com/dashboard/project/[your-project]/sql/new\n', colors.reset);
    console.log('─'.repeat(80));
    console.log(migrationSql);
    console.log('─'.repeat(80));

    console.log(colors.yellow, '\n⚠️  Note: This script cannot execute DDL statements directly.', colors.reset);
    console.log(colors.yellow, '   Copy the SQL above and run it in the Supabase dashboard.\n', colors.reset);

    // Verify after manual execution (user can re-run this script)
    const { data: after, error: afterError } = await supabase
      .from('user_documents')
      .select('id, storage_path, signed_url, signed_url_expires_at')
      .limit(1);

    if (!afterError && after) {
      console.log(colors.green, '✅ Migration verified! Columns exist and are accessible.', colors.reset);
      console.log('\nSample record after migration:');
      console.log(JSON.stringify(after[0], null, 2));
    }

  } catch (error) {
    console.log(colors.red, `❌ Error: ${error.message}`, colors.reset);
    console.error(error);
  }
}

runMigration().catch(console.error);
