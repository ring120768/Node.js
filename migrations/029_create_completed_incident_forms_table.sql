-- Migration 029: Create completed_incident_forms Table
-- Date: 2025-12-14
-- Purpose: Store final PDF reports and email delivery status
-- Related: pdf.controller.js lines 294-307

BEGIN;

-- Create completed_incident_forms table for storing final PDF reports
CREATE TABLE IF NOT EXISTS public.completed_incident_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  create_user_id TEXT NOT NULL,  -- Foreign key to user_signup (TEXT type to match user_signup)

  -- Form and PDF data
  form_data JSON,                 -- Complete form data snapshot
  pdf_base64 TEXT,                -- Base64 encoded PDF (truncated to 1MB)
  pdf_url TEXT,                   -- Supabase Storage signed URL for PDF
  pdf_storage_path TEXT,          -- Supabase Storage path for on-demand URL regeneration

  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,  -- Soft delete for GDPR

  -- Email delivery tracking
  sent_to_user BOOLEAN DEFAULT FALSE,
  sent_to_accounts BOOLEAN DEFAULT FALSE,
  email_status JSON DEFAULT '{}',

  -- Constraints
  CONSTRAINT fk_create_user FOREIGN KEY (create_user_id)
    REFERENCES public.user_signup(create_user_id) ON DELETE CASCADE
);

-- Create index for faster lookups by user
CREATE INDEX idx_completed_forms_user
  ON public.completed_incident_forms(create_user_id);

-- Create index for email status queries
CREATE INDEX idx_completed_forms_sent_status
  ON public.completed_incident_forms(sent_to_user, sent_to_accounts);

-- Create index for soft delete queries
CREATE INDEX idx_completed_forms_deleted
  ON public.completed_incident_forms(deleted_at)
  WHERE deleted_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.completed_incident_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own completed forms
CREATE POLICY "Users can view their own completed forms"
  ON public.completed_incident_forms
  FOR SELECT
  USING (auth.uid()::text = create_user_id);

-- RLS Policy: Users can insert their own completed forms
CREATE POLICY "Users can create their own completed forms"
  ON public.completed_incident_forms
  FOR INSERT
  WITH CHECK (auth.uid()::text = create_user_id);

-- RLS Policy: Users can update their own completed forms
CREATE POLICY "Users can update their own completed forms"
  ON public.completed_incident_forms
  FOR UPDATE
  USING (auth.uid()::text = create_user_id);

-- RLS Policy: Users can soft delete their own completed forms
CREATE POLICY "Users can delete their own completed forms"
  ON public.completed_incident_forms
  FOR DELETE
  USING (auth.uid()::text = create_user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_completed_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER completed_forms_updated_at
  BEFORE UPDATE ON public.completed_incident_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_forms_updated_at();

COMMIT;
