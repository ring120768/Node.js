/**
 * PDF Form Field Constants
 *
 * Maps logical field names to actual PDF field names (including typos).
 * If the PDF template is ever fixed, update the values here - one place to change.
 *
 * Template: pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf
 * Total Fields: 213 (120 text, 92 checkbox, 1 signature)
 *
 * NAMING CONVENTION:
 * - Keys: SCREAMING_SNAKE_CASE logical names (what the field SHOULD be called)
 * - Values: Actual PDF field names (including typos like 'visibilty', 'mobilty')
 *
 * Generated from EXTRACTED_PDF_FIELDS.csv
 */

// ========================================
// TEXT FIELDS (120)
// ========================================
const TEXT_FIELDS = {
  // Page 1: Personal Info
  NAME: 'name',
  SURNAME: 'surname',
  EMAIL: 'email',
  MOBILE: 'mobile',
  DATE_OF_BIRTH: 'date_of_birth',
  STREET: 'street',
  TOWN: 'town',
  POSTCODE: 'postcode',
  COUNTRY: 'country',
  EMERGENCY_CONTACT_NAME: 'emergency_contact_name',
  EMERGENCY_CONTACT_NUMBER: 'emergency_contact_number',

  // Page 2: Accident Details
  ACCIDENT_DATE: 'accident_date',
  ACCIDENT_TIME: 'accident_time',
  LOCATION: 'location',
  STREET_NAME_OPTIONAL: 'street_name_optional',
  NEAREST_LANDMARK: 'nearest_landmark',
  SPEED_LIMIT: 'speed_limit',
  YOUR_SPEED: 'your_speed',
  TRAFFIC_LIGHT_STATUS: 'traffic_light_status',
  JUNCTION_TYPE: 'junction_type',
  JUNCTION_CONTROL: 'junction_control',
  USER_MANOEUVRE: 'user_manoeuvre',
  ADDITIONAL_HAZARDS: 'additional_hazards',

  // Page 4: Scene Photos
  SCENE_PHOTO_1_URL: 'scene_photo_1_url',
  SCENE_PHOTO_2_URL: 'scene_photo_2_url',
  SCENE_PHOTO_3_URL: 'scene_photo_3_url',
  WHAT3WORDS: 'what3words',
  LOCATION_MAP_SCREENSHOT: 'location_map_screenshot',

  // Page 5: Medical
  MEDICAL_HOW_ARE_YOU_FEELING: 'medical_how_are_you_feeling',
  MEDICAL_INJURY_DETAILS: 'medical_injury_details',
  MEDICAL_INJURY_SEVERITY: 'medical_injury_severity',
  MEDICAL_ATTENTION_FROM_WHO: 'medical_attention_from_who',
  MEDICAL_HOSPITAL_NAME: 'medical_hospital_name',
  MEDICAL_TREATMENT_RECEIVED: 'medical_treatment_recieved',  // PDF TYPO: 'recieved' not 'received'
  FURTHER_MEDICAL_ATTENTION_NEEDED: 'further_medical_attention_needed',

  // Page 6: Insurance
  INSURANCE_COMPANY: 'insurance_company',
  POLICY_NUMBER: 'policy_number',
  POLICY_HOLDER: 'policy_holder',
  COVER_TYPE: 'cover_type',
  DRIVING_LICENSE_NUMBER: 'driving_license_number',
  DRIVING_LICENSE_PICTURE: 'driving_license_picture',
  SUBSCRIPTION_START_DATE: 'subscription_start_date',

  // Page 7: Your Vehicle
  VEHICLE_LICENSE_PLATE: 'vehicle_license_plate',
  DVLA_MAKE: 'dvla_make',
  DVLA_MODEL: 'dvla_model',
  DVLA_COLOUR: 'dvla_colour',
  DVLA_YEAR: 'dvla_year',
  DVLA_FUEL_TYPE: 'dvla_fuel_type',
  DVLA_MOT_STATUS: 'dvla_mot_status',
  DVLA_MOT_EXPIRY: 'dvla_mot_expiry',
  DVLA_TAX_STATUS: 'dvla_tax_status',
  DVLA_TAX_DUE_DATE: 'dvla_tax_due_date',
  VEHICLE_MAKE: 'vehicle_make',
  VEHICLE_MODEL: 'vehicle_model',
  VEHICLE_COLOUR: 'vehicle_colour',
  DESCRIBE_DAMAGE_TO_VEHICLE: 'describe-damage-to-vehicle',  // PDF uses hyphen
  DAMAGE_TO_YOUR_VEHICLE: 'damage_to_your_vehicle',
  VEHICLE_CONDITION: 'vehicle_condition',
  SEATBELT_REASON: 'seatbelt_reason',

  // Page 8: Vehicle Photos
  VEHICLE_PICTURE_FRONT: 'vehicle_picture_front',
  VEHICLE_PICTURE_BACK: 'vehicle_picture_back',
  VEHICLE_PICTURE_DRIVER_SIDE: 'vehicle_picture_driver_side',
  VEHICLE_PICTURE_PASSENGER_SIDE: 'vehicle_picture_passenger_side',
  VEHICLE_DAMAGE_PHOTO_1_URL: 'vehicle_damage_photo_1_url',
  VEHICLE_DAMAGE_PHOTO_2_URL: 'vehicle_damage_photo_2_url',
  VEHICLE_DAMAGE_PHOTO_3_URL: 'vehicle_damage_photo_3_url',
  VEHICLE_DAMAGE_PHOTO_4_URL: 'vehicle_damage_photo_4_url',
  VEHICLE_DAMAGE_PHOTO_5_URL: 'vehicle_damage_photo_5_url',

  // Page 9: Recovery
  RECOVERY_COMPANY: 'recovery_company',
  RECOVERY_BREAKDOWN_NUMBER: 'recovery_breakdown_number',
  RECOVERY_BREAKDOWN_EMAIL: 'recovery_breakdown_email',

  // Page 10: Other Vehicle (PDF uses hyphens!)
  OTHER_VEHICLE_REGISTRATION: 'other-vehicle-registration',
  CAR_REGISTRATION_NUMBER: 'car_registration_number',
  OTHER_FULL_NAME: 'other-full-name',
  OTHER_CONTACT_NUMBER: 'other-contact-number',
  OTHER_EMAIL_ADDRESS: 'other-email-address',
  OTHER_DRIVING_LICENSE_NUMBER: 'other-driving-license-number',
  OTHER_VEHICLE_LOOK_UP_MAKE: 'other-vehicle-look-up-make',
  OTHER_VEHICLE_LOOK_UP_MODEL: 'other-vehicle-look-up-model',
  OTHER_VEHICLE_LOOK_UP_COLOUR: 'other-vehicle-look-up-colour',
  OTHER_VEHICLE_LOOK_UP_YEAR: 'other-vehicle-look-up-year',
  OTHER_VEHICLE_LOOK_UP_FUEL_TYPE: 'other-vehicle-look-up-fuel-type',
  OTHER_VEHICLE_LOOK_UP_MOT_STATUS: 'other-vehicle-look-up-mot-status',
  OTHER_VEHICLE_LOOK_UP_MOT_EXPIRY_DATE: 'other-vehicle-look-up-mot-expiry-date',
  OTHER_VEHICLE_LOOK_UP_TAX_STATUS: 'other-vehicle-look-up-tax-status',
  OTHER_VEHICLE_LOOK_UP_TAX_DUE_DATE: 'other-vehicle-look-up-tax-due-date',
  OTHER_VEHICLE_LOOK_UP_INSURANCE_STATUS: 'other-vehicle-look-up-insurance-status',
  OTHER_DRIVER_VEHICLE_MARKED_FOR_EXPORT: 'other_driver_vehicle_marked_for_export',
  OTHER_DRIVERS_INSURANCE_COMPANY: 'other-drivers-insurance-company',
  OTHER_DRIVERS_POLICY_NUMBER: 'other-drivers-policy-number',
  OTHER_DRIVERS_POLICY_HOLDER_NAME: 'other-drivers-policy-holder-name',
  OTHER_DRIVERS_POLICY_COVER_TYPE: 'other-drivers-policy-cover-type',
  OTHER_BREATH_TEST: 'other_breath_test',
  USER_BREATH_TEST: 'user_breath_test',
  OTHER_VEHICLE_PHOTO_1_URL: 'other_vehicle_photo_1_url',
  OTHER_VEHICLE_PHOTO_2_URL: 'other_vehicle_photo_2_url',
  OTHER_VEHICLE_PHOTO_3_URL: 'other_vehicle_photo_3_url',

  // Page 11: Police
  POLICE_FORCE: 'police_force',
  OFFICER_NAME: 'officer_name',
  OFFICER_BADGE: 'officer_badge',
  ACCIDENT_REF_NUMBER: 'accident_ref_number',

  // Page 12: Witnesses
  WITNESS_NAME: 'witness_name',
  WITNESS_MOBILE_NUMBER: 'witness_mobile_number',
  WITNESS_EMAIL_ADDRESS: 'witness_email_address',
  WITNESS_STATEMENT: 'witness_statement',
  WITNESS_NUMBER: 'witness_number',
  WITNESS_EMAIL_2: 'witness_email_2',
  WITNESS_STATEMENT_2: 'witness_statement_2',
  ADDITIONAL_WITNESSES: 'additional_witnesses',

  // Pages 13-16: AI Analysis (HTML rendered, but fields exist)
  VOICE_TRANSCRIPTION: 'voice_transcription',
  ANALYSIS_METADATA: 'analysis_metadata',
  QUALITY_REVIEW: 'quality_review',
  AI_SUMMARY: 'ai_summary',
  CLOSING_STATEMENT: 'closing_statement',
  FINAL_REVIEW: 'final_review',

  // Page 17: Declaration
  ID: 'id',
  OPEN: 'open',
  DATE69_AF_DATE: 'Date69_af_date',

  // Page 18: Emergency Audio
  EMERGENCY_AUDIO_TRANSCRIPTION: 'emergency_audio_transcription',
  EMERGENCY_RECORDING_TIMESTAMP: 'emergency_recording_timestamp'
};

// ========================================
// CHECKBOX FIELDS (92)
// Keys = logical names, Values = actual PDF field names (with typos)
// ========================================
const CHECKBOX_FIELDS = {
  // Weather conditions (12 checkboxes)
  WEATHER_BRIGHT_SUNLIGHT: 'weather_bright_sunlight',
  WEATHER_CLEAR: 'weather_clear',
  WEATHER_CLOUDY: 'weather_cloudy',
  WEATHER_DRIZZLE: 'weather_drizzle',
  WEATHER_DUSK: 'weather_dusk',
  WEATHER_FOG: 'weather_fog',
  WEATHER_HAIL: 'weather_hail',
  WEATHER_HEAVY_RAIN: 'weather_heavy_rain',
  WEATHER_RAINING: 'weather_raining',
  WEATHER_SNOW: 'weather_snow',
  WEATHER_THUNDER_LIGHTNING: 'weather_thunder_lightening',  // PDF TYPO: 'lightening' not 'lightning'
  WEATHER_WINDY: 'weather_windy',

  // Road conditions (6 checkboxes)
  ROAD_CONDITION_DRY: 'road_condition_dry',
  ROAD_CONDITION_ICY: 'road_condition_icy',
  ROAD_CONDITION_LOOSE_SURFACE: 'road_condition_loose_surface',
  ROAD_CONDITION_SLUSH_ON_ROAD: 'road_condition_slush_on_road',
  ROAD_CONDITION_SNOW_COVERED: 'road_condition_snow_covered',
  ROAD_CONDITION_WET: 'road_condition_wet',

  // Road type (7 checkboxes)
  ROAD_TYPE_A_ROAD: 'road_type_a_road',
  ROAD_TYPE_B_ROAD: 'road_type_b_road',
  ROAD_TYPE_CAR_PARK: 'road_type_car_park',
  ROAD_TYPE_MOTORWAY: 'road_type_motorway',
  ROAD_TYPE_PRIVATE_ROAD: 'road_type_private_road',
  ROAD_TYPE_RURAL: 'road_type_rural',
  ROAD_TYPE_URBAN: 'road_type_urban',

  // Road markings visibility (3 checkboxes)
  ROAD_MARKINGS_VISIBLE_PARTIALLY: 'road_markings_visible_partially',
  ROAD_MARKINGS_VISIBLE_NO: 'road_markings_vsible_no',   // PDF TYPO: 'vsible' not 'visible'
  ROAD_MARKINGS_VISIBLE_YES: 'road_markings_vsible_yes', // PDF TYPO: 'vsible' not 'visible'

  // Visibility (7 checkboxes)
  VISIBILITY_GOOD: 'visibilty_good',         // PDF TYPO: 'visibilty' not 'visibility'
  VISIBILITY_STREET_LIGHTS: 'visibilty_street_lights', // PDF TYPO: 'visibilty' not 'visibility'
  VISIBILITY_LARGE_VEHICLE: 'visibility_large_vehicle',
  VISIBILITY_POOR: 'visibility_poor',
  VISIBILITY_RESTRICTED_STRUCTURE: 'visibility_restricted_structure',
  VISIBILITY_SUN_GLARE: 'visibility_sun_glare',
  VISIBILITY_VERY_POOR: 'visibility_very_poor',

  // Traffic conditions (4 checkboxes)
  TRAFFIC_CONDITIONS_HEAVY: 'traffic_conditions_heavy',
  TRAFFIC_CONDITIONS_LIGHT: 'traffic_conditions_light',
  TRAFFIC_CONDITIONS_MODERATE: 'traffic_conditions_moderate',
  TRAFFIC_CONDITIONS_NO_TRAFFIC: 'traffic_conditions_no_traffic',

  // Special conditions/hazards (12 checkboxes)
  SPECIAL_CONDITION_ANIMALS: 'special_condition_animals',
  SPECIAL_CONDITION_CROSSING: 'special_condition_crossing',
  SPECIAL_CONDITION_CYCLISTS: 'special_condition_cyclists',
  SPECIAL_CONDITION_NARROW_ROAD: 'special_condition_narrow_road',
  SPECIAL_CONDITION_OIL_SPILLS: 'special_condition_oil_spills',
  SPECIAL_CONDITION_PARKED_VEHICLES: 'special_condition_parked_vehicles',
  SPECIAL_CONDITION_PEDESTRIANS: 'special_condition_pedestrians',
  SPECIAL_CONDITION_POTHOLES: 'special_condition_potholes',
  SPECIAL_CONDITION_ROADWORKS: 'special_condition_roadworks',
  SPECIAL_CONDITION_SCHOOL_ZONE: 'special_condition_school_zone',
  SPECIAL_CONDITION_TRAFFIC_CALMING: 'special_condition_traffic_calming',
  SPECIAL_CONDITION_WORKMEN: 'special_condition_workmen',

  // Medical symptoms (15 checkboxes)
  MEDICAL_SYMPTOM_ABDOMINAL_BRUISING: 'medical_symptom_abdominal_bruising',
  MEDICAL_SYMPTOM_ABDOMINAL_PAIN: 'medical_symptom_abdominal_pain',
  MEDICAL_SYMPTOM_BREATHLESSNESS: 'medical_symptom_breathlessness',
  MEDICAL_SYMPTOM_CHANGE_IN_VISION: 'medical_symptom_change_in_vision',
  MEDICAL_SYMPTOM_CHEST_PAIN: 'medical_symptom_chest_pain',
  MEDICAL_SYMPTOM_DIZZINESS: 'medical_symptom_dizziness',
  MEDICAL_SYMPTOM_LIFE_THREATENING: 'medical_symptom_life _threatening', // PDF TYPO: has space before 'threatening'
  MEDICAL_SYMPTOM_LIMB_PAIN_MOBILITY: 'medical_symptom_limb_pain_mobilty', // PDF TYPO: 'mobilty' not 'mobility'
  MEDICAL_SYMPTOM_LIMB_WEAKNESS: 'medical_symptom_limb_weakness',
  MEDICAL_SYMPTOM_LOSS_OF_CONSCIOUSNESS: 'medical_symptom_loss_of_consciousness',
  MEDICAL_SYMPTOM_NONE: 'medical_symptom_none',
  MEDICAL_SYMPTOM_SEVERE_HEADACHE: 'medical_symptom_severe_headache',
  MEDICAL_SYMPTOM_UNCONTROLLED_BLEEDING: 'medical_symptom_uncontrolled_bleeding',
  MEDICAL_AMBULANCE_CALLED: 'medical_ambulance_called',
  MEDICAL_ATTENTION_NEEDED: 'medical_attention_needed',

  // Seatbelt (2 checkboxes)
  SEATBELT_WORN: 'seatbelt_worn',
  SEATBELT_WORN_NO: 'seatbelt_worn_no',

  // Airbags (2 checkboxes)
  AIRBAGS_DEPLOYED: 'airbags_deployed',
  AIRBAGS_DEPLOYED_NO: 'airbags_deployed_no',

  // Vehicle damage (2 checkboxes)
  NO_DAMAGE: 'no_damage',
  NO_VISIBLE_DAMAGE: 'no-visible-damage',  // PDF uses hyphen

  // Impact points (10 checkboxes)
  IMPACT_POINT_DRIVER_SIDE: 'impact_point_driver_side',
  IMPACT_POINT_FRONT: 'impact_point_front',
  IMPACT_POINT_FRONT_DRIVER: 'impact_point_front_driver',
  IMPACT_POINT_FRONT_PASSENGER: 'impact_point_front_passenger',
  IMPACT_POINT_PASSENGER_SIDE: 'impact_point_passenger_side',
  IMPACT_POINT_REAR: 'impact_point_rear',
  IMPACT_POINT_REAR_DRIVER: 'impact_point_rear_driver',
  IMPACT_POINT_REAR_PASSENGER: 'impact_point_rear_passenger',
  IMPACT_POINT_ROOF: 'impact_point_roof',
  IMPACT_POINT_UNDER_CARRIAGE: 'impact_point_under_carriage',

  // Vehicle driveable (3 checkboxes)
  YES_I_DROVE_IT_AWAY: 'yes_i_drove_it_away',
  NO_IT_NEEDED_TO_BE_TOWED: 'no_it_needed_to_be_towed',
  UNSURE_DID_NOT_ATTEMPT: 'unsure _did_not_attempt', // PDF TYPO: space before 'did'

  // Usual vehicle (2 checkboxes)
  USUAL_VEHICLE: 'usual_vehicle',
  DRIVING_YOUR_USUAL_VEHICLE_NO: 'driving_your_usual_vehicle_no',

  // Six point safety check (1 checkbox)
  SIX_POINT_SAFETY_CHECK_COMPLETED: 'six_point_safety_check_completed',

  // Police (2 checkboxes)
  POLICE_ATTENDED: 'police_attended',
  POLICE_ATTEND: 'police_attend',  // NO checkbox (confusing naming in PDF)

  // Witnesses (1 checkbox)
  WITNESSES_PRESENT: 'witnesses_present',

  // Final feeling (1 checkbox)
  FINAL_FEELING: 'final_feeling'
};

// ========================================
// SIGNATURE FIELDS (1)
// ========================================
const SIGNATURE_FIELDS = {
  SIGNATURE70: 'Signature70'
};

// ========================================
// ALL FIELDS COMBINED (for validation)
// ========================================
const ALL_FIELD_VALUES = [
  ...Object.values(TEXT_FIELDS),
  ...Object.values(CHECKBOX_FIELDS),
  ...Object.values(SIGNATURE_FIELDS)
];

// Legacy array exports for backwards compatibility with validation script
const TEXT_FIELDS_ARRAY = Object.values(TEXT_FIELDS);
const CHECKBOX_FIELDS_ARRAY = Object.values(CHECKBOX_FIELDS);
const SIGNATURE_FIELDS_ARRAY = Object.values(SIGNATURE_FIELDS);

// ========================================
// FIELD CATEGORIES FOR DOCUMENTATION
// ========================================
const FIELD_CATEGORIES = {
  personalInfo: [
    TEXT_FIELDS.NAME, TEXT_FIELDS.SURNAME, TEXT_FIELDS.EMAIL, TEXT_FIELDS.MOBILE,
    TEXT_FIELDS.DATE_OF_BIRTH, TEXT_FIELDS.STREET, TEXT_FIELDS.TOWN, TEXT_FIELDS.POSTCODE,
    TEXT_FIELDS.COUNTRY, TEXT_FIELDS.EMERGENCY_CONTACT_NAME, TEXT_FIELDS.EMERGENCY_CONTACT_NUMBER
  ],
  accidentDetails: [
    TEXT_FIELDS.ACCIDENT_DATE, TEXT_FIELDS.ACCIDENT_TIME, TEXT_FIELDS.LOCATION,
    TEXT_FIELDS.STREET_NAME_OPTIONAL, TEXT_FIELDS.NEAREST_LANDMARK, TEXT_FIELDS.SPEED_LIMIT,
    TEXT_FIELDS.YOUR_SPEED, TEXT_FIELDS.TRAFFIC_LIGHT_STATUS, TEXT_FIELDS.JUNCTION_TYPE,
    TEXT_FIELDS.JUNCTION_CONTROL, TEXT_FIELDS.USER_MANOEUVRE, TEXT_FIELDS.ADDITIONAL_HAZARDS
  ],
  weather: Object.values(CHECKBOX_FIELDS).filter(f => f.startsWith('weather_')),
  roadConditions: Object.values(CHECKBOX_FIELDS).filter(f => f.startsWith('road_condition_')),
  roadType: Object.values(CHECKBOX_FIELDS).filter(f => f.startsWith('road_type_')),
  visibility: Object.values(CHECKBOX_FIELDS).filter(f => f.startsWith('visibilty_') || f.startsWith('visibility_')),
  trafficConditions: Object.values(CHECKBOX_FIELDS).filter(f => f.startsWith('traffic_conditions_')),
  specialConditions: Object.values(CHECKBOX_FIELDS).filter(f => f.startsWith('special_condition_')),
  medical: [
    ...Object.values(CHECKBOX_FIELDS).filter(f => f.startsWith('medical_')),
    TEXT_FIELDS.FURTHER_MEDICAL_ATTENTION_NEEDED
  ],
  insurance: [
    TEXT_FIELDS.INSURANCE_COMPANY, TEXT_FIELDS.POLICY_NUMBER, TEXT_FIELDS.POLICY_HOLDER,
    TEXT_FIELDS.COVER_TYPE, TEXT_FIELDS.DRIVING_LICENSE_NUMBER, TEXT_FIELDS.DRIVING_LICENSE_PICTURE,
    TEXT_FIELDS.SUBSCRIPTION_START_DATE
  ],
  yourVehicle: [
    TEXT_FIELDS.VEHICLE_LICENSE_PLATE, TEXT_FIELDS.DVLA_MAKE, TEXT_FIELDS.DVLA_MODEL,
    TEXT_FIELDS.DVLA_COLOUR, TEXT_FIELDS.DVLA_YEAR, TEXT_FIELDS.DVLA_FUEL_TYPE,
    TEXT_FIELDS.DVLA_MOT_STATUS, TEXT_FIELDS.DVLA_MOT_EXPIRY, TEXT_FIELDS.DVLA_TAX_STATUS,
    TEXT_FIELDS.DVLA_TAX_DUE_DATE
  ],
  impactPoints: Object.values(CHECKBOX_FIELDS).filter(f => f.startsWith('impact_point_')),
  otherVehicle: Object.values(TEXT_FIELDS).filter(f => f.startsWith('other-') || f.startsWith('other_')),
  witnesses: [
    TEXT_FIELDS.WITNESS_NAME, TEXT_FIELDS.WITNESS_MOBILE_NUMBER, TEXT_FIELDS.WITNESS_EMAIL_ADDRESS,
    TEXT_FIELDS.WITNESS_STATEMENT, CHECKBOX_FIELDS.WITNESSES_PRESENT
  ],
  police: [
    CHECKBOX_FIELDS.POLICE_ATTENDED, CHECKBOX_FIELDS.POLICE_ATTEND, TEXT_FIELDS.POLICE_FORCE,
    TEXT_FIELDS.OFFICER_NAME, TEXT_FIELDS.OFFICER_BADGE, TEXT_FIELDS.ACCIDENT_REF_NUMBER
  ],
  aiAnalysis: [
    TEXT_FIELDS.VOICE_TRANSCRIPTION, TEXT_FIELDS.ANALYSIS_METADATA, TEXT_FIELDS.QUALITY_REVIEW,
    TEXT_FIELDS.AI_SUMMARY, TEXT_FIELDS.CLOSING_STATEMENT, TEXT_FIELDS.FINAL_REVIEW
  ]
};

// ========================================
// TYPO DOCUMENTATION
// These PDF fields have typos that would break if we used "correct" spelling
// ========================================
const PDF_TYPOS = {
  'visibilty_good': 'Should be visibility_good',
  'visibilty_street_lights': 'Should be visibility_street_lights',
  'road_markings_vsible_no': 'Should be road_markings_visible_no',
  'road_markings_vsible_yes': 'Should be road_markings_visible_yes',
  'weather_thunder_lightening': 'Should be weather_thunder_lightning',
  'medical_symptom_limb_pain_mobilty': 'Should be medical_symptom_limb_pain_mobility',
  'medical_symptom_life _threatening': 'Has space before threatening',
  'medical_treatment_recieved': 'Should be medical_treatment_received',
  'unsure _did_not_attempt': 'Has space before did'
};

module.exports = {
  // Object exports (recommended - use these for new code)
  TEXT_FIELDS,
  CHECKBOX_FIELDS,
  SIGNATURE_FIELDS,

  // Array exports (for validation script backwards compatibility)
  TEXT_FIELDS_ARRAY,
  CHECKBOX_FIELDS_ARRAY,
  SIGNATURE_FIELDS_ARRAY,
  ALL_FIELDS: ALL_FIELD_VALUES,

  // Documentation
  FIELD_CATEGORIES,
  PDF_TYPOS,

  // Counts for validation
  EXPECTED_COUNTS: {
    text: Object.keys(TEXT_FIELDS).length,
    checkbox: Object.keys(CHECKBOX_FIELDS).length,
    signature: Object.keys(SIGNATURE_FIELDS).length,
    total: ALL_FIELD_VALUES.length
  }
};
