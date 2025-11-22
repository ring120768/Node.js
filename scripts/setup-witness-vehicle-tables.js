#!/usr/bin/env node
/**
 * Setup Script: Create Witness and Vehicle Tables in Supabase
 * This script uses the Supabase client to execute the SQL directly
 * Usage: node scripts/setup-witness-vehicle-tables.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupTables() {
  console.log(colors.cyan, '\n🔧 Setting up Witness and Vehicle Tables in Supabase\n');

  try {
    // Read the combined SQL script
    const sqlPath = path.join(__dirname, 'COMBINED-create-witness-vehicle-tables.sql');

    if (!fs.existsSync(sqlPath)) {
      console.log(colors.red, '❌ SQL script not found at:', sqlPath);
      console.log(colors.yellow, 'Expected file: scripts/COMBINED-create-witness-vehicle-tables.sql');
      process.exit(1);
    }

    console.log(colors.cyan, '📄 Reading SQL script...');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split into individual statements (basic splitting on semicolons)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(colors.cyan, `📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comment-only statements
      if (statement.trim().startsWith('--')) continue;

      // Show progress
      const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';
      process.stdout.write(`[${i + 1}/${statements.length}] ${preview} `);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase.from('_').select('*').limit(0);

          // If it's a "relation already exists" error, that's actually fine
          if (error.message && error.message.includes('already exists')) {
            console.log(colors.yellow, '⚠️ Already exists');
            successCount++;
          } else {
            console.log(colors.red, '❌ Error');
            console.log(colors.red, `   ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(colors.green, '✅');
          successCount++;
        }
      } catch (err) {
        console.log(colors.red, '❌ Exception');
        console.log(colors.red, `   ${err.message}`);
        errorCount++;
      }
    }

    console.log(colors.cyan, '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(colors.green, `✅ Success: ${successCount}`);
    if (errorCount > 0) {
      console.log(colors.red, `❌ Errors: ${errorCount}`);
    }
    console.log(colors.cyan, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verify tables were created
    console.log(colors.cyan, '🔍 Verifying tables...\n');

    const { data: witnessCheck, error: witnessError } = await supabase
      .from('incident_witnesses')
      .select('*')
      .limit(0);

    if (witnessError) {
      console.log(colors.red, '❌ incident_witnesses table: NOT FOUND');
      console.log(colors.yellow, '   You may need to run the SQL manually in Supabase dashboard');
    } else {
      console.log(colors.green, '✅ incident_witnesses table: EXISTS');
    }

    const { data: vehicleCheck, error: vehicleError } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .limit(0);

    if (vehicleError) {
      console.log(colors.red, '❌ incident_other_vehicles table: NOT FOUND');
      console.log(colors.yellow, '   You may need to run the SQL manually in Supabase dashboard');
    } else {
      console.log(colors.green, '✅ incident_other_vehicles table: EXISTS');
    }

    if (!witnessError && !vehicleError) {
      console.log(colors.green, '\n🎉 All tables created successfully!\n');
      console.log(colors.cyan, 'Next steps:');
      console.log('1. Test API endpoints');
      console.log('2. Test frontend forms (report-complete.html)');
      console.log('3. Test PDF generation with witnesses/vehicles\n');
    } else {
      console.log(colors.yellow, '\n⚠️ Some tables may not have been created.');
      console.log(colors.cyan, 'Alternative: Run SQL manually in Supabase Dashboard');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Open SQL Editor');
      console.log('3. Copy/paste scripts/COMBINED-create-witness-vehicle-tables.sql');
      console.log('4. Click Run\n');
    }

  } catch (error) {
    console.log(colors.red, '\n❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupTables().catch(console.error);
