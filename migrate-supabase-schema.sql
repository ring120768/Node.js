
-- ========================================
-- CAR CRASH LAWYER AI - SUPABASE SCHEMA MIGRATION
-- Based on supabase_fields_1759689113802.csv
-- ========================================

-- First, let's ensure we have all the essential tables with correct structure

-- ========================================
-- USER SIGNUP TABLE - Core user information
-- ========================================
ALTER TABLE public.user_signup 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS surname TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS mobile BIGINT,
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS town TEXT,
ADD COLUMN IF NOT EXISTS street_address_optional TEXT,
ADD COLUMN IF NOT EXISTS postcode TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS driving_license_number TEXT,
ADD COLUMN IF NOT EXISTS car_registration_number TEXT,
ADD COLUMN IF NOT EXISTS vehicle_make TEXT,
ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
ADD COLUMN IF NOT EXISTS vehicle_colour TEXT,
ADD COLUMN IF NOT EXISTS vehicle_condition TEXT,
ADD COLUMN IF NOT EXISTS recovery_company TEXT,
ADD COLUMN IF NOT EXISTS recovery_breakdown_number TEXT,
ADD COLUMN IF NOT EXISTS recovery_breakdown_email TEXT,
ADD COLUMN IF NOT EXISTS gdpr_consent TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact BIGINT,
ADD COLUMN IF NOT EXISTS insurance_company TEXT,
ADD COLUMN IF NOT EXISTS policy_number TEXT,
ADD COLUMN IF NOT EXISTS policy_holder TEXT,
ADD COLUMN IF NOT EXISTS cover_type TEXT,
ADD COLUMN IF NOT EXISTS time_stamp TIMESTAMP,
ADD COLUMN IF NOT EXISTS driving_license_picture TEXT,
ADD COLUMN IF NOT EXISTS vehicle_picture_front TEXT,
ADD COLUMN IF NOT EXISTS vehicle_picture_driver_side TEXT,
ADD COLUMN IF NOT EXISTS vehicle_picture_passenger_side TEXT,
ADD COLUMN IF NOT EXISTS vehicle_picture_back TEXT,
-- Hidden Typeform fields
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS auth_code TEXT;

-- Ensure create_user_id is UUID type
ALTER TABLE public.user_signup 
ALTER COLUMN create_user_id TYPE UUID USING create_user_id::UUID;

-- ========================================
-- INCIDENT REPORTS TABLE - Main incident data
-- ========================================
ALTER TABLE public.incident_reports
-- Core incident fields
ADD COLUMN IF NOT EXISTS submit_date DATE,
ADD COLUMN IF NOT EXISTS form_id TEXT,
-- Medical assessment
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
-- Incident details
ADD COLUMN IF NOT EXISTS when_did_the_accident_happen TEXT,
ADD COLUMN IF NOT EXISTS what_time_did_the_accident_happen INTEGER,
ADD COLUMN IF NOT EXISTS where_exactly_did_this_happen TEXT,
ADD COLUMN IF NOT EXISTS weather_conditions TEXT,
ADD COLUMN IF NOT EXISTS wearing_seatbelts BOOLEAN,
ADD COLUMN IF NOT EXISTS airbags_deployed BOOLEAN,
ADD COLUMN IF NOT EXISTS damage_to_your_vehicle BOOLEAN,
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
ADD COLUMN IF NOT EXISTS reason_no_seatbelts TEXT,
-- Road information
ADD COLUMN IF NOT EXISTS road_type TEXT,
ADD COLUMN IF NOT EXISTS speed_limit INTEGER,
ADD COLUMN IF NOT EXISTS junction_information TEXT,
ADD COLUMN IF NOT EXISTS special_conditions_roadworks TEXT,
ADD COLUMN IF NOT EXISTS junction_information_roundabout TEXT,
ADD COLUMN IF NOT EXISTS special_conditions_defective_road TEXT,
ADD COLUMN IF NOT EXISTS special_conditions_oil_spills TEXT,
ADD COLUMN IF NOT EXISTS special_conditions_workman TEXT,
ADD COLUMN IF NOT EXISTS junction_information_t_junction TEXT,
ADD COLUMN IF NOT EXISTS junction_information_traffic_lights TEXT,
ADD COLUMN IF NOT EXISTS special_conditions TEXT,
ADD COLUMN IF NOT EXISTS junction_information_crossroads TEXT,
-- Vehicle details
ADD COLUMN IF NOT EXISTS make_of_car TEXT,
ADD COLUMN IF NOT EXISTS model_of_car TEXT,
ADD COLUMN IF NOT EXISTS license_plate_number TEXT,
ADD COLUMN IF NOT EXISTS direction_and_speed TEXT,
ADD COLUMN IF NOT EXISTS impact TEXT,
ADD COLUMN IF NOT EXISTS damage_caused_by_accident TEXT,
ADD COLUMN IF NOT EXISTS any_damage_prior BOOLEAN,
-- Other driver information
ADD COLUMN IF NOT EXISTS other_drivers_name TEXT,
ADD COLUMN IF NOT EXISTS other_drivers_number TEXT,
ADD COLUMN IF NOT EXISTS other_drivers_address TEXT,
ADD COLUMN IF NOT EXISTS other_make_of_vehicle TEXT,
ADD COLUMN IF NOT EXISTS other_model_of_vehicle TEXT,
ADD COLUMN IF NOT EXISTS vehicle_license_plate TEXT,
ADD COLUMN IF NOT EXISTS other_policy_number TEXT,
ADD COLUMN IF NOT EXISTS other_insurance_company TEXT,
ADD COLUMN IF NOT EXISTS other_policy_cover TEXT,
ADD COLUMN IF NOT EXISTS other_policy_holder TEXT,
-- Police and legal
ADD COLUMN IF NOT EXISTS other_damage_accident TEXT,
ADD COLUMN IF NOT EXISTS other_damage_prior BOOLEAN,
ADD COLUMN IF NOT EXISTS accident_reference_number TEXT,
ADD COLUMN IF NOT EXISTS police_officer_badge_number TEXT,
ADD COLUMN IF NOT EXISTS police_officers_name TEXT,
ADD COLUMN IF NOT EXISTS police_force_details TEXT,
ADD COLUMN IF NOT EXISTS did_police_attend BOOLEAN,
ADD COLUMN IF NOT EXISTS breath_test BOOLEAN,
ADD COLUMN IF NOT EXISTS other_breath_test BOOLEAN,
-- Additional information
ADD COLUMN IF NOT EXISTS anything_else TEXT,
ADD COLUMN IF NOT EXISTS witness_contact_information TEXT,
ADD COLUMN IF NOT EXISTS any_witness BOOLEAN,
ADD COLUMN IF NOT EXISTS call_recovery BOOLEAN,
ADD COLUMN IF NOT EXISTS upgrade_to_premium BOOLEAN,
-- File uploads
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
ADD COLUMN IF NOT EXISTS file_url_vehicle_damage_2 TEXT,
-- DVLA user vehicle data
ADD COLUMN IF NOT EXISTS user_make TEXT,
ADD COLUMN IF NOT EXISTS user_colour TEXT,
ADD COLUMN IF NOT EXISTS user_mot_status TEXT,
ADD COLUMN IF NOT EXISTS user_mot_expiry_date TEXT,
ADD COLUMN IF NOT EXISTS user_fuel_type TEXT,
ADD COLUMN IF NOT EXISTS user_revenue_weight INTEGER,
ADD COLUMN IF NOT EXISTS user_wheelplan TEXT,
ADD COLUMN IF NOT EXISTS user_date_last_v5c_issued TEXT,
ADD COLUMN IF NOT EXISTS user_registration_number TEXT,
ADD COLUMN IF NOT EXISTS user_month_of_registration TEXT,
ADD COLUMN IF NOT EXISTS user_year_of_manufacture INTEGER,
ADD COLUMN IF NOT EXISTS user_tax_status TEXT,
ADD COLUMN IF NOT EXISTS user_tax_due_date TEXT,
ADD COLUMN IF NOT EXISTS user_co2_emissions INTEGER,
ADD COLUMN IF NOT EXISTS user_engine_capacity INTEGER,
ADD COLUMN IF NOT EXISTS user_type_approval TEXT,
ADD COLUMN IF NOT EXISTS user_marked_for_export BOOLEAN,
-- DVLA other vehicle data
ADD COLUMN IF NOT EXISTS other_make_of_car TEXT,
ADD COLUMN IF NOT EXISTS other_car_colour TEXT,
ADD COLUMN IF NOT EXISTS other_mot_status TEXT,
ADD COLUMN IF NOT EXISTS other_mot_expiry_date TEXT,
ADD COLUMN IF NOT EXISTS other_fuel_type TEXT,
ADD COLUMN IF NOT EXISTS other_wheelplan TEXT,
ADD COLUMN IF NOT EXISTS other_date_of_last_v5c_issued TEXT,
ADD COLUMN IF NOT EXISTS other_registration_number TEXT,
ADD COLUMN IF NOT EXISTS other_month_of_first_registration TEXT,
ADD COLUMN IF NOT EXISTS other_tax_status TEXT,
ADD COLUMN IF NOT EXISTS other_tax_due_date TEXT,
ADD COLUMN IF NOT EXISTS other_co2_emissions INTEGER,
ADD COLUMN IF NOT EXISTS other_engine_capacity INTEGER,
ADD COLUMN IF NOT EXISTS other_type_approval TEXT,
ADD COLUMN IF NOT EXISTS other_marked_for_export BOOLEAN,
-- Declaration
ADD COLUMN IF NOT EXISTS declaration BOOLEAN,
-- Hidden Typeform fields
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS auth_code TEXT,
-- Core system fields
ADD COLUMN IF NOT EXISTS account_status TEXT,
ADD COLUMN IF NOT EXISTS legal_support BOOLEAN,
ADD COLUMN IF NOT EXISTS voice_transcription BOOLEAN,
ADD COLUMN IF NOT EXISTS form_responses TEXT,
-- Additional system fields that may be useful
ADD COLUMN IF NOT EXISTS emergency_services_number BIGINT,
ADD COLUMN IF NOT EXISTS emergency_contact_number BIGINT,
ADD COLUMN IF NOT EXISTS recovery_service_number BIGINT;

-- Ensure create_user_id is UUID type
ALTER TABLE public.incident_reports 
ALTER COLUMN create_user_id TYPE UUID USING create_user_id::UUID;

-- ========================================
-- TRANSCRIPTION QUEUE TABLE - Ensure compatibility
-- ========================================
ALTER TABLE public.transcription_queue
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS incident_id UUID;

-- ========================================
-- AI_TRANSCRIPTION TABLE - Ensure compatibility
-- ========================================
ALTER TABLE public.ai_transcription
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS incident_id UUID;

-- ========================================
-- AI_SUMMARY TABLE - Ensure compatibility
-- ========================================
ALTER TABLE public.ai_summary
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS incident_id UUID;

-- ========================================
-- UPDATE EXISTING DATA TO MAINTAIN CONSISTENCY
-- ========================================

-- Sync user_id with create_user_id in user_signup
UPDATE public.user_signup 
SET user_id = create_user_id::UUID 
WHERE user_id IS NULL AND create_user_id IS NOT NULL;

-- Sync user_id with create_user_id in incident_reports
UPDATE public.incident_reports 
SET user_id = create_user_id::UUID 
WHERE user_id IS NULL AND create_user_id IS NOT NULL;

-- Sync user_id with create_user_id in transcription_queue
UPDATE public.transcription_queue 
SET user_id = create_user_id::UUID 
WHERE user_id IS NULL AND create_user_id IS NOT NULL;

-- Sync user_id with create_user_id in ai_transcription
UPDATE public.ai_transcription 
SET user_id = create_user_id::UUID 
WHERE user_id IS NULL AND create_user_id IS NOT NULL;

-- Sync user_id with create_user_id in ai_summary
UPDATE public.ai_summary 
SET user_id = create_user_id::UUID 
WHERE user_id IS NULL AND create_user_id IS NOT NULL;

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- User lookup indexes
CREATE INDEX IF NOT EXISTS idx_user_signup_create_user_id ON public.user_signup(create_user_id);
CREATE INDEX IF NOT EXISTS idx_user_signup_user_id ON public.user_signup(user_id);
CREATE INDEX IF NOT EXISTS idx_user_signup_email ON public.user_signup(email);

-- Incident reports indexes
CREATE INDEX IF NOT EXISTS idx_incident_reports_create_user_id ON public.incident_reports(create_user_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_user_id ON public.incident_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_created_at ON public.incident_reports(created_at);

-- Transcription indexes
CREATE INDEX IF NOT EXISTS idx_transcription_queue_create_user_id ON public.transcription_queue(create_user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_queue_status ON public.transcription_queue(status);
CREATE INDEX IF NOT EXISTS idx_ai_transcription_create_user_id ON public.ai_transcription(create_user_id);

-- AI summary indexes
CREATE INDEX IF NOT EXISTS idx_ai_summary_create_user_id ON public.ai_summary(create_user_id);

-- ========================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.user_signup IS 'User registration and personal information from Typeform';
COMMENT ON TABLE public.incident_reports IS 'Complete incident report data including all Typeform pages';
COMMENT ON COLUMN public.user_signup.create_user_id IS 'Primary UUID from Typeform submission';
COMMENT ON COLUMN public.user_signup.user_id IS 'Secondary UUID field for compatibility';
COMMENT ON COLUMN public.user_signup.product_id IS 'Typeform hidden field for product identification';
COMMENT ON COLUMN public.user_signup.auth_code IS 'Typeform hidden field for authentication';

-- ========================================
-- VERIFY SCHEMA INTEGRITY
-- ========================================

-- Show table structure for verification
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('user_signup', 'incident_reports', 'transcription_queue', 'ai_transcription', 'ai_summary')
ORDER BY table_name, ordinal_position;

-- Show indexes for verification
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('user_signup', 'incident_reports', 'transcription_queue', 'ai_transcription', 'ai_summary')
ORDER BY tablename, indexname;
