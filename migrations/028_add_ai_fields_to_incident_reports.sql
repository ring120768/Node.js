-- Migration 028: Add AI Analysis Fields to Incident Reports
-- Purpose: Store GPT-4o AI analysis results directly in incident_reports (Pages 13-16)
-- Date: 2025-11-20
-- Author: Document Automation Engineer

BEGIN;

-- Add AI analysis columns to incident_reports table
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS voice_transcription TEXT,
  ADD COLUMN IF NOT EXISTS analysis_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_review TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS closing_statement TEXT,
  ADD COLUMN IF NOT EXISTS final_review TEXT;

-- Add helpful column comments
COMMENT ON COLUMN incident_reports.voice_transcription IS 'Page 13: Optional user voice transcription from Whisper API';
COMMENT ON COLUMN incident_reports.analysis_metadata IS 'Page 13: GPT model info, timestamp, version (displayed on PDF)';
COMMENT ON COLUMN incident_reports.quality_review IS 'Page 13: Quality assessment with strengths/improvements';
COMMENT ON COLUMN incident_reports.ai_summary IS 'Page 14: Summary & Key Points section with formatted bullets';
COMMENT ON COLUMN incident_reports.closing_statement IS 'Page 15: Legal closing statement';
COMMENT ON COLUMN incident_reports.final_review IS 'Page 16: Next steps and recommendations';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 028 complete: Added 6 AI analysis fields to incident_reports';
END $$;

COMMIT;
