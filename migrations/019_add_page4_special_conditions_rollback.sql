-- ROLLBACK: Remove Page 4 Special Condition Individual Columns
-- Date: 2025-11-06
-- Purpose: Rollback migration 019 if needed
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Drop all 12 special condition fields
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS special_condition_roadworks,
  DROP COLUMN IF EXISTS special_condition_workmen,
  DROP COLUMN IF EXISTS special_condition_cyclists,
  DROP COLUMN IF EXISTS special_condition_pedestrians,
  DROP COLUMN IF EXISTS special_condition_traffic_calming,
  DROP COLUMN IF EXISTS special_condition_parked_vehicles,
  DROP COLUMN IF EXISTS special_condition_crossing,
  DROP COLUMN IF EXISTS special_condition_school_zone,
  DROP COLUMN IF EXISTS special_condition_narrow_road,
  DROP COLUMN IF EXISTS special_condition_potholes,
  DROP COLUMN IF EXISTS special_condition_oil_spills,
  DROP COLUMN IF EXISTS special_condition_animals;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed 12 special condition fields from incident_reports';
  RAISE NOTICE '⚠️ Table returned to previous state';
END $$;

COMMIT;
