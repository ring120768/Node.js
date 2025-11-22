-- Rollback Migration: Remove Page 12 final medical check fields from incident_reports
-- Date: 2025-11-07
-- Purpose: Rollback for migration 026

BEGIN;

-- Drop Page 12 fields
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS final_feeling,
  DROP COLUMN IF EXISTS form_completed_at;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '⚠️  Migration 026 ROLLBACK complete: Removed Page 12 fields';
END $$;

COMMIT;
