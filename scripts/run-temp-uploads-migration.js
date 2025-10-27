#!/usr/bin/env node
/**
 * Run temp_uploads table migration
 * Creates the temp_uploads table in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const config = require('../src/config');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

async function runMigration() {
  console.log(colors.cyan, '\n🔄 Running temp_uploads table migration...\n');

  try {
    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    );

    console.log(colors.cyan, '📖 Reading migration file...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/create-temp-uploads-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log(colors.cyan, '✅ Migration file loaded\n');
    console.log(colors.yellow, 'SQL Preview:');
    console.log(colors.yellow, '─'.repeat(60));
    console.log(migrationSQL.split('\n').slice(0, 10).join('\n'));
    console.log(colors.yellow, '...\n');

    console.log(colors.cyan, '🚀 Executing migration...');

    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql function doesn't exist, try direct execution
      // Note: This requires proper database permissions
      console.log(colors.yellow, '⚠️  exec_sql function not found, trying direct execution...\n');

      // Split SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(colors.cyan, `\n📝 Executing statement ${i + 1}/${statements.length}...`);

        const { error: execError } = await supabase.rpc('exec', {
          query: statement
        });

        if (execError) {
          console.log(colors.red, `❌ Statement ${i + 1} failed:`, execError.message);
          throw execError;
        }

        console.log(colors.green, `✅ Statement ${i + 1} executed successfully`);
      }
    }

    // Verify the table was created
    console.log(colors.cyan, '\n🔍 Verifying table creation...');

    const { data: tableCheck, error: checkError } = await supabase
      .from('temp_uploads')
      .select('*')
      .limit(0);

    if (checkError && !checkError.message.includes('no rows')) {
      throw new Error(`Table verification failed: ${checkError.message}`);
    }

    console.log(colors.green, '\n✅ Migration completed successfully!');
    console.log(colors.green, '✅ temp_uploads table created\n');

    console.log(colors.cyan, '📊 Table Structure:');
    console.log(colors.cyan, '─'.repeat(60));
    console.log(colors.cyan, '  • id (UUID) - Primary key');
    console.log(colors.cyan, '  • session_id (TEXT) - Client session identifier');
    console.log(colors.cyan, '  • field_name (TEXT) - Form field name');
    console.log(colors.cyan, '  • storage_path (TEXT) - Path in Supabase storage');
    console.log(colors.cyan, '  • file_size (INTEGER) - File size in bytes');
    console.log(colors.cyan, '  • mime_type (TEXT) - File MIME type');
    console.log(colors.cyan, '  • uploaded_at (TIMESTAMPTZ) - Upload timestamp');
    console.log(colors.cyan, '  • expires_at (TIMESTAMPTZ) - Expiration timestamp');
    console.log(colors.cyan, '  • claimed (BOOLEAN) - Whether file was claimed');
    console.log(colors.cyan, '  • claimed_by_user_id (UUID) - User who claimed');
    console.log(colors.cyan, '  • claimed_at (TIMESTAMPTZ) - Claim timestamp');
    console.log(colors.cyan, '  • created_at (TIMESTAMPTZ) - Record creation\n');

    console.log(colors.green, '🎉 Ready to test temp upload functionality!\n');
    console.log(colors.cyan, 'Next steps:');
    console.log(colors.cyan, '  1. Open http://localhost:3000/signup-form.html');
    console.log(colors.cyan, '  2. Select an image on any page');
    console.log(colors.cyan, '  3. Watch browser console for upload confirmation');
    console.log(colors.cyan, '  4. Submit form to test temp→permanent conversion\n');

  } catch (error) {
    console.log(colors.red, '\n❌ Migration failed:', error.message);
    console.log(colors.yellow, '\n💡 Troubleshooting:');
    console.log(colors.yellow, '  1. Check Supabase credentials in .env');
    console.log(colors.yellow, '  2. Verify SERVICE_ROLE_KEY has database permissions');
    console.log(colors.yellow, '  3. Manually run SQL in Supabase SQL Editor:');
    console.log(colors.yellow, '     - Go to Supabase Dashboard → SQL Editor');
    console.log(colors.yellow, '     - Copy migrations/create-temp-uploads-table.sql');
    console.log(colors.yellow, '     - Run the SQL manually\n');
    process.exit(1);
  }
}

// Run the migration
runMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(colors.red, 'Unexpected error:', error);
    process.exit(1);
  });
