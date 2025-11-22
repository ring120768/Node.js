/**
 * Audit PDF Field Mappings
 *
 * Compares fields from incident form controller vs PDF form filler service
 * to identify any missing mappings.
 *
 * Usage: node scripts/audit-pdf-field-mappings.js
 */

const fs = require('fs');
const path = require('path');

// Fields submitted by the incident form controller
const CONTROLLER_FIELDS = [
  // System fields
  'create_user_id',
  'created_at',
  'updated_at',

  // Page 1: Date, Time, Location
  'accident_date',
  'accident_time',

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
  'medical_symptom_loss_of_consciousness',
  'medical_symptom_severe_headache',
  'medical_symptom_change_in_vision',
  'medical_symptom_abdominal_pain',
  'medical_symptom_abdominal_bruising',
  'medical_symptom_limb_pain_mobility',
  'medical_symptom_dizziness',
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
  'additional_hazards',
  'visibility_clear',
  'visibility_restricted_structure',
  'visibility_restricted_bend',
  'visibility_large_vehicle',
  'visibility_sun_glare',
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

  // Page 9: Witnesses
  'witnesses_present',

  // Page 10: Police & Safety (10 fields)
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

  // Page 12: Final Medical Check
  'final_feeling',
  'form_completed_at'
];

function extractFieldsFromPdfMapper() {
  const pdfMapperPath = path.join(__dirname, '../src/services/adobePdfFormFillerService.js');
  const content = fs.readFileSync(pdfMapperPath, 'utf8');

  // Extract all field mapping calls
  const setFieldTextRegex = /setFieldText(?:WithMaxFont)?\(['"]([^'"]+)['"],\s*([^)]+)\)/g;
  const setCheckboxRegex = /setCheckbox\(['"]([^'"]+)['"],\s*([^)]+)\)/g;
  const checkFieldRegex = /checkField\(['"]([^'"]+)['"],\s*([^)]+)\)/g;  // ADDED: checkField function
  const setUrlFieldRegex = /setUrlFieldWithAutoFitFont\(['"]([^'"]+)['"],\s*([^)]+)\)/g;

  const mappedFields = new Set();
  const fieldMappings = [];

  let match;

  // Extract setFieldText mappings
  while ((match = setFieldTextRegex.exec(content)) !== null) {
    const pdfField = match[1];
    const sourceExpression = match[2].trim();
    fieldMappings.push({ pdfField, sourceExpression, type: 'text' });

    // Try to extract data source field name
    const dataFieldMatch = sourceExpression.match(/(?:incident|user|data)\.([\w_]+)/);
    if (dataFieldMatch) {
      mappedFields.add(dataFieldMatch[1]);
    }
  }

  // Extract setCheckbox mappings
  while ((match = setCheckboxRegex.exec(content)) !== null) {
    const pdfField = match[1];
    const sourceExpression = match[2].trim();
    fieldMappings.push({ pdfField, sourceExpression, type: 'checkbox' });

    const dataFieldMatch = sourceExpression.match(/(?:incident|user|data)\.([\w_]+)/);
    if (dataFieldMatch) {
      mappedFields.add(dataFieldMatch[1]);
    }
  }

  // Extract checkField mappings (ADDED)
  while ((match = checkFieldRegex.exec(content)) !== null) {
    const pdfField = match[1];
    const sourceExpression = match[2].trim();
    fieldMappings.push({ pdfField, sourceExpression, type: 'checkbox' });

    const dataFieldMatch = sourceExpression.match(/(?:incident|user|data)\.([\w_]+)/);
    if (dataFieldMatch) {
      mappedFields.add(dataFieldMatch[1]);
    }
  }

  // Extract URL field mappings
  while ((match = setUrlFieldRegex.exec(content)) !== null) {
    const pdfField = match[1];
    const sourceExpression = match[2].trim();
    fieldMappings.push({ pdfField, sourceExpression, type: 'url' });

    const dataFieldMatch = sourceExpression.match(/imageUrls\?\.([^'\s|]+)/);
    if (dataFieldMatch) {
      mappedFields.add(dataFieldMatch[1]);
    }
  }

  return { mappedFields: Array.from(mappedFields), fieldMappings };
}

function auditMappings() {
  console.log('📋 PDF Field Mapping Audit\n');
  console.log('═'.repeat(60));

  const { mappedFields, fieldMappings } = extractFieldsFromPdfMapper();

  // Find missing fields
  const missingFields = CONTROLLER_FIELDS.filter(field => {
    // Skip system fields that shouldn't be in PDF
    if (['create_user_id', 'created_at', 'updated_at'].includes(field)) {
      return false;
    }
    return !mappedFields.includes(field);
  });

  // Group missing fields by page
  const missingByPage = {
    page2_medical: [],
    page3_weather_road: [],
    page4_location_hazards: [],
    page5_vehicle: [],
    page7_other_driver: [],
    page10_police: [],
    page12_final: [],
    other: []
  };

  missingFields.forEach(field => {
    if (field.startsWith('medical_')) {
      missingByPage.page2_medical.push(field);
    } else if (field.startsWith('weather_') || field.startsWith('road_') ||
               field.startsWith('traffic_') || field.startsWith('visibility_')) {
      missingByPage.page3_weather_road.push(field);
    } else if (field.startsWith('special_condition_') || field.startsWith('junction_') ||
               field === 'location' || field === 'what3words' || field === 'nearest_landmark' ||
               field === 'user_manoeuvre' || field === 'additional_hazards' ||
               field.startsWith('visibility_')) {
      missingByPage.page4_location_hazards.push(field);
    } else if (field.startsWith('dvla_') || field.startsWith('manual_') ||
               field.startsWith('impact_point_') || field.startsWith('vehicle_') ||
               field === 'usual_vehicle' || field === 'no_damage' || field === 'damage_to_your_vehicle') {
      missingByPage.page5_vehicle.push(field);
    } else if (field.startsWith('other_') || field === 'no_visible_damage' || field === 'describe_damage_to_vehicle') {
      missingByPage.page7_other_driver.push(field);
    } else if (field.startsWith('police_') || field.startsWith('officer_') ||
               field.includes('breath_test') || field.startsWith('airbags_') ||
               field.startsWith('seatbelt') || field === 'accident_ref_number') {
      missingByPage.page10_police.push(field);
    } else if (field === 'final_feeling' || field === 'form_completed_at') {
      missingByPage.page12_final.push(field);
    } else {
      missingByPage.other.push(field);
    }
  });

  // Report results
  console.log('\n📊 AUDIT RESULTS:\n');
  console.log(`✅ Total controller fields: ${CONTROLLER_FIELDS.length}`);
  console.log(`📝 Mapped in PDF: ${mappedFields.length}`);
  console.log(`⚠️  Missing from PDF: ${missingFields.length}\n`);

  if (missingFields.length > 0) {
    console.log('🔴 MISSING FIELDS BY PAGE:\n');

    if (missingByPage.page2_medical.length > 0) {
      console.log(`\n📍 PAGE 2: Medical Information (${missingByPage.page2_medical.length} missing)`);
      console.log('─'.repeat(60));
      missingByPage.page2_medical.forEach(f => console.log(`  ❌ ${f}`));
    }

    if (missingByPage.page3_weather_road.length > 0) {
      console.log(`\n📍 PAGE 3: Weather & Road Conditions (${missingByPage.page3_weather_road.length} missing)`);
      console.log('─'.repeat(60));
      missingByPage.page3_weather_road.forEach(f => console.log(`  ❌ ${f}`));
    }

    if (missingByPage.page4_location_hazards.length > 0) {
      console.log(`\n📍 PAGE 4: Location & Hazards (${missingByPage.page4_location_hazards.length} missing)`);
      console.log('─'.repeat(60));
      missingByPage.page4_location_hazards.forEach(f => console.log(`  ❌ ${f}`));
    }

    if (missingByPage.page5_vehicle.length > 0) {
      console.log(`\n📍 PAGE 5: Your Vehicle (${missingByPage.page5_vehicle.length} missing)`);
      console.log('─'.repeat(60));
      missingByPage.page5_vehicle.forEach(f => console.log(`  ❌ ${f}`));
    }

    if (missingByPage.page7_other_driver.length > 0) {
      console.log(`\n📍 PAGE 7: Other Driver (${missingByPage.page7_other_driver.length} missing)`);
      console.log('─'.repeat(60));
      missingByPage.page7_other_driver.forEach(f => console.log(`  ❌ ${f}`));
    }

    if (missingByPage.page10_police.length > 0) {
      console.log(`\n📍 PAGE 10: Police & Safety (${missingByPage.page10_police.length} missing)`);
      console.log('─'.repeat(60));
      missingByPage.page10_police.forEach(f => console.log(`  ❌ ${f}`));
    }

    if (missingByPage.page12_final.length > 0) {
      console.log(`\n📍 PAGE 12: Final Medical Check (${missingByPage.page12_final.length} missing)`);
      console.log('─'.repeat(60));
      missingByPage.page12_final.forEach(f => console.log(`  ❌ ${f}`));
    }

    if (missingByPage.other.length > 0) {
      console.log(`\n📍 OTHER FIELDS (${missingByPage.other.length} missing)`);
      console.log('─'.repeat(60));
      missingByPage.other.forEach(f => console.log(`  ❌ ${f}`));
    }

    console.log('\n' + '═'.repeat(60));
    console.log('🔧 RECOMMENDATION: Add missing fields to PDF mapping');
    console.log('═'.repeat(60));
  } else {
    console.log('\n✅ All controller fields are mapped in PDF!\n');
  }

  // Show sample of existing mappings
  console.log('\n📝 SAMPLE OF EXISTING PDF MAPPINGS (first 10):\n');
  fieldMappings.slice(0, 10).forEach(({ pdfField, sourceExpression, type }) => {
    console.log(`  ${type.toUpperCase()}: ${pdfField} ← ${sourceExpression}`);
  });

  if (fieldMappings.length > 10) {
    console.log(`  ... and ${fieldMappings.length - 10} more mappings`);
  }
}

// Run audit
auditMappings();
