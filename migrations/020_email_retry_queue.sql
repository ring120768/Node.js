-- Migration: 020_email_retry_queue.sql
-- Purpose: Add email retry queue for reliable email delivery
-- Date: 2025-12-20

-- =====================================================
-- EMAIL RETRY QUEUE TABLE
-- =====================================================
-- Tracks failed email sends for retry with exponential backoff
-- Separates email delivery from PDF generation lifecycle

CREATE TABLE IF NOT EXISTS email_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to the user/incident
  create_user_id UUID NOT NULL,
  incident_id UUID,
  completed_form_id UUID,

  -- Email details
  email_type VARCHAR(50) NOT NULL, -- 'pdf_delivery', 'image_links', 'admin_notification', etc.
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT,

  -- Template info (for regeneration)
  template_name VARCHAR(100),
  template_data JSONB,

  -- Attachment info (for PDF emails)
  pdf_storage_path TEXT,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'abandoned')),

  -- Retry tracking
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  last_error TEXT,
  error_history JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Source tracking
  source VARCHAR(50), -- 'pdf_generation', 'declaration_submission', 'manual_retry', etc.

  -- Priority (lower = higher priority)
  priority INTEGER DEFAULT 10
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_email_retry_queue_status_next_retry
  ON email_retry_queue(status, next_retry_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_email_retry_queue_user
  ON email_retry_queue(create_user_id);

CREATE INDEX IF NOT EXISTS idx_email_retry_queue_type
  ON email_retry_queue(email_type);

-- =====================================================
-- UPDATE completed_incident_forms FOR BETTER TRACKING
-- =====================================================
-- Add separate columns for PDF generation vs email delivery status

-- Add email_attempts column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'completed_incident_forms'
    AND column_name = 'email_attempts'
  ) THEN
    ALTER TABLE completed_incident_forms ADD COLUMN email_attempts INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add email_last_error column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'completed_incident_forms'
    AND column_name = 'email_last_error'
  ) THEN
    ALTER TABLE completed_incident_forms ADD COLUMN email_last_error TEXT;
  END IF;
END $$;

-- Add email_retry_queued column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'completed_incident_forms'
    AND column_name = 'email_retry_queued'
  ) THEN
    ALTER TABLE completed_incident_forms ADD COLUMN email_retry_queued BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE email_retry_queue ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
DROP POLICY IF EXISTS "Service role full access to email_retry_queue" ON email_retry_queue;
CREATE POLICY "Service role full access to email_retry_queue"
  ON email_retry_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own email queue entries (read-only)
DROP POLICY IF EXISTS "Users can view own email queue" ON email_retry_queue;
CREATE POLICY "Users can view own email queue"
  ON email_retry_queue
  FOR SELECT
  TO authenticated
  USING (create_user_id = auth.uid());

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE email_retry_queue IS 'Queue for retrying failed email sends with exponential backoff';
COMMENT ON COLUMN email_retry_queue.email_type IS 'Type of email: pdf_delivery, image_links, admin_notification, etc.';
COMMENT ON COLUMN email_retry_queue.status IS 'pending=waiting, processing=in progress, completed=success, failed=will retry, abandoned=max retries exceeded';
COMMENT ON COLUMN email_retry_queue.priority IS 'Lower number = higher priority. Default 10, admin notifications use 1';
