/**
 * Apply Migration 031: Create PDF Generation Queue Table
 *
 * Creates the pdf_generation_queue table for tracking and retrying failed PDF jobs.
 *
 * Run: node scripts/apply-migration-031.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableExists() {
  try {
    const { data, error } = await supabase
      .from('pdf_generation_queue')
      .select('id')
      .limit(1);

    // If no error, table exists
    if (!error) {
      return true;
    }

    // If error is about relation not existing, table doesn't exist
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      return false;
    }

    // Some other error
    return false;
  } catch (e) {
    return false;
  }
}

async function applyMigration() {
  console.log('🔧 PDF Generation Queue - Migration 031\n');

  try {
    // Check if table already exists
    console.log('🔍 Checking if table already exists...');
    const exists = await checkTableExists();

    if (exists) {
      console.log('✅ Table pdf_generation_queue already exists. Migration not needed.');
      return;
    }

    console.log('❌ Table does not exist. Migration required.\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/031_create_pdf_generation_queue.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));

    // Supabase JS client doesn't support raw SQL execution
    // Provide instructions for manual execution
    console.log('\n⚠️  Cannot execute raw SQL via Supabase client.\n');
    console.log('📋 MANUAL STEPS REQUIRED:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/zzqjblvpjmwezdjfbcrd/sql/new');
    console.log('2. Copy the SQL above');
    console.log('3. Paste into SQL Editor');
    console.log('4. Click "Run" (or press Cmd/Ctrl + Enter)');
    console.log('\n✅ After running, the PDF queue system will be operational.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration().then(() => {
  console.log('📖 Migration check complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
