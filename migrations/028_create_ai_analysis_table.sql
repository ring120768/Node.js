-- Migration 028: Create AI Analysis Table
-- Purpose: Store GPT-4o AI analysis results for incident reports (Pages 13-16)
-- Date: 2025-11-20
-- Author: Document Automation Engineer

BEGIN;

-- Create ai_analysis table to store AI-generated content for PDF pages 13-16
CREATE TABLE IF NOT EXISTS ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  create_user_id UUID NOT NULL REFERENCES user_signup(create_user_id) ON DELETE CASCADE,

  -- Page 13 fields
  voice_transcription TEXT,
  analysis_metadata JSONB DEFAULT '{}'::jsonb,
  quality_review TEXT,

  -- Page 14 field
  ai_summary TEXT,

  -- Page 15 field
  closing_statement TEXT,

  -- Page 16 field
  final_review TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Soft delete for GDPR compliance
  deleted_at TIMESTAMPTZ,

  -- Ensure one analysis per user (unique constraint)
  CONSTRAINT unique_user_analysis UNIQUE (create_user_id)
);

-- Add helpful column comments
COMMENT ON TABLE ai_analysis IS 'Stores GPT-4o AI analysis results for incident reports (PDF Pages 13-16)';
COMMENT ON COLUMN ai_analysis.voice_transcription IS 'Page 13: Optional user voice transcription from Whisper API';
COMMENT ON COLUMN ai_analysis.analysis_metadata IS 'Page 13: GPT model info, timestamp, version (displayed on PDF)';
COMMENT ON COLUMN ai_analysis.quality_review IS 'Page 13: Quality assessment with strengths/improvements';
COMMENT ON COLUMN ai_analysis.ai_summary IS 'Page 14: Summary & Key Points section with formatted bullets';
COMMENT ON COLUMN ai_analysis.closing_statement IS 'Page 15: Legal closing statement';
COMMENT ON COLUMN ai_analysis.final_review IS 'Page 16: Next steps and recommendations';

-- Create index on create_user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_analysis_user_id ON ai_analysis(create_user_id) WHERE deleted_at IS NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_analysis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_analysis_timestamp
  BEFORE UPDATE ON ai_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_analysis_timestamp();

-- Enable Row Level Security
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own AI analysis
CREATE POLICY ai_analysis_user_policy ON ai_analysis
  FOR ALL
  USING (create_user_id = auth.uid())
  WITH CHECK (create_user_id = auth.uid());

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 028 complete: Created ai_analysis table with 6 fields for PDF pages 13-16';
END $$;

COMMIT;
