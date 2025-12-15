-- Migration: Create ai_transcription table
-- Date: 2025-12-15
-- Purpose: Create missing ai_transcription table for personal statements
--
-- This table stores user's personal statements and transcriptions
-- Used by: transcription-status.html, ai.controller.js

BEGIN;

-- Create ai_transcription table
CREATE TABLE IF NOT EXISTS public.ai_transcription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  create_user_id UUID NOT NULL,
  transcript_text TEXT,
  narrative_text TEXT,
  voice_transcription TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_transcription_user_id
  ON public.ai_transcription(create_user_id);

CREATE INDEX IF NOT EXISTS idx_ai_transcription_created_at
  ON public.ai_transcription(created_at DESC);

-- Add comments
COMMENT ON TABLE public.ai_transcription IS
'Stores user personal statements and AI transcriptions';

COMMENT ON COLUMN public.ai_transcription.create_user_id IS
'User ID from auth.users or user_signup table';

COMMENT ON COLUMN public.ai_transcription.transcript_text IS
'Main personal statement text entered or transcribed by user';

COMMENT ON COLUMN public.ai_transcription.narrative_text IS
'AI-generated narrative version of the personal statement';

COMMENT ON COLUMN public.ai_transcription.voice_transcription IS
'Raw voice transcription from OpenAI Whisper API';

-- Enable Row Level Security (RLS)
ALTER TABLE public.ai_transcription ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own transcriptions
CREATE POLICY "Users can view own transcriptions"
  ON public.ai_transcription
  FOR SELECT
  USING (auth.uid() = create_user_id);

-- RLS Policy: Users can insert their own transcriptions
CREATE POLICY "Users can insert own transcriptions"
  ON public.ai_transcription
  FOR INSERT
  WITH CHECK (auth.uid() = create_user_id);

-- RLS Policy: Users can update their own transcriptions
CREATE POLICY "Users can update own transcriptions"
  ON public.ai_transcription
  FOR UPDATE
  USING (auth.uid() = create_user_id)
  WITH CHECK (auth.uid() = create_user_id);

-- RLS Policy: Users can soft-delete their own transcriptions
CREATE POLICY "Users can delete own transcriptions"
  ON public.ai_transcription
  FOR UPDATE
  USING (auth.uid() = create_user_id AND deleted_at IS NULL);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.ai_transcription TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_transcription TO anon;

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: Created ai_transcription table with RLS policies';
END $$;

COMMIT;
