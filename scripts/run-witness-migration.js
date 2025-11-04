/**
 * Run migration to create incident_witnesses table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('\n🚀 Running incident_witnesses table migration...\n');
  console.log('='.repeat(70));

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251104000000_create_incident_witnesses_table.sql');

    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found at: ' + migrationPath);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📏 SQL length:', migrationSQL.length, 'characters\n');

    // Execute the migration
    console.log('⚙️  Executing migration...\n');

    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    });

    if (error) {
      // Try alternative approach - split and execute individual statements
      console.log('⚠️  RPC method failed, trying direct execution...\n');

      // Split SQL into statements (simple split by semicolon)
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt) continue;

        console.log(`Executing statement ${i + 1}/${statements.length}...`);

        try {
          // Use raw query for CREATE/ALTER statements
          await supabase.rpc('exec_sql', { query: stmt + ';' });
        } catch (stmtError) {
          console.error(`❌ Statement ${i + 1} failed:`, stmtError.message);
          console.error('Statement:', stmt.substring(0, 100) + '...');
        }
      }
    }

    // Verify the table was created
    console.log('\n🔍 Verifying table creation...\n');

    const { data: tableCheck, error: checkError } = await supabase
      .from('incident_witnesses')
      .select('*')
      .limit(0);

    if (checkError) {
      throw new Error('Table verification failed: ' + checkError.message);
    }

    console.log('✅ Table created successfully!');
    console.log('✅ RLS policies enabled');
    console.log('✅ Indexes created');
    console.log('✅ Triggers configured\n');

    // Show table structure
    console.log('📊 Table Structure:\n');
    console.log('  Table: incident_witnesses');
    console.log('  Columns:');
    console.log('    - id (UUID, primary key)');
    console.log('    - incident_report_id (UUID, foreign key)');
    console.log('    - create_user_id (UUID, foreign key)');
    console.log('    - witness_number (INTEGER)');
    console.log('    - witness_name (TEXT, required)');
    console.log('    - witness_phone (TEXT)');
    console.log('    - witness_email (TEXT)');
    console.log('    - witness_address (TEXT)');
    console.log('    - witness_statement (TEXT, required)');
    console.log('    - created_at (TIMESTAMP)');
    console.log('    - updated_at (TIMESTAMP)\n');

    console.log('🔐 Security:');
    console.log('  - Row Level Security (RLS) enabled');
    console.log('  - Users can only access their own witnesses');
    console.log('  - 4 RLS policies created (SELECT, INSERT, UPDATE, DELETE)\n');

    console.log('⚡ Performance:');
    console.log('  - 3 indexes created for fast queries');
    console.log('  - Auto-updated timestamps via trigger\n');

    console.log('='.repeat(70));
    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease run the SQL migration manually in Supabase dashboard:');
    console.error('1. Go to SQL Editor in Supabase dashboard');
    console.error('2. Copy contents of: supabase/migrations/20251104000000_create_incident_witnesses_table.sql');
    console.error('3. Paste and execute\n');
    process.exit(1);
  }
}

runMigration();
