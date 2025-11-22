/**
 * Find Vehicle-Related Columns in incident_reports Table
 *
 * Searches for all columns that might be related to Page 5 (Your Vehicle Details)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function searchVehicleColumns() {
  console.log('🔍 Searching for vehicle-related columns in incident_reports...\n');

  // Query the table to get all columns
  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No data in table, cannot determine columns');
    return;
  }

  // Get all column names
  const allColumns = Object.keys(data[0]);

  // Search for vehicle-related patterns
  const vehiclePatterns = [
    'vehicle', 'car', 'usual', 'license', 'registration', 'plate',
    'make', 'model', 'color', 'colour', 'year', 'fuel',
    'damage', 'impact', 'driveable', 'recovery',
    'mot', 'tax', 'dvla', 'your_'
  ];

  const matchedColumns = allColumns.filter(col => {
    const lowerCol = col.toLowerCase();
    return vehiclePatterns.some(pattern => lowerCol.includes(pattern));
  });

  console.log(`✅ Found ${matchedColumns.length} vehicle-related columns:\n`);

  if (matchedColumns.length > 0) {
    matchedColumns.sort().forEach(col => {
      console.log(`   - ${col}`);
    });
  } else {
    console.log('⚠️  No vehicle-related columns found in incident_reports table');
    console.log('\n💡 These columns may need to be created via migration');
  }

  console.log(`\n📊 Total columns in table: ${allColumns.length}`);
}

searchVehicleColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
