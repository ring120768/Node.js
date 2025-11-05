/**
 * Migration Runner
 * Executes SQL migrations against Supabase database using PostgreSQL client
 * Uses direct database connection string
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration - Supabase PostgreSQL connection
// Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL environment variable');
  console.error('\nYou can get this from Supabase Dashboard:');
  console.error('   1. Go to https://supabase.com/dashboard/project/[your-project]/settings/database');
  console.error('   2. Copy the "Connection string" under "Connection pooling"');
  console.error('   3. Set it as DATABASE_URL in your environment');
  console.error('\nAlternatively, run migrations manually via Supabase SQL Editor');
  process.exit(1);
}

/**
 * Execute a single migration file
 */
async function runMigration(client, migrationPath) {
  const migrationName = path.basename(migrationPath);
  console.log(`\n📋 Running: ${migrationName}`);

  try {
    // Read migration file
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Remove comments and split statements
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`   Found ${statements.length} SQL statement(s)`);

    // Execute each statement in a transaction
    await client.query('BEGIN');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   Executing statement ${i + 1}/${statements.length}...`);

      try {
        await client.query(statement);
      } catch (error) {
        // Check if error is "column already exists" or "already renamed"
        if (error.code === '42701' || error.message.includes('already exists')) {
          console.log(`   ⚠️  Statement ${i + 1} already applied (skipping)`);
          continue;
        }
        throw error;
      }
    }

    await client.query('COMMIT');

    console.log(`   ✅ ${migrationName} completed successfully`);
    return { success: true, migration: migrationName };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`   ❌ Error in ${migrationName}:`);
    console.error(`      ${error.message}`);
    return { success: false, migration: migrationName, error: error.message };
  }
}

/**
 * Run migrations in order
 */
async function runMigrations() {
  console.log('🚀 Starting migration runner...');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Supabase uses self-signed certs
    }
  });

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Migrations to run (in order)
    const migrations = [
      'supabase/migrations/004_rename_visibility_field.sql',
      'supabase/migrations/005_add_your_speed_column.sql',
      'supabase/migrations/006_add_page_four_columns.sql',
      'supabase/migrations/007_rename_road_type_column.sql'
    ];

    const results = [];

    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, '..', migration);

      if (!fs.existsSync(migrationPath)) {
        console.error(`\n❌ Migration file not found: ${migration}`);
        results.push({ success: false, migration, error: 'File not found' });
        continue;
      }

      const result = await runMigration(client, migrationPath);
      results.push(result);

      // Stop on first failure
      if (!result.success) {
        console.error('\n⚠️  Stopping migration run due to error');
        break;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}`);
    successful.forEach(r => console.log(`   - ${r.migration}`));

    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length}`);
      failed.forEach(r => console.log(`   - ${r.migration}: ${r.error}`));
    }

    console.log('='.repeat(60));

    if (failed.length > 0) {
      process.exit(1);
    }

    console.log('\n🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('\n💥 Fatal error:');
    console.error(error);
    process.exit(1);
  } finally {
    // Always close the connection
    await client.end();
    console.log('\n📡 Database connection closed');
  }
}

// Run migrations
runMigrations();
