-- ROLLBACK: Restore all 225 columns to incident_reports table
-- Date: 2025-11-06
-- Purpose: Restore columns if needed (safety measure)
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Restore Medical/Safety fields
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS medical_how_are_you_feeling TEXT,
  ADD COLUMN IF NOT EXISTS medical_attention_from_who TEXT,
  ADD COLUMN IF NOT EXISTS further_medical_attention TEXT,
  ADD COLUMN IF NOT EXISTS are_you_safe BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_attention BOOLEAN,
  ADD COLUMN IF NOT EXISTS six_point_safety_check BOOLEAN,
  ADD COLUMN IF NOT EXISTS call_emergency_contact BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_chest_pain BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_breathlessness BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_abdominal_bruising BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_uncontrolled_bleeding BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_severe_headache BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_change_in_vision BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_abdominal_pain BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_limb_pain BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_limb_weakness BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_loss_of_consciousness BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_none_of_these BOOLEAN,
  ADD COLUMN IF NOT EXISTS medical_please_be_completely_honest TEXT,
  ADD COLUMN IF NOT EXISTS ambulance_called BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hospital_name TEXT,
  ADD COLUMN IF NOT EXISTS injury_severity TEXT,
  ADD COLUMN IF NOT EXISTS treatment_received TEXT,
  ADD COLUMN IF NOT EXISTS medical_follow_up_needed TEXT,
  ADD COLUMN IF NOT EXISTS medical_ambulance_called BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_attention_needed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_hospital_name TEXT,
  ADD COLUMN IF NOT EXISTS medical_injury_details TEXT,
  ADD COLUMN IF NOT EXISTS medical_injury_severity TEXT,
  ADD COLUMN IF NOT EXISTS medical_treatment_received TEXT,
  ADD COLUMN IF NOT EXISTS medical_symptom_none BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_abdominal_bruising BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_abdominal_pain BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_breathlessness BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_change_in_vision BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_chest_pain BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_dizziness BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_life_threatening BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_limb_pain_mobility BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_limb_weakness BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_loss_of_consciousness BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_severe_headache BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_symptom_uncontrolled_bleeding BOOLEAN DEFAULT false;

-- Restore Date/Time/Location fields
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS when_did_the_accident_happen TEXT,
  ADD COLUMN IF NOT EXISTS what_time_did_the_accident_happen INTEGER,
  ADD COLUMN IF NOT EXISTS where_exactly_did_this_happen TEXT,
  ADD COLUMN IF NOT EXISTS accident_date DATE,
  ADD COLUMN IF NOT EXISTS accident_time TIME WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS what3words TEXT,
  ADD COLUMN IF NOT EXISTS nearestlandmark TEXT,
  ADD COLUMN IF NOT EXISTS additionalhazards TEXT,
  ADD COLUMN IF NOT EXISTS specialconditions TEXT,
  ADD COLUMN IF NOT EXISTS visibilityfactors TEXT;

-- Restore Weather conditions
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS weather_conditions TEXT,
  ADD COLUMN IF NOT EXISTS weather_overcast BOOLEAN,
  ADD COLUMN IF NOT EXISTS weather_street_lights BOOLEAN,
  ADD COLUMN IF NOT EXISTS weather_heavy_rain BOOLEAN,
  ADD COLUMN IF NOT EXISTS weather_wet_road BOOLEAN,
  ADD COLUMN IF NOT EXISTS weather_fog BOOLEAN,
  ADD COLUMN IF NOT EXISTS weather_snow_on_road BOOLEAN,
  ADD COLUMN IF NOT EXISTS weather_bright_daylight BOOLEAN,
  ADD COLUMN IF NOT EXISTS weather_light_rain BOOLEAN,
  ADD COLUMN IF NOT EXISTS weather_clear_and_dry BOOLEAN,
  ADD COLUMN IF NOT EXISTS weather_dusk BOOLEAN,
  ADD COLUMN IF NOT EXISTS weather_snow BOOLEAN,
  ADD COLUMN IF NOT EXISTS weather_drizzle BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_raining BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_hail BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_windy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_thunder BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_slush_road BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_loose_surface BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_clear BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_cloudy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_bright_sunlight BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_ice BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_thunder_lightning BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS weather_other BOOLEAN DEFAULT false;

-- Restore Road conditions and traffic
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS road_type TEXT,
  ADD COLUMN IF NOT EXISTS speed_limit INTEGER,
  ADD COLUMN IF NOT EXISTS road_condition_dry BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_condition_wet BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_condition_icy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_condition_snow_covered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_condition_loose_surface BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_condition_other BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_markings_yes BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_markings_partial BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_markings_no BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_markings_visible_yes BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_markings_visible_partially BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_markings_visible_no BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_type_motorway BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_type_a_road BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_type_b_road BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_type_urban_street BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_type_rural_road BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_type_car_park BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS road_type_private_road BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS traffic_heavy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS traffic_moderate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS traffic_light BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS traffic_none BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS traffic_conditions_no_traffic BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS traffic_conditions_light BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS traffic_conditions_moderate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS traffic_conditions_heavy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility_good BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility_poor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility_very_poor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility_street_lights BOOLEAN DEFAULT false;

-- Restore Junction information
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS junction_information TEXT,
  ADD COLUMN IF NOT EXISTS junction_information_roundabout TEXT,
  ADD COLUMN IF NOT EXISTS junction_information_t_junction TEXT,
  ADD COLUMN IF NOT EXISTS junction_information_traffic_lights TEXT,
  ADD COLUMN IF NOT EXISTS junction_information_crossroads TEXT,
  ADD COLUMN IF NOT EXISTS junctiontype TEXT,
  ADD COLUMN IF NOT EXISTS junctioncontrol TEXT,
  ADD COLUMN IF NOT EXISTS trafficlightstatus TEXT;

-- Restore Special conditions
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS special_conditions TEXT,
  ADD COLUMN IF NOT EXISTS special_conditions_roadworks TEXT,
  ADD COLUMN IF NOT EXISTS special_conditions_defective_road TEXT,
  ADD COLUMN IF NOT EXISTS special_conditions_oil_spills TEXT,
  ADD COLUMN IF NOT EXISTS special_conditions_workman TEXT,
  ADD COLUMN IF NOT EXISTS special_conditions_animals BOOLEAN;

-- Restore Accident details
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS detailed_account_of_what_happened TEXT,
  ADD COLUMN IF NOT EXISTS usermanoeuvre TEXT,
  ADD COLUMN IF NOT EXISTS your_speed TEXT,
  ADD COLUMN IF NOT EXISTS impact_point TEXT,
  ADD COLUMN IF NOT EXISTS direction_and_speed TEXT,
  ADD COLUMN IF NOT EXISTS impact TEXT;

-- Restore User's vehicle information
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS make_of_car TEXT,
  ADD COLUMN IF NOT EXISTS model_of_car TEXT,
  ADD COLUMN IF NOT EXISTS license_plate_number TEXT,
  ADD COLUMN IF NOT EXISTS wearing_seatbelts BOOLEAN,
  ADD COLUMN IF NOT EXISTS airbags_deployed BOOLEAN,
  ADD COLUMN IF NOT EXISTS damage_to_your_vehicle BOOLEAN,
  ADD COLUMN IF NOT EXISTS reason_no_seatbelts TEXT,
  ADD COLUMN IF NOT EXISTS damage_caused_by_accident TEXT,
  ADD COLUMN IF NOT EXISTS any_damage_prior BOOLEAN,
  ADD COLUMN IF NOT EXISTS usual_vehicle TEXT DEFAULT 'false',
  ADD COLUMN IF NOT EXISTS vehicle_driveable TEXT DEFAULT 'false',
  ADD COLUMN IF NOT EXISTS no_damage BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_visible_damage BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS seatbelts_worn BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS describe_damage_to_vehicle TEXT;

-- Restore DVLA lookup fields
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS dvla_lookup_reg TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_make TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_model TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_color TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_year INTEGER,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_fuel_type TEXT,
  ADD COLUMN IF NOT EXISTS dvla_mot_status TEXT,
  ADD COLUMN IF NOT EXISTS dvla_mot_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS dvla_tax_status TEXT,
  ADD COLUMN IF NOT EXISTS dvla_tax_due_date DATE,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_make TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_model TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_color TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_year TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_fuel_type TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_mot_status TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_mot_expiry TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_tax_status TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_tax_due_date TEXT,
  ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_insurance_status TEXT;

-- Restore Other vehicle/driver information
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_drivers_name TEXT,
  ADD COLUMN IF NOT EXISTS other_drivers_number TEXT,
  ADD COLUMN IF NOT EXISTS other_drivers_address TEXT,
  ADD COLUMN IF NOT EXISTS other_make_of_vehicle TEXT,
  ADD COLUMN IF NOT EXISTS other_model_of_vehicle TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_license_plate TEXT,
  ADD COLUMN IF NOT EXISTS other_drivers_policy_number TEXT,
  ADD COLUMN IF NOT EXISTS other_drivers_insurance_company TEXT,
  ADD COLUMN IF NOT EXISTS other_drivers_policy_cover_type TEXT,
  ADD COLUMN IF NOT EXISTS other_drivers_policy_holder_name TEXT,
  ADD COLUMN IF NOT EXISTS other_damage_accident TEXT,
  ADD COLUMN IF NOT EXISTS other_damage_prior BOOLEAN,
  ADD COLUMN IF NOT EXISTS other_vehicle_registration TEXT,
  ADD COLUMN IF NOT EXISTS other_full_name TEXT,
  ADD COLUMN IF NOT EXISTS other_contact_number TEXT,
  ADD COLUMN IF NOT EXISTS other_email_address TEXT,
  ADD COLUMN IF NOT EXISTS other_driving_license_number TEXT,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_make TEXT,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_model TEXT,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_colour TEXT,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_year TEXT,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_fuel_type TEXT,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_mot_status TEXT,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_mot_expiry_date TEXT,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_tax_status TEXT,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_tax_due_date TEXT,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_insurance_status TEXT;

-- Restore Police information
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS did_police_attend BOOLEAN,
  ADD COLUMN IF NOT EXISTS police_attended BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accident_reference_number TEXT,
  ADD COLUMN IF NOT EXISTS police_officer_badge_number TEXT,
  ADD COLUMN IF NOT EXISTS police_officers_name TEXT,
  ADD COLUMN IF NOT EXISTS police_force_details TEXT,
  ADD COLUMN IF NOT EXISTS breath_test BOOLEAN,
  ADD COLUMN IF NOT EXISTS other_breath_test BOOLEAN;

-- Restore Witness information
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS any_witness BOOLEAN,
  ADD COLUMN IF NOT EXISTS witnesses_present BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS witness_contact_information TEXT;

-- Restore File URLs
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS file_url_documents TEXT,
  ADD COLUMN IF NOT EXISTS file_url_documents_1 TEXT,
  ADD COLUMN IF NOT EXISTS file_url_record_detailed_account_of_what_happened TEXT,
  ADD COLUMN IF NOT EXISTS file_url_what3words TEXT,
  ADD COLUMN IF NOT EXISTS file_url_scene_overview TEXT,
  ADD COLUMN IF NOT EXISTS file_url_scene_overview_1 TEXT,
  ADD COLUMN IF NOT EXISTS file_url_other_vehicle TEXT,
  ADD COLUMN IF NOT EXISTS file_url_other_vehicle_1 TEXT,
  ADD COLUMN IF NOT EXISTS file_url_vehicle_damage TEXT,
  ADD COLUMN IF NOT EXISTS file_url_vehicle_damage_1 TEXT,
  ADD COLUMN IF NOT EXISTS file_url_vehicle_damage_2 TEXT;

-- Restore Recovery and miscellaneous
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS call_recovery BOOLEAN,
  ADD COLUMN IF NOT EXISTS recovery_location TEXT,
  ADD COLUMN IF NOT EXISTS recovery_phone TEXT,
  ADD COLUMN IF NOT EXISTS recovery_notes TEXT,
  ADD COLUMN IF NOT EXISTS upgrade_to_premium BOOLEAN,
  ADD COLUMN IF NOT EXISTS anything_else TEXT,
  ADD COLUMN IF NOT EXISTS final_feeling TEXT,
  ADD COLUMN IF NOT EXISTS emergency_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS emergency_audio_transcription TEXT;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Restored all 225 columns to incident_reports';
  RAISE NOTICE '⚠️ Table returned to previous state with 236 total columns';
END $$;

COMMIT;
