-- ROLLBACK: Remove remaining Page 7 Other Vehicle Fields from incident_reports
-- Date: 2025-11-06
-- Purpose: Rollback migration 022 if needed
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Drop all 11 additional Page 7 fields
ALTER TABLE incident_reports
  -- Other Driver
  DROP COLUMN IF EXISTS other_full_name,
  DROP COLUMN IF EXISTS other_contact_number,
  DROP COLUMN IF EXISTS other_vehicle_registration,

  -- DVLA Data
  DROP COLUMN IF EXISTS other_vehicle_look_up_make,
  DROP COLUMN IF EXISTS other_vehicle_look_up_model,
  DROP COLUMN IF EXISTS other_vehicle_look_up_colour,
  DROP COLUMN IF EXISTS other_vehicle_look_up_year,

  -- Insurance
  DROP COLUMN IF EXISTS other_drivers_insurance_company,
  DROP COLUMN IF EXISTS other_drivers_policy_number,
  DROP COLUMN IF EXISTS other_drivers_policy_holder_name,
  DROP COLUMN IF EXISTS other_drivers_policy_cover_type,

  -- Damage
  DROP COLUMN IF EXISTS describe_damage_to_vehicle;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed 11 additional Page 7 fields from incident_reports';
  RAISE NOTICE '⚠️ Table returned to previous state';
END $$;

COMMIT;
