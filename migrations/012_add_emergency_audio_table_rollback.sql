-- =============================================
-- Migration 012 ROLLBACK: Remove Emergency Audio Table
-- Created: 2025-11-05
-- =============================================

BEGIN;

-- Drop policies first
DROP POLICY IF EXISTS "Users can delete own emergency recordings" ON public.ai_listening_transcripts;
DROP POLICY IF EXISTS "Users can update own emergency recordings" ON public.ai_listening_transcripts;
DROP POLICY IF EXISTS "Users can create own emergency recordings" ON public.ai_listening_transcripts;
DROP POLICY IF EXISTS "Users can view own emergency recordings" ON public.ai_listening_transcripts;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_ai_listening_recorded_at;
DROP INDEX IF EXISTS public.idx_ai_listening_incident_id;
DROP INDEX IF EXISTS public.idx_ai_listening_user_id;

-- Drop table
DROP TABLE IF EXISTS public.ai_listening_transcripts CASCADE;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 012 rollback complete: ai_listening_transcripts table removed';
END $$;

COMMIT;
