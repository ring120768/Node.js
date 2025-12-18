/**
 * Apply Migration 031: Create PDF Generation Queue Table
 *
 * Uses direct PostgreSQL connection to Supabase
 *
 * Run: node scripts/apply-migration-031-direct.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase direct PostgreSQL connection
// Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
const getConnectionString = () => {
  // Check for direct connection string first
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Try to construct from Supabase URL
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error('SUPABASE_URL not set');
  }

  // Extract project ref from URL (e.g., https://kctlcmbjmhcfoobmkfrs.supabase.co)
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    throw new Error('Could not parse Supabase URL');
  }

  const projectRef = match[1];
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!password) {
    console.log('\n⚠️  Direct PostgreSQL connection requires database password.');
    console.log('   Set SUPABASE_DB_PASSWORD environment variable or use the SQL Editor.\n');
    return null;
  }

  return `postgresql://postgres.${projectRef}:${password}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`;
};

async function applyMigration() {
  console.log('🔧 PDF Generation Queue - Migration 031 (Direct Connection)\n');

  const connectionString = getConnectionString();

  if (!connectionString) {
    // Fall back to providing instructions
    const migrationPath = path.join(__dirname, '../migrations/031_create_pdf_generation_queue.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 MANUAL MIGRATION REQUIRED:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/kctlcmbjmhcfoobmkfrs/sql/new');
    console.log('2. Paste the following SQL:\n');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log('\n3. Click "Run" (or press Cmd/Ctrl + Enter)');
    return;
  }

  const pool = new Pool({ connectionString });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/031_create_pdf_generation_queue.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration...');

    await pool.query(migrationSQL);

    console.log('✅ Migration applied successfully!');
    console.log('   Table pdf_generation_queue is now ready.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    // Check if it's a connection error
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection failed. Try using the Supabase SQL Editor instead.');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration().then(() => {
  console.log('\n📖 Migration complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
