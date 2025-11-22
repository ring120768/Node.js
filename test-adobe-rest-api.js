#!/usr/bin/env node

/**
 * Test Adobe REST API Form Filling Service
 *
 * Tests the new Adobe PDF Services REST API implementation
 * with real user data from Supabase.
 *
 * Usage:
 *   node test-adobe-rest-api.js [user-uuid]
 *
 * If no UUID provided, uses Ian Ring's test account:
 *   9db03736-74ac-4d00-9ae2-3639b58360a3
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const adobeRestFormFiller = require('./src/services/adobeRestFormFiller');

// Test user UUID (Ian Ring's account)
const DEFAULT_TEST_USER = '9db03736-74ac-4d00-9ae2-3639b58360a3';

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Fetch all user data from Supabase
 */
async function fetchUserData(userId) {
  console.log('\n📊 Fetching user data from Supabase...');
  console.log(`   User ID: ${userId}`);

  // Fetch user_signup data
  const { data: userData, error: userError } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (userError) {
    throw new Error(`Failed to fetch user data: ${userError.message}`);
  }

  if (!userData) {
    throw new Error(`No user found with ID: ${userId}`);
  }

  console.log('   ✅ User data fetched');
  console.log(`   Name: ${userData.name} ${userData.surname}`);
  console.log(`   Email: ${userData.email}`);

  // Fetch incident_reports data (optional - get most recent)
  const { data: incidentData, error: incidentError } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (incidentError) {
    console.log('   ⚠️  No incident report found:', incidentError.message);
  } else if (incidentData) {
    console.log('   ✅ Incident report data fetched');
    console.log(`   Accident Date: ${incidentData.accident_date}`);
    console.log(`   Accident Time: ${incidentData.accident_time}`);
  }

  return {
    user: userData,
    incident: incidentData || {}
  };
}

/**
 * Prepare data for PDF form filling
 * Converts database structure to flat key-value pairs
 */
function prepareFormData(data) {
  console.log('\n🔄 Preparing form data...');

  const formData = {};

  // Map user_signup data to PDF fields
  if (data.user) {
    const user = data.user;

    // Page 1 - Personal Details
    formData.name = user.name;
    formData.surname = user.surname;
    formData.email = user.email;
    formData.mobile = user.mobile;
    formData.street = user.street_address;  // Fixed: was user.street
    formData.town = user.town;
    formData.postcode = user.postcode;
    formData.country = user.country;
    formData.date_of_birth = user.date_of_birth;

    // Emergency Contact - Parse combined field
    if (user.emergency_contact) {
      const parts = user.emergency_contact.split('|').map(p => p.trim());
      formData.emergency_contact_name = parts[0] || '';
      formData.emergency_contact_number = parts[1] || '';
    }

    // Vehicle Details
    formData.driving_license_number = user.driving_license_number;  // Fixed: was user.license_number
    formData.car_registration_number = user.car_registration_number;  // Fixed: was user.license_plate
    formData.vehicle_make = user.vehicle_make;
    formData.vehicle_model = user.vehicle_model;
    formData.vehicle_colour = user.vehicle_colour;
    formData.vehicle_condition = user.vehicle_condition;

    // Recovery Details
    formData.recovery_company = user.recovery_company;
    formData.recovery_breakdown_number = user.recovery_breakdown_number;
    formData.recovery_breakdown_email = user.recovery_breakdown_email;

    // Insurance Details
    formData.insurance_company = user.insurance_company;
    formData.policy_number = user.policy_number;
    formData.policy_holder = user.policy_holder;
    formData.cover_type = user.cover_type;

    // Timestamp
    formData.time_stamp = new Date().toISOString();
  }

  // Map incident_reports data to PDF fields (NEW SCHEMA - HTML form column names)
  if (data.incident) {
    const incident = data.incident;

    // Medical Information (NEW SCHEMA)
    formData.medical_attention_needed = incident.medical_attention_needed;
    formData.medical_symptom_chest_pain = incident.medical_symptom_chest_pain;
    formData.medical_symptom_breathlessness = incident.medical_symptom_breathlessness;
    formData.medical_symptom_severe_headache = incident.medical_symptom_severe_headache;
    formData.medical_symptom_limb_pain_mobility = incident.medical_symptom_limb_pain_mobility;
    formData.medical_symptom_loss_of_consciousness = incident.medical_symptom_loss_of_consciousness;
    formData.medical_symptom_uncontrolled_bleeding = incident.medical_symptom_uncontrolled_bleeding;
    formData.medical_symptom_limb_weakness = incident.medical_symptom_limb_weakness;
    formData.medical_symptom_dizziness = incident.medical_symptom_dizziness;
    formData.medical_symptom_change_in_vision = incident.medical_symptom_change_in_vision;
    formData.medical_symptom_abdominal_pain = incident.medical_symptom_abdominal_pain;
    formData.medical_symptom_abdominal_bruising = incident.medical_symptom_abdominal_bruising;

    // Accident Details (NEW SCHEMA)
    formData.accident_date = incident.accident_date;
    formData.accident_time = incident.accident_time;
    formData.location = incident.location;
    formData.what3words = incident.what3words;
    formData.nearest_landmark = incident.nearest_landmark;

    // Weather Conditions (NEW SCHEMA)
    formData.weather_clear = incident.weather_clear;
    formData.weather_bright_sunlight = incident.weather_bright_sunlight;
    formData.weather_cloudy = incident.weather_cloudy;
    formData.weather_raining = incident.weather_raining;
    formData.weather_heavy_rain = incident.weather_heavy_rain;
    formData.weather_drizzle = incident.weather_drizzle;
    formData.weather_fog = incident.weather_fog;
    formData.weather_snow = incident.weather_snow;
    formData.weather_ice = incident.weather_ice;
    formData.weather_windy = incident.weather_windy;
    formData.weather_hail = incident.weather_hail;
    formData.weather_thunder_lightning = incident.weather_thunder_lightning;

    // Road Conditions (NEW SCHEMA)
    formData.road_condition_dry = incident.road_condition_dry;
    formData.road_condition_wet = incident.road_condition_wet;
    formData.road_condition_icy = incident.road_condition_icy;
    formData.road_condition_snow_covered = incident.road_condition_snow_covered;
    formData.road_condition_loose_surface = incident.road_condition_loose_surface;
    formData.road_condition_slush_on_road = incident.road_condition_slush_on_road;

    // Road Type (NEW SCHEMA)
    formData.road_type_motorway = incident.road_type_motorway;
    formData.road_type_a_road = incident.road_type_a_road;
    formData.road_type_b_road = incident.road_type_b_road;
    formData.road_type_urban_street = incident.road_type_urban_street;
    formData.road_type_rural_road = incident.road_type_rural_road;
    formData.road_type_car_park = incident.road_type_car_park;
    formData.road_type_private_road = incident.road_type_private_road;

    // Speed and Traffic (NEW SCHEMA)
    formData.speed_limit = incident.speed_limit;
    formData.your_speed = incident.your_speed;
    formData.traffic_conditions_heavy = incident.traffic_conditions_heavy;
    formData.traffic_conditions_moderate = incident.traffic_conditions_moderate;
    formData.traffic_conditions_light = incident.traffic_conditions_light;
    formData.traffic_conditions_no_traffic = incident.traffic_conditions_no_traffic;

    // Visibility (NEW SCHEMA)
    formData.visibility_good = incident.visibility_good;
    formData.visibility_poor = incident.visibility_poor;
    formData.visibility_very_poor = incident.visibility_very_poor;
    formData.visibility_street_lights = incident.visibility_street_lights;
    formData.visibility_clear = incident.visibility_clear;
    formData.visibility_restricted_structure = incident.visibility_restricted_structure;
    formData.visibility_restricted_bend = incident.visibility_restricted_bend;
    formData.visibility_large_vehicle = incident.visibility_large_vehicle;
    formData.visibility_sun_glare = incident.visibility_sun_glare;

    // Junction Details (NEW SCHEMA)
    formData.junction_type = incident.junction_type;
    formData.junction_control = incident.junction_control;
    formData.traffic_light_status = incident.traffic_light_status;
    formData.user_manoeuvre = incident.user_manoeuvre;

    // Special Conditions (NEW SCHEMA)
    formData.special_condition_roadworks = incident.special_condition_roadworks;
    formData.special_condition_workmen = incident.special_condition_workmen;
    formData.special_condition_cyclists = incident.special_condition_cyclists;
    formData.special_condition_pedestrians = incident.special_condition_pedestrians;
    formData.special_condition_traffic_calming = incident.special_condition_traffic_calming;
    formData.special_condition_parked_vehicles = incident.special_condition_parked_vehicles;
    formData.special_condition_crossing = incident.special_condition_crossing;
    formData.special_condition_school_zone = incident.special_condition_school_zone;
    formData.special_condition_narrow_road = incident.special_condition_narrow_road;
    formData.special_condition_potholes = incident.special_condition_potholes;
    formData.special_condition_oil_spills = incident.special_condition_oil_spills;
    formData.special_condition_animals = incident.special_condition_animals;

    // Vehicle Damage (NEW SCHEMA)
    formData.no_damage = incident.no_damage;
    formData.impact_point_front = incident.impact_point_front;
    formData.impact_point_front_driver = incident.impact_point_front_driver;
    formData.impact_point_front_passenger = incident.impact_point_front_passenger;
    formData.impact_point_driver_side = incident.impact_point_driver_side;
    formData.impact_point_passenger_side = incident.impact_point_passenger_side;
    formData.impact_point_rear_driver = incident.impact_point_rear_driver;
    formData.impact_point_rear_passenger = incident.impact_point_rear_passenger;
    formData.impact_point_rear = incident.impact_point_rear;
    formData.impact_point_roof = incident.impact_point_roof;
    formData.impact_point_undercarriage = incident.impact_point_undercarriage;
    formData.damage_to_your_vehicle = incident.damage_to_your_vehicle;
    formData.vehicle_driveable = incident.vehicle_driveable;

    // Other Vehicle (NEW SCHEMA)
    formData.other_full_name = incident.other_full_name;
    formData.other_contact_number = incident.other_contact_number;
    formData.other_email_address = incident.other_email_address;
    formData.other_vehicle_registration = incident.other_vehicle_registration;
    formData.other_drivers_insurance_company = incident.other_drivers_insurance_company;
    formData.other_drivers_policy_number = incident.other_drivers_policy_number;
    formData.other_drivers_policy_holder_name = incident.other_drivers_policy_holder_name;
    formData.other_drivers_policy_cover_type = incident.other_drivers_policy_cover_type;
    formData.describe_damage_to_vehicle = incident.describe_damage_to_vehicle;
    formData.no_visible_damage = incident.no_visible_damage;

    // Witnesses (NEW SCHEMA)
    formData.witnesses_present = incident.witnesses_present;
    formData.witness_name = incident.witness_name;
    formData.witness_mobile_number = incident.witness_mobile_number;
    formData.witness_email_address = incident.witness_email_address;
    formData.witness_statement = incident.witness_statement;

    // Police (NEW SCHEMA)
    formData.police_attended = incident.police_attended;
    formData.accident_ref_number = incident.accident_ref_number;
    formData.police_force = incident.police_force;
    formData.officer_name = incident.officer_name;
    formData.officer_badge = incident.officer_badge;
    formData.user_breath_test = incident.user_breath_test;
    formData.other_breath_test = incident.other_breath_test;

    // Safety Equipment (NEW SCHEMA)
    formData.airbags_deployed = incident.airbags_deployed;
    formData.seatbelts_worn = incident.seatbelts_worn;
    formData.seatbelt_reason = incident.seatbelt_reason;
  }

  const fieldCount = Object.keys(formData).filter(key => formData[key] != null).length;
  console.log(`   ✅ Prepared ${fieldCount} fields with values`);
  console.log(`   ✅ Total fields defined: ${Object.keys(formData).length}`);

  return formData;
}


/**
 * Main test function
 */
async function testAdobeRestApi() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Adobe REST API Form Filling Service - Integration Test      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  // Get user ID from command line or use default
  const userId = process.argv[2] || DEFAULT_TEST_USER;

  try {
    // Step 1: Check Adobe service is configured
    console.log('\n1️⃣ Checking Adobe PDF Services configuration...');

    if (!adobeRestFormFiller.isReady()) {
      throw new Error('Adobe PDF Services not configured. Please set PDF_SERVICES_CLIENT_ID and PDF_SERVICES_CLIENT_SECRET environment variables.');
    }

    console.log('   ✅ Adobe credentials configured');

    // Step 2: Fetch user data
    console.log('\n2️⃣ Fetching data from Supabase...');
    const data = await fetchUserData(userId);

    // Step 3: Prepare form data
    console.log('\n3️⃣ Preparing PDF form data...');
    const formData = prepareFormData(data);

    // Step 4: Fill PDF form using Adobe REST API
    console.log('\n4️⃣ Filling PDF form with Adobe REST API...');
    console.log('   This may take 30-60 seconds...');

    const filledPdfBuffer = await adobeRestFormFiller.fillForm(formData);

    // Step 5: Save output
    const outputPath = path.join(__dirname, 'test-output', `filled-pdf-${Date.now()}.pdf`);

    // Ensure output directory exists
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, filledPdfBuffer);

    // Success!
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ TEST SUCCESSFUL!                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\n📄 Filled PDF saved to: ${outputPath}`);
    console.log(`📊 File size: ${(filledPdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log('\n🔍 Next steps:');
    console.log('   1. Open the PDF and verify all fields are populated');
    console.log('   2. Check that company branding and template structure are preserved');
    console.log('   3. Verify 100% of available data fields are filled');
    console.log('\n💡 If everything looks good, we can integrate this into the application!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n📋 Error details:', error);
    process.exit(1);
  }
}

// Run the test
testAdobeRestApi().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
