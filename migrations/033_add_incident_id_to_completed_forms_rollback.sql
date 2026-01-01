-- Migration 033 Rollback: Remove incident_id from completed_incident_forms
-- Created: 2026-01-01

BEGIN;

-- Drop index
DROP INDEX IF EXISTS public.idx_completed_forms_incident_id;

-- Drop foreign key constraint
ALTER TABLE public.completed_incident_forms
  DROP CONSTRAINT IF EXISTS fk_completed_forms_incident_id;

-- Drop column
ALTER TABLE public.completed_incident_forms
  DROP COLUMN IF EXISTS incident_id;

COMMIT;
