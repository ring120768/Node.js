-- ============================================
-- ROLLBACK: Remove vehicle_driveable field
-- Run this if you need to undo the migration
-- ============================================

BEGIN;

-- Drop the column if it exists
ALTER TABLE incident_reports
  DROP COLUMN IF EXISTS vehicle_driveable;

-- Verify the column was removed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'incident_reports'
    AND column_name = 'vehicle_driveable'
  ) THEN
    RAISE NOTICE '✅ vehicle_driveable column successfully removed from incident_reports table';
  ELSE
    RAISE EXCEPTION '❌ Failed to remove vehicle_driveable column';
  END IF;
END $$;

COMMIT;
