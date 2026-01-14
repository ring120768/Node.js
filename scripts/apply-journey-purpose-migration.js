/**
 * Apply Migration 036: Add journey_purpose column
 *
 * Executes the migration using direct PostgreSQL connection
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  console.log('🔧 Applying Migration 036: Add journey_purpose column...\n');

  // Parse Supabase URL to get PostgreSQL connection details
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Extract project ref from Supabase URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectRef) {
    console.error('❌ Could not parse project ref from SUPABASE_URL');
    process.exit(1);
  }

  // Construct PostgreSQL connection string
  const connectionString = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || serviceRoleKey}@db.${projectRef}.supabase.co:5432/postgres`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/036_add_journey_purpose_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL...');
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully\n');

    // Verify column was added
    console.log('Verifying journey_purpose column...');
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
        AND column_name = 'journey_purpose';
    `;

    const result = await client.query(verifyQuery);

    if (result.rows.length === 1) {
      const col = result.rows[0];
      console.log('✅ Column verified:');
      console.log(`   - Name: ${col.column_name}`);
      console.log(`   - Type: ${col.data_type}`);
      console.log(`   - Nullable: ${col.is_nullable}`);

      // Check constraint
      const constraintQuery = `
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name = 'check_journey_purpose_values';
      `;
      const constraintResult = await client.query(constraintQuery);

      if (constraintResult.rows.length > 0) {
        console.log(`   - Constraint: ✅ check_journey_purpose_values exists`);
      }

      // Check index
      const indexQuery = `
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'incident_reports'
          AND indexname = 'idx_incident_reports_journey_purpose';
      `;
      const indexResult = await client.query(indexQuery);

      if (indexResult.rows.length > 0) {
        console.log(`   - Index: ✅ idx_incident_reports_journey_purpose exists`);
      }

      console.log('\n🎉 Migration 036 complete! journey_purpose field is ready.');
    } else {
      console.error('❌ Column not found after migration');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n📋 Manual migration instructions:');
    console.log('1. Go to: Supabase Dashboard > SQL Editor');
    console.log('2. Copy the SQL from: migrations/036_add_journey_purpose_column.sql');
    console.log('3. Paste and run\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
