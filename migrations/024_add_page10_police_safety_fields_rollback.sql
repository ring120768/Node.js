-- ROLLBACK: Remove Page 10 Police & Safety Fields from incident_reports
-- Date: 2025-11-06
-- Purpose: Rollback migration 024 if needed
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Drop all 10 Page 10 fields
ALTER TABLE incident_reports
  -- Police Info
  DROP COLUMN IF EXISTS police_attended,
  DROP COLUMN IF EXISTS accident_ref_number,
  DROP COLUMN IF EXISTS police_force,
  DROP COLUMN IF EXISTS officer_name,
  DROP COLUMN IF EXISTS officer_badge,

  -- Breath Tests
  DROP COLUMN IF EXISTS user_breath_test,
  DROP COLUMN IF EXISTS other_breath_test,

  -- Safety Info
  DROP COLUMN IF EXISTS airbags_deployed,
  DROP COLUMN IF EXISTS seatbelts_worn,
  DROP COLUMN IF EXISTS seatbelt_reason;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed 10 Page 10 fields from incident_reports';
  RAISE NOTICE '⚠️ Table returned to previous state';
END $$;

COMMIT;
