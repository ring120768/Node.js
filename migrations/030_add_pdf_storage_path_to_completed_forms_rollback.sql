-- Rollback Migration 030: Remove pdf_storage_path from completed_incident_forms
-- Date: 2025-12-16

BEGIN;

ALTER TABLE public.completed_incident_forms
DROP COLUMN IF EXISTS pdf_storage_path;

COMMIT;
