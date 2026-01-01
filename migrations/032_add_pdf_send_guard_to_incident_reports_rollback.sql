-- Rollback Migration 032: Remove PDF send guard fields from incident_reports

BEGIN;

ALTER TABLE public.incident_reports
  DROP COLUMN IF EXISTS pdf_send_started_at,
  DROP COLUMN IF EXISTS pdf_send_in_progress,
  DROP COLUMN IF EXISTS pdf_sent_at;

COMMIT;
