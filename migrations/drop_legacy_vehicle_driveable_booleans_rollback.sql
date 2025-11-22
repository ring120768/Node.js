-- Rollback: Restore Legacy vehicle_driveable BOOLEAN Fields
-- Date: 2025-11-12
-- Purpose: Restore the 3 BOOLEAN fields if needed
--
-- NOTE: This will restore the COLUMNS but NOT the data (all were NULL anyway)

BEGIN;

-- Restore the 3 BOOLEAN columns
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS vehicle_driveable_yes BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vehicle_driveable_no BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vehicle_driveable_unsure BOOLEAN DEFAULT NULL;

-- Add comments to explain they are legacy
COMMENT ON COLUMN incident_reports.vehicle_driveable_yes IS 'LEGACY: From Typeform era, replaced by vehicle_driveable TEXT field';
COMMENT ON COLUMN incident_reports.vehicle_driveable_no IS 'LEGACY: From Typeform era, replaced by vehicle_driveable TEXT field';
COMMENT ON COLUMN incident_reports.vehicle_driveable_unsure IS 'LEGACY: From Typeform era, replaced by vehicle_driveable TEXT field';

DO $$
BEGIN
  RAISE NOTICE '✅ Legacy BOOLEAN fields restored (all NULL)';
  RAISE NOTICE 'ℹ️  These fields are no longer used by the HTML forms';
END $$;

COMMIT;
