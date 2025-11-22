/**
 * Analyze Page 7 (Other Vehicle) Database Schema
 * Checks which columns exist and need to be renamed/added
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeSchema() {
  console.log('🔍 Analyzing Page 7 Database Schema...\n');

  // Query table to get column names
  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error querying schema:', error.message);
    process.exit(1);
  }

  const columns = data && data.length > 0
    ? Object.keys(data[0]).map(col => ({ column_name: col }))
    : [];

  // Expected field mappings from Page 7
  const fieldMappings = {
    // OLD → NEW mappings
    'other_driver_name': 'other_full_name',
    'other_driver_phone': 'other_contact_number',
    'other_driver_email': 'other_email_address',
    'other_driver_license': 'other_driving_license_number',
    'other_vehicle_registration': 'other_vehicle_registration', // Already correct
    'other_insurance_company': 'other_drivers_insurance_company',
    'other_policy_number': 'other_drivers_policy_number',
    'other_policy_holder': 'other_drivers_policy_holder_name',
    'other_policy_cover': 'other_drivers_policy_cover_type',
    'other_point_of_impact': 'describe_damage_to_vehicle',

    // NEW DVLA fields (need to be added)
    'other_vehicle_look_up_make': null,
    'other_vehicle_look_up_model': null,
    'other_vehicle_look_up_colour': null,
    'other_vehicle_look_up_year': null,
    'other_vehicle_look_up_fuel_type': null,
    'other_vehicle_look_up_mot_status': null,
    'other_vehicle_look_up_mot_expiry_date': null,
    'other_vehicle_look_up_tax_status': null,
    'other_vehicle_look_up_tax_due_date': null,
    'other_vehicle_look_up_insurance_status': null
  };

  const existingColumns = columns.map(c => c.column_name);

  console.log('📊 Current Schema Analysis:\n');

  let needsRename = [];
  let needsAdd = [];
  let alreadyCorrect = [];

  for (const [oldName, newName] of Object.entries(fieldMappings)) {
    if (!newName) {
      // New field to be added
      if (!existingColumns.includes(oldName)) {
        needsAdd.push(oldName);
        console.log(`  ➕ ${oldName} - needs to be ADDED`);
      } else {
        console.log(`  ✅ ${oldName} - already exists`);
      }
    } else if (oldName === newName) {
      // Field name is already correct
      if (existingColumns.includes(oldName)) {
        alreadyCorrect.push(oldName);
        console.log(`  ✅ ${oldName} - correct name, already exists`);
      } else {
        needsAdd.push(oldName);
        console.log(`  ➕ ${oldName} - needs to be ADDED`);
      }
    } else {
      // Field needs to be renamed
      if (existingColumns.includes(oldName)) {
        needsRename.push({ old: oldName, new: newName });
        console.log(`  🔄 ${oldName} → ${newName} - needs RENAME`);
      } else if (existingColumns.includes(newName)) {
        alreadyCorrect.push(newName);
        console.log(`  ✅ ${newName} - already renamed`);
      } else {
        console.log(`  ⚠️  ${oldName} / ${newName} - NEITHER EXISTS`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Already correct: ${alreadyCorrect.length}`);
  console.log(`🔄 Need to rename: ${needsRename.length}`);
  console.log(`➕ Need to add: ${needsAdd.length}`);

  return { needsRename, needsAdd, alreadyCorrect };
}

analyzeSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
