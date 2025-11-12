-- Migration: Drop Legacy vehicle_driveable BOOLEAN Fields
-- Date: 2025-11-12
-- Purpose: Clean up unused BOOLEAN fields from Typeform era
--
-- Context: The HTML forms use a single TEXT field (vehicle_driveable)
--          which is correctly populated. The BOOLEAN fields
--          (vehicle_driveable_yes/no/unsure) are legacy from Typeform
--          and are no longer used.
--
-- Safety: All 4 recent incidents show TEXT field populated, BOOLEAN fields NULL
--
-- Rollback: See drop_legacy_vehicle_driveable_booleans_rollback.sql

BEGIN;

-- Drop the 3 legacy BOOLEAN columns
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS vehicle_driveable_yes,
  DROP COLUMN IF EXISTS vehicle_driveable_no,
  DROP COLUMN IF EXISTS vehicle_driveable_unsure;

-- Verify TEXT field still exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_reports'
    AND column_name = 'vehicle_driveable'
    AND data_type = 'text'
  ) THEN
    RAISE EXCEPTION '❌ TEXT field vehicle_driveable is missing! Rollback immediately.';
  END IF;

  RAISE NOTICE '✅ Legacy BOOLEAN fields dropped successfully';
  RAISE NOTICE '✅ TEXT field vehicle_driveable remains intact';
END $$;

COMMIT;
