-- ============================================
-- Add vehicle_driveable field if missing
-- Safe to run multiple times (idempotent)
-- ============================================

BEGIN;

-- Add the column if it doesn't exist
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS vehicle_driveable TEXT DEFAULT NULL;

-- Add helpful comment
COMMENT ON COLUMN incident_reports.vehicle_driveable IS 'Was vehicle driveable after accident? Values: "yes", "no", "unsure"';

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'incident_reports'
    AND column_name = 'vehicle_driveable'
  ) THEN
    RAISE NOTICE '✅ vehicle_driveable column exists in incident_reports table';
  ELSE
    RAISE EXCEPTION '❌ Failed to add vehicle_driveable column';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERY (run separately to check)
-- ============================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'incident_reports'
-- AND column_name = 'vehicle_driveable';
