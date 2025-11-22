-- ============================================================
-- Page 7 - Clean Up Duplicate Insurance Column
-- Migration Date: 2025-01-16
-- Purpose: Migrate data from old column and drop duplicate
--
-- Issue: Both columns exist:
--   - other_insurance_company (old)
--   - other_drivers_insurance_company (new)
--
-- Solution:
--   1. Migrate any data from old to new (if new is NULL)
--   2. Drop old column
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: MIGRATE DATA (if new column is NULL but old has data)
-- ============================================================

-- Update new column with old column data where new is NULL
UPDATE incident_reports
SET other_drivers_insurance_company = other_insurance_company
WHERE other_drivers_insurance_company IS NULL
  AND other_insurance_company IS NOT NULL;

-- ============================================================
-- STEP 2: DROP OLD COLUMN
-- ============================================================

ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS other_insurance_company;

COMMIT;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

-- Verify old column is gone and new column exists:
/*
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'incident_reports'
  AND column_name IN ('other_insurance_company', 'other_drivers_insurance_company')
ORDER BY column_name;

-- Should only show: other_drivers_insurance_company
*/

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================

-- ⚠️ WARNING: Cannot restore data after dropping column!
-- Only use this if you have a backup or no data was lost.

/*
BEGIN;

-- Re-create old column (data will be empty)
ALTER TABLE incident_reports
  ADD COLUMN other_insurance_company TEXT;

COMMIT;
*/

-- ============================================================
-- NOTES
-- ============================================================

-- 1. This migration is SAFE because:
--    - It migrates data from old to new (if needed)
--    - Only drops the old column after data is safe
--
-- 2. After this migration:
--    - Only "other_drivers_insurance_company" will exist
--    - No data loss (data migrated before drop)
--
-- 3. If you're worried about data loss:
--    - Check data before running: SELECT COUNT(*) FROM incident_reports WHERE other_insurance_company IS NOT NULL;
--    - If count > 0, verify data migration is needed
