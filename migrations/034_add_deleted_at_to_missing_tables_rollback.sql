-- Migration 034 Rollback: Remove deleted_at from tables
-- Created: 2026-01-03

BEGIN;

-- Remove deleted_at from incident_other_vehicles
ALTER TABLE public.incident_other_vehicles
  DROP COLUMN IF EXISTS deleted_at;

-- Remove deleted_at from temp_uploads
ALTER TABLE public.temp_uploads
  DROP COLUMN IF EXISTS deleted_at;

-- Remove deleted_at from pdf_generation_queue
ALTER TABLE public.pdf_generation_queue
  DROP COLUMN IF EXISTS deleted_at;

COMMIT;
