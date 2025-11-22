/**
 * Direct PostgreSQL Migration Executor
 *
 * Executes the ai_transcription schema migration using direct PostgreSQL connection
 * Bypasses Supabase client limitations
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function executeMigration() {
  console.log('🔧 Executing ai_transcription schema migration...\n');

  // Parse Supabase URL to get PostgreSQL connection details
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Extract project ref from Supabase URL
  // Format: https://<project-ref>.supabase.co
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectRef) {
    console.error('❌ Could not parse project ref from SUPABASE_URL');
    process.exit(1);
  }

  // Construct PostgreSQL connection string
  // Supabase PostgreSQL: db.<project-ref>.supabase.co:5432
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
    const migrationPath = path.join(__dirname, '../migrations/add_ai_transcription_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL...');
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully\n');

    // Verify columns were added
    console.log('Verifying columns...');
    const verifyQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ai_transcription'
        AND column_name IN ('transcript_text', 'narrative_text', 'voice_transcription')
      ORDER BY column_name;
    `;

    const result = await client.query(verifyQuery);

    if (result.rows.length === 3) {
      console.log('✅ All 3 columns verified:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
      console.log('\n🎉 Migration complete! The save-statement endpoint should now work.');
    } else {
      console.warn(`⚠️  Expected 3 columns, found ${result.rows.length}`);
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n📋 Manual migration instructions:');
    console.log('1. Go to: https://supabase.com/dashboard/project/obrztlhdqlhjnfncybsc/editor');
    console.log('2. Click "SQL Editor"');
    console.log('3. Copy the SQL from: migrations/add_ai_transcription_columns.sql');
    console.log('4. Paste and run\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

executeMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
