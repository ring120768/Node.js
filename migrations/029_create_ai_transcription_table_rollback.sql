-- Rollback Migration: Drop ai_transcription table
-- Date: 2025-12-15

BEGIN;

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can view own transcriptions" ON public.ai_transcription;
DROP POLICY IF EXISTS "Users can insert own transcriptions" ON public.ai_transcription;
DROP POLICY IF EXISTS "Users can update own transcriptions" ON public.ai_transcription;
DROP POLICY IF EXISTS "Users can delete own transcriptions" ON public.ai_transcription;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_ai_transcription_user_id;
DROP INDEX IF EXISTS public.idx_ai_transcription_created_at;

-- Drop table
DROP TABLE IF EXISTS public.ai_transcription;

-- Log the rollback
DO $$
BEGIN
  RAISE NOTICE 'Rollback complete: Dropped ai_transcription table';
END $$;

COMMIT;
