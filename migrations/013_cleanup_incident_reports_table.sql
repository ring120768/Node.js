-- Migration: Clean up incident_reports table - Remove redundant/incorrect columns
-- Date: 2025-11-06
-- Purpose: Drop 225 columns, keep only 11 essential metadata/identifier columns
-- Status: Table is empty (0 rows), no data loss

BEGIN;

-- Drop all data columns, keeping only essential metadata
-- Medical/Safety fields (40+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS medical_how_are_you_feeling,
  DROP COLUMN IF EXISTS medical_attention_from_who,
  DROP COLUMN IF EXISTS further_medical_attention,
  DROP COLUMN IF EXISTS are_you_safe,
  DROP COLUMN IF EXISTS medical_attention,
  DROP COLUMN IF EXISTS six_point_safety_check,
  DROP COLUMN IF EXISTS call_emergency_contact,
  DROP COLUMN IF EXISTS medical_chest_pain,
  DROP COLUMN IF EXISTS medical_breathlessness,
  DROP COLUMN IF EXISTS medical_abdominal_bruising,
  DROP COLUMN IF EXISTS medical_uncontrolled_bleeding,
  DROP COLUMN IF EXISTS medical_severe_headache,
  DROP COLUMN IF EXISTS medical_change_in_vision,
  DROP COLUMN IF EXISTS medical_abdominal_pain,
  DROP COLUMN IF EXISTS medical_limb_pain,
  DROP COLUMN IF EXISTS medical_limb_weakness,
  DROP COLUMN IF EXISTS medical_loss_of_consciousness,
  DROP COLUMN IF EXISTS medical_none_of_these,
  DROP COLUMN IF EXISTS medical_please_be_completely_honest,
  DROP COLUMN IF EXISTS ambulance_called,
  DROP COLUMN IF EXISTS hospital_name,
  DROP COLUMN IF EXISTS injury_severity,
  DROP COLUMN IF EXISTS treatment_received,
  DROP COLUMN IF EXISTS medical_follow_up_needed,
  DROP COLUMN IF EXISTS medical_ambulance_called,
  DROP COLUMN IF EXISTS medical_attention_needed,
  DROP COLUMN IF EXISTS medical_hospital_name,
  DROP COLUMN IF EXISTS medical_injury_details,
  DROP COLUMN IF EXISTS medical_injury_severity,
  DROP COLUMN IF EXISTS medical_treatment_received,
  DROP COLUMN IF EXISTS medical_symptom_none,
  DROP COLUMN IF EXISTS medical_symptom_abdominal_bruising,
  DROP COLUMN IF EXISTS medical_symptom_abdominal_pain,
  DROP COLUMN IF EXISTS medical_symptom_breathlessness,
  DROP COLUMN IF EXISTS medical_symptom_change_in_vision,
  DROP COLUMN IF EXISTS medical_symptom_chest_pain,
  DROP COLUMN IF EXISTS medical_symptom_dizziness,
  DROP COLUMN IF EXISTS medical_symptom_life_threatening,
  DROP COLUMN IF EXISTS medical_symptom_limb_pain_mobility,
  DROP COLUMN IF EXISTS medical_symptom_limb_weakness,
  DROP COLUMN IF EXISTS medical_symptom_loss_of_consciousness,
  DROP COLUMN IF EXISTS medical_symptom_severe_headache,
  DROP COLUMN IF EXISTS medical_symptom_uncontrolled_bleeding;

-- Date/Time/Location fields (15+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS date,
  DROP COLUMN IF EXISTS when_did_the_accident_happen,
  DROP COLUMN IF EXISTS what_time_did_the_accident_happen,
  DROP COLUMN IF EXISTS where_exactly_did_this_happen,
  DROP COLUMN IF EXISTS accident_date,
  DROP COLUMN IF EXISTS accident_time,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS what3words,
  DROP COLUMN IF EXISTS nearestlandmark,
  DROP COLUMN IF EXISTS additionalhazards,
  DROP COLUMN IF EXISTS specialconditions,
  DROP COLUMN IF EXISTS visibilityfactors;

-- Weather conditions (40+ boolean columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS weather_conditions,
  DROP COLUMN IF EXISTS weather_overcast,
  DROP COLUMN IF EXISTS weather_street_lights,
  DROP COLUMN IF EXISTS weather_heavy_rain,
  DROP COLUMN IF EXISTS weather_wet_road,
  DROP COLUMN IF EXISTS weather_fog,
  DROP COLUMN IF EXISTS weather_snow_on_road,
  DROP COLUMN IF EXISTS weather_bright_daylight,
  DROP COLUMN IF EXISTS weather_light_rain,
  DROP COLUMN IF EXISTS weather_clear_and_dry,
  DROP COLUMN IF EXISTS weather_dusk,
  DROP COLUMN IF EXISTS weather_snow,
  DROP COLUMN IF EXISTS weather_drizzle,
  DROP COLUMN IF EXISTS weather_raining,
  DROP COLUMN IF EXISTS weather_hail,
  DROP COLUMN IF EXISTS weather_windy,
  DROP COLUMN IF EXISTS weather_thunder,
  DROP COLUMN IF EXISTS weather_slush_road,
  DROP COLUMN IF EXISTS weather_loose_surface,
  DROP COLUMN IF EXISTS weather_clear,
  DROP COLUMN IF EXISTS weather_cloudy,
  DROP COLUMN IF EXISTS weather_bright_sunlight,
  DROP COLUMN IF EXISTS weather_ice,
  DROP COLUMN IF EXISTS weather_thunder_lightning,
  DROP COLUMN IF EXISTS weather_other;

-- Road conditions and traffic (40+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS road_type,
  DROP COLUMN IF EXISTS speed_limit,
  DROP COLUMN IF EXISTS road_condition_dry,
  DROP COLUMN IF EXISTS road_condition_wet,
  DROP COLUMN IF EXISTS road_condition_icy,
  DROP COLUMN IF EXISTS road_condition_snow_covered,
  DROP COLUMN IF EXISTS road_condition_loose_surface,
  DROP COLUMN IF EXISTS road_condition_other,
  DROP COLUMN IF EXISTS road_markings_yes,
  DROP COLUMN IF EXISTS road_markings_partial,
  DROP COLUMN IF EXISTS road_markings_no,
  DROP COLUMN IF EXISTS road_markings_visible_yes,
  DROP COLUMN IF EXISTS road_markings_visible_partially,
  DROP COLUMN IF EXISTS road_markings_visible_no,
  DROP COLUMN IF EXISTS road_type_motorway,
  DROP COLUMN IF EXISTS road_type_a_road,
  DROP COLUMN IF EXISTS road_type_b_road,
  DROP COLUMN IF EXISTS road_type_urban_street,
  DROP COLUMN IF EXISTS road_type_rural_road,
  DROP COLUMN IF EXISTS road_type_car_park,
  DROP COLUMN IF EXISTS road_type_private_road,
  DROP COLUMN IF EXISTS traffic_heavy,
  DROP COLUMN IF EXISTS traffic_moderate,
  DROP COLUMN IF EXISTS traffic_light,
  DROP COLUMN IF EXISTS traffic_none,
  DROP COLUMN IF EXISTS traffic_conditions_no_traffic,
  DROP COLUMN IF EXISTS traffic_conditions_light,
  DROP COLUMN IF EXISTS traffic_conditions_moderate,
  DROP COLUMN IF EXISTS traffic_conditions_heavy,
  DROP COLUMN IF EXISTS visibility_good,
  DROP COLUMN IF EXISTS visibility_poor,
  DROP COLUMN IF EXISTS visibility_very_poor,
  DROP COLUMN IF EXISTS visibility_street_lights;

-- Junction information (10+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS junction_information,
  DROP COLUMN IF EXISTS junction_information_roundabout,
  DROP COLUMN IF EXISTS junction_information_t_junction,
  DROP COLUMN IF EXISTS junction_information_traffic_lights,
  DROP COLUMN IF EXISTS junction_information_crossroads,
  DROP COLUMN IF EXISTS junctiontype,
  DROP COLUMN IF EXISTS junctioncontrol,
  DROP COLUMN IF EXISTS trafficlightstatus;

-- Special conditions (5+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS special_conditions,
  DROP COLUMN IF EXISTS special_conditions_roadworks,
  DROP COLUMN IF EXISTS special_conditions_defective_road,
  DROP COLUMN IF EXISTS special_conditions_oil_spills,
  DROP COLUMN IF EXISTS special_conditions_workman,
  DROP COLUMN IF EXISTS special_conditions_animals;

-- Accident details (10+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS detailed_account_of_what_happened,
  DROP COLUMN IF EXISTS usermanoeuvre,
  DROP COLUMN IF EXISTS your_speed,
  DROP COLUMN IF EXISTS impact_point,
  DROP COLUMN IF EXISTS direction_and_speed,
  DROP COLUMN IF EXISTS impact;

-- User's vehicle information (15+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS make_of_car,
  DROP COLUMN IF EXISTS model_of_car,
  DROP COLUMN IF EXISTS license_plate_number,
  DROP COLUMN IF EXISTS wearing_seatbelts,
  DROP COLUMN IF EXISTS airbags_deployed,
  DROP COLUMN IF EXISTS damage_to_your_vehicle,
  DROP COLUMN IF EXISTS reason_no_seatbelts,
  DROP COLUMN IF EXISTS damage_caused_by_accident,
  DROP COLUMN IF EXISTS any_damage_prior,
  DROP COLUMN IF EXISTS usual_vehicle,
  DROP COLUMN IF EXISTS vehicle_driveable,
  DROP COLUMN IF EXISTS no_damage,
  DROP COLUMN IF EXISTS no_visible_damage,
  DROP COLUMN IF EXISTS seatbelts_worn,
  DROP COLUMN IF EXISTS describe_damage_to_vehicle;

-- DVLA lookup fields (old schema - 20+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS dvla_lookup_reg,
  DROP COLUMN IF EXISTS dvla_vehicle_make,
  DROP COLUMN IF EXISTS dvla_vehicle_model,
  DROP COLUMN IF EXISTS dvla_vehicle_color,
  DROP COLUMN IF EXISTS dvla_vehicle_year,
  DROP COLUMN IF EXISTS dvla_vehicle_fuel_type,
  DROP COLUMN IF EXISTS dvla_mot_status,
  DROP COLUMN IF EXISTS dvla_mot_expiry_date,
  DROP COLUMN IF EXISTS dvla_tax_status,
  DROP COLUMN IF EXISTS dvla_tax_due_date,
  DROP COLUMN IF EXISTS dvla_vehicle_lookup_make,
  DROP COLUMN IF EXISTS dvla_vehicle_lookup_model,
  DROP COLUMN IF EXISTS dvla_vehicle_lookup_color,
  DROP COLUMN IF EXISTS dvla_vehicle_lookup_year,
  DROP COLUMN IF EXISTS dvla_vehicle_lookup_fuel_type,
  DROP COLUMN IF EXISTS dvla_vehicle_lookup_mot_status,
  DROP COLUMN IF EXISTS dvla_vehicle_lookup_mot_expiry,
  DROP COLUMN IF EXISTS dvla_vehicle_lookup_tax_status,
  DROP COLUMN IF EXISTS dvla_vehicle_lookup_tax_due_date,
  DROP COLUMN IF EXISTS dvla_vehicle_lookup_insurance_status;

-- Other vehicle/driver information (40+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS other_drivers_name,
  DROP COLUMN IF EXISTS other_drivers_number,
  DROP COLUMN IF EXISTS other_drivers_address,
  DROP COLUMN IF EXISTS other_make_of_vehicle,
  DROP COLUMN IF EXISTS other_model_of_vehicle,
  DROP COLUMN IF EXISTS vehicle_license_plate,
  DROP COLUMN IF EXISTS other_drivers_policy_number,
  DROP COLUMN IF EXISTS other_drivers_insurance_company,
  DROP COLUMN IF EXISTS other_drivers_policy_cover_type,
  DROP COLUMN IF EXISTS other_drivers_policy_holder_name,
  DROP COLUMN IF EXISTS other_damage_accident,
  DROP COLUMN IF EXISTS other_damage_prior,
  DROP COLUMN IF EXISTS other_vehicle_registration,
  DROP COLUMN IF EXISTS other_full_name,
  DROP COLUMN IF EXISTS other_contact_number,
  DROP COLUMN IF EXISTS other_email_address,
  DROP COLUMN IF EXISTS other_driving_license_number,
  DROP COLUMN IF EXISTS other_vehicle_look_up_make,
  DROP COLUMN IF EXISTS other_vehicle_look_up_model,
  DROP COLUMN IF EXISTS other_vehicle_look_up_colour,
  DROP COLUMN IF EXISTS other_vehicle_look_up_year,
  DROP COLUMN IF EXISTS other_vehicle_look_up_fuel_type,
  DROP COLUMN IF EXISTS other_vehicle_look_up_mot_status,
  DROP COLUMN IF EXISTS other_vehicle_look_up_mot_expiry_date,
  DROP COLUMN IF EXISTS other_vehicle_look_up_tax_status,
  DROP COLUMN IF EXISTS other_vehicle_look_up_tax_due_date,
  DROP COLUMN IF EXISTS other_vehicle_look_up_insurance_status;

-- Police information (10+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS did_police_attend,
  DROP COLUMN IF EXISTS police_attended,
  DROP COLUMN IF EXISTS accident_reference_number,
  DROP COLUMN IF EXISTS police_officer_badge_number,
  DROP COLUMN IF EXISTS police_officers_name,
  DROP COLUMN IF EXISTS police_force_details,
  DROP COLUMN IF EXISTS breath_test,
  DROP COLUMN IF EXISTS other_breath_test;

-- Witness information (5+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS any_witness,
  DROP COLUMN IF EXISTS witnesses_present,
  DROP COLUMN IF EXISTS witness_contact_information;

-- File URLs (15+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS file_url_documents,
  DROP COLUMN IF EXISTS file_url_documents_1,
  DROP COLUMN IF EXISTS file_url_record_detailed_account_of_what_happened,
  DROP COLUMN IF EXISTS file_url_what3words,
  DROP COLUMN IF EXISTS file_url_scene_overview,
  DROP COLUMN IF EXISTS file_url_scene_overview_1,
  DROP COLUMN IF EXISTS file_url_other_vehicle,
  DROP COLUMN IF EXISTS file_url_other_vehicle_1,
  DROP COLUMN IF EXISTS file_url_vehicle_damage,
  DROP COLUMN IF EXISTS file_url_vehicle_damage_1,
  DROP COLUMN IF EXISTS file_url_vehicle_damage_2;

-- Recovery and miscellaneous (15+ columns)
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS call_recovery,
  DROP COLUMN IF EXISTS recovery_location,
  DROP COLUMN IF EXISTS recovery_phone,
  DROP COLUMN IF EXISTS recovery_notes,
  DROP COLUMN IF EXISTS upgrade_to_premium,
  DROP COLUMN IF EXISTS anything_else,
  DROP COLUMN IF EXISTS final_feeling,
  DROP COLUMN IF EXISTS emergency_audio_url,
  DROP COLUMN IF EXISTS emergency_audio_transcription;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 013 complete: Dropped 225 columns from incident_reports';
  RAISE NOTICE '✅ Kept 11 essential columns: id, create_user_id, auth_user_id, user_id, created_at, updated_at, submit_date, deleted_at, retention_until, transcription_id, form_id';
  RAISE NOTICE '✅ Table ready for rebuild with correct schema';
END $$;

COMMIT;
