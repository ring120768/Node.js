-- Rollback Migration 028: Remove AI Analysis Fields from Incident Reports
-- Purpose: Undo addition of AI analysis columns
-- Date: 2025-11-20
-- Author: Document Automation Engineer

BEGIN;

-- Drop AI analysis columns from incident_reports table
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS voice_transcription,
  DROP COLUMN IF EXISTS analysis_metadata,
  DROP COLUMN IF EXISTS quality_review,
  DROP COLUMN IF EXISTS ai_summary,
  DROP COLUMN IF EXISTS closing_statement,
  DROP COLUMN IF EXISTS final_review;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Rollback 028 complete: Removed AI analysis fields from incident_reports';
END $$;

COMMIT;
