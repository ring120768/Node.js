-- ROLLBACK: Remove Page 5 Vehicle & Damage Fields from incident_reports
-- Date: 2025-11-06
-- Purpose: Rollback migration 020 if needed
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Drop all 29 Page 5 fields
ALTER TABLE incident_reports
  -- Vehicle Info
  DROP COLUMN IF EXISTS usual_vehicle,
  DROP COLUMN IF EXISTS vehicle_license_plate,

  -- DVLA Data
  DROP COLUMN IF EXISTS dvla_make,
  DROP COLUMN IF EXISTS dvla_model,
  DROP COLUMN IF EXISTS dvla_colour,
  DROP COLUMN IF EXISTS dvla_year,
  DROP COLUMN IF EXISTS dvla_fuel_type,
  DROP COLUMN IF EXISTS dvla_mot_status,
  DROP COLUMN IF EXISTS dvla_mot_expiry,
  DROP COLUMN IF EXISTS dvla_tax_status,
  DROP COLUMN IF EXISTS dvla_tax_due_date,
  DROP COLUMN IF EXISTS dvla_insurance_status,

  -- Damage
  DROP COLUMN IF EXISTS no_damage,

  -- Impact Points
  DROP COLUMN IF EXISTS impact_point_front,
  DROP COLUMN IF EXISTS impact_point_front_driver,
  DROP COLUMN IF EXISTS impact_point_front_passenger,
  DROP COLUMN IF EXISTS impact_point_driver_side,
  DROP COLUMN IF EXISTS impact_point_passenger_side,
  DROP COLUMN IF EXISTS impact_point_rear_driver,
  DROP COLUMN IF EXISTS impact_point_rear_passenger,
  DROP COLUMN IF EXISTS impact_point_rear,
  DROP COLUMN IF EXISTS impact_point_roof,
  DROP COLUMN IF EXISTS impact_point_undercarriage,

  -- Damage & Driveability
  DROP COLUMN IF EXISTS damage_to_your_vehicle,
  DROP COLUMN IF EXISTS vehicle_driveable,

  -- Manual Entry Fallbacks
  DROP COLUMN IF EXISTS manual_make,
  DROP COLUMN IF EXISTS manual_model,
  DROP COLUMN IF EXISTS manual_colour,
  DROP COLUMN IF EXISTS manual_year;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed 29 Page 5 fields from incident_reports';
  RAISE NOTICE '⚠️ Table returned to previous state';
END $$;

COMMIT;
