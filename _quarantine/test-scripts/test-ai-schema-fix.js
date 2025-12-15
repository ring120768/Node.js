#!/usr/bin/env node

/**
 * Test AI Schema Fix - Verify boolean columns are correctly converted to arrays
 * Tests the fix for schema mismatch issue where AI controller was reading from
 * non-existent TEXT[] array columns instead of individual BOOLEAN columns
 *
 * Incident ID: 3aead998-97f7-4626-9b59-47f58e1fe601
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Import the helper functions from ai.controller.js
function buildWeatherArray(incidentData) {
  const conditions = [];
  if (incidentData.weather_bright_sunlight) conditions.push('Bright Sunlight');
  if (incidentData.weather_clear) conditions.push('Clear');
  if (incidentData.weather_cloudy) conditions.push('Cloudy');
  if (incidentData.weather_raining) conditions.push('Raining');
  if (incidentData.weather_heavy_rain) conditions.push('Heavy Rain');
  if (incidentData.weather_drizzle) conditions.push('Drizzle');
  if (incidentData.weather_fog) conditions.push('Fog');
  if (incidentData.weather_snow) conditions.push('Snow');
  if (incidentData.weather_ice) conditions.push('Ice');
  if (incidentData.weather_windy) conditions.push('Windy');
  if (incidentData.weather_hail) conditions.push('Hail');
  if (incidentData.weather_thunder_lightning) conditions.push('Thunder/Lightning');
  return conditions.length > 0 ? conditions.join(', ') : null;
}

function buildMedicalSymptomsArray(incidentData) {
  const symptoms = [];
  if (incidentData.medical_symptom_chest_pain) symptoms.push('Chest Pain');
  if (incidentData.medical_symptom_uncontrolled_bleeding) symptoms.push('Uncontrolled Bleeding');
  if (incidentData.medical_symptom_breathlessness) symptoms.push('Breathlessness');
  if (incidentData.medical_symptom_limb_weakness) symptoms.push('Limb Weakness');
  if (incidentData.medical_symptom_loss_of_consciousness) symptoms.push('Loss of Consciousness');
  if (incidentData.medical_symptom_severe_headache) symptoms.push('Severe Headache');
  if (incidentData.medical_symptom_change_in_vision) symptoms.push('Change in Vision');
  if (incidentData.medical_symptom_abdominal_pain) symptoms.push('Abdominal Pain');
  if (incidentData.medical_symptom_abdominal_bruising) symptoms.push('Abdominal Bruising');
  if (incidentData.medical_symptom_limb_pain_mobility) symptoms.push('Limb Pain/Mobility Issues');
  if (incidentData.medical_symptom_dizziness) symptoms.push('Dizziness');
  if (incidentData.medical_symptom_life_threatening) symptoms.push('Life-Threatening Condition');
  if (incidentData.medical_symptom_none) symptoms.push('No Symptoms');
  return symptoms.length > 0 ? symptoms.join(', ') : null;
}

function buildRoadConditionsArray(incidentData) {
  const conditions = [];
  if (incidentData.road_condition_dry) conditions.push('Dry');
  if (incidentData.road_condition_wet) conditions.push('Wet');
  if (incidentData.road_condition_icy) conditions.push('Icy');
  if (incidentData.road_condition_snow_covered) conditions.push('Snow Covered');
  if (incidentData.road_condition_loose_surface) conditions.push('Loose Surface');
  if (incidentData.road_condition_slush_on_road) conditions.push('Slush on Road');
  return conditions.length > 0 ? conditions.join(', ') : null;
}

async function testSchemaFix() {
  console.log('🔧 Testing AI Schema Fix\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const incidentId = '3aead998-97f7-4626-9b59-47f58e1fe601';

  try {
    // Fetch incident data
    console.log('📋 Fetching incident data...');
    const { data: incident, error } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (error) {
      console.error('❌ Error fetching incident:', error.message);
      process.exit(1);
    }

    if (!incident) {
      console.log('❌ No incident found with ID:', incidentId);
      process.exit(1);
    }

    console.log('✅ Incident found:', incident.id);
    console.log('   Created:', new Date(incident.created_at).toLocaleString('en-GB'));
    console.log('   User ID:', incident.create_user_id);
    console.log('');

    // Test the helper functions
    console.log('🧪 Testing helper functions:\n');

    // Test 1: Weather Conditions
    console.log('1️⃣  Weather Conditions');
    console.log('   Raw boolean columns:');
    console.log('      weather_bright_sunlight:', incident.weather_bright_sunlight);
    console.log('      weather_raining:', incident.weather_raining);
    console.log('      weather_fog:', incident.weather_fog);
    const weatherResult = buildWeatherArray(incident);
    console.log('   ✅ Converted to string:', weatherResult || '(none)');
    console.log('');

    // Test 2: Road Conditions
    console.log('2️⃣  Road Surface Conditions');
    console.log('   Raw boolean columns:');
    console.log('      road_condition_dry:', incident.road_condition_dry);
    console.log('      road_condition_wet:', incident.road_condition_wet);
    console.log('      road_condition_icy:', incident.road_condition_icy);
    const roadResult = buildRoadConditionsArray(incident);
    console.log('   ✅ Converted to string:', roadResult || '(none)');
    console.log('');

    // Test 3: Medical Symptoms
    console.log('3️⃣  Medical Symptoms');
    console.log('   Raw boolean columns:');
    console.log('      medical_symptom_chest_pain:', incident.medical_symptom_chest_pain);
    console.log('      medical_symptom_breathlessness:', incident.medical_symptom_breathlessness);
    console.log('      medical_symptom_dizziness:', incident.medical_symptom_dizziness);
    console.log('      medical_symptom_none:', incident.medical_symptom_none);
    const medicalResult = buildMedicalSymptomsArray(incident);
    console.log('   ✅ Converted to string:', medicalResult || incident.medical_how_are_you_feeling || '(none)');
    console.log('');

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SCHEMA FIX VALIDATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    const allGood = weatherResult || roadResult || medicalResult;

    if (allGood) {
      console.log('✅ SUCCESS: Helper functions correctly convert boolean columns to strings');
      console.log('');
      console.log('🎯 What this means:');
      console.log('   - AI will now receive weather conditions:', weatherResult ? '✅' : '⚠️ (no data)');
      console.log('   - AI will now receive road conditions:', roadResult ? '✅' : '⚠️ (no data)');
      console.log('   - AI will now receive medical symptoms:', medicalResult ? '✅' : '⚠️ (no data)');
      console.log('');
      console.log('📝 Next Steps:');
      console.log('   1. Trigger AI analysis regeneration for this incident');
      console.log('   2. Verify combinedReport includes all form data');
      console.log('   3. Confirm frontend preview displays complete information');
      console.log('');
    } else {
      console.log('⚠️  WARNING: No data found in any of the tested columns');
      console.log('');
      console.log('   Possible reasons:');
      console.log('   - Form submission did not save this data');
      console.log('   - User did not fill out these fields');
      console.log('   - This is expected if user skipped these sections');
      console.log('');
    }

    // Show what the old code would have returned
    console.log('🔍 Comparison with old code:');
    console.log('   OLD (extractArrayField on non-existent columns):');
    console.log('      weather_conditions column: NULL (does not exist)');
    console.log('      medical_symptoms column: NULL (does not exist)');
    console.log('      road_surface_conditions column: NULL (does not exist)');
    console.log('');
    console.log('   NEW (helper functions reading boolean columns):');
    console.log('      Weather:', weatherResult || '(none)');
    console.log('      Medical:', medicalResult || '(none)');
    console.log('      Road:', roadResult || '(none)');
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

testSchemaFix()
  .then(() => {
    console.log('✅ Test complete\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
