-- Rollback Migration 029: Drop completed_incident_forms Table
-- Date: 2025-12-14
-- Purpose: Rollback completed_incident_forms table creation

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS completed_forms_updated_at ON public.completed_incident_forms;

-- Drop function
DROP FUNCTION IF EXISTS update_completed_forms_updated_at();

-- Drop table (CASCADE will drop all dependent objects)
DROP TABLE IF EXISTS public.completed_incident_forms CASCADE;

COMMIT;
