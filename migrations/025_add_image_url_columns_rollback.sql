-- ROLLBACK Migration 025: Remove Image URL Columns from incident_reports
-- Date: 2025-11-06
-- Purpose: Rollback migration 025 if needed
-- WARNING: Only use if migration needs to be reversed
--
-- This will:
-- - Remove file_url_other_vehicle column
-- - Remove file_url_other_vehicle_1 column
-- - Data in these columns will be LOST (but preserved in user_documents table)

BEGIN;

-- Drop Page 8 Photo URL Columns
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS file_url_other_vehicle,
  DROP COLUMN IF EXISTS file_url_other_vehicle_1;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed 2 image URL columns from incident_reports';
  RAISE NOTICE '⚠️ Table returned to previous state';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Note: Image URLs still preserved in user_documents table';
  RAISE NOTICE '📝 Note: No data loss - primary storage is user_documents';
END $$;

COMMIT;
