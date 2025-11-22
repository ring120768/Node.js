/**
 * Check for Duplicate Columns (Old + New Names Both Exist)
 * Identifies columns where both old and new names exist
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDuplicates() {
  console.log('🔍 Checking for Duplicate Columns in incident_reports...\n');

  // Query table to get all column names
  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error querying schema:', error.message);
    process.exit(1);
  }

  const existingColumns = data && data.length > 0
    ? Object.keys(data[0])
    : [];

  // Check for old/new pairs that both exist
  const duplicatePairs = [
    ['other_insurance_company', 'other_drivers_insurance_company'],
    ['other_policy_number', 'other_drivers_policy_number'],
    ['other_policy_holder', 'other_drivers_policy_holder_name'],
    ['other_policy_cover', 'other_drivers_policy_cover_type'],
    ['other_point_of_impact', 'describe_damage_to_vehicle']
  ];

  console.log('📊 Duplicate Column Analysis:\n');

  let foundDuplicates = false;

  for (const [oldName, newName] of duplicatePairs) {
    const oldExists = existingColumns.includes(oldName);
    const newExists = existingColumns.includes(newName);

    if (oldExists && newExists) {
      console.log(`  ⚠️  DUPLICATE: Both "${oldName}" and "${newName}" exist`);
      foundDuplicates = true;
    } else if (oldExists) {
      console.log(`  🔄 Old only: "${oldName}" exists (new "${newName}" missing)`);
    } else if (newExists) {
      console.log(`  ✅ New only: "${newName}" exists (old "${oldName}" removed)`);
    } else {
      console.log(`  ❌ Neither: "${oldName}" nor "${newName}" exist`);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (foundDuplicates) {
    console.log('⚠️  DUPLICATES FOUND!');
    console.log('\nAction needed:');
    console.log('1. Migrate data from old columns to new columns (if needed)');
    console.log('2. Drop old columns');
    console.log('\nOr if old columns are empty, just drop them.');
  } else {
    console.log('✅ No duplicate columns found.');
  }

  console.log('='.repeat(60));
}

checkDuplicates()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
