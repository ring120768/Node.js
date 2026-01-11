-- =============================================
-- Migration 013: Add duration_seconds to Emergency Audio Table
-- Created: 2026-01-11
-- Purpose: Track recording duration for emergency safety recordings
-- =============================================

BEGIN;

-- Add duration column
ALTER TABLE public.ai_listening_transcripts
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Add comment
COMMENT ON COLUMN public.ai_listening_transcripts.duration_seconds
IS 'Recording duration in seconds';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 013 complete: Added duration_seconds to ai_listening_transcripts';
  RAISE NOTICE 'Column tracks recording length for audit purposes';
END $$;

COMMIT;
