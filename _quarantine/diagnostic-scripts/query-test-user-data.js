#!/usr/bin/env node

/**
 * Query Test User Data - Debug PDF field issues
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Service role to bypass RLS
);

const userId = '1048b3ac-11ec-4e98-968d-9de28183a84d';

async function queryUserData() {
  console.log('🔍 Querying user data for:', userId);
  console.log('='.repeat(80));

  // Query user_signup for safety check fields
  const { data: userSignup, error: userError } = await supabase
    .from('user_signup')
    .select('are_you_safe, safety_status, six_point_safety_check_completed')
    .eq('create_user_id', userId)
    .single();

  console.log('\n📋 User Signup Data (safety fields):');
  console.log('  are_you_safe:', userSignup?.are_you_safe);
  console.log('  safety_status:', userSignup?.safety_status);
  console.log('  six_point_safety_check_completed:', userSignup?.six_point_safety_check_completed);

  // Query incident_reports for all problem fields
  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .select(`
      are_you_safe_and_ready_to_complete_this_form,
      six_point_safety_check_completed,
      medical_symptom_change_in_vision,
      usual_vehicle,
      driving_usual_vehicle,
      damage_to_your_vehicle,
      describe_damage_to_your_vehicle,
      describle_the_damage,
      describe_the_damage_to_the_other_vehicle,
      witness_present,
      witnesses_present,
      police_attended,
      police_attend
    `)
    .eq('create_user_id', userId)
    .single();

  console.log('\n📋 Incident Report Data (problem fields):');
  console.log('  are_you_safe_and_ready_to_complete_this_form:', incident?.are_you_safe_and_ready_to_complete_this_form);
  console.log('  six_point_safety_check_completed:', incident?.six_point_safety_check_completed);
  console.log('  medical_symptom_change_in_vision:', incident?.medical_symptom_change_in_vision);
  console.log('  usual_vehicle:', incident?.usual_vehicle);
  console.log('  driving_usual_vehicle:', incident?.driving_usual_vehicle);
  console.log('  damage_to_your_vehicle:', incident?.damage_to_your_vehicle);
  console.log('  describe_damage_to_your_vehicle:', incident?.describe_damage_to_your_vehicle);
  console.log('  describle_the_damage:', incident?.describle_the_damage);
  console.log('  describe_the_damage_to_the_other_vehicle:', incident?.describe_the_damage_to_the_other_vehicle);
  console.log('  witness_present:', incident?.witness_present);
  console.log('  witnesses_present:', incident?.witnesses_present);
  console.log('  police_attended:', incident?.police_attended);
  console.log('  police_attend:', incident?.police_attend);

  console.log('\n' + '='.repeat(80));
}

queryUserData().catch(console.error);
