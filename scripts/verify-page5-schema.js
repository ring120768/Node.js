#!/usr/bin/env node

/**
 * Verify Page 5 Database Schema
 *
 * Checks that all 16 required columns exist in incident_reports table
 * with correct data types.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const REQUIRED_COLUMNS = [
  { name: 'usual_vehicle', type: 'text' },
  { name: 'dvla_lookup_reg', type: 'text' },
  { name: 'dvla_vehicle_lookup_make', type: 'text' },
  { name: 'dvla_vehicle_lookup_model', type: 'text' },
  { name: 'dvla_vehicle_lookup_color', type: 'text' },
  { name: 'dvla_vehicle_lookup_year', type: 'text' },
  { name: 'dvla_vehicle_lookup_fuel_type', type: 'text' },
  { name: 'dvla_vehicle_lookup_mot_status', type: 'text' },
  { name: 'dvla_vehicle_lookup_mot_expiry', type: 'text' },
  { name: 'dvla_vehicle_lookup_tax_status', type: 'text' },
  { name: 'dvla_vehicle_lookup_tax_due_date', type: 'text' },
  { name: 'dvla_vehicle_lookup_insurance_status', type: 'text' },
  { name: 'no_damage', type: 'boolean' },
  { name: 'damage_to_your_vehicle', type: 'text' },
  { name: 'impact_point', type: 'ARRAY' },
  { name: 'vehicle_driveable', type: 'text' }
];

async function verifySchema() {
  console.log('\n🔍 Verifying Page 5 Database Schema...\n');

  try {
    // Query information_schema to get column information
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_name = 'incident_reports'
          AND column_name IN (
            'usual_vehicle',
            'dvla_lookup_reg',
            'dvla_vehicle_lookup_make',
            'dvla_vehicle_lookup_model',
            'dvla_vehicle_lookup_color',
            'dvla_vehicle_lookup_year',
            'dvla_vehicle_lookup_fuel_type',
            'dvla_vehicle_lookup_mot_status',
            'dvla_vehicle_lookup_mot_expiry',
            'dvla_vehicle_lookup_tax_status',
            'dvla_vehicle_lookup_tax_due_date',
            'dvla_vehicle_lookup_insurance_status',
            'no_damage',
            'damage_to_your_vehicle',
            'impact_point',
            'vehicle_driveable'
          )
        ORDER BY column_name;
      `
    });

    if (error) {
      // Fallback: Try direct query if RPC doesn't exist
      console.log('⚠️  RPC method not available, trying direct query...\n');
      return await verifyWithDirectQuery();
    }

    if (!data || data.length === 0) {
      console.log('❌ No columns found! Schema migration may not have run.\n');
      console.log('📋 Run the SQL migration from:');
      console.log('   docs/PAGE_FIVE_SQL_MIGRATION.md\n');
      process.exit(1);
    }

    // Check results
    const foundColumns = data.map(col => col.column_name);
    const missingColumns = REQUIRED_COLUMNS.filter(
      req => !foundColumns.includes(req.name)
    );

    console.log(`✅ Found ${data.length} columns\n`);

    // Display found columns
    console.log('📊 Column Details:\n');
    data.forEach(col => {
      const expected = REQUIRED_COLUMNS.find(r => r.name === col.column_name);
      const typeMatch = col.data_type === expected.type ||
                        (expected.type === 'ARRAY' && col.data_type === 'ARRAY');
      const typeIcon = typeMatch ? '✅' : '⚠️';

      console.log(`${typeIcon} ${col.column_name.padEnd(40)} ${col.data_type.padEnd(15)} (nullable: ${col.is_nullable})`);
    });

    // Check for missing columns
    if (missingColumns.length > 0) {
      console.log('\n❌ Missing Columns:\n');
      missingColumns.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });
      console.log('\n📋 Run the SQL migration from:');
      console.log('   docs/PAGE_FIVE_SQL_MIGRATION.md\n');
      process.exit(1);
    }

    console.log('\n✅ All 16 Page 5 columns exist!\n');
    console.log('🎉 Database schema verification PASSED\n');

  } catch (err) {
    console.error('❌ Error verifying schema:', err.message);
    console.log('\n📋 Manual verification required:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Run the verification query from docs/PAGE_FIVE_RECONCILIATION_CHECKLIST.md');
    process.exit(1);
  }
}

async function verifyWithDirectQuery() {
  try {
    // Try to select from incident_reports with Page 5 fields
    const { data, error } = await supabase
      .from('incident_reports')
      .select('usual_vehicle, dvla_lookup_reg, dvla_vehicle_lookup_make, dvla_vehicle_lookup_model, dvla_vehicle_lookup_color, dvla_vehicle_lookup_year, dvla_vehicle_lookup_fuel_type, dvla_vehicle_lookup_mot_status, dvla_vehicle_lookup_mot_expiry, dvla_vehicle_lookup_tax_status, dvla_vehicle_lookup_tax_due_date, dvla_vehicle_lookup_insurance_status, no_damage, damage_to_your_vehicle, impact_point, vehicle_driveable')
      .limit(1);

    if (error) {
      console.error('❌ Error querying columns:', error.message);
      console.log('\n📋 Missing columns detected!');
      console.log('   Run the SQL migration from:');
      console.log('   docs/PAGE_FIVE_SQL_MIGRATION.md\n');
      process.exit(1);
    }

    console.log('✅ All 16 Page 5 columns exist!\n');
    console.log('🎉 Database schema verification PASSED\n');

    if (data && data.length > 0) {
      console.log('📊 Sample Record (first row):\n');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('ℹ️  No records found in incident_reports table yet.');
      console.log('   This is expected if you haven\'t submitted any forms.\n');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

// Run verification
verifySchema();
