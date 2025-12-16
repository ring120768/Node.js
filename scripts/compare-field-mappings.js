/**
 * Compare PDF actual fields vs what we're mapping in code
 * Identifies missing mappings
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Fields that ARE being mapped in adobePdfFormFillerService.js
// Extracted from the code
const mappedFields = new Set([
  // Page 1: Personal Information
  'name', 'surname', 'email', 'mobile', 'street', 'street_name_optional',
  'town', 'postcode', 'country', 'driving_license_number', 'date_of_birth',
  'car_registration_number', 'vehicle_make', 'vehicle_model', 'vehicle_colour',
  'vehicle_condition', 'recovery_company', 'recovery_breakdown_number',
  'recovery_breakdown_email',

  // Page 2: Emergency Contact & Insurance
  'emergency_contact_name', 'emergency_contact_number', 'insurance_company',
  'policy_number', 'policy_holder', 'cover_type', 'Date69_af_date',
  'subscription_start_date',

  // Page 3: Personal Documentation (Images)
  'driving_license_picture', 'vehicle_picture_front', 'vehicle_picture_driver_side',
  'vehicle_picture_passenger_side', 'vehicle_picture_back',

  // Page 4: Form Metadata & Safety
  // REMOVED: form_id, submit_date, emergency_contact_made - fields do not exist in PDF
  'id', 'final_feeling', 'emergency_recording_timestamp',
  'medical_attention_needed', 'medical_how_are_you_feeling', 'medical_attention_from_who',
  'further_medical_attention_needed', 'six_point_safety_check_completed',

  // Page 4: Medical Symptoms
  'medical_symptom_chest_pain', 'medical_symptom_uncontrolled_bleeding',
  'medical_symptom_breathlessness', 'medical_symptom_limb_weakness',
  'medical_symptom_loss_of_consciousness', 'medical_symptom_severe_headache',
  'medical_symptom_abdominal_bruising', 'medical_symptom_change_in_vision',
  'medical_symptom_abdominal_pain', 'medical_symptom_limb_pain_mobilty',
  'medical_symptom_life _threatening', 'medical_symptom_dizziness',
  'medical_symptom_none', 'medical_injury_details',

  // Page 4: Accident Date/Time/Location
  'accident_date', 'accident_time', 'location', 'what3words', 'nearest_landmark',

  // Page 4: Safety Equipment
  'airbags_deployed', 'airbags_deployed_no', 'seatbelt_worn', 'seatbelt_worn_no',
  'seatbelt_reason', 'medical_ambulance_called', 'medical_injury_severity',
  'medical_hospital_name', 'medical_treatment_recieved',

  // Page 5: Weather (11 checkboxes - weather_ice removed, doesn't exist in PDF)
  'weather_bright_sunlight', 'weather_clear', 'weather_cloudy', 'weather_raining',
  'weather_heavy_rain', 'weather_drizzle', 'weather_fog', 'weather_snow',
  'weather_windy', 'weather_hail', 'weather_thunder_lightening',
  'weather_dusk',

  // Page 5: Road Conditions
  'road_condition_dry', 'road_condition_wet', 'road_condition_icy',
  'road_condition_snow_covered', 'road_condition_loose_surface',
  'road_condition_slush_on_road',

  // Page 5: Road Type
  'road_type_motorway', 'road_type_a_road', 'road_type_b_road', 'road_type_urban',
  'road_type_rural', 'road_type_car_park', 'road_type_private_road',

  // Page 6: Speed & Traffic
  'speed_limit', 'your_speed', 'traffic_conditions_heavy', 'traffic_conditions_moderate',
  'traffic_conditions_light', 'traffic_conditions_no_traffic',

  // Page 6: Visibility (visibility_clear and visibility_restricted_bend removed - don't exist in PDF)
  'visibilty_good', 'visibility_poor', 'visibility_very_poor', 'visibilty_street_lights',
  'road_markings_vsible_yes', 'road_markings_vsible_no', 'road_markings_visible_partially',
  'visibility_restricted_structure',
  'visibility_large_vehicle', 'visibility_sun_glare',

  // Page 6: Junction
  'junction_type', 'junction_control', 'traffic_light_status', 'user_manoeuvre',

  // Page 6: Special Conditions
  'special_condition_roadworks', 'special_condition_workmen', 'special_condition_cyclists',
  'special_condition_pedestrians', 'special_condition_traffic_calming',
  'special_condition_parked_vehicles', 'special_condition_crossing',
  'special_condition_school_zone', 'special_condition_narrow_road',
  'special_condition_potholes', 'special_condition_oil_spills', 'special_condition_animals',
  'additional_hazards',

  // Page 7: Your Vehicle (dvla_insurance_status, manual_make/model/colour/year removed - don't exist in PDF)
  'usual_vehicle', 'driving_your_usual_vehicle_no', 'vehicle_license_plate',
  'dvla_make', 'dvla_model', 'dvla_colour', 'dvla_year', 'dvla_fuel_type',
  'dvla_mot_status', 'dvla_mot_expiry', 'dvla_tax_status', 'dvla_tax_due_date',

  // Page 7: Impact Points
  'impact_point_front', 'impact_point_front_driver', 'impact_point_front_passenger',
  'impact_point_driver_side', 'impact_point_passenger_side', 'impact_point_rear_driver',
  'impact_point_rear_passenger', 'impact_point_rear', 'impact_point_roof',
  'impact_point_under_carriage',

  // Page 7: Damage (describle_the_damage removed - doesn't exist in PDF)
  'no_damage', 'no-visible-damage', 'open', 'damage_to_your_vehicle',
  'describe-damage-to-vehicle',
  'yes_i_drove_it_away', 'no_it_needed_to_be_towed', 'unsure _did_not_attempt',

  // Page 8: Other Vehicle (uses hyphens!) - describe_the_damage_to_the_other_vehicle removed
  'other-full-name', 'other-contact-number', 'other-email-address',
  'other-driving-license-number', 'other-vehicle-registration',
  'other-vehicle-look-up-make', 'other-vehicle-look-up-model',
  'other-vehicle-look-up-colour', 'other-vehicle-look-up-year',
  'other-vehicle-look-up-fuel-type', 'other-vehicle-look-up-mot-status',
  'other-vehicle-look-up-mot-expiry-date', 'other-vehicle-look-up-tax-status',
  'other-vehicle-look-up-tax-due-date', 'other-vehicle-look-up-insurance-status',
  'other-drivers-insurance-company', 'other-drivers-policy-number',
  'other-drivers-policy-holder-name', 'other-drivers-policy-cover-type',
  'other_driver_vehicle_marked_for_export',

  // Page 9: Witnesses (witnesses_present_no, witness_name_2, witness_mobile_number_2, witness_email_address_2 removed)
  'witnesses_present', 'witness_name', 'witness_mobile_number',
  'witness_email_address', 'witness_statement',
  'witness_email_2', 'witness_statement_2', 'witness_number',
  'additional_witnesses',

  // Page 10: Police (police_attended_no removed - doesn't exist in PDF)
  'police_attended', 'police_attend', 'police_force',
  'accident_ref_number', 'officer_name', 'officer_badge', 'user_breath_test',
  'other_breath_test',

  // Pages 11-12: Evidence (Images)
  // REMOVED: file_url_record_detailed_account_of_what_happened - doesn't exist in PDF
  'location_map_screenshot',
  'scene_photo_1_url', 'scene_photo_2_url', 'scene_photo_3_url',
  'other_vehicle_photo_1_url', 'other_vehicle_photo_2_url', 'other_vehicle_photo_3_url',
  // REMOVED: other_vehicle_photo_4_url, other_vehicle_photo_5_url - don't exist in PDF
  'vehicle_damage_photo_1_url', 'vehicle_damage_photo_2_url', 'vehicle_damage_photo_3_url',
  'vehicle_damage_photo_4_url', 'vehicle_damage_photo_5_url',

  // Pages 13-16: AI Analysis (HTML rendered but also form fields)
  'voice_transcription', 'analysis_metadata', 'quality_review', 'ai_summary',
  'closing_statement', 'final_review',

  // Page 17: Legal
  'Signature70',

  // Page 18: Emergency Audio
  'emergency_audio_transcription',
]);

async function compareFields() {
  const templatePath = path.join(__dirname, '../pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');

  console.log('📄 Loading PDF template...');
  const pdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const pdfFields = new Set();
  fields.forEach(field => {
    pdfFields.add(field.getName());
  });

  console.log(`\n📊 Summary:`);
  console.log(`   PDF form fields: ${pdfFields.size}`);
  console.log(`   Mapped in code:  ${mappedFields.size}`);

  // Find fields in PDF but NOT mapped
  const unmapped = [];
  pdfFields.forEach(fieldName => {
    if (!mappedFields.has(fieldName)) {
      const field = form.getField(fieldName);
      const fieldType = field.constructor.name.replace('PDF', '').replace('Field', '');
      unmapped.push({ name: fieldName, type: fieldType });
    }
  });

  // Find fields mapped but NOT in PDF (dead code)
  const deadMappings = [];
  mappedFields.forEach(fieldName => {
    if (!pdfFields.has(fieldName)) {
      deadMappings.push(fieldName);
    }
  });

  console.log(`\n❌ UNMAPPED (in PDF but not in code): ${unmapped.length}`);
  console.log('─'.repeat(60));
  unmapped.forEach(f => {
    console.log(`   [${f.type.padEnd(10)}] ${f.name}`);
  });

  console.log(`\n⚠️  DEAD MAPPINGS (in code but not in PDF): ${deadMappings.length}`);
  console.log('─'.repeat(60));
  deadMappings.forEach(f => {
    console.log(`   ${f}`);
  });

  // Write comparison CSV
  const csvHeader = 'Field Name,Field Type,Status,Notes';
  const csvRows = [];

  // Add all PDF fields with their status
  fields.forEach(field => {
    const fieldName = field.getName();
    const fieldType = field.constructor.name.replace('PDF', '').replace('Field', '');
    const isMapped = mappedFields.has(fieldName);
    csvRows.push(`"${fieldName}",${fieldType},${isMapped ? 'MAPPED' : 'UNMAPPED'},`);
  });

  // Add dead mappings
  deadMappings.forEach(fieldName => {
    csvRows.push(`"${fieldName}",Unknown,DEAD_MAPPING,Field not found in PDF`);
  });

  csvRows.sort();
  const csvContent = [csvHeader, ...csvRows].join('\n');

  const outputPath = path.join(__dirname, '../docs/pdf-field-comparison.csv');
  fs.writeFileSync(outputPath, csvContent);
  console.log(`\n📁 Comparison CSV saved to: ${outputPath}`);

  return { unmapped, deadMappings };
}

compareFields().catch(console.error);
