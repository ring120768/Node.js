-- Migration: Create ai_analysis table for storing AI-generated analysis
-- Created: 2025-11-16
-- Purpose: Store comprehensive AI analysis results for incident reports

BEGIN;

-- Create ai_analysis table
CREATE TABLE IF NOT EXISTS ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and incident references
  create_user_id UUID NOT NULL,
  incident_id UUID,

  -- Input data
  transcription_text TEXT NOT NULL,

  -- AI Analysis Results (Step 1: Summary)
  summary TEXT,
  key_points TEXT[],  -- Array of bullet points
  fault_analysis TEXT,

  -- AI Analysis Results (Step 2: Quality Review)
  quality_review JSONB,  -- { quality, missingInfo[], suggestions[] }

  -- AI Analysis Results (Step 3: Combined Report)
  combined_report TEXT,  -- HTML narrative using all pages 1-12 + transcription

  -- AI Analysis Results (Step 4: Final Review)
  completeness_score INTEGER,
  final_review JSONB,  -- { strengths, nextSteps[], legalConsiderations }

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete support
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_analysis_create_user_id ON ai_analysis(create_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_incident_id ON ai_analysis(incident_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_created_at ON ai_analysis(created_at DESC);

-- Add helpful comments
COMMENT ON TABLE ai_analysis IS 'Stores comprehensive AI analysis of incident reports including summary, quality review, combined narrative, and recommendations';
COMMENT ON COLUMN ai_analysis.create_user_id IS 'UUID of user who owns this analysis';
COMMENT ON COLUMN ai_analysis.incident_id IS 'Optional reference to specific incident report';
COMMENT ON COLUMN ai_analysis.transcription_text IS 'Original transcription/statement text that was analyzed';
COMMENT ON COLUMN ai_analysis.summary IS 'AI-generated 2-3 sentence summary';
COMMENT ON COLUMN ai_analysis.key_points IS 'Array of 3-5 key bullet points';
COMMENT ON COLUMN ai_analysis.fault_analysis IS 'Brief analysis of fault/liability';
COMMENT ON COLUMN ai_analysis.quality_review IS 'JSON object containing quality assessment, missing info, and suggestions';
COMMENT ON COLUMN ai_analysis.combined_report IS 'HTML narrative combining all incident data (pages 1-12) with transcription';
COMMENT ON COLUMN ai_analysis.completeness_score IS 'Score 0-100 indicating documentation completeness';
COMMENT ON COLUMN ai_analysis.final_review IS 'JSON object containing strengths, next steps, and legal considerations';

-- Enable Row Level Security
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view their own analysis
CREATE POLICY ai_analysis_select_own
  ON ai_analysis
  FOR SELECT
  USING (auth.uid() = create_user_id);

-- Policy: Users can insert their own analysis
CREATE POLICY ai_analysis_insert_own
  ON ai_analysis
  FOR INSERT
  WITH CHECK (auth.uid() = create_user_id);

-- Policy: Users can update their own analysis
CREATE POLICY ai_analysis_update_own
  ON ai_analysis
  FOR UPDATE
  USING (auth.uid() = create_user_id);

-- Policy: Users can soft-delete their own analysis (GDPR compliance)
CREATE POLICY ai_analysis_delete_own
  ON ai_analysis
  FOR UPDATE
  USING (auth.uid() = create_user_id);

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 013: ai_analysis table created successfully';
  RAISE NOTICE 'Columns: id, create_user_id, incident_id, transcription_text, summary, key_points, fault_analysis, quality_review, combined_report, completeness_score, final_review, created_at, updated_at, deleted_at';
  RAISE NOTICE 'Indexes: create_user_id, incident_id, created_at';
  RAISE NOTICE 'RLS Policies: Enabled with user-level access control';
END $$;

COMMIT;
