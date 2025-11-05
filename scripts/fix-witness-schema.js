/**
 * Fix incident_witnesses table schema
 * - Rename incident_id to incident_report_id
 * - Add missing columns
 * - Update indexes
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSchema() {
  console.log('\n🔧 Fixing incident_witnesses table schema...\n');
  console.log('='.repeat(70));

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251104000002_fix_incident_witnesses_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📏 SQL length:', migrationSQL.length, 'characters\n');

    // Execute the migration directly via SQL query
    console.log('⚙️  Executing schema fixes...\n');

    // Since we can't use exec_sql RPC, we'll execute via raw SQL
    // This requires using the Supabase SQL editor or pgAdmin

    console.log('⚠️  IMPORTANT: Execute this SQL in Supabase SQL Editor:\n');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the following SQL:\n');
    console.log('='.repeat(70));
    console.log(migrationSQL);
    console.log('='.repeat(70));
    console.log('\n5. Click "Run" to execute\n');

    // Verify table exists
    console.log('🔍 Verifying current table state...\n');

    const { data, error } = await supabase
      .from('incident_witnesses')
      .select('*')
      .limit(0);

    if (error) {
      console.log('❌ Error accessing table:', error.message);
    } else {
      console.log('✅ Table exists and is accessible');
      console.log('⚠️  But may need schema updates - see SQL above\n');
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('\nPlease run the SQL migration manually in Supabase dashboard.\n');
  }
}

fixSchema();
