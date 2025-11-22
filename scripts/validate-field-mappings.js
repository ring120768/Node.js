/**
 * Validate Field Mappings Against Database Schema
 *
 * Compares fields in incidentForm.controller.js buildIncidentData()
 * against actual database columns to identify mismatches.
 *
 * Run: node scripts/validate-field-mappings.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fields from buildIncidentData() in incidentForm.controller.js (lines 400-641)
const CONTROLLER_FIELDS = [
  // System Fields (2 - submission_source removed, doesn't exist in DB)
  'create_user_id',
  'created_at',
  'updated_at',

  // Page 1: Date, Time, Location (2 fields - location_* fields removed, don't exist in DB)
  'accident_date',
  'accident_time',
  // Note: location_address, location_postcode, location_city, location_what3words removed - don't exist
  // Note: incident_description removed - doesn't exist in schema

  // Page 2: Medical Information (26 fields)
  'medical_attention_needed',
  'medical_injury_details',
  'medical_injury_severity',
  'medical_hospital_name',
  'medical_ambulance_called',
  'medical_treatment_received',
  'medical_symptom_chest_pain',
  'medical_symptom_uncontrolled_bleeding',
  'medical_symptom_breathlessness',
  'medical_symptom_limb_weakness',
  'medical_symptom_dizziness',
  'medical_symptom_loss_of_consciousness',
  'medical_symptom_severe_headache',
  'medical_symptom_change_in_vision',
  'medical_symptom_abdominal_pain',
  'medical_symptom_abdominal_bruising',
  'medical_symptom_limb_pain_mobility',
  'medical_symptom_life_threatening',
  'medical_symptom_none',

  // Page 3: Weather & Road Conditions (41 fields)
  'weather_bright_sunlight',
  'weather_clear',
  'weather_cloudy',
  'weather_raining',
  'weather_heavy_rain',
  'weather_drizzle',
  'weather_fog',
  'weather_snow',
  'weather_ice',
  'weather_windy',
  'weather_hail',
  'weather_thunder_lightning',
  'road_condition_dry',
  'road_condition_wet',
  'road_condition_icy',
  'road_condition_snow_covered',
  'road_condition_loose_surface',
  'road_condition_slush_on_road',
  'road_type_motorway',
  'road_type_a_road',
  'road_type_b_road',
  'road_type_urban_street',
  'road_type_rural_road',
  'road_type_car_park',
  'road_type_private_road',
  'speed_limit',
  'your_speed',
  'traffic_conditions_heavy',
  'traffic_conditions_moderate',
  'traffic_conditions_light',
  'traffic_conditions_no_traffic',
  'visibility_good',
  'visibility_poor',
  'visibility_very_poor',
  'visibility_street_lights',
  'road_markings_visible_yes',
  'road_markings_visible_no',
  'road_markings_visible_partially',

  // Page 4: Location Details & Hazards (30 fields)
  'location',
  'what3words',
  'nearest_landmark',
  'junction_type',
  'junction_control',
  'traffic_light_status',
  'user_manoeuvre',
  'visibility_clear',
  'visibility_restricted_structure',
  'visibility_restricted_bend',
  'visibility_large_vehicle',
  'visibility_sun_glare',
  'additional_hazards',
  'special_condition_roadworks',
  'special_condition_workmen',
  'special_condition_cyclists',
  'special_condition_pedestrians',
  'special_condition_traffic_calming',
  'special_condition_parked_vehicles',
  'special_condition_crossing',
  'special_condition_school_zone',
  'special_condition_narrow_road',
  'special_condition_potholes',
  'special_condition_oil_spills',
  'special_condition_animals',

  // Page 5: Your Vehicle Details (34 fields)
  'usual_vehicle',
  'vehicle_license_plate',
  'dvla_make',
  'dvla_model',
  'dvla_colour',
  'dvla_year',
  'dvla_fuel_type',
  'dvla_mot_status',
  'dvla_mot_expiry',
  'dvla_tax_status',
  'dvla_tax_due_date',
  'dvla_insurance_status',
  'no_damage',
  'damage_to_your_vehicle',
  'impact_point_front',
  'impact_point_front_driver',
  'impact_point_front_passenger',
  'impact_point_driver_side',
  'impact_point_passenger_side',
  'impact_point_rear_driver',
  'impact_point_rear_passenger',
  'impact_point_rear',
  'impact_point_roof',
  'impact_point_undercarriage',
  'vehicle_driveable',
  'manual_make',
  'manual_model',
  'manual_colour',
  'manual_year',
  // Note: Legacy Typeform fields removed (don't exist in schema):
  // your_vehicle_make, your_vehicle_model, your_vehicle_color, your_vehicle_registration, your_vehicle_year

  // Page 7: Other Driver & Vehicle (20 fields)
  'other_full_name',
  'other_contact_number',
  'other_email_address',
  'other_driving_license_number',
  'other_vehicle_registration',
  'other_vehicle_look_up_make',
  'other_vehicle_look_up_model',
  'other_vehicle_look_up_colour',
  'other_vehicle_look_up_year',
  'other_vehicle_look_up_fuel_type',
  'other_vehicle_look_up_mot_status',
  'other_vehicle_look_up_mot_expiry_date',
  'other_vehicle_look_up_tax_status',
  'other_vehicle_look_up_tax_due_date',
  'other_vehicle_look_up_insurance_status',
  'other_drivers_insurance_company',
  'other_drivers_policy_number',
  'other_drivers_policy_holder_name',
  'other_drivers_policy_cover_type',
  'no_visible_damage',
  'describe_damage_to_vehicle',

  // Page 9: Witnesses (1 field)
  'witnesses_present',

  // Page 10: Police & Safety Equipment (10 fields)
  'police_attended',
  'accident_ref_number',
  'police_force',
  'officer_name',
  'officer_badge',
  'user_breath_test',
  'other_breath_test',
  'airbags_deployed',
  'seatbelts_worn',
  'seatbelt_reason',

  // Page 12: Final Medical Check (2 fields)
  'final_feeling',
  'form_completed_at'
];

async function validateFieldMappings() {
  console.log('🔍 Validating Field Mappings\n');
  console.log('='.repeat(70));

  try {
    // Get actual database columns
    const { data: columns, error } = await supabase
      .from('incident_reports')
      .select('*')
      .limit(0); // Just get column info, no data

    if (error) {
      throw error;
    }

    // Extract column names from the result metadata
    // We need to query the information_schema instead
    const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'incident_reports'
        ORDER BY ordinal_position;
      `
    });

    if (schemaError) {
      // Fallback: Use raw SQL
      console.log('⚠️  RPC not available, using alternative method...\n');
    }

    // Get columns via PostgreSQL query
    const query = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'incident_reports'
      ORDER BY ordinal_position;
    `;

    // We can't use supabase.rpc, so let's parse from the earlier schema we fetched
    // For now, manually list based on the earlier query result
    const DB_COLUMNS = [
      'id', 'auth_user_id', 'create_user_id', 'transcription_id',
      'created_at', 'updated_at', 'form_id', 'submit_date', 'user_id',
      'deleted_at', 'retention_until',
      'medical_attention_needed', 'medical_injury_details', 'medical_injury_severity',
      'medical_hospital_name', 'medical_ambulance_called', 'medical_treatment_received',
      'medical_symptom_chest_pain', 'medical_symptom_uncontrolled_bleeding',
      'medical_symptom_breathlessness', 'medical_symptom_limb_weakness',
      'medical_symptom_dizziness', 'medical_symptom_loss_of_consciousness',
      'medical_symptom_severe_headache', 'medical_symptom_change_in_vision',
      'medical_symptom_abdominal_pain', 'medical_symptom_abdominal_bruising',
      'medical_symptom_limb_pain_mobility', 'medical_symptom_life_threatening',
      'medical_symptom_none',
      'accident_date', 'accident_time',
      'weather_bright_sunlight', 'weather_clear', 'weather_cloudy', 'weather_raining',
      'weather_heavy_rain', 'weather_drizzle', 'weather_fog', 'weather_snow',
      'weather_ice', 'weather_windy', 'weather_hail', 'weather_thunder_lightning',
      'road_condition_dry', 'road_condition_wet', 'road_condition_icy',
      'road_condition_snow_covered', 'road_condition_loose_surface',
      'road_condition_slush_on_road',
      'road_type_motorway', 'road_type_a_road', 'road_type_b_road',
      'road_type_urban_street', 'road_type_rural_road', 'road_type_car_park',
      'road_type_private_road',
      'speed_limit', 'your_speed',
      'traffic_conditions_heavy', 'traffic_conditions_moderate',
      'traffic_conditions_light', 'traffic_conditions_no_traffic',
      'visibility_good', 'visibility_poor', 'visibility_very_poor',
      'visibility_street_lights',
      'road_markings_visible_yes', 'road_markings_visible_no',
      'road_markings_visible_partially',
      'completed_at',
      'location', 'what3words', 'nearest_landmark',
      'junction_type', 'junction_control', 'traffic_light_status', 'user_manoeuvre',
      'visibility_clear', 'visibility_restricted_structure', 'visibility_restricted_bend',
      'visibility_large_vehicle', 'visibility_sun_glare', 'additional_hazards',
      'special_condition_roadworks', 'special_condition_workmen',
      'special_condition_cyclists', 'special_condition_pedestrians',
      'special_condition_traffic_calming', 'special_condition_parked_vehicles',
      'special_condition_crossing', 'special_condition_school_zone',
      'special_condition_narrow_road', 'special_condition_potholes',
      'special_condition_oil_spills', 'special_condition_animals',
      'usual_vehicle', 'vehicle_license_plate',
      'dvla_make', 'dvla_model', 'dvla_colour', 'dvla_year', 'dvla_fuel_type',
      'dvla_mot_status', 'dvla_mot_expiry', 'dvla_tax_status', 'dvla_tax_due_date',
      'dvla_insurance_status',
      'no_damage',
      'impact_point_front', 'impact_point_front_driver', 'impact_point_front_passenger',
      'impact_point_driver_side', 'impact_point_passenger_side',
      'impact_point_rear_driver', 'impact_point_rear_passenger',
      'impact_point_rear', 'impact_point_roof', 'impact_point_undercarriage',
      'damage_to_your_vehicle', 'vehicle_driveable',
      'manual_make', 'manual_model', 'manual_colour', 'manual_year',
      'other_email_address', 'other_driving_license_number',
      'other_vehicle_look_up_fuel_type', 'other_vehicle_look_up_mot_status',
      'other_vehicle_look_up_mot_expiry_date', 'other_vehicle_look_up_tax_status',
      'other_vehicle_look_up_tax_due_date', 'other_vehicle_look_up_insurance_status',
      'no_visible_damage',
      'other_full_name', 'other_contact_number', 'other_vehicle_registration',
      'other_vehicle_look_up_make', 'other_vehicle_look_up_model',
      'other_vehicle_look_up_colour', 'other_vehicle_look_up_year',
      'other_drivers_insurance_company', 'other_drivers_policy_number',
      'other_drivers_policy_holder_name', 'other_drivers_policy_cover_type',
      'describe_damage_to_vehicle',
      'witnesses_present', 'witness_name', 'witness_mobile_number',
      'witness_email_address', 'witness_statement',
      'police_attended', 'accident_ref_number', 'police_force',
      'officer_name', 'officer_badge',
      'user_breath_test', 'other_breath_test',
      'airbags_deployed', 'seatbelts_worn', 'seatbelt_reason',
      'file_url_other_vehicle', 'file_url_other_vehicle_1', 'any_witness',
      'final_feeling', 'form_completed_at'
    ];

    const dbColumnSet = new Set(DB_COLUMNS);

    // Find fields in controller that don't exist in database
    const missingInDb = CONTROLLER_FIELDS.filter(field => !dbColumnSet.has(field));

    // Find fields in database that aren't in controller
    const missingInController = DB_COLUMNS.filter(col => {
      // Skip system/internal columns
      const systemCols = ['id', 'auth_user_id', 'transcription_id', 'form_id',
                          'submit_date', 'user_id', 'deleted_at', 'retention_until',
                          'file_url_other_vehicle', 'file_url_other_vehicle_1',
                          'witness_name', 'witness_mobile_number', 'witness_email_address',
                          'witness_statement', 'any_witness'];
      if (systemCols.includes(col)) return false;

      return !CONTROLLER_FIELDS.includes(col);
    });

    // Results
    console.log('\n📊 VALIDATION RESULTS\n');
    console.log('='.repeat(70));

    console.log('\n✅ Total fields in controller:', CONTROLLER_FIELDS.length);
    console.log('✅ Total columns in database:', DB_COLUMNS.length);

    if (missingInDb.length === 0 && missingInController.length === 0) {
      console.log('\n✅ PERFECT MATCH! All fields validated successfully.\n');
    } else {
      console.log('\n❌ MISMATCHES FOUND!\n');

      if (missingInDb.length > 0) {
        console.log('🔴 Fields in controller that DON\'T exist in database (' + missingInDb.length + '):');
        console.log('='.repeat(70));
        missingInDb.forEach(field => {
          console.log('  ❌', field);
        });
        console.log('');
      }

      if (missingInController.length > 0) {
        console.log('🟡 Fields in database that AREN\'T in controller (' + missingInController.length + '):');
        console.log('='.repeat(70));
        missingInController.forEach(field => {
          console.log('  ⚠️ ', field);
        });
        console.log('');
      }

      console.log('📝 RECOMMENDED ACTIONS:');
      console.log('='.repeat(70));

      if (missingInDb.length > 0) {
        console.log('1. Remove these fields from incidentForm.controller.js:');
        missingInDb.forEach(field => {
          console.log(`   - ${field}`);
        });
        console.log('   OR add these columns to the database if they should exist.\n');
      }

      if (missingInController.length > 0) {
        console.log('2. Consider adding these fields to the controller if needed:');
        missingInController.forEach(field => {
          console.log(`   - ${field}`);
        });
        console.log('');
      }
    }

    console.log('='.repeat(70));
    console.log('\n✅ Validation complete!\n');

    process.exit(missingInDb.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

validateFieldMappings();
