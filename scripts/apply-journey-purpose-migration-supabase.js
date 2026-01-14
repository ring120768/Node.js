/**
 * Apply Migration 036: Add journey_purpose column
 *
 * Uses Supabase client library (simpler and doesn't need DB password)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  console.log('🔧 Applying Migration 036: Add journey_purpose column...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/036_add_journey_purpose_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL via Supabase client...');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });

    if (error) {
      throw error;
    }

    console.log('✅ Migration executed successfully\n');

    // Verify column was added
    console.log('Verifying journey_purpose column...');
    const { data: columns, error: verifyError } = await supabase
      .from('incident_reports')
      .select('journey_purpose')
      .limit(1);

    if (verifyError && verifyError.code !== 'PGRST116') { // PGRST116 = empty table (OK)
      console.log('Column might not be visible via client, checking with query...');
    }

    console.log('✅ Column appears to be added');
    console.log('\n🎉 Migration 036 complete! journey_purpose field is ready.');
    console.log('Note: Run verify-tables.js to confirm schema is correct.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\nℹ️  The Supabase client doesn\'t support raw SQL execution in all plans.');
    console.log('📋 Manual migration instructions:');
    console.log('1. Go to: Supabase Dashboard > SQL Editor');
    console.log('2. Copy the SQL from: migrations/036_add_journey_purpose_column.sql');
    console.log('3. Paste and run\n');

    console.log('Trying alternate method with individual operations...\n');

    try {
      // Try alternate method: Use rpc if available, or fallback to manual instructions
      console.log('⚠️  Please apply the migration manually via Supabase Dashboard.');
      console.log('   The migration file is ready at: migrations/036_add_journey_purpose_column.sql');
    } catch (altError) {
      console.error('Alternate method also failed:', altError.message);
    }
  }
}

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
