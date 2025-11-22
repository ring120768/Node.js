-- ============================================================
-- Page 7 - Rename Last Insurance Field
-- Migration Date: 2025-01-16
-- Purpose: Rename other_insurance_company to other_drivers_insurance_company
-- ============================================================

BEGIN;

-- Rename the insurance company field
ALTER TABLE incident_reports
  RENAME COLUMN other_insurance_company TO other_drivers_insurance_company;

-- Update comment for clarity
COMMENT ON COLUMN incident_reports.other_drivers_insurance_company
  IS 'Other driver insurance company name';

COMMIT;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

-- Verify the column was renamed:
/*
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'incident_reports'
  AND column_name = 'other_drivers_insurance_company';
*/

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================

-- To rollback this migration, run:
/*
BEGIN;

ALTER TABLE incident_reports
  RENAME COLUMN other_drivers_insurance_company TO other_insurance_company;

COMMIT;
*/
