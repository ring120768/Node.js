require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🔄 Running Migration 026: Add Page 12 fields...\n');

  const migrationSQL = fs.readFileSync('migrations/026_add_page12_final_medical_check_fields.sql', 'utf8');

  // Execute migration
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

  if (error) {
    console.log('❌ Migration failed:', error.message);
    console.log('\n💡 Trying alternative approach with individual statements...\n');

    // Fallback: execute statements individually
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE incident_reports
          ADD COLUMN IF NOT EXISTS final_feeling TEXT,
          ADD COLUMN IF NOT EXISTS form_completed_at TIMESTAMPTZ DEFAULT NULL;
      `
    });

    if (alterError) {
      console.log('❌ ALTER TABLE failed:', alterError.message);
      console.log('\n⚠️  You may need to run the migration manually in Supabase SQL Editor');
      console.log('📁 Migration file: migrations/026_add_page12_final_medical_check_fields.sql');
      process.exit(1);
    }

    console.log('✅ Columns added successfully using fallback method');
  } else {
    console.log('✅ Migration completed successfully!');
  }

  console.log('\n📋 Columns added:');
  console.log('  - final_feeling (TEXT)');
  console.log('  - form_completed_at (TIMESTAMPTZ)');
}

runMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
