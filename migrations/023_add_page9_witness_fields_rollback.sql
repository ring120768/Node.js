-- ROLLBACK: Remove Page 9 Witness Fields from incident_reports
-- Date: 2025-11-06
-- Purpose: Rollback migration 023 if needed
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Drop all 5 Page 9 witness fields
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS witnesses_present,
  DROP COLUMN IF EXISTS witness_name,
  DROP COLUMN IF EXISTS witness_mobile_number,
  DROP COLUMN IF EXISTS witness_email_address,
  DROP COLUMN IF EXISTS witness_statement;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed 5 Page 9 witness fields from incident_reports';
  RAISE NOTICE '⚠️ Table returned to previous state';
END $$;

COMMIT;
