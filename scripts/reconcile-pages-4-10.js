/**
 * PDF Pages 4-10 vs incident_reports Table Reconciliation
 * ONLY checks fields that come from incident_reports table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = 'e6708c56-f9bb-46f1-94d5-d5bea8db1d71';

// PDF Data from Pages 4-10 (ALL from incident_reports table)
const pdfData = {
  // Page 4 - Medical Assessment
  medical: {
    medical_attention_needed: true,
    medical_injury_details: 'whiplash and some chest pain',
    medical_ambulance_called: true,
    six_point_safety_check_completed: true,
    medical_symptom_chest_pain: true,
    medical_symptom_breathlessness: true,
    medical_symptom_severe_headache: true
  },

  // Page 5 - Accident Details
  accident: {
    accident_date: '2025-12-15',
    accident_time: '18:55:00',
    weather_raining: true,
    weather_windy: true,
    road_condition_wet: true,
    road_type_a_road: true,
    traffic_conditions_moderate: true,
    speed_limit: '50',
    your_speed: '10',
    visibility_very_poor: true,
    road_markings_visible_partially: true
  },

  // Page 6 - Location
  location: {
    what3words: '///bypassed.thin.explores',
    location: 'Priory Drive\nForest Hall Park, Uttlesford\nEssex, CM24 8NR\nGB\n\nCoordinates: 51.898267, 0.199741\nwhat3words: ///bypassed.thin.explores',
    nearest_landmark: 'Bp petrol station',
    junction_type: 'multi_lane_roundabout',
    junction_control: 'traffic_lights',
    traffic_light_status: 'green',
    user_manoeuvre: 'already_in_junction',
    visibility_clear: true,
    special_condition_potholes: true
  },

  // Page 7 - Vehicle Damage
  vehicle_damage: {
    impact_point_front_driver: true,
    impact_point_driver_side: true,
    damage_to_your_vehicle: 'Front bumper and light cluster ',
    vehicle_driveable: 'no'
  },

  // Page 8 - Other Vehicle Details (stored in other table, skip for now)

  // Page 9 - Witness Information (stored in witness table, skip for now)

  // Page 10 - Police Involvement
  police: {
    police_attended: true,
    accident_ref_number: 'Inc/2025/1234',
    police_force: 'Essex police',
    officer_name: 'James Butler',
    officer_badge: '121212121212',
    user_breath_test: 'negative_0mg',
    other_breath_test: 'refused'
  }
};

async function reconcile() {
  console.log('🔍 PDF Pages 4-10 vs incident_reports Table Reconciliation\n');
  console.log(`User ID: ${userId}\n`);

  let totalFields = 0;
  let matchedFields = 0;
  let mismatchedFields = 0;
  let missingFields = 0;

  const issues = [];

  // Fetch incident_reports data
  console.log('📊 Fetching incident_reports record...\n');

  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (incidentError) {
    console.error('❌ Error fetching incident_reports:', incidentError.message);
    process.exit(1);
  }

  console.log('✅ incident_reports record fetched\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Helper function to compare fields
  function compareField(category, fieldName, pdfValue, dbValue) {
    totalFields++;

    // Normalize values for comparison
    // Handle booleans (PDF true/false vs DB true/false)
    let normalizePdf, normalizeDb;

    if (typeof pdfValue === 'boolean' && typeof dbValue === 'boolean') {
      normalizePdf = pdfValue;
      normalizeDb = dbValue;
    } else {
      normalizePdf = String(pdfValue || '').trim().toLowerCase();
      normalizeDb = String(dbValue || '').trim().toLowerCase();
    }

    if (normalizePdf === normalizeDb) {
      matchedFields++;
      console.log(`✅ ${category} → ${fieldName}: MATCH`);
      console.log(`   PDF: "${pdfValue}" | DB: "${dbValue}"\n`);
    } else if (dbValue === null || dbValue === undefined) {
      missingFields++;
      console.log(`⚠️  ${category} → ${fieldName}: MISSING IN DATABASE`);
      console.log(`   PDF: "${pdfValue}" | DB: NULL\n`);
      issues.push({
        category,
        field: fieldName,
        type: 'MISSING',
        pdfValue,
        dbValue: null
      });
    } else {
      mismatchedFields++;
      console.log(`❌ ${category} → ${fieldName}: MISMATCH`);
      console.log(`   PDF: "${pdfValue}"`);
      console.log(`   DB:  "${dbValue}"\n`);
      issues.push({
        category,
        field: fieldName,
        type: 'MISMATCH',
        pdfValue,
        dbValue
      });
    }
  }

  // ========================================
  // PAGE 4: MEDICAL ASSESSMENT
  // ========================================
  console.log('🏥 PAGE 4: MEDICAL ASSESSMENT\n');

  compareField('Medical', 'Medical Attention Needed', pdfData.medical.medical_attention_needed, incident.medical_attention_needed);
  compareField('Medical', 'Injury Details', pdfData.medical.medical_injury_details, incident.medical_injury_details);
  compareField('Medical', 'Ambulance Called', pdfData.medical.medical_ambulance_called, incident.medical_ambulance_called);
  compareField('Medical', 'Six Point Safety Check', pdfData.medical.six_point_safety_check_completed, incident.six_point_safety_check_completed);
  compareField('Medical', 'Symptom: Chest Pain', pdfData.medical.medical_symptom_chest_pain, incident.medical_symptom_chest_pain);
  compareField('Medical', 'Symptom: Breathlessness', pdfData.medical.medical_symptom_breathlessness, incident.medical_symptom_breathlessness);
  compareField('Medical', 'Symptom: Severe Headache', pdfData.medical.medical_symptom_severe_headache, incident.medical_symptom_severe_headache);

  // ========================================
  // PAGE 5: ACCIDENT DETAILS
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('💥 PAGE 5: ACCIDENT DETAILS\n');

  compareField('Accident', 'Date', pdfData.accident.accident_date, incident.accident_date);
  compareField('Accident', 'Time', pdfData.accident.accident_time, incident.accident_time);
  compareField('Accident', 'Weather: Raining', pdfData.accident.weather_raining, incident.weather_raining);
  compareField('Accident', 'Weather: Windy', pdfData.accident.weather_windy, incident.weather_windy);
  compareField('Accident', 'Road: Wet', pdfData.accident.road_condition_wet, incident.road_condition_wet);
  compareField('Accident', 'Road Type: A-Road', pdfData.accident.road_type_a_road, incident.road_type_a_road);
  compareField('Accident', 'Traffic: Moderate', pdfData.accident.traffic_conditions_moderate, incident.traffic_conditions_moderate);
  compareField('Accident', 'Speed Limit', pdfData.accident.speed_limit, incident.speed_limit);
  compareField('Accident', 'Your Speed', pdfData.accident.your_speed, incident.your_speed);
  compareField('Accident', 'Visibility: Very Poor', pdfData.accident.visibility_very_poor, incident.visibility_very_poor);
  compareField('Accident', 'Road Markings: Partially Visible', pdfData.accident.road_markings_visible_partially, incident.road_markings_visible_partially);

  // ========================================
  // PAGE 6: LOCATION DETAILS
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📍 PAGE 6: LOCATION DETAILS\n');

  compareField('Location', 'what3words', pdfData.location.what3words, incident.what3words);
  compareField('Location', 'Full Address', pdfData.location.location, incident.location);
  compareField('Location', 'Nearest Landmark', pdfData.location.nearest_landmark, incident.nearest_landmark);
  compareField('Location', 'Junction Type', pdfData.location.junction_type, incident.junction_type);
  compareField('Location', 'Junction Control', pdfData.location.junction_control, incident.junction_control);
  compareField('Location', 'Traffic Light Status', pdfData.location.traffic_light_status, incident.traffic_light_status);
  compareField('Location', 'User Manoeuvre', pdfData.location.user_manoeuvre, incident.user_manoeuvre);
  compareField('Location', 'Visibility Clear', pdfData.location.visibility_clear, incident.visibility_clear);
  compareField('Location', 'Special Condition: Potholes', pdfData.location.special_condition_potholes, incident.special_condition_potholes);

  // ========================================
  // PAGE 7: VEHICLE DAMAGE
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('🚗 PAGE 7: VEHICLE DAMAGE\n');

  compareField('Vehicle Damage', 'Impact: Front Driver', pdfData.vehicle_damage.impact_point_front_driver, incident.impact_point_front_driver);
  compareField('Vehicle Damage', 'Impact: Driver Side', pdfData.vehicle_damage.impact_point_driver_side, incident.impact_point_driver_side);
  compareField('Vehicle Damage', 'Damage Description', pdfData.vehicle_damage.damage_to_your_vehicle, incident.damage_to_your_vehicle);
  compareField('Vehicle Damage', 'Vehicle Driveable', pdfData.vehicle_damage.vehicle_driveable, incident.vehicle_driveable);

  // ========================================
  // PAGE 10: POLICE INVOLVEMENT
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('👮 PAGE 10: POLICE INVOLVEMENT\n');

  compareField('Police', 'Police Attended', pdfData.police.police_attended, incident.police_attended);
  compareField('Police', 'Accident Ref Number', pdfData.police.accident_ref_number, incident.accident_ref_number);
  compareField('Police', 'Police Force', pdfData.police.police_force, incident.police_force);
  compareField('Police', 'Officer Name', pdfData.police.officer_name, incident.officer_name);
  compareField('Police', 'Officer Badge', pdfData.police.officer_badge, incident.officer_badge);
  compareField('Police', 'User Breath Test', pdfData.police.user_breath_test, incident.user_breath_test);
  compareField('Police', 'Other Breath Test', pdfData.police.other_breath_test, incident.other_breath_test);

  // ========================================
  // SUMMARY REPORT
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📊 PAGES 4-10 RECONCILIATION SUMMARY\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const accuracy = ((matchedFields / totalFields) * 100).toFixed(2);

  console.log(`Total Fields Checked: ${totalFields}`);
  console.log(`✅ Matched:          ${matchedFields}`);
  console.log(`❌ Mismatched:       ${mismatchedFields}`);
  console.log(`⚠️  Missing in DB:    ${missingFields}`);
  console.log(`\n📈 Data Accuracy:     ${accuracy}%\n`);

  if (issues.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('⚠️  ISSUES REQUIRING ATTENTION\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.category} → ${issue.field}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   PDF:  "${issue.pdfValue}"`);
      console.log(`   DB:   "${issue.dbValue}"`);
      console.log('');
    });
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  if (accuracy === '100.00') {
    console.log('🎉 PERFECT: PDF Pages 4-10 match incident_reports table 100%!\n');
  } else if (accuracy >= 95) {
    console.log('🎉 EXCELLENT: PDF and database are highly consistent!\n');
  } else if (accuracy >= 85) {
    console.log('✅ GOOD: Minor discrepancies found, review recommended\n');
  } else if (accuracy >= 70) {
    console.log('⚠️  WARNING: Significant discrepancies detected\n');
  } else {
    console.log('❌ CRITICAL: Major data inconsistencies found!\n');
  }

  console.log('📄 Note: This reconciliation covers ONLY Pages 4-10 (incident_reports table)');
  console.log('   Pages 8-9 use different tables (incident_other_vehicles, incident_witnesses)\n');
}

reconcile().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
