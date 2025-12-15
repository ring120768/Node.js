#!/usr/bin/env node

/**
 * Diagnostic: Check Latest Incident Data
 *
 * Investigates why AI analysis preview doesn't show form data
 * (weather conditions, vehicle damage, witnesses, medical info)
 *
 * User reported: "preview doesn't reflect any of the form information"
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLatestIncident() {
  console.log('🔍 Checking latest incident data...\n');

  try {
    // Step 1: Get most recent incident
    console.log('📋 Step 1: Fetching most recent incident report...');
    const { data: incident, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (incidentError) {
      console.error('❌ Error fetching incident:', incidentError.message);
      process.exit(1);
    }

    if (!incident) {
      console.log('❌ No incidents found in database\n');
      process.exit(0);
    }

    console.log('✅ Found incident:', incident.id);
    console.log('   Created:', new Date(incident.created_at).toLocaleString('en-GB'));
    console.log('   User ID:', incident.create_user_id);
    console.log('');

    // Step 2: Check critical form fields
    console.log('📊 Step 2: Checking critical form fields...\n');

    const criticalFields = {
      'Weather Conditions': incident.weather_conditions,
      'Road Surface': incident.road_surface_conditions,
      'Vehicle Damage': incident.damage_to_your_vehicle,
      'Medical Symptoms': incident.medical_symptoms,
      'Police Attended': incident.police_attended,
      'Date/Time': incident.when_did_the_accident_happen,
      'Location': incident.where_exactly_did_this_happen,
      'Vehicle Make': incident.make_of_car,
      'Vehicle Model': incident.model_of_car
    };

    let populatedCount = 0;
    let emptyCount = 0;

    for (const [field, value] of Object.entries(criticalFields)) {
      const hasValue = value && (Array.isArray(value) ? value.length > 0 : value.toString().trim() !== '');
      if (hasValue) {
        console.log(`✅ ${field}: ${Array.isArray(value) ? value.join(', ') : value}`);
        populatedCount++;
      } else {
        console.log(`❌ ${field}: EMPTY`);
        emptyCount++;
      }
    }

    console.log('');
    console.log(`📈 Field Status: ${populatedCount} populated, ${emptyCount} empty`);
    console.log('');

    // Step 3: Check total field count (backend requires > 5 fields)
    console.log('🔢 Step 3: Checking total field count...\n');

    const allFields = Object.keys(incident);
    const nonNullFields = allFields.filter(key => {
      const value = incident[key];
      if (value === null || value === undefined) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    });

    console.log(`   Total fields in incident_reports: ${allFields.length}`);
    console.log(`   Non-null/non-empty fields: ${nonNullFields.length}`);
    console.log('');

    if (nonNullFields.length <= 5) {
      console.log('⚠️  WARNING: Only', nonNullFields.length, 'populated fields');
      console.log('   Backend requires > 5 fields to generate combinedReport');
      console.log('   THIS IS WHY WEATHER CONDITIONS ETC. ARE NOT IN PREVIEW!');
      console.log('');
    } else {
      console.log('✅ Sufficient fields to generate combinedReport');
      console.log('');
    }

    // Step 4: Check other vehicles
    console.log('🚗 Step 4: Checking other vehicles...\n');
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .eq('create_user_id', incident.create_user_id);

    if (vehiclesError) {
      console.warn('⚠️  Error fetching vehicles:', vehiclesError.message);
    } else if (vehicles && vehicles.length > 0) {
      console.log(`✅ Found ${vehicles.length} other vehicle(s)`);
      vehicles.forEach((v, idx) => {
        console.log(`   ${idx + 1}. ${v.vehicle_make || 'Unknown'} ${v.vehicle_model || ''}`);
      });
    } else {
      console.log('ℹ️  No other vehicles recorded');
    }
    console.log('');

    // Step 5: Check witnesses
    console.log('👥 Step 5: Checking witnesses...\n');
    const { data: witnesses, error: witnessesError } = await supabase
      .from('incident_witnesses')
      .select('*')
      .eq('create_user_id', incident.create_user_id);

    if (witnessesError) {
      console.warn('⚠️  Error fetching witnesses:', witnessesError.message);
    } else if (witnesses && witnesses.length > 0) {
      console.log(`✅ Found ${witnesses.length} witness(es)`);
      witnesses.forEach((w, idx) => {
        console.log(`   ${idx + 1}. ${w.witness_name || 'Unnamed'}`);
      });
    } else {
      console.log('ℹ️  No witnesses recorded');
    }
    console.log('');

    // Step 6: Check AI analysis existence
    console.log('🤖 Step 6: Checking AI analysis records...\n');
    const { data: analysis, error: analysisError } = await supabase
      .from('completed_incident_forms')
      .select('*')
      .eq('incident_id', incident.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (analysisError && analysisError.code !== 'PGRST116') { // PGRST116 = no rows
      console.warn('⚠️  Error fetching analysis:', analysisError.message);
    } else if (analysis) {
      console.log('✅ AI analysis found:', analysis.id);
      console.log('   Created:', new Date(analysis.created_at).toLocaleString('en-GB'));
      console.log('   Has Summary:', !!analysis.summary);
      console.log('   Has Closing Statement:', !!analysis.closing_statement);
      console.log('   Closing Statement Length:', analysis.closing_statement?.length || 0, 'chars');
      console.log('');

      if (!analysis.closing_statement || analysis.closing_statement.length < 100) {
        console.log('⚠️  WARNING: Closing statement is missing or too short');
        console.log('   This is the "combinedReport" that should contain ALL form data!');
        console.log('');
      }
    } else {
      console.log('ℹ️  No AI analysis found yet');
      console.log('');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 DIAGNOSTIC SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Incident ID: ${incident.id}`);
    console.log(`Created: ${new Date(incident.created_at).toLocaleString('en-GB')}`);
    console.log(`Populated Fields: ${nonNullFields.length} of ${allFields.length}`);
    console.log(`Critical Fields Status: ${populatedCount}/${Object.keys(criticalFields).length} populated`);
    console.log(`Other Vehicles: ${vehicles?.length || 0}`);
    console.log(`Witnesses: ${witnesses?.length || 0}`);
    console.log('');

    if (nonNullFields.length <= 5) {
      console.log('🔴 ROOT CAUSE IDENTIFIED:');
      console.log('   Only', nonNullFields.length, 'fields populated in incident_reports');
      console.log('   Backend requires > 5 fields to generate combinedReport');
      console.log('   Without combinedReport, weather/damage/medical data is NOT in preview');
      console.log('');
      console.log('💡 SOLUTION:');
      console.log('   Form data was NOT saved before AI analysis was generated');
      console.log('   User needs to resubmit form OR regenerate AI analysis');
    } else {
      console.log('✅ Sufficient data exists in database');
      console.log('   Issue may be in AI analysis generation or frontend display');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

checkLatestIncident()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
