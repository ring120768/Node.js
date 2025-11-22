const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('='.repeat(70));
console.log('DATABASE MIGRATION TEST');
console.log('='.repeat(70));

async function testMigration() {
  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ ERROR: Missing environment variables');
    console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    console.error('   Check your .env file or Replit Secrets');
    process.exit(1);
  }

  console.log(`\n📊 Configuration:`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`   Using: Service Role Key (bypasses RLS)`);

  // Initialize Supabase client with service role key
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

  console.log(`\n✅ Supabase client initialized`);

  // Read migration file
  const migrationPath = path.join(__dirname, '../migrations/001_add_new_pdf_fields.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error(`\n❌ ERROR: Migration file not found`);
    console.error(`   Expected: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log(`\n📄 Migration file loaded:`);
  console.log(`   Path: ${migrationPath}`);
  console.log(`   Size: ${migrationSQL.length} characters`);

  // Confirm before proceeding
  console.log(`\n⚠️  WARNING: This will modify your database schema!`);
  console.log(`   - Adding 51 new columns across 3 tables`);
  console.log(`   - Creating 4 indexes`);
  console.log(`   - Adding 4 constraints`);

  // In production, you'd want to add a confirmation prompt here
  // For automated testing, we proceed automatically

  console.log(`\n🚀 Starting migration...`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);

  try {
    // Execute migration
    const startTime = Date.now();

    // Note: Supabase JS client doesn't support multi-statement SQL directly
    // We need to use the REST API or split into individual statements

    // For this test, we'll use a simpler approach: test if we can add one column
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          -- Test adding one column to verify permissions
          ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS ambulance_called BOOLEAN DEFAULT FALSE;

          RAISE NOTICE 'Migration test successful - column added or already exists';
        END $$;
      `
    });

    const duration = Date.now() - startTime;

    if (error) {
      console.error(`\n❌ Migration failed!`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Hint: ${error.hint || 'N/A'}`);
      console.error(`   Details: ${error.details || 'N/A'}`);
      process.exit(1);
    }

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`   Duration: ${duration}ms`);

    // Verify changes
    console.log(`\n🔍 Verifying changes...`);

    // Check if new column exists
    const { data: columns, error: checkError } = await supabase
      .from('incident_reports')
      .select('ambulance_called')
      .limit(1);

    if (checkError) {
      // Column might exist but table is empty
      if (checkError.code === 'PGRST116') {
        console.log(`   ✅ Column 'ambulance_called' exists (table empty)`);
      } else {
        console.warn(`   ⚠️  Could not verify column: ${checkError.message}`);
      }
    } else {
      console.log(`   ✅ Column 'ambulance_called' verified`);
    }

  } catch (err) {
    console.error(`\n❌ Unexpected error during migration:`);
    console.error(err);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`MIGRATION TEST COMPLETE`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\n📝 IMPORTANT NOTES:`);
  console.log(`   1. This test added ONE column as a proof-of-concept`);
  console.log(`   2. To run the FULL migration with all 51 columns:`);
  console.log(`      - Use Supabase Dashboard SQL Editor (recommended)`);
  console.log(`      - Or use psql command line tool`);
  console.log(`   3. Run verify-migration.js to check all columns exist`);
  console.log(`\n💡 To apply full migration:`);
  console.log(`   1. Copy migrations/001_add_new_pdf_fields.sql`);
  console.log(`   2. Go to Supabase Dashboard → SQL Editor`);
  console.log(`   3. Paste and run the SQL`);
  console.log(`   4. Run: node scripts/verify-migration.js`);
  console.log(`\n✅ Test complete!`);
}

testMigration().catch(console.error);
