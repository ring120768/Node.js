/**
 * Generate CSV file with all 207 PDF fields and database mappings
 */

const fs = require('fs');
const path = require('path');

// Read the extracted field list
const fieldListPath = path.join(__dirname, '../field-list.json');
const fieldList = JSON.parse(fs.readFileSync(fieldListPath, 'utf8'));

// CSV header
const csv = ['PDF_Field_Name,Field_Type,Index,Multiline,DB_Table,DB_Column,UI_Page,Status,Notes'];

// Database mappings for each field
const mapping = {
  // Personal Info (18 fields)
  'name': 'user_signup,name,signup-auth.html,✅ Exists,First name',
  'surname': 'user_signup,surname,signup-auth.html,✅ Exists,Last name',
  'driver_dob': 'user_signup,date_of_birth,signup-form.html,✅ Exists,DD/MM/YYYY',
  'email': 'user_signup,email,signup-auth.html,✅ Exists,Primary contact',
  'mobile': 'user_signup,mobile,signup-form.html,✅ Exists,+44 format',
  'street': 'user_signup,street,signup-form.html,✅ Exists,Address line 1',
  'street_name_optional': 'user_signup,street_name_optional,signup-form.html,✅ Exists,Address line 2',
  'town': 'user_signup,town,signup-form.html,✅ Exists,City/town',
  'postcode': 'user_signup,postcode,signup-form.html,✅ Exists,UK postcode',
  'country': 'user_signup,country,signup-form.html,✅ Exists,Default: UK',
  'driving_license_number': 'user_signup,driving_license_number,signup-form.html,✅ Exists,UK license',
  'emergency_contact': 'user_signup,emergency_contact,signup-form.html,✅ Exists,Emergency contact',
  'car_registration_number': 'user_signup,car_registration_number,signup-form.html,✅ Exists,UK reg plate',
  'vehicle_make': 'user_signup,vehicle_make,signup-form.html,✅ Exists,e.g. PORSCHE',
  'vehicle_model': 'user_signup,vehicle_model,signup-form.html,✅ Exists,e.g. 911',
  'vehicle_colour': 'user_signup,vehicle_colour,signup-form.html,✅ Exists,e.g. BLACK',
  'vehicle_condition': 'user_signup,vehicle_condition,signup-form.html,✅ Exists,Pre-accident',
  'policy_holder': 'user_signup,policy_holder,signup-form.html,✅ Exists,Policy holder name',

  // Insurance (3 fields)
  'insurance_company': 'user_signup,insurance_company,signup-form.html,✅ Exists,e.g. Beat the Bookie',
  'policy_number': 'user_signup,policy_number,signup-form.html,✅ Exists,Policy number',
  'cover_type': 'user_signup,cover_type,signup-form.html,✅ Exists,Comprehensive/Third Party',

  // Recovery (3 fields)
  'recovery_company': 'user_signup,recovery_company,signup-form.html,✅ Exists,e.g. AA RAC',
  'recovery_breakdown_number': 'user_signup,recovery_breakdown_number,signup-form.html,✅ Exists,Membership number',
  'recovery_breakdown_email': 'user_signup,recovery_breakdown_email,signup-form.html,✅ Exists,Recovery email',

  // Medical - Safety (2 fields)
  'six_point_safety_check': 'incident_reports,six_point_safety_check,page2.html,✅ Exists,Scene safety',
  'are_you_safe': 'incident_reports,are_you_safe,page2.html,✅ Exists,Personal safety',

  // Medical - Attention (9 fields - 5 NEW)
  'ambulance_callled': 'incident_reports,ambulance_called,page2.html,🆕 NEW,Typo in PDF: callled',
  'medical_attention': 'incident_reports,medical_attention,page2.html,✅ Exists,Received medical help',
  'medical_how_are_you_feeling': 'incident_reports,medical_how_feeling,page2.html,✅ Exists,Self-assessment',
  'medical_attention_from_who': 'incident_reports,medical_attention_from_who,page2.html,✅ Exists,Paramedic/doctor',
  'hospital_or_medical_center': 'incident_reports,hospital_name,page2.html,🆕 NEW,Hospital/GP name',
  'severity_of_injuries': 'incident_reports,injury_severity,page2.html,🆕 NEW,Minor/Moderate/Severe',
  'treatment_recieved': 'incident_reports,treatment_received,page2.html,🆕 NEW,Treatment description',
  'further_medical_attention': 'incident_reports,further_medical_attention,page2.html,✅ Exists,Follow-up needed',
  'please_provide_details_of_any_injuries': 'incident_reports,injury_details,page2.html,✅ Exists,Detailed description',

  // Medical - Symptoms (11 checkboxes)
  'medical_chest_pain': 'incident_reports,symptom_chest_pain,page2.html,✅ Exists,Chest pain',
  'medical_abdominal_pain': 'incident_reports,symptom_abdominal_pain,page2.html,✅ Exists,Abdominal pain',
  'medical_abdominal_bruising': 'incident_reports,symptom_abdominal_bruising,page2.html,✅ Exists,Abdominal bruising',
  'medical_severe_headache': 'incident_reports,symptom_severe_headache,page2.html,✅ Exists,Severe headache',
  'medical_change_in_vision': 'incident_reports,symptom_vision_change,page2.html,✅ Exists,Vision change',
  'medical_uncontrolled_bleeding': 'incident_reports,symptom_uncontrolled_bleeding,page2.html,✅ Exists,Uncontrolled bleeding',
  'medical_limb_pain': 'incident_reports,symptom_limb_pain,page2.html,✅ Exists,Limb pain',
  'medical_limb_weakness': 'incident_reports,symptom_limb_weakness,page2.html,✅ Exists,Limb weakness',
  'medical_loss_of_consciousness': 'incident_reports,symptom_loss_consciousness,page2.html,✅ Exists,Loss of consciousness',
  'medical_breathlessness': 'incident_reports,symptom_breathlessness,page2.html,✅ Exists,Breathlessness',
  'medical_none_of_these': 'incident_reports,symptom_none,page2.html,✅ Exists,No symptoms',

  // Date/Time (2 fields)
  'when_did_the_accident_happen': 'incident_reports,accident_date,page3.html,✅ Exists,DD/MM/YYYY',
  'what_time_did_the_accident_happen': 'incident_reports,accident_time,page3.html,✅ Exists,HH:MM 24hr',

  // Weather - Original (8 fields)
  'weather_clear_and_dry': 'incident_reports,weather_clear_dry,page4.html,✅ Exists,Clear and dry',
  'weather_bright_daylight': 'incident_reports,weather_bright_daylight,page4.html,✅ Exists,Bright daylight',
  'weather_overcast': 'incident_reports,weather_overcast,page4.html,✅ Exists,Overcast',
  'weather_heavy_rain': 'incident_reports,weather_heavy_rain,page4.html,✅ Exists,Heavy rain',
  'weather_fog': 'incident_reports,weather_fog,page4.html,✅ Exists,Fog',
  'weather_snow': 'incident_reports,weather_snow,page4.html,✅ Exists,Snow',
  'weather_dusk': 'incident_reports,weather_dusk,page4.html,✅ Exists,Dusk',
  'weather_street_lights': 'incident_reports,weather_street_lights,page4.html,✅ Exists,Street lights on',

  // Weather - NEW (5 fields)
  'weather_thunder_lightening': 'incident_reports,weather_thunder_lightning,page4.html,🆕 NEW,Thunder/lightning (typo in PDF)',
  'weather_drizzle': 'incident_reports,weather_drizzle,page4.html,🆕 NEW,Light rain/drizzle',
  'weather_raining': 'incident_reports,weather_raining,page4.html,🆕 NEW,Moderate rain',
  'weather-hail': 'incident_reports,weather_hail,page4.html,🆕 NEW,Hail/sleet (hyphen in PDF)',
  'weather_windy': 'incident_reports,weather_windy,page4.html,🆕 NEW,Strong wind',

  // Road Surface - Original (4 fields)
  'weather_road_dry': 'incident_reports,road_surface_dry,page4.html,✅ Exists,Dry road',
  'weather_wet_road': 'incident_reports,road_surface_wet,page4.html,✅ Exists,Wet road',
  'weather_ice_on_road': 'incident_reports,road_surface_ice,page4.html,✅ Exists,Ice on road',
  'weather_snow_on_road': 'incident_reports,road_surface_snow,page4.html,✅ Exists,Snow on road',

  // Road Surface - NEW (2 fields)
  'weather_slush_road': 'incident_reports,road_surface_slush,page4.html,🆕 NEW,Slush on road',
  'weather_loose_surface_road': 'incident_reports,road_surface_loose,page4.html,🆕 NEW,Loose surface',

  // Road Type (7 fields)
  'road_type_motorway': 'incident_reports,road_type_motorway,page4.html,✅ Exists,Motorway',
  'road_type_a_road': 'incident_reports,road_type_a_road,page4.html,✅ Exists,A-Road',
  'road_type_b_road': 'incident_reports,road_type_b_road,page4.html,✅ Exists,B-Road',
  'road_type_urban': 'incident_reports,road_type_urban,page4.html,✅ Exists,Urban road',
  'road_type_rural': 'incident_reports,road_type_rural,page4.html,✅ Exists,Rural road',
  'road_type_car_park': 'incident_reports,road_type_car_park,page4.html,✅ Exists,Car park',
  'road_type_private_road': 'incident_reports,road_type_private_road,page4.html,✅ Exists,Private road',

  // Traffic Conditions - NEW (4 fields)
  'traffic_conditions_heavy': 'incident_reports,traffic_heavy,page4.html,🆕 NEW,Heavy traffic',
  'traffic_conditions_moderate': 'incident_reports,traffic_moderate,page4.html,🆕 NEW,Moderate traffic',
  'traffic_conditions_light': 'incident_reports,traffic_light,page4.html,🆕 NEW,Light traffic',
  'traffic_conditions_no_traffic': 'incident_reports,traffic_none,page4.html,🆕 NEW,No traffic',

  // Road Markings - NEW (3 fields)
  'road_markings_yes': 'incident_reports,road_markings_present,page4.html,🆕 NEW,Clear markings',
  'road_markings_partial': 'incident_reports,road_markings_partial,page4.html,🆕 NEW,Faded/partial',
  'road_markings_no': 'incident_reports,road_markings_absent,page4.html,🆕 NEW,No markings',

  // Visibility - NEW (3 fields)
  'visabilty_good': 'incident_reports,visibility_good,page4.html,🆕 NEW,Good visibility (typo in PDF)',
  'visability_poor': 'incident_reports,visibility_poor,page4.html,🆕 NEW,Poor visibility (typo in PDF)',
  'visability_very_poor': 'incident_reports,visibility_very_poor,page4.html,🆕 NEW,Very poor visibility (typo in PDF)',

  // Speed & Location (5 fields)
  'speed_limit': 'incident_reports,speed_limit,page4.html,✅ Exists,Speed limit mph',
  'your_estimated_speed_mph': 'incident_reports,estimated_speed,page4.html,✅ Exists,Your speed mph',
  'what3words_address': 'incident_reports,what3words,page5.html,✅ Exists,///word.word.word',
  'nearest_landmark': 'incident_reports,nearest_landmark,page5.html,✅ Exists,Landmark',
  'full_address_location_description': 'incident_reports,location_description,page5.html,✅ Exists,Full location',

  // Junction (4 fields)
  'what_type_of_junction_was_it': 'incident_reports,junction_type,page5.html,✅ Exists,Junction type',
  'what_controlled_this_junction': 'incident_reports,junction_control,page5.html,✅ Exists,Traffic control',
  'what_were_you_doing_when_the_collision_occurred': 'incident_reports,action_at_collision,page5.html,✅ Exists,Your action',
  'what _color_were_traffic _lights': 'incident_reports,traffic_light_color,page5.html,✅ Exists,Traffic light color (spaces in PDF)',

  // Special Conditions/Hazards (16 fields)
  'special_conditions_workman': 'incident_reports,hazard_workman,page6.html,✅ Exists,Workmen present',
  'special_conditions_roadworks': 'incident_reports,hazard_roadworks,page6.html,✅ Exists,Roadworks',
  'special_conditions_pedestrians': 'incident_reports,hazard_pedestrians,page6.html,✅ Exists,Pedestrians',
  'special_conditions_pedestrian_crossing': 'incident_reports,hazard_ped_crossing,page6.html,✅ Exists,Ped crossing',
  'special_conditions_cyclists': 'incident_reports,hazard_cyclists,page6.html,✅ Exists,Cyclists',
  'special_conditions_school': 'incident_reports,hazard_school,page6.html,✅ Exists,School zone',
  'special_conditions_traffic_calming': 'incident_reports,hazard_traffic_calming,page6.html,✅ Exists,Traffic calming',
  'special_conditions_sun_glare': 'incident_reports,hazard_sun_glare,page6.html,✅ Exists,Sun glare',
  'special_conditions_oil_spills': 'incident_reports,hazard_oil_spill,page6.html,✅ Exists,Oil spill',
  'special_conditions_defective_road': 'incident_reports,hazard_defective_road,page6.html,✅ Exists,Defective road',
  'special_conditions_pot_holes': 'incident_reports,hazard_pot_holes,page6.html,✅ Exists,Pot holes',
  'special_conditions_hedgerow': 'incident_reports,hazard_hedgerow,page6.html,✅ Exists,Hedgerow',
  'special_conditions_narrow_road': 'incident_reports,hazard_narrow_road,page6.html,✅ Exists,Narrow road',
  'special_conditions_large_vehicle': 'incident_reports,hazard_large_vehicle,page6.html,✅ Exists,Large vehicle',
  'special_conditions_none_of_these': 'incident_reports,hazard_none,page6.html,✅ Exists,No special hazards',
  'special_conditions_additional_hazards': 'incident_reports,hazard_additional,page6.html,✅ Exists,Additional hazards',

  // DVLA Lookup - Your Vehicle - NEW (10 fields)
  'uk_licence_plate_look_up': 'incident_reports,dvla_lookup_reg,page7.html,🆕 NEW,Reg searched',
  'vehicle_found_make': 'incident_reports,dvla_vehicle_make,page7.html,🆕 NEW,From DVLA API',
  'vehicle_found_model': 'incident_reports,dvla_vehicle_model,page7.html,🆕 NEW,From DVLA API',
  'vehicle_found_color': 'incident_reports,dvla_vehicle_color,page7.html,🆕 NEW,From DVLA API',
  'vehicle_found_year': 'incident_reports,dvla_vehicle_year,page7.html,🆕 NEW,From DVLA API',
  'vehicle_found_fuel_type': 'incident_reports,dvla_fuel_type,page7.html,🆕 NEW,Petrol/Diesel/Electric',
  'vehicle_found_mot': 'incident_reports,dvla_mot_status,page7.html,🆕 NEW,Valid/Expired',
  'vehicle_found_mot_expiry': 'incident_reports,dvla_mot_expiry_date,page7.html,🆕 NEW,DD/MM/YYYY',
  'vehicle_found_road_tax': 'incident_reports,dvla_tax_status,page7.html,🆕 NEW,Taxed/SORN/Untaxed',
  'vehicle_found_road_tax_due_date': 'incident_reports,dvla_tax_due_date,page7.html,🆕 NEW,DD/MM/YYYY',

  // Your Vehicle Damage (13 fields)
  'yes_i_drove_it_away': 'incident_reports,vehicle_driveable_yes,page8.html,✅ Exists,Drove away',
  'no_it_needed_to_be_towed': 'incident_reports,vehicle_driveable_no,page8.html,✅ Exists,Needed towing',
  'unsure _did_not_attempt': 'incident_reports,vehicle_driveable_unsure,page8.html,✅ Exists,Unsure (space in PDF)',
  'my_vehicle_has_no_visible_damage': 'incident_reports,damage_none,page8.html,✅ Exists,No damage',
  'vehicle_damage_front': 'incident_reports,damage_front,page8.html,✅ Exists,Front damage',
  'vehicle_damage_rear': 'incident_reports,damage_rear,page8.html,✅ Exists,Rear damage',
  'vehicle_damage_driver_side': 'incident_reports,damage_driver_side,page8.html,✅ Exists,Driver side',
  'vehicle_damage_passenger_side': 'incident_reports,damage_passenger_side,page8.html,✅ Exists,Passenger side',
  'vehicle_damage_front_driver_side': 'incident_reports,damage_front_driver,page8.html,✅ Exists,Front driver',
  'vehicle_damage_rear_driver_side': 'incident_reports,damage_rear_driver,page8.html,✅ Exists,Rear driver',
  'vehicle_damage_front_assenger_side': 'incident_reports,damage_front_passenger,page8.html,✅ Exists,Front passenger (typo in PDF)',
  'vehicle_damage_rear_passenger_side': 'incident_reports,damage_rear_passenger,page8.html,✅ Exists,Rear passenger',
  'vehicle_damage_under-carriage': 'incident_reports,damage_undercarriage,page8.html,✅ Exists,Undercarriage',
  'vehicle_damage_roof': 'incident_reports,damage_roof,page8.html,✅ Exists,Roof',

  // Usual Vehicle (2 fields)
  'driving_your_usual_vehicle_yes': 'incident_reports,usual_vehicle_yes,page8.html,✅ Exists,Usual vehicle yes',
  'driving_your_usual_vehicle_no': 'incident_reports,usual_vehicle_no,page8.html,✅ Exists,Usual vehicle no',

  // Other Vehicle - Driver (4 fields)
  'other_drivers_name': 'incident_other_vehicles,driver_name,page9.html,✅ Exists,Other driver name',
  'other_driver_email_address': 'incident_other_vehicles,driver_email,page9.html,✅ Exists,Other driver email',
  'other_driver_mobile_number': 'incident_other_vehicles,driver_mobile,page9.html,✅ Exists,Other driver mobile',
  'other_driver_license_number': 'incident_other_vehicles,driver_license_number,page9.html,✅ Exists,Other driver license',

  // Other Vehicle - Details (6 fields)
  'other_car_colour_vehicle_license_plate': 'incident_other_vehicles,vehicle_registration,page9.html,✅ Exists,Other vehicle reg (odd naming)',
  'other_make_of_car': 'incident_other_vehicles,vehicle_make,page9.html,✅ Exists,Other vehicle make',
  'other_car_vehicle_model': 'incident_other_vehicles,vehicle_model,page9.html,✅ Exists,Other vehicle model',
  'other_car_colour': 'incident_other_vehicles,vehicle_color,page9.html,✅ Exists,Other vehicle color',
  'other_car_vehicle_year': 'incident_other_vehicles,vehicle_year,page9.html,✅ Exists,Other vehicle year',
  'other_car_vehicle_fuel_type': 'incident_other_vehicles,vehicle_fuel_type,page9.html,✅ Exists,Other fuel type',

  // Other Vehicle - DVLA Lookup - NEW (6 fields)
  'other_car_mot_status': 'incident_other_vehicles,mot_status,page9.html,🆕 NEW,From DVLA API',
  'other_car_mot_expiry': 'incident_other_vehicles,mot_expiry_date,page9.html,🆕 NEW,From DVLA API',
  'other_car_tax_status': 'incident_other_vehicles,tax_status,page9.html,🆕 NEW,From DVLA API',
  'other_car_tax_due_date': 'incident_other_vehicles,tax_due_date,page9.html,🆕 NEW,From DVLA API',
  'other_car_insurance_status': 'incident_other_vehicles,insurance_status,page9.html,🆕 NEW,From MIB database',
  'other_driver_vehicle_marked_for_export': 'incident_other_vehicles,marked_for_export,page9.html,🆕 NEW,From DVLA API',

  // Other Vehicle - Insurance (4 fields - 3 NEW)
  'other_car_insurance_company': 'incident_other_vehicles,insurance_company,page9.html,✅ Exists,Other insurance co',
  'other_car_colour_policy number': 'incident_other_vehicles,insurance_policy_number,page9.html,🆕 NEW,Policy number (odd naming)',
  'other_car_colour_policy holder': 'incident_other_vehicles,insurance_policy_holder,page9.html,🆕 NEW,Policy holder (odd naming)',
  'other_car_colour_policy_cover_type': 'incident_other_vehicles,insurance_cover_type,page9.html,🆕 NEW,Cover type (odd naming)',

  // Other Vehicle - Damage (2 fields)
  'other_car_no_visible_damage': 'incident_other_vehicles,no_visible_damage,page9.html,✅ Exists,No damage',
  'describe_the_damage_to_the_other_vehicle': 'incident_other_vehicles,damage_description,page9.html,✅ Exists,Damage description',

  // Witnesses - Presence (2 fields)
  'any_witness': 'incident_witnesses,witnesses_present_yes,page10.html,✅ Exists,Witnesses yes',
  'any_witness_no': 'incident_witnesses,witnesses_present_no,page10.html,✅ Exists,Witnesses no',

  // Witness 1 (4 fields)
  'witness_name': 'incident_witnesses,witness_1_name,page10.html,✅ Exists,Witness 1 name',
  'witness_mobile_number': 'incident_witnesses,witness_1_mobile,page10.html,✅ Exists,Witness 1 mobile',
  'witness_email_address': 'incident_witnesses,witness_1_email,page10.html,✅ Exists,Witness 1 email',
  'witness_statement': 'incident_witnesses,witness_1_statement,page10.html,✅ Exists,Witness 1 statement',

  // Witness 2 - NEW (4 fields)
  'witness_name_2': 'incident_witnesses,witness_2_name,page10.html,🆕 NEW,Witness 2 name',
  'witness_mobile_number_2': 'incident_witnesses,witness_2_mobile,page10.html,🆕 NEW,Witness 2 mobile',
  'witness_email_address_2': 'incident_witnesses,witness_2_email,page10.html,🆕 NEW,Witness 2 email',
  'witness_statement_2': 'incident_witnesses,witness_2_statement,page10.html,🆕 NEW,Witness 2 statement',

  // Police (8 fields)
  'did_police_attend': 'incident_reports,police_attended_yes,page11.html,✅ Exists,Police yes',
  'did_police_attend_no': 'incident_reports,police_attended_no,page11.html,✅ Exists,Police no',
  'police_officer_name': 'incident_reports,police_officer_name,page11.html,✅ Exists,Officer name',
  'police_officer_badge_number': 'incident_reports,police_badge_number,page11.html,✅ Exists,Badge number',
  'police_force_details': 'incident_reports,police_force,page11.html,✅ Exists,Police force',
  'accident_reference_number': 'incident_reports,police_reference_number,page11.html,✅ Exists,Reference number',
  'breath_test': 'incident_reports,breath_test_result_you,page11.html,✅ Exists,Your breath test',
  'other_breath_test': 'incident_reports,breath_test_result_other,page11.html,✅ Exists,Other breath test',

  // Safety Equipment (5 fields)
  'wearing_seatbelts': 'incident_reports,seatbelt_yes,page12.html,✅ Exists,Seatbelt yes',
  'wearing_seatbelts_no': 'incident_reports,seatbelt_no,page12.html,✅ Exists,Seatbelt no',
  'reason_no_seatbelts': 'incident_reports,seatbelt_reason_not_worn,page12.html,✅ Exists,Reason not worn',
  'airbags_deployed': 'incident_reports,airbags_deployed_yes,page12.html,✅ Exists,Airbags yes',
  'airbags_deployed_no': 'incident_reports,airbags_deployed_no,page12.html,✅ Exists,Airbags no',

  // Image File Paths (5 fields)
  'vehicle_picture_front': 'user_documents,storage_path,signup-form.html,✅ Exists,Front image path',
  'vehicle_picture_driver_side': 'user_documents,storage_path,signup-form.html,✅ Exists,Driver side path',
  'vehicle_picture_passenger_side': 'user_documents,storage_path,signup-form.html,✅ Exists,Passenger side path',
  'vehicle_picture_back': 'user_documents,storage_path,signup-form.html,✅ Exists,Back image path',
  'driving_license_picture': 'user_documents,storage_path,signup-form.html,✅ Exists,License image path',

  // Image URLs - NEW (13 fields)
  'vehicle_images_file_1_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'vehicle_images_file_2_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'vehicle_images_file_3_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'vehicle_images_file_4_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'vehicle_images_file_5_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'vehicle_images_file_6_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'scene_images_file_1_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'scene_images_file_2_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'scene_images_file_3_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'other_vehicle_images_1_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'other_vehicle_images_2_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'other_vehicle_images_3_url': 'generated,N/A,various,🆕 NEW,Signed URL for embedding',
  'what3Words_map_image_url': 'generated,N/A,page5.html,🆕 NEW,what3words map image',

  // AI/Transcription (4 fields)
  'ai_transcription': 'ai_transcription,transcript_text,transcription-status.html,✅ Exists,Whisper transcript',
  'ai_model_used': 'ai_transcription,model,transcription-status.html,✅ Exists,Model name',
  'ai_summary': 'ai_summary,summary_text,transcription-status.html,✅ Exists,Legal summary',
  'ai_narrative_text': 'ai_summary,narrative,transcription-status.html,✅ Exists,Plain English',

  // Additional Comments (1 field)
  'anything_else_important': 'incident_reports,additional_comments,page13.html,✅ Exists,Additional info',

  // Declaration/Signature (3 fields)
  'Signature70': 'incident_reports,signature_data,declaration.html,✅ Exists,Base64 signature',
  'Date69_af_date': 'incident_reports,signature_date,declaration.html,✅ Exists,Signature date',
  'time_stamp': 'incident_reports,timestamp,declaration.html,✅ Exists,Auto timestamp',

  // User ID - NEW (1 field) - CRITICAL
  'id': 'user_signup,create_user_id,footer/header,🆕 NEW,UUID tracking field (REQUESTED)'
};

// Generate CSV rows
fieldList.fields.forEach(field => {
  const mapData = mapping[field.name] || ',,,🔴 UNMAPPED,Missing mapping';
  const parts = mapData.split(',');
  const multiline = field.multiline !== undefined ? (field.multiline ? 'Yes' : 'No') : '';

  csv.push(`${field.name},${field.type},${field.index},${multiline},${parts.join(',')}`);
});

// Write CSV file
const outputPath = path.join(__dirname, '../MASTER_PDF_FIELD_LIST_207_FIELDS.csv');
fs.writeFileSync(outputPath, csv.join('\n'));

console.log('✅ Created: MASTER_PDF_FIELD_LIST_207_FIELDS.csv');
console.log(`✅ Total fields: ${fieldList.fields.length}`);
console.log(`✅ New fields: ${Object.values(mapping).filter(v => v.includes('🆕 NEW')).length}`);
console.log(`✅ Existing fields: ${Object.values(mapping).filter(v => v.includes('✅ Exists')).length}`);
