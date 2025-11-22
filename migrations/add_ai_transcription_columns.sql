-- Migration: Add missing columns to ai_transcription table
-- Date: 2025-11-11
-- Purpose: Fix schema mismatch causing save errors
--
-- Error: "Could not find the 'narrative_text' column of 'ai_transcription' in the schema cache"
-- Root Cause: Controller expects columns that don't exist in database
--
-- Current schema has:
--   - transcription (text)
--   - audio_url (text)
--
-- Controller expects:
--   - transcript_text (text) - Main personal statement
--   - narrative_text (text) - Optional AI-generated narrative
--   - voice_transcription (text) - Raw voice transcription from Whisper

BEGIN;

-- Add transcript_text column (main personal statement)
ALTER TABLE ai_transcription
ADD COLUMN IF NOT EXISTS transcript_text TEXT;

COMMENT ON COLUMN ai_transcription.transcript_text IS
'Main personal statement text entered or transcribed by user';

-- Add narrative_text column (optional AI-generated narrative)
ALTER TABLE ai_transcription
ADD COLUMN IF NOT EXISTS narrative_text TEXT;

COMMENT ON COLUMN ai_transcription.narrative_text IS
'AI-generated narrative version of the personal statement';

-- Add voice_transcription column (raw voice transcription)
ALTER TABLE ai_transcription
ADD COLUMN IF NOT EXISTS voice_transcription TEXT;

COMMENT ON COLUMN ai_transcription.voice_transcription IS
'Raw voice transcription from OpenAI Whisper API';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Added transcript_text, narrative_text, voice_transcription columns to ai_transcription table';
END $$;

COMMIT;

-- Verify columns were added
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'ai_transcription'
    AND column_name IN ('transcript_text', 'narrative_text', 'voice_transcription');

  IF col_count = 3 THEN
    RAISE NOTICE '✅ Verification passed: All 3 columns exist';
  ELSE
    RAISE WARNING '⚠️  Verification failed: Expected 3 columns, found %', col_count;
  END IF;
END $$;
