/**
 * Apply Migration 026: Add Page 12 Final Medical Check Fields
 *
 * This script applies migration 026 to add final_feeling field to incident_reports table.
 *
 * Run: node scripts/apply-migration-026.js
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

    const migrationPath = path.join(__dirname, '../migrations/026_add_page12_final_medical_check_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('✅ Migration file loaded');
    console.log('\n📝 Migration SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));

    console.log('\n🚀 SQL to execute manually in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/zzqjblvpjmwezdjfbcrd/sql/new');
    console.log('\nCopy the migration SQL above and paste it into the SQL editor.');

  } catch (error) {
    console.error('❌ Migration preparation failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
