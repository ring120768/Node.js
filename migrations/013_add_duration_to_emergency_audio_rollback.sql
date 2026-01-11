-- =============================================
-- Migration 013 Rollback: Remove duration_seconds column
-- Created: 2026-01-11
-- Purpose: Rollback duration tracking for emergency recordings
-- =============================================

BEGIN;

-- Remove duration column
ALTER TABLE public.ai_listening_transcripts
DROP COLUMN IF EXISTS duration_seconds;

-- Log rollback
DO $$
BEGIN
  RAISE NOTICE 'Rollback 013 complete: Removed duration_seconds from ai_listening_transcripts';
END $$;

COMMIT;
