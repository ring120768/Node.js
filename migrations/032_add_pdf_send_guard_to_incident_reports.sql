-- Migration 032: Add PDF send guard fields to incident_reports
-- Date: 2025-12-28
-- Purpose: Prevent duplicate PDF sends and track send status per incident

BEGIN;

ALTER TABLE public.incident_reports
  ADD COLUMN IF NOT EXISTS pdf_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS pdf_send_in_progress BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pdf_send_started_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.incident_reports.pdf_sent_at IS
  'Timestamp when the PDF was successfully emailed to the user (send-once guard).';
COMMENT ON COLUMN public.incident_reports.pdf_send_in_progress IS
  'True while a PDF send attempt is in progress to prevent duplicate sends.';
COMMENT ON COLUMN public.incident_reports.pdf_send_started_at IS
  'Timestamp when the current PDF send attempt started (for stale lock recovery).';

COMMIT;
