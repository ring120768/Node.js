-- Migration 024 Rollback: Drop incident_witnesses Table
-- Date: 2025-11-12
-- Purpose: Rollback creation of incident_witnesses table
-- Related: 024_create_incident_witnesses_table.sql

BEGIN;

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can view their own witnesses" ON public.incident_witnesses;
DROP POLICY IF EXISTS "Users can insert their own witnesses" ON public.incident_witnesses;
DROP POLICY IF EXISTS "Users can update their own witnesses" ON public.incident_witnesses;
DROP POLICY IF EXISTS "Users can soft-delete their own witnesses" ON public.incident_witnesses;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_incident_witnesses_incident_id;
DROP INDEX IF EXISTS public.idx_incident_witnesses_user_id;
DROP INDEX IF EXISTS public.idx_incident_witnesses_deleted_at;

-- Drop table (CASCADE will remove foreign key constraints)
DROP TABLE IF EXISTS public.incident_witnesses CASCADE;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 024 rollback complete: Dropped incident_witnesses table';
  RAISE NOTICE 'ℹ️  Witness data still available in incident_reports table';
END $$;

COMMIT;
