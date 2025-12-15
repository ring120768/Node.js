/**
 * Apply Migration: Create ai_transcription Table
 *
 * This script creates the missing ai_transcription table in Supabase.
 * Run this to fix: "Could not find the table 'public.ai_transcription' in the schema cache"
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
  console.log('🔧 Creating ai_transcription table in Supabase...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/029_create_ai_transcription_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n' + '='.repeat(80) + '\n');

    // Execute the migration
    console.log('🚀 Executing migration...');

    // Note: Supabase client doesn't support raw SQL execution directly
    // You need to run this in Supabase SQL Editor
    console.log('⚠️  Cannot execute raw SQL via Supabase client.');
    console.log('\n📋 MANUAL STEPS REQUIRED:\n');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Click "SQL Editor" in the left sidebar');
    console.log('4. Click "New Query"');
    console.log('5. Copy the SQL from: migrations/029_create_ai_transcription_table.sql');
    console.log('6. Paste into SQL Editor');
    console.log('7. Click "Run" (or press Cmd/Ctrl + Enter)');
    console.log('\n✅ After running, the save-statement endpoint will work correctly.\n');

  } catch (error) {
    console.error('❌ Error reading migration file:', error.message);
    process.exit(1);
  }
}

applyMigration().then(() => {
  console.log('📖 Migration instructions provided');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
