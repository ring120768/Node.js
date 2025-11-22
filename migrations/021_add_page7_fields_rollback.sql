-- ROLLBACK: Remove Page 7 Other Vehicle Fields from incident_reports
-- Date: 2025-11-06
-- Purpose: Rollback migration 021 if needed
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Drop all 9 Page 7 fields
ALTER TABLE incident_reports
  -- Other Driver
  DROP COLUMN IF EXISTS other_email_address,
  DROP COLUMN IF EXISTS other_driving_license_number,

  -- DVLA Lookup
  DROP COLUMN IF EXISTS other_vehicle_look_up_fuel_type,
  DROP COLUMN IF EXISTS other_vehicle_look_up_mot_status,
  DROP COLUMN IF EXISTS other_vehicle_look_up_mot_expiry_date,
  DROP COLUMN IF EXISTS other_vehicle_look_up_tax_status,
  DROP COLUMN IF EXISTS other_vehicle_look_up_tax_due_date,
  DROP COLUMN IF EXISTS other_vehicle_look_up_insurance_status,

  -- Damage
  DROP COLUMN IF EXISTS no_visible_damage;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed 9 Page 7 fields from incident_reports';
  RAISE NOTICE '⚠️ Table returned to previous state';
END $$;

COMMIT;
