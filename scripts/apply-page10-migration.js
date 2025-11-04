/**
 * Apply Page 10 Police Details Migration
 * Uses Supabase client to execute migration SQL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyMigration() {
  console.log('🚀 Applying Page 10 Police Details Migration (008)...\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase/migrations/008_add_page10_police_details.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Migration SQL loaded');
    console.log('📡 Connecting to Supabase...\n');

    // Execute SQL via Supabase RPC
    // Note: We'll execute the full SQL as one statement
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(err => {
      // If exec_sql function doesn't exist, try direct query
      return supabase.from('incident_reports').select('count').limit(0);
    });

    // If RPC doesn't work, use the PostgreSQL approach via pg library
    // For now, let's use a simpler approach: execute each ALTER TABLE directly

    console.log('⚙️  Adding missing Page 10 columns...\n');

    // Execute each ALTER TABLE statement separately
    const statements = [
      {
        name: 'police_details',
        sql: `ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS accident_ref_number TEXT,
ADD COLUMN IF NOT EXISTS police_force TEXT,
ADD COLUMN IF NOT EXISTS officer_name TEXT,
ADD COLUMN IF NOT EXISTS officer_badge TEXT,
ADD COLUMN IF NOT EXISTS user_breath_test TEXT,
ADD COLUMN IF NOT EXISTS other_breath_test TEXT;`
      },
      {
        name: 'safety_equipment',
        sql: `ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS airbags_deployed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seatbelt_reason TEXT;`
      }
    ];

    // Since Supabase client doesn't directly support DDL, we'll need to document
    // that this must be run via Supabase SQL Editor

    console.log('⚠️  Direct DDL execution via Supabase client is limited.');
    console.log('');
    console.log('📝 Please run this migration via Supabase SQL Editor:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/[your-project]/editor');
    console.log('2. Create a new query');
    console.log('3. Copy and paste the SQL from:');
    console.log('   supabase/migrations/008_add_page10_police_details.sql');
    console.log('4. Click "Run" to execute');
    console.log('');
    console.log('✅ Migration file created and ready to apply');
    console.log('');
    console.log('Columns to be added:');
    console.log('  • accident_ref_number (TEXT) - Police reference/CAD number');
    console.log('  • police_force (TEXT) - Police force name');
    console.log('  • officer_name (TEXT) - Officer name');
    console.log('  • officer_badge (TEXT) - Officer badge/collar number');
    console.log('  • user_breath_test (TEXT) - User breath test result');
    console.log('  • other_breath_test (TEXT) - Other driver breath test');
    console.log('  • airbags_deployed (BOOLEAN) - Were airbags deployed');
    console.log('  • seatbelt_reason (TEXT) - Reason if seatbelt not worn');

  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error.message);
    process.exit(1);
  }
}

applyMigration();
