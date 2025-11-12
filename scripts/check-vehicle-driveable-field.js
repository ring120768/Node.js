/**
 * Check if vehicle_driveable field exists in incident_reports table
 * Usage: node scripts/check-vehicle-driveable-field.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkField() {
  console.log('🔍 Checking vehicle_driveable field in incident_reports table...\n');

  try {
    // Query information_schema to check if column exists
    const { data, error } = await supabase.rpc('check_column_exists', {
      p_table_name: 'incident_reports',
      p_column_name: 'vehicle_driveable'
    }).catch(async () => {
      // Fallback: Try to query the table directly
      console.log('⚠️  RPC function not available, using direct query...\n');

      const { data: testData, error: testError } = await supabase
        .from('incident_reports')
        .select('vehicle_driveable')
        .limit(1);

      if (testError) {
        if (testError.message.includes('column') && testError.message.includes('does not exist')) {
          return { data: null, error: null, exists: false };
        }
        throw testError;
      }

      return { data: testData, error: null, exists: true };
    });

    if (error && !error.exists) {
      if (error.message?.includes('does not exist')) {
        console.log('❌ vehicle_driveable field DOES NOT EXIST in incident_reports table');
        console.log('\n📋 To add it, run:');
        console.log('   psql $DATABASE_URL -f migrations/add_vehicle_driveable_if_missing.sql');
        console.log('\n   OR via Supabase Dashboard:');
        console.log('   SQL Editor → Run the migration file contents');
        process.exit(1);
      }
      throw error;
    }

    console.log('✅ vehicle_driveable field EXISTS in incident_reports table');
    console.log('\n📊 Field Details:');
    console.log('   Column Name: vehicle_driveable');
    console.log('   Data Type: TEXT');
    console.log('   Nullable: Yes');
    console.log('   Default: NULL');
    console.log('   Values: "yes", "no", "unsure"');

    // Try to query some sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('incident_reports')
      .select('id, vehicle_driveable')
      .not('vehicle_driveable', 'is', null)
      .limit(5);

    if (sampleError) {
      console.log('\n⚠️  Could not query sample data:', sampleError.message);
    } else if (sampleData && sampleData.length > 0) {
      console.log(`\n📈 Found ${sampleData.length} records with vehicle_driveable data:`);
      sampleData.forEach(record => {
        console.log(`   - ID ${record.id}: "${record.vehicle_driveable}"`);
      });
    } else {
      console.log('\n📭 No records found with vehicle_driveable data yet');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error checking field:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

checkField();
