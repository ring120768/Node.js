/**
 * Run Migrations 002-005 Using Supabase Client
 * Automated migration runner with verification
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase with service role (can alter schema)
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

// Read the corrective migration SQL
const migrationSQL = fs.readFileSync(
  path.join(__dirname, '../migrations/fix-existing-schema-002-005.sql'),
  'utf8'
);

async function runMigrations() {
  console.log('🚀 Starting automated migration process...\n');

  try {
    // Execute the migration SQL
    console.log('📝 Executing migration SQL...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('Error details:', error);

      // Try alternative approach: execute via REST API
      console.log('\n🔄 Trying alternative execution method...');
      await executeViaPostgREST();
      return;
    }

    console.log('✅ Migration SQL executed successfully!');
    console.log('Response:', data);

    // Verify the migrations
    await verifyMigrations();

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error('\n💡 Fallback: Please run the SQL manually in Supabase Dashboard');
    console.error('   File: migrations/fix-existing-schema-002-005.sql');
    process.exit(1);
  }
}

async function executeViaPostgREST() {
  console.log('📝 Attempting direct execution via Supabase client...\n');

  const migrations = [
    {
      name: 'Migration 002: Fix visibility column',
      sql: `
        ALTER TABLE incident_reports
        RENAME COLUMN visibility_streets_ TO visibility_street_lights;

        COMMENT ON COLUMN incident_reports.visibility_street_lights IS
        'Whether street lights were present/on at accident scene (Page Three visibility section)';
      `
    },
    {
      name: 'Migration 003: Verify your_speed exists',
      sql: `
        -- Already exists, just verify
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'incident_reports' AND column_name = 'your_speed';
      `
    },
    {
      name: 'Migration 004: Rename road_type_private',
      sql: `
        ALTER TABLE incident_reports
        RENAME COLUMN road_type_private TO road_type_private_road;

        COMMENT ON COLUMN incident_reports.road_type_private_road IS
        'Whether accident occurred on private road (important for UK liability - Page Three road type section)';
      `
    },
    {
      name: 'Migration 005: Add user_documents columns',
      sql: `
        ALTER TABLE user_documents
        ADD COLUMN IF NOT EXISTS incident_report_id UUID REFERENCES incident_reports(id);

        ALTER TABLE user_documents
        ADD COLUMN IF NOT EXISTS download_url TEXT;

        COMMENT ON COLUMN user_documents.incident_report_id IS
        'Foreign key to incident_reports table - links documents to specific incident reports (NULL for signup documents)';

        COMMENT ON COLUMN user_documents.download_url IS
        'Permanent API URL for downloading document (/api/user-documents/{id}/download) - generates fresh signed URLs on demand';

        CREATE INDEX IF NOT EXISTS idx_user_documents_incident_report
        ON user_documents(incident_report_id)
        WHERE incident_report_id IS NOT NULL AND deleted_at IS NULL;

        CREATE INDEX IF NOT EXISTS idx_user_documents_user_incident
        ON user_documents(create_user_id, incident_report_id)
        WHERE incident_report_id IS NOT NULL AND deleted_at IS NULL;
      `
    }
  ];

  for (const migration of migrations) {
    console.log(`▶ ${migration.name}`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: migration.sql });

      if (error) {
        console.log(`⚠️  Warning: ${error.message}`);
        // Continue with other migrations
      } else {
        console.log(`✅ ${migration.name} completed`);
      }
    } catch (err) {
      console.log(`⚠️  ${migration.name} error: ${err.message}`);
      // Continue with other migrations
    }
  }

  console.log('\n📋 Verifying final state...');
  await verifyMigrations();
}

async function verifyMigrations() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔍 VERIFICATION: Checking all migrations...');
  console.log('═══════════════════════════════════════════════════════\n');

  const columnsToCheck = [
    { table: 'incident_reports', column: 'visibility_street_lights' },
    { table: 'incident_reports', column: 'your_speed' },
    { table: 'incident_reports', column: 'road_type_private_road' },
    { table: 'user_documents', column: 'incident_report_id' },
    { table: 'user_documents', column: 'download_url' }
  ];

  let allPassed = true;

  for (const { table, column } of columnsToCheck) {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', table)
      .eq('column_name', column)
      .maybeSingle();

    const exists = !error && data;
    const status = exists ? '✅' : '❌';

    console.log(`${status} ${table}.${column}`);

    if (!exists) {
      allPassed = false;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');

  if (allPassed) {
    console.log('🎉 SUCCESS: All 5 columns verified!');
    console.log('\nNext steps:');
    console.log('  1. ✅ Database schema updated');
    console.log('  2. 📦 Ready to implement LocationPhotoService');
    console.log('  3. 🔄 Ready to implement page controllers');
    console.log('\n💡 Run: npm start (to restart server with new schema)');
  } else {
    console.log('⚠️  WARNING: Some columns still missing');
    console.log('\n💡 Please run the SQL manually:');
    console.log('   File: migrations/fix-existing-schema-002-005.sql');
    console.log('   Location: Supabase Dashboard → SQL Editor');
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

// Run the migrations
runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
