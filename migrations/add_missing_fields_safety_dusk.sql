-- Migration: Add missing six_point_safety_check and dusk fields
-- Date: 2025-11-16
-- Issue: Fields referenced in PDF mapping but missing from database

BEGIN;

-- Add six_point_safety_check_completed column
-- This tracks completion of the six-point-safety-check.html page
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS six_point_safety_check_completed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.six_point_safety_check_completed
  IS 'Tracks if six-point safety check was completed (from six-point-safety-check.html). BOOLEAN: true/false';

-- Add dusk column for time of day
-- Part of weather/time conditions on Page 5
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS dusk BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.dusk
  IS 'Time of day: Dusk/twilight (Page 5 weather conditions). Maps to weather_dusk PDF field';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Added six_point_safety_check_completed and dusk columns';
END $$;

COMMIT;
