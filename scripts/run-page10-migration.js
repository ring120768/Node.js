/**
 * Run Page 10 Police Details Migration (008)
 * Adds missing columns for police attendance and safety equipment details
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL environment variable');
  console.error('\nYou can get this from Supabase Dashboard:');
  console.error('   1. Go to https://supabase.com/dashboard/project/[your-project]/settings/database');
  console.error('   2. Copy the "Connection string" under "Connection pooling"');
  console.error('   3. Set it as DATABASE_URL in your environment');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Running Page 10 Police Details Migration (008)...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Connect
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase/migrations/008_add_page10_police_details.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split into statements
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📋 Found ${statements.length} SQL statement(s)\n`);

    // Execute in transaction
    await client.query('BEGIN');

    for (let i = 0; i < statements.length; i++) {
      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);

      try {
        await client.query(statements[i]);
        console.log(`   ✅ Success`);
      } catch (error) {
        // Check if column already exists
        if (error.code === '42701' || error.message.includes('already exists')) {
          console.log(`   ⚠️  Already exists (skipping)`);
          continue;
        }
        throw error;
      }
    }

    await client.query('COMMIT');

    console.log('\n🎉 Migration completed successfully!\n');
    console.log('Added columns:');
    console.log('  • accident_ref_number (TEXT)');
    console.log('  • police_force (TEXT)');
    console.log('  • officer_name (TEXT)');
    console.log('  • officer_badge (TEXT)');
    console.log('  • user_breath_test (TEXT)');
    console.log('  • other_breath_test (TEXT)');
    console.log('  • airbags_deployed (BOOLEAN)');
    console.log('  • seatbelt_reason (TEXT)');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n📡 Database connection closed');
  }
}

runMigration();
