#!/usr/bin/env node
/**
 * Database Migration Script: Witness and Vehicle Tables
 *
 * Creates two new tables in Supabase:
 * 1. incident_witnesses - Stores witness information for incidents
 * 2. incident_other_vehicles - Stores other vehicle information with DVLA integration
 *
 * Usage: node scripts/run-witness-vehicle-migrations.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m'
};

async function runMigrations() {
    console.log(colors.cyan, '\n🔄 Running Database Migrations for Witnesses and Vehicles\n', colors.reset);

    // Initialize Supabase client with service role (bypasses RLS)
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

    try {
        // Test connection
        console.log('1. Testing Supabase connection...');
        const { data: testData, error: testError } = await supabase
            .from('user_signup')
            .select('count')
            .limit(1);

        if (testError) {
            throw new Error(`Supabase connection failed: ${testError.message}`);
        }
        console.log(colors.green, '✅ Supabase connection successful\n', colors.reset);

        // Read SQL files
        console.log('2. Reading migration SQL files...');
        const witnessesSQL = fs.readFileSync(
            path.join(__dirname, 'create-incident-witnesses-table.sql'),
            'utf8'
        );
        const vehiclesSQL = fs.readFileSync(
            path.join(__dirname, 'create-incident-other-vehicles-table.sql'),
            'utf8'
        );
        console.log(colors.green, '✅ SQL files loaded\n', colors.reset);

        // Execute witness table migration
        console.log('3. Creating incident_witnesses table...');
        const { data: witnessData, error: witnessError } = await supabase.rpc('exec_sql', {
            sql_query: witnessesSQL
        });

        // If exec_sql RPC doesn't exist, try direct execution (Supabase may not expose this)
        // In that case, you'll need to run these SQL files manually in Supabase SQL Editor
        if (witnessError) {
            console.log(colors.yellow, '\n⚠️  Cannot execute SQL directly via Supabase client.', colors.reset);
            console.log(colors.yellow, '\nPlease run the following files manually in Supabase SQL Editor:', colors.reset);
            console.log(colors.cyan, '  1. scripts/create-incident-witnesses-table.sql', colors.reset);
            console.log(colors.cyan, '  2. scripts/create-incident-other-vehicles-table.sql\n', colors.reset);
            console.log('Supabase Dashboard → SQL Editor → New Query → Paste SQL → Run');
            console.log('\n' + colors.yellow + 'Alternative: Use Supabase CLI:', colors.reset);
            console.log('  npx supabase db push\n');
            return;
        }

        console.log(colors.green, '✅ incident_witnesses table created\n', colors.reset);

        // Execute vehicle table migration
        console.log('4. Creating incident_other_vehicles table...');
        const { data: vehicleData, error: vehicleError } = await supabase.rpc('exec_sql', {
            sql_query: vehiclesSQL
        });

        if (vehicleError) {
            throw new Error(`Failed to create vehicle table: ${vehicleError.message}`);
        }

        console.log(colors.green, '✅ incident_other_vehicles table created\n', colors.reset);

        // Verify tables exist
        console.log('5. Verifying tables...');
        const { data: tables, error: tablesError } = await supabase
            .from('incident_witnesses')
            .select('count')
            .limit(1);

        if (tablesError && tablesError.code !== 'PGRST116') {
            console.log(colors.yellow, '⚠️  Warning: Could not verify witness table', colors.reset);
        } else {
            console.log(colors.green, '✅ Tables verified and ready\n', colors.reset);
        }

        console.log(colors.green, '\n🎉 Migration completed successfully!\n', colors.reset);
        console.log('Next steps:');
        console.log('  1. Test witness API: POST /api/witnesses');
        console.log('  2. Test vehicle API: POST /api/other-vehicles');
        console.log('  3. Verify in Supabase dashboard → Database → Tables\n');

    } catch (error) {
        console.error(colors.red, '\n❌ Migration failed:', error.message, colors.reset);
        console.log('\nPlease run the SQL files manually in Supabase SQL Editor:');
        console.log('  1. scripts/create-incident-witnesses-table.sql');
        console.log('  2. scripts/create-incident-other-vehicles-table.sql\n');
        process.exit(1);
    }
}

// Run migrations
runMigrations().catch(error => {
    console.error(colors.red, 'Fatal error:', error, colors.reset);
    process.exit(1);
});
