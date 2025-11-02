const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function quickCheck() {
  console.log('🔍 Quick Database Check\n');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables');
    return;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Checking for new columns...\n');

  // Test a few new columns from each table
  const tests = [
    { table: 'incident_reports', column: 'ambulance_called' },
    { table: 'incident_reports', column: 'dvla_lookup_reg' },
    { table: 'incident_reports', column: 'traffic_heavy' },
    { table: 'incident_other_vehicles', column: 'dvla_mot_status' },
    { table: 'incident_witnesses', column: 'witness_2_name' }
  ];

  let foundCount = 0;
  let missingCount = 0;

  for (const test of tests) {
    try {
      const { error } = await supabase
        .from(test.table)
        .select(test.column)
        .limit(1);

      if (error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log(`❌ ${test.table}.${test.column} - MISSING`);
          missingCount++;
        } else if (error.code === 'PGRST116') {
          // Table empty but column exists
          console.log(`✅ ${test.table}.${test.column} - EXISTS`);
          foundCount++;
        } else {
          console.log(`⚠️  ${test.table}.${test.column} - ${error.message}`);
        }
      } else {
        console.log(`✅ ${test.table}.${test.column} - EXISTS`);
        foundCount++;
      }
    } catch (err) {
      console.log(`⚠️  ${test.table}.${test.column} - ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n📊 Results: ${foundCount} found, ${missingCount} missing`);

  if (missingCount === 0) {
    console.log('\n✅ Migration appears to be complete!');
    console.log('   Run: node scripts/verify-migration.js');
    console.log('   for full verification of all 51 columns.');
  } else {
    console.log('\n❌ Migration not yet run.');
    console.log('   Run the SQL in Supabase Dashboard first.');
  }
}

quickCheck().catch(console.error);
