-- Migration 031: Create PDF Generation Queue Table
-- Date: 2025-12-18
-- Purpose: Track and retry failed PDF generation jobs
-- Ensures PDFs are always generated even if initial attempt fails

BEGIN;

-- Create enum for job status
DO $$ BEGIN
  CREATE TYPE pdf_job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'abandoned');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create pdf_generation_queue table
CREATE TABLE IF NOT EXISTS public.pdf_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and incident references
  create_user_id TEXT NOT NULL,  -- FK to user_signup
  incident_id UUID,              -- FK to incident_reports (optional, for reference)

  -- Job tracking
  status pdf_job_status DEFAULT 'pending',
  source TEXT DEFAULT 'incident-form-submission',  -- What triggered this job

  -- Retry management
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),  -- When to next attempt (exponential backoff)

  -- Error tracking
  last_error TEXT,
  error_history JSONB DEFAULT '[]',  -- Array of {timestamp, error, attempt} objects

  -- Result tracking
  completed_form_id UUID,  -- FK to completed_incident_forms when successful

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT fk_pdf_queue_user FOREIGN KEY (create_user_id)
    REFERENCES public.user_signup(create_user_id) ON DELETE CASCADE
);

-- Index for finding pending jobs to process
CREATE INDEX idx_pdf_queue_pending
  ON public.pdf_generation_queue(status, next_retry_at)
  WHERE status IN ('pending', 'failed');

-- Index for user lookups
CREATE INDEX idx_pdf_queue_user
  ON public.pdf_generation_queue(create_user_id);

-- Index for finding recent failures (for monitoring)
CREATE INDEX idx_pdf_queue_failures
  ON public.pdf_generation_queue(status, updated_at)
  WHERE status = 'failed';

-- Enable Row Level Security
ALTER TABLE public.pdf_generation_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role only (not user-facing)
CREATE POLICY "Service role can manage pdf queue"
  ON public.pdf_generation_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_pdf_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pdf_queue_updated_at
  BEFORE UPDATE ON public.pdf_generation_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_queue_updated_at();

-- Comment on table
COMMENT ON TABLE public.pdf_generation_queue IS 'Queue for tracking and retrying PDF generation jobs with exponential backoff';

COMMIT;
