#!/usr/bin/env node

/**
 * Query Actual User Data - Using CORRECT column names
 *
 * Previous query failed because it used non-existent column names.
 * This query uses only columns that actually exist in the database.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '1048b3ac-11ec-4e98-968d-9de28183a84d';

async function queryActualData() {
  console.log('🔍 Querying ACTUAL data for user:', userId);
  console.log('='.repeat(80));

  // Query incident_reports using columns that ACTUALLY EXIST
  const { data: incident, error } = await supabase
    .from('incident_reports')
    .select(`
      six_point_safety_check_completed,
      medical_symptom_change_in_vision,
      usual_vehicle,
      damage_to_your_vehicle,
      describle_the_damage,
      witnesses_present,
      police_attended
    `)
    .eq('create_user_id', userId)
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log('\n📋 Incident Report Data (columns that exist):');
  console.log('  six_point_safety_check_completed:', incident.six_point_safety_check_completed);
  console.log('  medical_symptom_change_in_vision:', incident.medical_symptom_change_in_vision);
  console.log('  usual_vehicle:', incident.usual_vehicle);
  console.log('  damage_to_your_vehicle:', incident.damage_to_your_vehicle);
  console.log('  describle_the_damage:', incident.describle_the_damage);
  console.log('  witnesses_present:', incident.witnesses_present);
  console.log('  police_attended:', incident.police_attended);

  console.log('\n' + '='.repeat(80));
  console.log('\n💡 Analysis:\n');

  // Analyze each field
  if (incident.six_point_safety_check_completed === null) {
    console.log('⚠️  six_point_safety_check_completed is NULL');
    console.log('   → PDF will have both checkboxes unchecked or in default state\n');
  }

  if (incident.medical_symptom_change_in_vision === null) {
    console.log('⚠️  medical_symptom_change_in_vision is NULL');
    console.log('   → User reported this as missing in PDF\n');
  }

  if (incident.usual_vehicle === null) {
    console.log('⚠️  usual_vehicle is NULL');
    console.log('   → User reported PDF shows "no" when should be "yes"\n');
  }

  if (incident.damage_to_your_vehicle === null) {
    console.log('⚠️  damage_to_your_vehicle is NULL');
    console.log('   → User said database has "large dent in driver door"\n');
  }

  if (incident.describle_the_damage === null) {
    console.log('⚠️  describle_the_damage is NULL (note: typo in DB)');
    console.log('   → This might be the field user meant for vehicle damage\n');
  }

  if (incident.witnesses_present === null) {
    console.log('⚠️  witnesses_present is NULL');
    console.log('   → User reported both yes/no checked in PDF\n');
  }

  if (incident.police_attended === null) {
    console.log('⚠️  police_attended is NULL');
    console.log('   → User reported both yes/no checked in PDF\n');
  }

  console.log('='.repeat(80));
}

queryActualData().catch(console.error);
