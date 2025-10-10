
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

-- Create incident_reports table (if needed for future functionality)
CREATE TABLE IF NOT EXISTS public.incident_reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id uuid REFERENCES auth.users(id),
    create_user_id text, -- Legacy compatibility
    transcription_id uuid REFERENCES public.transcription_queue(id),
    incident_data jsonb,
    pdf_generated boolean DEFAULT false,
    pdf_url text,
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
