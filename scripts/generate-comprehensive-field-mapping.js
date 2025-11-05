// Generate comprehensive field mapping CSV with detailed HTML, DB, and PDF mappings

const fs = require('fs');
const path = require('path');

console.log('📋 Generating comprehensive field mapping CSV...\n');

// Read the PDF generator to extract all mappings
const pdfGenPath = path.join(__dirname, '../lib/pdfGenerator.js');
const pdfGenContent = fs.readFileSync(pdfGenPath, 'utf8');

// Manual comprehensive mapping based on code analysis
// Format: { htmlPage, htmlFieldId, dbTable, dbColumn, pdfField, pdfPage, type, notes }
const fieldMappings = [
  // ========== PAGE 1: Personal Information ==========
  { htmlPage: 'signup-auth', htmlFieldId: 'name', dbTable: 'user_signup', dbColumn: 'name', pdfField: 'name', pdfPage: 1, type: 'text', notes: 'First name' },
  { htmlPage: 'signup-auth', htmlFieldId: 'name', dbTable: 'user_signup', dbColumn: 'name', pdfField: 'driver_name', pdfPage: 1, type: 'text', notes: 'Alternative field name in PDF' },
  { htmlPage: 'signup-auth', htmlFieldId: 'surname', dbTable: 'user_signup', dbColumn: 'surname', pdfField: 'surname', pdfPage: 1, type: 'text', notes: 'Last name' },
  { htmlPage: 'signup-auth', htmlFieldId: 'email', dbTable: 'user_signup', dbColumn: 'email', pdfField: 'email', pdfPage: 1, type: 'text', notes: 'Email address' },
  { htmlPage: 'signup-auth', htmlFieldId: 'mobile', dbTable: 'user_signup', dbColumn: 'mobile', pdfField: 'mobile', pdfPage: 1, type: 'text', notes: 'Mobile phone number' },
  { htmlPage: 'signup-form-1', htmlFieldId: 'street', dbTable: 'user_signup', dbColumn: 'street_address', pdfField: 'street', pdfPage: 1, type: 'text', notes: 'Street address line 1' },
  { htmlPage: 'signup-form-1', htmlFieldId: 'street_optional', dbTable: 'user_signup', dbColumn: 'street_address_optional', pdfField: 'street_address_optional', pdfPage: 1, type: 'text', notes: 'Street address line 2' },
  { htmlPage: 'signup-form-1', htmlFieldId: 'town', dbTable: 'user_signup', dbColumn: 'town', pdfField: 'town', pdfPage: 1, type: 'text', notes: 'Town/City' },
  { htmlPage: 'signup-form-1', htmlFieldId: 'postcode', dbTable: 'user_signup', dbColumn: 'postcode', pdfField: 'postcode', pdfPage: 1, type: 'text', notes: 'UK Postcode' },
  { htmlPage: 'signup-form-1', htmlFieldId: 'country', dbTable: 'user_signup', dbColumn: 'country', pdfField: 'country', pdfPage: 1, type: 'text', notes: 'Country' },
  { htmlPage: 'signup-form-2', htmlFieldId: 'date_of_birth', dbTable: 'user_signup', dbColumn: 'date_of_birth', pdfField: 'date_of_birth', pdfPage: 1, type: 'text', notes: 'Driver date of birth' },
  { htmlPage: 'signup-form-2', htmlFieldId: 'driving_license_number', dbTable: 'user_signup', dbColumn: 'driving_license_number', pdfField: 'driving_license_number', pdfPage: 1, type: 'text', notes: 'UK driving license number' },
  { htmlPage: null, htmlFieldId: 'create_user_id', dbTable: 'metadata', dbColumn: 'create_user_id', pdfField: 'create_user_id', pdfPage: 1, type: 'text', notes: 'System-generated user UUID' },
  { htmlPage: null, htmlFieldId: 'create_user_id', dbTable: 'metadata', dbColumn: 'create_user_id', pdfField: 'id', pdfPage: 1, type: 'text', notes: 'User tracking field (duplicate)' },

  // ========== PAGE 1: Vehicle Information ==========
  { htmlPage: 'signup-form-3', htmlFieldId: 'car_registration', dbTable: 'user_signup', dbColumn: 'car_registration_number', pdfField: 'license_plate', pdfPage: 1, type: 'text', notes: 'Vehicle registration number' },
  { htmlPage: 'signup-form-3', htmlFieldId: 'vehicle_make', dbTable: 'user_signup', dbColumn: 'vehicle_make', pdfField: 'vehicle_make', pdfPage: 1, type: 'text', notes: 'Vehicle manufacturer' },
  { htmlPage: 'signup-form-3', htmlFieldId: 'vehicle_model', dbTable: 'user_signup', dbColumn: 'vehicle_model', pdfField: 'vehicle_model', pdfPage: 1, type: 'text', notes: 'Vehicle model' },
  { htmlPage: 'signup-form-3', htmlFieldId: 'vehicle_colour', dbTable: 'user_signup', dbColumn: 'vehicle_colour', pdfField: 'vehicle_colour', pdfPage: 1, type: 'text', notes: 'Vehicle color' },
  { htmlPage: 'signup-form-4', htmlFieldId: 'vehicle_condition', dbTable: 'user_signup', dbColumn: 'vehicle_condition', pdfField: 'vehicle_condition', pdfPage: 1, type: 'text', notes: 'Pre-accident vehicle condition' },
  { htmlPage: 'signup-form-5', htmlFieldId: 'recovery_company', dbTable: 'user_signup', dbColumn: 'recovery_company', pdfField: 'recovery_company', pdfPage: 1, type: 'text', notes: 'Vehicle recovery company name' },
  { htmlPage: 'signup-form-5', htmlFieldId: 'recovery_number', dbTable: 'user_signup', dbColumn: 'recovery_breakdown_number', pdfField: 'recovery_breakdown_number', pdfPage: 1, type: 'text', notes: 'Recovery phone number' },
  { htmlPage: 'signup-form-5', htmlFieldId: 'recovery_email', dbTable: 'user_signup', dbColumn: 'recovery_breakdown_email', pdfField: 'recovery_breakdown_email', pdfPage: 1, type: 'text', notes: 'Recovery email address' },

  // ========== PAGE 2: Emergency Contact & Insurance ==========
  { htmlPage: 'signup-form-6', htmlFieldId: 'emergency_contact', dbTable: 'user_signup', dbColumn: 'emergency_contact', pdfField: 'emergency_contact', pdfPage: 2, type: 'text', notes: 'Emergency contact (pipe-delimited format)' },
  { htmlPage: 'signup-form-6', htmlFieldId: 'emergency_name', dbTable: 'user_signup', dbColumn: 'emergency_contact_name', pdfField: 'emergency_contact_name', pdfPage: 2, type: 'text', notes: 'Emergency contact name' },
  { htmlPage: 'signup-form-6', htmlFieldId: 'emergency_number', dbTable: 'user_signup', dbColumn: 'emergency_contact_number', pdfField: 'emergency_contact_number', pdfPage: 2, type: 'text', notes: 'Emergency contact phone' },
  { htmlPage: 'signup-form-7', htmlFieldId: 'insurance_company', dbTable: 'user_signup', dbColumn: 'insurance_company', pdfField: 'insurance_company', pdfPage: 2, type: 'text', notes: 'Insurance provider name' },
  { htmlPage: 'signup-form-7', htmlFieldId: 'policy_number', dbTable: 'user_signup', dbColumn: 'policy_number', pdfField: 'policy_number', pdfPage: 2, type: 'text', notes: 'Insurance policy number' },
  { htmlPage: 'signup-form-7', htmlFieldId: 'policy_holder', dbTable: 'user_signup', dbColumn: 'policy_holder', pdfField: 'policy_holder', pdfPage: 2, type: 'text', notes: 'Policy holder name' },
  { htmlPage: 'signup-form-7', htmlFieldId: 'cover_type', dbTable: 'user_signup', dbColumn: 'cover_type', pdfField: 'cover_type', pdfPage: 2, type: 'text', notes: 'Insurance cover type (comprehensive, third party, etc.)' },
  { htmlPage: null, htmlFieldId: 'created_at', dbTable: 'user_signup', dbColumn: 'created_at', pdfField: 'Date139_af_date', pdfPage: 2, type: 'text', notes: 'User signup date (formatted DD/MM/YYYY)' },

  // ========== PAGE 3: Images ==========
  { htmlPage: 'signup-form-8', htmlFieldId: 'driving_license_upload', dbTable: 'user_documents', dbColumn: 'driving_license', pdfField: 'driving_license_picture', pdfPage: 3, type: 'image', notes: 'Driving license photo URL' },
  { htmlPage: 'signup-form-8', htmlFieldId: 'vehicle_front_upload', dbTable: 'user_documents', dbColumn: 'vehicle_front', pdfField: 'vehicle_picture_front', pdfPage: 3, type: 'image', notes: 'Vehicle front view URL' },
  { htmlPage: 'signup-form-8', htmlFieldId: 'vehicle_driver_upload', dbTable: 'user_documents', dbColumn: 'vehicle_driver_side', pdfField: 'vehicle_picture_driver_side', pdfPage: 3, type: 'image', notes: 'Vehicle driver side URL' },
  { htmlPage: 'signup-form-8', htmlFieldId: 'vehicle_passenger_upload', dbTable: 'user_documents', dbColumn: 'vehicle_passenger_side', pdfField: 'vehicle_picture_passenger_side', pdfPage: 3, type: 'image', notes: 'Vehicle passenger side URL' },
  { htmlPage: 'signup-form-8', htmlFieldId: 'vehicle_back_upload', dbTable: 'user_documents', dbColumn: 'vehicle_back', pdfField: 'vehicle_picture_back', pdfPage: 3, type: 'image', notes: 'Vehicle rear view URL' },

  // ========== PAGE 4: Incident Safety ==========
  { htmlPage: 'incident-form-page1', htmlFieldId: 'form_id', dbTable: 'incident_reports', dbColumn: 'id', pdfField: 'form_id', pdfPage: 4, type: 'text', notes: 'Incident report UUID' },
  { htmlPage: 'incident-form-page1', htmlFieldId: 'submit_date', dbTable: 'incident_reports', dbColumn: 'created_at', pdfField: 'submit_date', pdfPage: 4, type: 'text', notes: 'Incident submission timestamp' },
  { htmlPage: 'incident-form-page1', htmlFieldId: 'are_you_safe', dbTable: 'incident_reports', dbColumn: 'are_you_safe', pdfField: 'are_you_safe', pdfPage: 4, type: 'checkbox', notes: 'User safety status' },
  { htmlPage: 'incident-form-page1', htmlFieldId: 'medical_attention', dbTable: 'incident_reports', dbColumn: 'medical_attention', pdfField: 'medical_attention', pdfPage: 4, type: 'checkbox', notes: 'Medical attention received' },
  { htmlPage: 'incident-form-page1', htmlFieldId: 'medical_feeling', dbTable: 'incident_reports', dbColumn: 'medical_how_are_you_feeling', pdfField: 'medical_how_are_you_feeling', pdfPage: 4, type: 'text', notes: 'How user is feeling' },
  { htmlPage: 'incident-form-page1', htmlFieldId: 'medical_from_who', dbTable: 'incident_reports', dbColumn: 'medical_attention_from_who', pdfField: 'medical_attention_from_who', pdfPage: 4, type: 'text', notes: 'Who provided medical attention' },
  { htmlPage: 'incident-form-page1', htmlFieldId: 'further_medical', dbTable: 'incident_reports', dbColumn: 'further_medical_attention', pdfField: 'further_medical_attention', pdfPage: 4, type: 'text', notes: 'Further medical attention needed' },
  { htmlPage: 'incident-form-page1', htmlFieldId: 'medical_honest', dbTable: 'incident_reports', dbColumn: 'medical_please_be_completely_honest', pdfField: 'medical_please_be_completely_honest', pdfPage: 4, type: 'text', notes: 'Medical honesty declaration' },
  { htmlPage: 'incident-form-page1', htmlFieldId: 'six_point_check', dbTable: 'incident_reports', dbColumn: 'six_point_safety_check', pdfField: 'six_point_safety_check', pdfPage: 4, type: 'checkbox', notes: '6-point safety check completed' },
  { htmlPage: 'incident-form-page1', htmlFieldId: 'call_emergency', dbTable: 'incident_reports', dbColumn: 'call_emergency_contact', pdfField: 'call_emergency_contact', pdfPage: 4, type: 'checkbox', notes: 'Emergency contact called' },

  // ========== PAGE 5: Medical Symptoms ==========
  { htmlPage: 'incident-form-page2', htmlFieldId: 'symptom_chest_pain', dbTable: 'incident_reports', dbColumn: 'medical_chest_pain', pdfField: 'medical_chest_pain', pdfPage: 5, type: 'checkbox', notes: 'Chest pain symptom' },
  { htmlPage: 'incident-form-page2', htmlFieldId: 'symptom_bleeding', dbTable: 'incident_reports', dbColumn: 'medical_uncontrolled_bleeding', pdfField: 'medical_uncontrolled_bleeding', pdfPage: 5, type: 'checkbox', notes: 'Uncontrolled bleeding' },
  { htmlPage: 'incident-form-page2', htmlFieldId: 'symptom_breathless', dbTable: 'incident_reports', dbColumn: 'medical_breathlessness', pdfField: 'medical_breathlessness', pdfPage: 5, type: 'checkbox', notes: 'Breathlessness symptom' },
  { htmlPage: 'incident-form-page2', htmlFieldId: 'symptom_limb_weakness', dbTable: 'incident_reports', dbColumn: 'medical_limb_weakness', pdfField: 'medical_limb_weakness', pdfPage: 5, type: 'checkbox', notes: 'Limb weakness' },
  { htmlPage: 'incident-form-page2', htmlFieldId: 'symptom_unconscious', dbTable: 'incident_reports', dbColumn: 'medical_loss_of_consciousness', pdfField: 'medical_loss_of_consciousness', pdfPage: 5, type: 'checkbox', notes: 'Loss of consciousness' },
  { htmlPage: 'incident-form-page2', htmlFieldId: 'symptom_headache', dbTable: 'incident_reports', dbColumn: 'medical_severe_headache', pdfField: 'medical_severe_headache', pdfPage: 5, type: 'checkbox', notes: 'Severe headache' },
  { htmlPage: 'incident-form-page2', htmlFieldId: 'symptom_abdominal_bruise', dbTable: 'incident_reports', dbColumn: 'medical_abdominal_bruising', pdfField: 'medical_abdominal_bruising', pdfPage: 5, type: 'checkbox', notes: 'Abdominal bruising' },
  { htmlPage: 'incident-form-page2', htmlFieldId: 'symptom_vision_change', dbTable: 'incident_reports', dbColumn: 'medical_change_in_vision', pdfField: 'medical_change_in_vision', pdfPage: 5, type: 'checkbox', notes: 'Change in vision' },
  { htmlPage: 'incident-form-page2', htmlFieldId: 'symptom_abdominal_pain', dbTable: 'incident_reports', dbColumn: 'medical_abdominal_pain', pdfField: 'medical_abdominal_pain', pdfPage: 5, type: 'checkbox', notes: 'Abdominal pain' },
  { htmlPage: 'incident-form-page2', htmlFieldId: 'symptom_limb_pain', dbTable: 'incident_reports', dbColumn: 'medical_limb_pain', pdfField: 'medical_limb_pain', pdfPage: 5, type: 'checkbox', notes: 'Limb pain or mobility issues' },
  { htmlPage: 'incident-form-page2', htmlFieldId: 'symptom_none', dbTable: 'incident_reports', dbColumn: 'medical_none_of_these', pdfField: 'medical_none_of_these', pdfPage: 5, type: 'checkbox', notes: 'No symptoms' },
  { htmlPage: 'incident-form-page3', htmlFieldId: 'ambulance_called', dbTable: 'incident_reports', dbColumn: 'medical_ambulance_called', pdfField: 'ambulance_callled', pdfPage: 5, type: 'checkbox', notes: 'Ambulance called (PDF has typo)' },
  { htmlPage: 'incident-form-page3', htmlFieldId: 'medical_needed', dbTable: 'incident_reports', dbColumn: 'medical_attention_needed', pdfField: 'medical_attention_needed', pdfPage: 5, type: 'checkbox', notes: 'Medical attention needed' },
  { htmlPage: 'incident-form-page3', htmlFieldId: 'hospital_name', dbTable: 'incident_reports', dbColumn: 'medical_hospital_name', pdfField: 'hospital_or_medical_center', pdfPage: 5, type: 'text', notes: 'Hospital or medical center name' },
  { htmlPage: 'incident-form-page3', htmlFieldId: 'injury_details', dbTable: 'incident_reports', dbColumn: 'medical_injury_details', pdfField: 'medical_injury_details', pdfPage: 5, type: 'text', notes: 'Detailed injury description' },
  { htmlPage: 'incident-form-page3', htmlFieldId: 'injury_severity', dbTable: 'incident_reports', dbColumn: 'medical_injury_severity', pdfField: 'severity_of_injuries', pdfPage: 5, type: 'text', notes: 'Injury severity assessment' },
  { htmlPage: 'incident-form-page3', htmlFieldId: 'treatment_received', dbTable: 'incident_reports', dbColumn: 'medical_treatment_received', pdfField: 'treatment_received_on_scene', pdfPage: 5, type: 'text', notes: 'Treatment received on scene' },
  { htmlPage: 'incident-form-page3', htmlFieldId: 'follow_up', dbTable: 'incident_reports', dbColumn: 'medical_follow_up_needed', pdfField: 'follow_up_appointments_scheduled', pdfPage: 5, type: 'text', notes: 'Follow-up appointments' },

  // ========== PAGE 6: Incident Details ==========
  { htmlPage: 'incident-form-page4', htmlFieldId: 'accident_date', dbTable: 'incident_reports', dbColumn: 'when_did_the_accident_happen', pdfField: 'when_did_the_accident_happen', pdfPage: 6, type: 'text', notes: 'Accident date (formatted DD/MM/YYYY)' },
  { htmlPage: 'incident-form-page4', htmlFieldId: 'accident_time', dbTable: 'incident_reports', dbColumn: 'accident_time', pdfField: 'what_time_did_the_accident_happen', pdfPage: 6, type: 'text', notes: 'Accident time (HH:MM format)' },
  { htmlPage: 'incident-form-page4', htmlFieldId: 'accident_location', dbTable: 'incident_reports', dbColumn: 'where_exactly_did_this_happen', pdfField: 'where_exactly_did_this_happen', pdfPage: 6, type: 'text', notes: 'Accident location description' },
  { htmlPage: 'incident-form-page5', htmlFieldId: 'wearing_seatbelts', dbTable: 'incident_reports', dbColumn: 'wearing_seatbelts', pdfField: 'wearing_seatbelts', pdfPage: 6, type: 'checkbox', notes: 'Seatbelts worn status' },
  { htmlPage: 'incident-form-page5', htmlFieldId: 'airbags_deployed', dbTable: 'incident_reports', dbColumn: 'airbags_deployed', pdfField: 'airbags_deployed', pdfPage: 6, type: 'checkbox', notes: 'Airbags deployment status' },
  { htmlPage: 'incident-form-page5', htmlFieldId: 'reason_no_seatbelt', dbTable: 'incident_reports', dbColumn: 'why_werent_seat_belts_being_worn', pdfField: 'reason_no_seatbelts', pdfPage: 6, type: 'text', notes: 'Reason for not wearing seatbelts' },
  { htmlPage: 'incident-form-page5', htmlFieldId: 'vehicle_damaged', dbTable: 'incident_reports', dbColumn: 'was_your_vehicle_damaged', pdfField: 'damage_to_your_vehicle', pdfPage: 6, type: 'checkbox', notes: 'Vehicle damage status' },
  { htmlPage: 'incident-form-page6', htmlFieldId: 'no_damage', dbTable: 'incident_reports', dbColumn: 'no_damage', pdfField: 'no_damage', pdfPage: 6, type: 'checkbox', notes: 'No damage checkbox' },
  { htmlPage: 'incident-form-page6', htmlFieldId: 'no_visible_damage', dbTable: 'incident_reports', dbColumn: 'no_visible_damage', pdfField: 'no_visible_damage', pdfPage: 6, type: 'checkbox', notes: 'No visible damage' },
  { htmlPage: 'incident-form-page6', htmlFieldId: 'usual_vehicle', dbTable: 'incident_reports', dbColumn: 'usual_vehicle', pdfField: 'usual_vehicle', pdfPage: 6, type: 'checkbox', notes: 'Usual vehicle status' },
  { htmlPage: 'incident-form-page6', htmlFieldId: 'vehicle_driveable', dbTable: 'incident_reports', dbColumn: 'vehicle_driveable', pdfField: 'vehicle_driveable', pdfPage: 6, type: 'checkbox', notes: 'Vehicle driveable after accident' },

  // ========== PAGE 7: Weather & Road Conditions ==========
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_overcast', dbTable: 'incident_reports', dbColumn: 'overcast_dull', pdfField: 'weather_overcast', pdfPage: 7, type: 'checkbox', notes: 'Overcast/dull weather' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_heavy_rain', dbTable: 'incident_reports', dbColumn: 'heavy_rain', pdfField: 'weather_heavy_rain', pdfPage: 7, type: 'checkbox', notes: 'Heavy rain' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_wet_road', dbTable: 'incident_reports', dbColumn: 'wet_road', pdfField: 'weather_wet_road', pdfPage: 7, type: 'checkbox', notes: 'Wet road surface' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_fog', dbTable: 'incident_reports', dbColumn: 'fog_poor_visibility', pdfField: 'weather_fog', pdfPage: 7, type: 'checkbox', notes: 'Fog or poor visibility' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_street_lights', dbTable: 'incident_reports', dbColumn: 'street_lights', pdfField: 'weather_street_lights', pdfPage: 7, type: 'checkbox', notes: 'Street lights on' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_dusk', dbTable: 'incident_reports', dbColumn: 'dusk', pdfField: 'weather_dusk', pdfPage: 7, type: 'checkbox', notes: 'Dusk/dawn lighting' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_clear_dry', dbTable: 'incident_reports', dbColumn: 'clear_and_dry', pdfField: 'weather_clear_and_dry', pdfPage: 7, type: 'checkbox', notes: 'Clear and dry' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_snow_road', dbTable: 'incident_reports', dbColumn: 'snow_ice_on_road', pdfField: 'weather_snow_on_road', pdfPage: 7, type: 'checkbox', notes: 'Snow/ice on road' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_snow', dbTable: 'incident_reports', dbColumn: 'snow', pdfField: 'weather_snow', pdfPage: 7, type: 'checkbox', notes: 'Snowing' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_light_rain', dbTable: 'incident_reports', dbColumn: 'light_rain', pdfField: 'weather_light_rain', pdfPage: 7, type: 'checkbox', notes: 'Light rain' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_bright', dbTable: 'incident_reports', dbColumn: 'bright_daylight', pdfField: 'weather_bright_daylight', pdfPage: 7, type: 'checkbox', notes: 'Bright daylight' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_drizzle', dbTable: 'incident_reports', dbColumn: 'weather_drizzle', pdfField: 'weather_drizzle', pdfPage: 7, type: 'checkbox', notes: 'Drizzle' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_raining', dbTable: 'incident_reports', dbColumn: 'weather_raining', pdfField: 'weather_raining', pdfPage: 7, type: 'checkbox', notes: 'Raining' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_hail', dbTable: 'incident_reports', dbColumn: 'weather_hail', pdfField: 'weather-hail', pdfPage: 7, type: 'checkbox', notes: 'Hail (PDF field uses hyphen)' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_windy', dbTable: 'incident_reports', dbColumn: 'weather_windy', pdfField: 'weather_windy', pdfPage: 7, type: 'checkbox', notes: 'Windy conditions' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_thunder', dbTable: 'incident_reports', dbColumn: 'weather_thunder', pdfField: 'weather_thunder', pdfPage: 7, type: 'checkbox', notes: 'Thunder/lightning' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_slush', dbTable: 'incident_reports', dbColumn: 'weather_slush_road', pdfField: 'weather_slush_road', pdfPage: 7, type: 'checkbox', notes: 'Slush on road' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_loose_surface', dbTable: 'incident_reports', dbColumn: 'weather_loose_surface', pdfField: 'weather_loose_surface', pdfPage: 7, type: 'checkbox', notes: 'Loose surface (gravel, etc.)' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_clear', dbTable: 'incident_reports', dbColumn: 'weather_clear', pdfField: 'weather_clear', pdfPage: 7, type: 'checkbox', notes: 'Clear skies' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_cloudy', dbTable: 'incident_reports', dbColumn: 'weather_cloudy', pdfField: 'weather_cloudy', pdfPage: 7, type: 'checkbox', notes: 'Cloudy' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_bright_sun', dbTable: 'incident_reports', dbColumn: 'weather_bright_sunlight', pdfField: 'weather_bright_sunlight', pdfPage: 7, type: 'checkbox', notes: 'Bright sunlight' },
  { htmlPage: 'incident-form-page7', htmlFieldId: 'weather_ice', dbTable: 'incident_reports', dbColumn: 'weather_ice', pdfField: 'weather_ice', pdfPage: 7, type: 'checkbox', notes: 'Ice on road' },

  // ========== PAGE 18: Appendix A - Emergency Audio (AI Eavesdropper) ==========
  { htmlPage: 'incident.html', htmlFieldId: 'voiceTranscription', dbTable: 'ai_listening_transcripts', dbColumn: 'transcription_text', pdfField: 'emergency_audio_transcription', pdfPage: 18, type: 'text', notes: 'AI Eavesdropper transcription from OpenAI Whisper' },
  { htmlPage: 'incident.html', htmlFieldId: 'recordedAt', dbTable: 'ai_listening_transcripts', dbColumn: 'recorded_at', pdfField: 'emergency_recording_timestamp', pdfPage: 18, type: 'text', notes: 'Emergency recording timestamp (formatted as full date/time)' },
  { htmlPage: 'incident.html', htmlFieldId: 'audioUrl', dbTable: 'ai_listening_transcripts', dbColumn: 'audio_url', pdfField: 'emergency_audio_url', pdfPage: 18, type: 'text', notes: 'Signed URL to emergency audio file in Supabase Storage' },
];

// Convert to CSV
const csvRows = [
  ['HTML Page', 'HTML Field ID', 'Database Table', 'Database Column', 'PDF Field Name', 'PDF Page', 'Field Type', 'Notes']
];

fieldMappings.forEach(mapping => {
  csvRows.push([
    mapping.htmlPage || '',
    mapping.htmlFieldId || '',
    mapping.dbTable || '',
    mapping.dbColumn || '',
    mapping.pdfField || '',
    mapping.pdfPage || '',
    mapping.type || '',
    mapping.notes || ''
  ]);
});

// Convert to CSV string
const csvContent = csvRows.map(row =>
  row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
).join('\n');

// Write to file
const outputPath = path.join(__dirname, '../FIELD_MAPPING_COMPLETE.csv');
fs.writeFileSync(outputPath, csvContent, 'utf8');

console.log(`✅ Generated comprehensive field mapping CSV`);
console.log(`📄 File: ${outputPath}`);
console.log(`📊 Total mappings: ${csvRows.length - 1}`);
console.log(`\n📋 Coverage:`);
console.log(`   • Pages 1-7: Core incident data`);
console.log(`   • Page 18: Emergency audio (AI Eavesdropper)`);
console.log(`   • ${fieldMappings.filter(f => f.type === 'text').length} text fields`);
console.log(`   • ${fieldMappings.filter(f => f.type === 'checkbox').length} checkboxes`);
console.log(`   • ${fieldMappings.filter(f => f.type === 'image').length} image URLs`);
console.log(`\n✨ Ready for cross-referencing!`);
