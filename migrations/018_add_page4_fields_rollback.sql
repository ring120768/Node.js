-- ROLLBACK: Remove Page 4 Location/Junction/Visibility Fields from incident_reports
-- Date: 2025-11-06
-- Purpose: Rollback migration 018 if needed
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Drop all 13 Page 4 fields
ALTER TABLE incident_reports
  -- Location
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS what3words,
  DROP COLUMN IF EXISTS nearest_landmark,

  -- Junction
  DROP COLUMN IF EXISTS junction_type,
  DROP COLUMN IF EXISTS junction_control,
  DROP COLUMN IF EXISTS traffic_light_status,
  DROP COLUMN IF EXISTS user_manoeuvre,

  -- Visibility
  DROP COLUMN IF EXISTS visibility_clear,
  DROP COLUMN IF EXISTS visibility_restricted_structure,
  DROP COLUMN IF EXISTS visibility_restricted_bend,
  DROP COLUMN IF EXISTS visibility_large_vehicle,
  DROP COLUMN IF EXISTS visibility_sun_glare,

  -- Hazards
  DROP COLUMN IF EXISTS additional_hazards;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed 13 Page 4 fields from incident_reports';
  RAISE NOTICE '⚠️ Table returned to previous state';
END $$;

COMMIT;
