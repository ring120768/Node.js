/**
 * Check actual database schema for incident_reports table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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

async function checkSchema() {
  console.log('🔍 Checking database table schemas...\n');

  try {
    // Check incident_reports table
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 incident_reports table');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (incidentError) throw new Error(`Query failed: ${incidentError.message}`);

    if (!incidentData || incidentData.length === 0) {
      console.log('⚠️  No incident reports found');
    } else {
      const columns = Object.keys(incidentData[0]).sort();
      console.log(`✅ Found ${columns.length} columns\n`);

      const targetColumns = [
        'accident_date',
        'accident_time',
        'location',
        'form_data_summary',
        'form_data_summary_metadata'
      ];

      console.log('Key columns:');
      targetColumns.forEach(col => {
        const exists = columns.includes(col);
        console.log(`  ${exists ? '✅' : '❌'} ${col}`);
      });
    }

    // Check incident_other_vehicles table
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 incident_other_vehicles table');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: vehicleData, error: vehicleError } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .limit(1);

    if (vehicleError) throw new Error(`Vehicle query failed: ${vehicleError.message}`);

    if (!vehicleData || vehicleData.length === 0) {
      console.log('⚠️  No other vehicle records found');
    } else {
      const vehicleColumns = Object.keys(vehicleData[0]).sort();
      console.log(`✅ Found ${vehicleColumns.length} columns\n`);

      const vehicleTargetCols = ['vehicle_index', 'id', 'create_user_id', 'created_at'];
      console.log('Key columns:');
      vehicleTargetCols.forEach(col => {
        const exists = vehicleColumns.includes(col);
        console.log(`  ${exists ? '✅' : '❌'} ${col}`);
      });

      console.log('\nAll vehicle table columns:');
      vehicleColumns.forEach(col => console.log(`  - ${col}`));
    }

    // Check incident_witnesses table
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 incident_witnesses table');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: witnessData, error: witnessError } = await supabase
      .from('incident_witnesses')
      .select('*')
      .limit(1);

    if (witnessError) throw new Error(`Witness query failed: ${witnessError.message}`);

    if (!witnessData || witnessData.length === 0) {
      console.log('⚠️  No witness records found');
    } else {
      const witnessColumns = Object.keys(witnessData[0]).sort();
      console.log(`✅ Found ${witnessColumns.length} columns\n`);

      const witnessTargetCols = ['witness_index', 'id', 'create_user_id', 'created_at'];
      console.log('Key columns:');
      witnessTargetCols.forEach(col => {
        const exists = witnessColumns.includes(col);
        console.log(`  ${exists ? '✅' : '❌'} ${col}`);
      });

      console.log('\nAll witness table columns:');
      witnessColumns.forEach(col => console.log(`  - ${col}`));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
