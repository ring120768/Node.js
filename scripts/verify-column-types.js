#!/usr/bin/env node

/**
 * Verify Page 5 Column Data Types
 *
 * Queries PostgreSQL information_schema to check actual data types
 * for Page 5 fields and identifies any mismatches.
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

// Expected column types
const EXPECTED_TYPES = {
  usual_vehicle: 'text',
  dvla_lookup_reg: 'text',
  dvla_vehicle_lookup_make: 'text',
  dvla_vehicle_lookup_model: 'text',
  dvla_vehicle_lookup_color: 'text',
  dvla_vehicle_lookup_year: 'text',
  dvla_vehicle_lookup_fuel_type: 'text',
  dvla_vehicle_lookup_mot_status: 'text',
  dvla_vehicle_lookup_mot_expiry: 'text',
  dvla_vehicle_lookup_tax_status: 'text',
  dvla_vehicle_lookup_tax_due_date: 'text',
  dvla_vehicle_lookup_insurance_status: 'text',
  no_damage: 'boolean',
  damage_to_your_vehicle: 'text',
  impact_point: 'ARRAY',
  vehicle_driveable: 'text'
};

async function verifyColumnTypes() {
  console.log('\n🔍 Verifying Page 5 Column Data Types...\n');

  try {
    // Query information_schema for column types
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          column_name,
          data_type,
          udt_name,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'incident_reports'
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
      console.log('⚠️  RPC method not available, using alternative approach...\n');
      return await verifyWithSampleData();
    }

    if (!data || data.length === 0) {
      console.log('❌ No column information retrieved!');
      console.log('   This may indicate missing columns or RPC access issues.\n');
      process.exit(1);
    }

    // Analyze results
    console.log('📊 Column Type Analysis:\n');
    console.log('Column Name'.padEnd(40) + 'Actual Type'.padEnd(20) + 'Expected'.padEnd(15) + 'Status');
    console.log('─'.repeat(90));

    const mismatches = [];

    data.forEach(col => {
      const expected = EXPECTED_TYPES[col.column_name];
      let actualType = col.data_type;

      // Handle PostgreSQL ARRAY type
      if (col.data_type === 'ARRAY' && col.udt_name === '_text') {
        actualType = 'TEXT[]';
      }

      const matches = (actualType.toLowerCase() === expected.toLowerCase()) ||
                      (expected === 'ARRAY' && col.data_type === 'ARRAY');

      const status = matches ? '✅ OK' : '⚠️  MISMATCH';

      console.log(
        col.column_name.padEnd(40) +
        actualType.padEnd(20) +
        expected.padEnd(15) +
        status
      );

      if (!matches) {
        mismatches.push({
          column: col.column_name,
          actual: actualType,
          expected: expected
        });
      }
    });

    console.log('\n' + '─'.repeat(90) + '\n');

    // Report findings
    if (mismatches.length === 0) {
      console.log('🎉 All column types match expected values!\n');
      console.log('✅ Database schema verification COMPLETE\n');
      return;
    }

    // Report mismatches
    console.log(`⚠️  Found ${mismatches.length} type mismatch(es):\n`);

    mismatches.forEach(mm => {
      console.log(`Column: ${mm.column}`);
      console.log(`  Actual:   ${mm.actual}`);
      console.log(`  Expected: ${mm.expected}\n`);
    });

    // Provide fix SQL
    console.log('📝 Fix SQL:\n');
    console.log('BEGIN;\n');

    mismatches.forEach(mm => {
      if (mm.column === 'usual_vehicle' && mm.actual.toLowerCase() === 'boolean') {
        console.log(`-- Fix usual_vehicle (BOOLEAN → TEXT)`);
        console.log(`ALTER TABLE incident_reports`);
        console.log(`ALTER COLUMN usual_vehicle TYPE TEXT`);
        console.log(`USING CASE`);
        console.log(`  WHEN usual_vehicle = true THEN 'yes'`);
        console.log(`  WHEN usual_vehicle = false THEN 'no'`);
        console.log(`  ELSE NULL`);
        console.log(`END;\n`);
      }

      if (mm.column === 'vehicle_driveable' && mm.actual.toLowerCase() === 'boolean') {
        console.log(`-- Fix vehicle_driveable (BOOLEAN → TEXT)`);
        console.log(`ALTER TABLE incident_reports`);
        console.log(`ALTER COLUMN vehicle_driveable TYPE TEXT`);
        console.log(`USING CASE`);
        console.log(`  WHEN vehicle_driveable = true THEN 'yes'`);
        console.log(`  WHEN vehicle_driveable = false THEN 'no'`);
        console.log(`  ELSE 'unsure'`);
        console.log(`END;\n`);
      }
    });

    console.log('COMMIT;\n');
    console.log('⚠️  Run this SQL in Supabase SQL Editor to fix type mismatches.\n');

  } catch (err) {
    console.error('❌ Error verifying column types:', err.message);
    console.log('\n📋 Fallback: Check manually in Supabase SQL Editor');
    process.exit(1);
  }
}

async function verifyWithSampleData() {
  console.log('📊 Checking actual data types from sample record...\n');

  try {
    const { data, error } = await supabase
      .from('incident_reports')
      .select('usual_vehicle, vehicle_driveable, impact_point, no_damage')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      console.log('ℹ️  No sample data available for type inference.');
      console.log('   Please run the SQL query manually in Supabase SQL Editor:\n');
      console.log(`
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'incident_reports'
  AND column_name IN ('usual_vehicle', 'vehicle_driveable', 'impact_point')
ORDER BY column_name;
      `);
      return;
    }

    console.log('Sample data retrieved:\n');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');

    // Infer types from sample data
    const issues = [];

    if (typeof data.usual_vehicle === 'boolean') {
      issues.push('usual_vehicle appears to be BOOLEAN (should be TEXT)');
    }

    if (typeof data.vehicle_driveable === 'boolean') {
      issues.push('vehicle_driveable appears to be BOOLEAN (should be TEXT)');
    }

    if (!Array.isArray(data.impact_point) && data.impact_point !== null) {
      issues.push('impact_point does not appear to be an ARRAY');
    }

    if (issues.length > 0) {
      console.log('⚠️  Potential Type Issues Detected:\n');
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('\n📝 See docs/PAGE_FIVE_VERIFICATION_RESULTS.md for fix SQL\n');
    } else {
      console.log('✅ Sample data types appear correct!\n');
    }

  } catch (err) {
    console.error('❌ Error checking sample data:', err.message);
    process.exit(1);
  }
}

// Run verification
verifyColumnTypes();
