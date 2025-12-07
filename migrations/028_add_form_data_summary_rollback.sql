-- Rollback Migration 028: Remove form_data_summary fields
-- WARNING: This will permanently delete all Phase 1 form data summaries
-- Created: 2025-12-07

BEGIN;

-- Remove form_data_summary columns
ALTER TABLE incident_reports
DROP COLUMN IF EXISTS form_data_summary;

ALTER TABLE incident_reports
DROP COLUMN IF EXISTS form_data_summary_metadata;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 028 rollback complete: Removed form_data_summary and form_data_summary_metadata columns';
  RAISE NOTICE 'WARNING: All Phase 1 form data summaries have been permanently deleted';
END $$;

COMMIT;
