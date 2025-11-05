-- =============================================
-- Migration 012: Add Emergency Audio (AI Eavesdropper) Table
-- Created: 2025-11-05
-- Purpose: Store emergency safety recordings from incident scene
-- =============================================

BEGIN;

-- Create ai_listening_transcripts table for emergency recordings
CREATE TABLE IF NOT EXISTS public.ai_listening_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  create_user_id UUID NOT NULL,
  incident_id UUID REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  audio_storage_path TEXT,
  audio_url TEXT,
  transcription_text TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add helpful comments
COMMENT ON TABLE public.ai_listening_transcripts IS 'Emergency safety recordings from incident scene (AI Eavesdropper feature)';
COMMENT ON COLUMN public.ai_listening_transcripts.create_user_id IS 'User who made the recording';
COMMENT ON COLUMN public.ai_listening_transcripts.incident_id IS 'Related incident report';
COMMENT ON COLUMN public.ai_listening_transcripts.audio_storage_path IS 'Storage path in Supabase incident-audio bucket';
COMMENT ON COLUMN public.ai_listening_transcripts.audio_url IS 'Signed URL to audio file';
COMMENT ON COLUMN public.ai_listening_transcripts.transcription_text IS 'OpenAI Whisper transcription of emergency recording';
COMMENT ON COLUMN public.ai_listening_transcripts.recorded_at IS 'When the emergency recording was made at the scene';

-- Enable Row Level Security
ALTER TABLE public.ai_listening_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own recordings
CREATE POLICY "Users can view own emergency recordings"
  ON public.ai_listening_transcripts FOR SELECT
  USING (auth.uid() = create_user_id::uuid);

CREATE POLICY "Users can create own emergency recordings"
  ON public.ai_listening_transcripts FOR INSERT
  WITH CHECK (auth.uid() = create_user_id::uuid);

CREATE POLICY "Users can update own emergency recordings"
  ON public.ai_listening_transcripts FOR UPDATE
  USING (auth.uid() = create_user_id::uuid);

CREATE POLICY "Users can delete own emergency recordings"
  ON public.ai_listening_transcripts FOR DELETE
  USING (auth.uid() = create_user_id::uuid);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_listening_user_id
  ON public.ai_listening_transcripts(create_user_id);

CREATE INDEX IF NOT EXISTS idx_ai_listening_incident_id
  ON public.ai_listening_transcripts(incident_id);

CREATE INDEX IF NOT EXISTS idx_ai_listening_recorded_at
  ON public.ai_listening_transcripts(recorded_at DESC);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 012 complete: ai_listening_transcripts table created';
  RAISE NOTICE 'RLS policies enabled for emergency recordings';
  RAISE NOTICE 'Indexes created for performance';
END $$;

COMMIT;
