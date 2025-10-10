
-- Migration: Create ai_summary and incident_images tables
-- Date: 2025-01-10
-- Description: Create tables for AI processing and image storage tracking

-- Create ai_summary table for OpenAI-generated summaries
CREATE TABLE IF NOT EXISTS public.ai_summary (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id uuid REFERENCES auth.users(id),
    create_user_id text NOT NULL, -- Legacy compatibility
    incident_id text, -- Links to incident or transcription
    summary_text text,
    key_points text[], -- Array of key findings
    fault_analysis text,
    severity_assessment text,
    liability_assessment text,
    contributing_factors text,
    ai_model_used text DEFAULT 'gpt-4-turbo-preview',
    processing_time_ms integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create incident_images table for tracking uploaded files
CREATE TABLE IF NOT EXISTS public.incident_images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id uuid REFERENCES auth.users(id),
    create_user_id text NOT NULL, -- Legacy compatibility
    incident_report_id uuid, -- Optional link to incident_reports table
    file_name text NOT NULL, -- Storage path/filename
    original_filename text, -- Original file name from upload
    file_type text, -- e.g., 'driving_license', 'vehicle_front', 'scene_photo'
    file_size integer,
    mime_type text,
    storage_bucket text DEFAULT 'user-uploads',
    storage_path text, -- Full storage path
    upload_source text DEFAULT 'typeform', -- 'typeform', 'direct_upload', etc.
    processed boolean DEFAULT false,
    processing_error text,
    deletion_requested timestamptz,
    deletion_completed timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_summary_auth_user_id ON public.ai_summary(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_summary_create_user_id ON public.ai_summary(create_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_summary_incident_id ON public.ai_summary(incident_id);

CREATE INDEX IF NOT EXISTS idx_incident_images_auth_user_id ON public.incident_images(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_incident_images_create_user_id ON public.incident_images(create_user_id);
CREATE INDEX IF NOT EXISTS idx_incident_images_incident_report_id ON public.incident_images(incident_report_id);
CREATE INDEX IF NOT EXISTS idx_incident_images_file_type ON public.incident_images(file_type);
CREATE INDEX IF NOT EXISTS idx_incident_images_processed ON public.incident_images(processed);

-- Add updated_at triggers
CREATE TRIGGER update_ai_summary_updated_at 
BEFORE UPDATE ON public.ai_summary 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incident_images_updated_at 
BEFORE UPDATE ON public.incident_images 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on both tables
ALTER TABLE public.ai_summary ENABLE row level security;
ALTER TABLE public.incident_images ENABLE row level security;

-- Create RLS policies for ai_summary (owner-only access)
CREATE POLICY "ai_summary_sel" ON public.ai_summary 
FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "ai_summary_ins" ON public.ai_summary 
FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "ai_summary_upd" ON public.ai_summary 
FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "ai_summary_del" ON public.ai_summary 
FOR DELETE USING (auth.uid() = auth_user_id);

-- Create RLS policies for incident_images (owner-only access)
CREATE POLICY "incident_images_sel" ON public.incident_images 
FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "incident_images_ins" ON public.incident_images 
FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "incident_images_upd" ON public.incident_images 
FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "incident_images_del" ON public.incident_images 
FOR DELETE USING (auth.uid() = auth_user_id);
