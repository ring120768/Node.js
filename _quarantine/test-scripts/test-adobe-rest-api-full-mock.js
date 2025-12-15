#!/usr/bin/env node

/**
 * Test Adobe REST API Form Filling Service - COMPREHENSIVE MOCK DATA
 *
 * This script generates a PDF with ALL fields populated using mock data
 * to verify complete field connectivity and visual appearance.
 *
 * Usage:
 *   node test-adobe-rest-api-full-mock.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const adobeRestFormFiller = require('./src/services/adobeRestFormFiller');

/**
 * Comprehensive mock data - ALL fields populated
 */
function getMockData() {
  return {
    user: {
      // Page 1 - Personal Details (ALL FIELDS)
      name: 'Alexander',
      surname: 'Thompson',
      email: 'alex.thompson@testmail.co.uk',
      mobile: '07700900123',
      street_address: '42 Fictional Street',
      town: 'Manchester',
      postcode: 'M1 1AB',
      country: 'United Kingdom',
      date_of_birth: '1985-03-15',

      // Emergency Contact
      emergency_contact: 'Sarah Thompson | 07700900456',

      // Vehicle Details (ALL FIELDS)
      driving_license_number: 'THOMP803156A99XY',
      car_registration_number: 'AB12 CDE',
      vehicle_make: 'Ford',
      vehicle_model: 'Focus',
      vehicle_colour: 'Silver',
      vehicle_condition: 'Excellent condition, well maintained, 3 years old',

      // Recovery Details (ALL FIELDS)
      recovery_company: 'AA Breakdown',
      recovery_breakdown_number: '0800 88 77 66',
      recovery_breakdown_email: 'recovery@aa.com',

      // Insurance Details (ALL FIELDS)
      insurance_company: 'Direct Line',
      policy_number: 'DL-123456789',
      policy_holder: 'Alexander Thompson',
      cover_type: 'Comprehensive'
    },

    incident: {
      // Medical Information (ALL 11 CHECKBOXES + attention field)
      medical_attention_needed: true,
      medical_symptom_chest_pain: true,
      medical_symptom_breathlessness: true,
      medical_symptom_severe_headache: true,
      medical_symptom_limb_pain_mobility: true,
      medical_symptom_loss_of_consciousness: false,
      medical_symptom_uncontrolled_bleeding: true,  // Uses "On"
      medical_symptom_limb_weakness: true,
      medical_symptom_dizziness: true,
      medical_symptom_change_in_vision: true,
      medical_symptom_abdominal_pain: true,
      medical_symptom_abdominal_bruising: true,  // Uses "On"

      // Accident Details (ALL FIELDS)
      accident_date: '2025-11-10',
      accident_time: '14:30',
      location: 'Junction of Oxford Road and Portland Street, Manchester',
      what3words: 'filled.count.soap',
      nearest_landmark: 'Near Manchester Metropolitan University main building',

      // Weather Conditions (ALL 12 CHECKBOXES - testing all "On" fields)
      weather_clear: true,              // Uses "On"
      weather_bright_sunlight: true,    // Uses "On"
      weather_cloudy: true,             // Uses "On"
      weather_raining: true,
      weather_heavy_rain: true,         // Uses "On"
      weather_drizzle: true,
      weather_fog: true,                // Uses "On"
      weather_snow: true,               // Uses "On"
      weather_ice: true,                // Uses "On"
      weather_windy: true,
      weather_hail: false,
      weather_thunder_lightning: true,  // Uses "On"

      // Road Conditions (ALL 6 CHECKBOXES)
      road_condition_dry: false,
      road_condition_wet: true,
      road_condition_icy: true,         // Uses "On" - ONLY ONE
      road_condition_snow_covered: true,
      road_condition_loose_surface: true,
      road_condition_slush_on_road: true,

      // Road Type (ALL 7 CHECKBOXES)
      road_type_motorway: false,
      road_type_a_road: true,           // Uses "On"
      road_type_b_road: true,           // Uses "On"
      road_type_urban_street: true,
      road_type_rural_road: false,
      road_type_car_park: false,
      road_type_private_road: true,     // Uses "On"

      // Speed and Traffic (ALL FIELDS)
      speed_limit: '30',
      your_speed: '25',
      traffic_conditions_heavy: true,
      traffic_conditions_moderate: true,  // Uses "On"
      traffic_conditions_light: false,
      traffic_conditions_no_traffic: false,

      // Visibility (ALL 9 CHECKBOXES)
      visibility_good: true,                      // Uses "On"
      visibility_poor: true,                      // Uses "On"
      visibility_very_poor: true,
      visibility_street_lights: true,             // Uses "On"
      visibility_clear: true,                     // Uses "On"
      visibility_restricted_structure: true,      // Uses "On"
      visibility_restricted_bend: true,           // Uses "On"
      visibility_large_vehicle: true,
      visibility_sun_glare: true,                 // Uses "On"

      // Junction Details (ALL FIELDS)
      junction_type: 'T-Junction',
      junction_control: 'Traffic lights',
      traffic_light_status: 'Green',
      user_manoeuvre: 'Going straight ahead',

      // Special Conditions (ALL 12 CHECKBOXES - testing all 10 "On" fields)
      special_condition_roadworks: true,          // Uses "On"
      special_condition_workmen: true,            // Uses "On"
      special_condition_cyclists: true,           // Uses "On"
      special_condition_pedestrians: true,        // Uses "On"
      special_condition_traffic_calming: true,    // Uses "On"
      special_condition_parked_vehicles: true,
      special_condition_crossing: true,           // Uses "On"
      special_condition_school_zone: true,        // Uses "On"
      special_condition_narrow_road: true,
      special_condition_potholes: true,           // Uses "On"
      special_condition_oil_spills: true,         // Uses "On"
      special_condition_animals: true,            // Uses "On"

      // Vehicle Damage (ALL 11 CHECKBOXES + description)
      no_damage: false,
      impact_point_front: true,
      impact_point_front_driver: true,
      impact_point_front_passenger: true,
      impact_point_driver_side: true,
      impact_point_passenger_side: false,
      impact_point_rear_driver: false,
      impact_point_rear_passenger: true,  // Uses "On" - testing this
      impact_point_rear: true,
      impact_point_roof: false,
      impact_point_undercarriage: false,
      damage_to_your_vehicle: 'Front bumper damaged, driver side door scratched, windscreen cracked',
      vehicle_driveable: 'Yes',

      // Other Vehicle (ALL FIELDS)
      other_full_name: 'James Wilson',
      other_contact_number: '07700900789',
      other_email_address: 'james.wilson@example.com',
      other_vehicle_registration: 'XY34 ZAB',
      other_drivers_insurance_company: 'Admiral Insurance',
      other_drivers_policy_number: 'ADM-987654321',
      other_drivers_policy_holder_name: 'James Wilson',
      other_drivers_policy_cover_type: 'Third Party',
      describe_damage_to_vehicle: 'Rear bumper dented, rear light cluster broken',
      no_visible_damage: false,

      // Witnesses (ALL FIELDS - 1 witness)
      witnesses_present: true,
      witness_name: 'Emma Roberts',
      witness_mobile_number: '07700900321',
      witness_email_address: 'emma.roberts@witness.com',
      witness_statement: 'I was waiting at the bus stop when I saw the blue Ford fail to stop at the red light and collide with the silver car that was proceeding through the junction on a green light. The impact was significant and I immediately called 999.',

      // Police (ALL FIELDS)
      police_attended: true,
      accident_ref_number: 'GMP-2025-11-10-12345',
      police_force: 'Greater Manchester Police',
      officer_name: 'PC David Johnson',
      officer_badge: 'PC 5678',
      user_breath_test: 'Negative',
      other_breath_test: 'Negative',

      // Safety Equipment (ALL FIELDS)
      airbags_deployed: true,
      seatbelts_worn: true,
      seatbelt_reason: ''  // Empty because seatbelts were worn
    }
  };
}

/**
 * Prepare data for PDF form filling (matches production prepareFormData)
 */
function prepareFormData(data) {
  console.log('\n🔄 Preparing comprehensive mock form data...');

  const formData = {};

  // Map user_signup data to PDF fields
  if (data.user) {
    const user = data.user;

    // Page 1 - Personal Details
    formData.name = user.name;
    formData.surname = user.surname;
    formData.email = user.email;
    formData.mobile = user.mobile;
    formData.street = user.street_address;
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
    formData.driving_license_number = user.driving_license_number;
    formData.car_registration_number = user.car_registration_number;
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

  // Map incident_reports data to PDF fields
  if (data.incident) {
    const incident = data.incident;

    // Medical Information
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

    // Accident Details
    formData.accident_date = incident.accident_date;
    formData.accident_time = incident.accident_time;
    formData.location = incident.location;
    formData.what3words = incident.what3words;
    formData.nearest_landmark = incident.nearest_landmark;

    // Weather Conditions
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

    // Road Conditions
    formData.road_condition_dry = incident.road_condition_dry;
    formData.road_condition_wet = incident.road_condition_wet;
    formData.road_condition_icy = incident.road_condition_icy;
    formData.road_condition_snow_covered = incident.road_condition_snow_covered;
    formData.road_condition_loose_surface = incident.road_condition_loose_surface;
    formData.road_condition_slush_on_road = incident.road_condition_slush_on_road;

    // Road Type
    formData.road_type_motorway = incident.road_type_motorway;
    formData.road_type_a_road = incident.road_type_a_road;
    formData.road_type_b_road = incident.road_type_b_road;
    formData.road_type_urban_street = incident.road_type_urban_street;
    formData.road_type_rural_road = incident.road_type_rural_road;
    formData.road_type_car_park = incident.road_type_car_park;
    formData.road_type_private_road = incident.road_type_private_road;

    // Speed and Traffic
    formData.speed_limit = incident.speed_limit;
    formData.your_speed = incident.your_speed;
    formData.traffic_conditions_heavy = incident.traffic_conditions_heavy;
    formData.traffic_conditions_moderate = incident.traffic_conditions_moderate;
    formData.traffic_conditions_light = incident.traffic_conditions_light;
    formData.traffic_conditions_no_traffic = incident.traffic_conditions_no_traffic;

    // Visibility
    formData.visibility_good = incident.visibility_good;
    formData.visibility_poor = incident.visibility_poor;
    formData.visibility_very_poor = incident.visibility_very_poor;
    formData.visibility_street_lights = incident.visibility_street_lights;
    formData.visibility_clear = incident.visibility_clear;
    formData.visibility_restricted_structure = incident.visibility_restricted_structure;
    formData.visibility_restricted_bend = incident.visibility_restricted_bend;
    formData.visibility_large_vehicle = incident.visibility_large_vehicle;
    formData.visibility_sun_glare = incident.visibility_sun_glare;

    // Junction Details
    formData.junction_type = incident.junction_type;
    formData.junction_control = incident.junction_control;
    formData.traffic_light_status = incident.traffic_light_status;
    formData.user_manoeuvre = incident.user_manoeuvre;

    // Special Conditions
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

    // Vehicle Damage
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

    // Other Vehicle
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

    // Witnesses
    formData.witnesses_present = incident.witnesses_present;
    formData.witness_name = incident.witness_name;
    formData.witness_mobile_number = incident.witness_mobile_number;
    formData.witness_email_address = incident.witness_email_address;
    formData.witness_statement = incident.witness_statement;

    // Police
    formData.police_attended = incident.police_attended;
    formData.accident_ref_number = incident.accident_ref_number;
    formData.police_force = incident.police_force;
    formData.officer_name = incident.officer_name;
    formData.officer_badge = incident.officer_badge;
    formData.user_breath_test = incident.user_breath_test;
    formData.other_breath_test = incident.other_breath_test;

    // Safety Equipment
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
async function testAdobeRestApiFullMock() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Adobe REST API - COMPREHENSIVE MOCK DATA TEST                ║');
  console.log('║   Purpose: Verify ALL fields populate and display correctly   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    // Step 1: Check Adobe service is configured
    console.log('\n1️⃣ Checking Adobe PDF Services configuration...');

    if (!adobeRestFormFiller.isReady()) {
      throw new Error('Adobe PDF Services not configured. Please set PDF_SERVICES_CLIENT_ID and PDF_SERVICES_CLIENT_SECRET environment variables.');
    }

    console.log('   ✅ Adobe credentials configured');

    // Step 2: Generate comprehensive mock data
    console.log('\n2️⃣ Generating comprehensive mock data...');
    const mockData = getMockData();
    console.log('   ✅ Mock data generated with ALL fields populated');
    console.log('   📊 Mock user: Alexander Thompson');
    console.log('   📊 Mock incident: T-Junction collision, Manchester');
    console.log('   📊 Testing all 43 "On" export value fields');

    // Step 3: Prepare form data
    console.log('\n3️⃣ Preparing PDF form data...');
    const formData = prepareFormData(mockData);

    // Step 4: Fill PDF form using Adobe REST API
    console.log('\n4️⃣ Filling PDF form with Adobe REST API...');
    console.log('   This may take 30-60 seconds...');

    const filledPdfBuffer = await adobeRestFormFiller.fillForm(formData);

    // Step 5: Save output
    const outputPath = path.join(__dirname, 'test-output', `filled-pdf-full-mock-${Date.now()}.pdf`);

    // Ensure output directory exists
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, filledPdfBuffer);

    // Success!
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ COMPREHENSIVE TEST SUCCESSFUL!                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\n📄 Filled PDF saved to: ${outputPath}`);
    console.log(`📊 File size: ${(filledPdfBuffer.length / 1024).toFixed(2)} KB`);

    console.log('\n🔍 Visual Verification Checklist:');
    console.log('   ✓ Page 1: Personal details (Alexander Thompson)');
    console.log('   ✓ Page 2: Insurance & emergency contact');
    console.log('   ✓ Page 4: Medical symptoms (11 checkboxes - 10 checked)');
    console.log('   ✓ Page 5: Weather (12 checkboxes - 11 checked, testing 8 "On" fields)');
    console.log('   ✓ Page 5: Road conditions (6 checkboxes - 5 checked, testing "icy" uses "On")');
    console.log('   ✓ Page 5: Road types (7 checkboxes - 4 checked, testing 3 "On" fields)');
    console.log('   ✓ Page 5: Traffic (4 checkboxes - 2 checked, testing "moderate" uses "On")');
    console.log('   ✓ Page 5: Visibility (9 checkboxes - all checked, testing 7 "On" fields)');
    console.log('   ✓ Page 6: Junction & special conditions (12 checkboxes, testing 10 "On" fields)');
    console.log('   ✓ Page 7: Vehicle damage (11 checkboxes, testing "rear_passenger" uses "On")');
    console.log('   ✓ Page 7: Other vehicle details');
    console.log('   ✓ Page 9: Witness information');
    console.log('   ✓ Page 10: Police & safety details');

    console.log('\n📋 Key Fields to Verify Visually:');
    console.log('   1. ALL checkboxes display correctly (not blank or "Off")');
    console.log('   2. Text fields contain expected mock data');
    console.log('   3. Company branding and logos preserved');
    console.log('   4. No corrupted formatting or missing data');
    console.log('   5. All 43 "On" export value fields render properly');

    console.log('\n💡 Next Step:');
    console.log('   Open the PDF and perform complete visual inspection of all pages.');
    console.log('   Verify every field populated correctly before proceeding to UI testing.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n📋 Error details:', error);
    process.exit(1);
  }
}

// Run the test
testAdobeRestApiFullMock().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
