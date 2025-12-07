-- Migration 028: Add form_data_summary field for Phase 1 AI analysis
-- Purpose: Store AI-generated summary of structured form data (pages 1-12) before transcription
-- Part of: Two-phase AI summary architecture
-- Created: 2025-12-07

BEGIN;

-- Add form_data_summary column to store Phase 1 AI analysis
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS form_data_summary TEXT;

COMMENT ON COLUMN incident_reports.form_data_summary IS
'AI-generated summary of structured form data (pages 1-12) before transcription - Phase 1 of two-phase AI analysis architecture. Generated using gpt-4o-mini when form submission completes.';

-- Add metadata column to track Phase 1 generation details (optional but recommended)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS form_data_summary_metadata JSONB;

COMMENT ON COLUMN incident_reports.form_data_summary_metadata IS
'Metadata for Phase 1 form data summary: model version, token usage, generation timestamp, etc.';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 028 complete: Added form_data_summary and form_data_summary_metadata columns to incident_reports table';
  RAISE NOTICE 'Phase 1 of two-phase AI summary architecture now supported';
END $$;

COMMIT;
