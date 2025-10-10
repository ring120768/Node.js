
-- Migration: Create core tables for Car Crash Lawyer AI
-- Date: 2025-01-10
-- Description: Create all essential tables referenced in the application

-- Create user_signup table (main user profile table)
CREATE TABLE IF NOT EXISTS public.user_signup (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    uid text, -- Legacy field for backwards compatibility
    create_user_id text, -- Legacy field for PDF generation
    auth_user_id uuid REFERENCES auth.users(id), -- For RLS policies
    email text NOT NULL,
    first_name text,
    last_name text,
    phone text,
    address text,
    postcode text,
    date_of_birth text,
    emergency_contact_name text,
    emergency_contact_number text,
    vehicle_registration text,
    vehicle_make text,
    vehicle_model text,
    vehicle_colour text,
    insurance_company text,
    insurance_policy_number text,
    driving_license_picture text,
    vehicle_picture_front text,
    vehicle_picture_driver_side text,
    vehicle_picture_passenger_side text,
    vehicle_picture_back text,
    product_id text DEFAULT 'car_crash_lawyer_ai',
    typeform_completed boolean DEFAULT false,
    typeform_completion_date timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create transcription_queue table
CREATE TABLE IF NOT EXISTS public.transcription_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id uuid REFERENCES auth.users(id),
    create_user_id text, -- Legacy compatibility
    audio_url text,
    status text DEFAULT 'pending',
    transcription_text text,
    error_message text,
    processing_started_at timestamptz,
    processing_completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create ai_transcription table
CREATE TABLE IF NOT EXISTS public.ai_transcription (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id uuid REFERENCES auth.users(id),
    create_user_id text, -- Legacy compatibility
    transcription_text text,
    ai_summary text,
    incident_details jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create gdpr_audit_log table
CREATE TABLE IF NOT EXISTS public.gdpr_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    activity_type text NOT NULL,
    details jsonb,
    ip_address text,
    user_agent text,
    request_id text,
    timestamp timestamptz DEFAULT now()
);

-- Create incident_reports table with comprehensive fields
CREATE TABLE IF NOT EXISTS public.incident_reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id uuid REFERENCES auth.users(id),
    create_user_id text NOT NULL, -- Legacy compatibility but required
    transcription_id uuid REFERENCES public.transcription_queue(id),
    
    -- Basic incident information
    incident_date text,
    incident_time text,
    weather_conditions text,
    road_conditions text,
    speed_limit text,
    accident_location text,
    what3words text,
    postcode text,
    
    -- Vehicle information
    vehicle_make text,
    vehicle_model text,
    vehicle_registration text,
    vehicle_colour text,
    vehicle_year text,
    
    -- Driver information
    driver_name text,
    driver_license_number text,
    driver_phone text,
    driver_address text,
    
    -- Other party information
    other_driver_name text,
    other_driver_phone text,
    other_driver_license text,
    other_vehicle_make text,
    other_vehicle_model text,
    other_vehicle_registration text,
    other_vehicle_colour text,
    other_vehicle_year text,
    other_driver_insurance_company text,
    other_driver_policy_number text,
    
    -- Witness information
    witness_1_name text,
    witness_1_phone text,
    witness_1_address text,
    witness_2_name text,
    witness_2_phone text,
    witness_2_address text,
    witness_3_name text,
    witness_3_phone text,
    witness_3_address text,
    
    -- Police information
    police_attended boolean DEFAULT false,
    police_reference_number text,
    police_officer_name text,
    police_station text,
    
    -- Insurance information
    insurance_company text,
    insurance_policy_number text,
    insurance_claim_number text,
    insurance_notified boolean DEFAULT false,
    insurance_notified_date text,
    
    -- Damage assessment
    damage_description text,
    damage_location text,
    damage_severity text,
    vehicle_driveable boolean,
    airbags_deployed boolean DEFAULT false,
    
    -- Injury information
    injuries_sustained boolean DEFAULT false,
    injury_description text,
    medical_attention_required boolean DEFAULT false,
    hospital_attended text,
    
    -- Incident description
    incident_description text,
    what_happened text,
    fault_admission boolean DEFAULT false,
    
    -- Recovery and aftermath
    recovery_required boolean DEFAULT false,
    recovery_company text,
    towed_to_location text,
    
    -- Additional notes
    additional_notes text,
    
    -- File attachments (storage paths)
    scene_photo_1 text,
    scene_photo_2 text,
    scene_photo_3 text,
    scene_photo_4 text,
    vehicle_damage_photo_1 text,
    vehicle_damage_photo_2 text,
    vehicle_damage_photo_3 text,
    vehicle_damage_photo_4 text,
    other_vehicle_photo_1 text,
    other_vehicle_photo_2 text,
    driving_license_photo text,
    insurance_certificate_photo text,
    
    -- Audio recording
    audio_recording_url text,
    audio_transcription text,
    
    -- Processing status
    status text DEFAULT 'pending',
    pdf_generated boolean DEFAULT false,
    pdf_url text,
    email_sent boolean DEFAULT false,
    email_sent_date timestamptz,
    
    -- Legacy fields for compatibility
    incident_data jsonb,
    
    -- Timestamps
    submitted_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_signup_auth_user_id ON public.user_signup(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_signup_email ON public.user_signup(email);
CREATE INDEX IF NOT EXISTS idx_transcription_queue_auth_user_id ON public.transcription_queue(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_queue_status ON public.transcription_queue(status);
CREATE INDEX IF NOT EXISTS idx_ai_transcription_auth_user_id ON public.ai_transcription(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_user_id ON public.gdpr_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_auth_user_id ON public.incident_reports(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_create_user_id ON public.incident_reports(create_user_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON public.incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_submitted_at ON public.incident_reports(submitted_at);
CREATE INDEX IF NOT EXISTS idx_incident_reports_transcription_id ON public.incident_reports(transcription_id);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_signup_updated_at BEFORE UPDATE ON public.user_signup FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcription_queue_updated_at BEFORE UPDATE ON public.transcription_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_transcription_updated_at BEFORE UPDATE ON public.ai_transcription FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incident_reports_updated_at BEFORE UPDATE ON public.incident_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
