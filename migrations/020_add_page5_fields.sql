-- Migration: Add Page 5 Vehicle & Damage Fields to incident_reports
-- Date: 2025-11-06
-- Purpose: Add 29 Page 5 fields (vehicle info, DVLA data, damage details, impact points)
-- Source: PAGE5_COMPLETE_FIELD_LIST.csv

BEGIN;

-- ========================================
-- STEP 1: Add Vehicle Info fields
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS usual_vehicle TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vehicle_license_plate TEXT DEFAULT NULL;

COMMENT ON COLUMN incident_reports.usual_vehicle IS 'Yes/No - Were you driving your usual vehicle';
COMMENT ON COLUMN incident_reports.vehicle_license_plate IS 'UK registration number - used for DVLA lookup';

-- ========================================
-- STEP 2: Add DVLA Data fields
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS dvla_make TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dvla_model TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dvla_colour TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dvla_year INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dvla_fuel_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dvla_mot_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dvla_mot_expiry DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dvla_tax_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dvla_tax_due_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dvla_insurance_status TEXT DEFAULT NULL;

COMMENT ON COLUMN incident_reports.dvla_make IS 'Vehicle make from DVLA or manual entry';
COMMENT ON COLUMN incident_reports.dvla_model IS 'Vehicle model from DVLA or manual entry';
COMMENT ON COLUMN incident_reports.dvla_colour IS 'Vehicle colour from DVLA or manual entry';
COMMENT ON COLUMN incident_reports.dvla_year IS 'Year of manufacture from DVLA or manual entry';
COMMENT ON COLUMN incident_reports.dvla_fuel_type IS 'Fuel type from DVLA or manual entry';
COMMENT ON COLUMN incident_reports.dvla_mot_status IS 'MOT status from DVLA (Valid/Invalid/Unknown)';
COMMENT ON COLUMN incident_reports.dvla_mot_expiry IS 'MOT expiry date from DVLA';
COMMENT ON COLUMN incident_reports.dvla_tax_status IS 'Tax status from DVLA (Taxed/Untaxed)';
COMMENT ON COLUMN incident_reports.dvla_tax_due_date IS 'Tax due date from DVLA';
COMMENT ON COLUMN incident_reports.dvla_insurance_status IS 'Insurance status (not available from DVLA API yet)';

-- ========================================
-- STEP 3: Add Damage checkbox
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS no_damage BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.no_damage IS 'Checkbox: My vehicle has no visible damage';

-- ========================================
-- STEP 4: Add Impact Point checkboxes
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS impact_point_front BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS impact_point_front_driver BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS impact_point_front_passenger BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS impact_point_driver_side BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS impact_point_passenger_side BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS impact_point_rear_driver BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS impact_point_rear_passenger BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS impact_point_rear BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS impact_point_roof BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS impact_point_undercarriage BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN incident_reports.impact_point_front IS 'Impact point: Front';
COMMENT ON COLUMN incident_reports.impact_point_front_driver IS 'Impact point: Front Driver Side';
COMMENT ON COLUMN incident_reports.impact_point_front_passenger IS 'Impact point: Front Passenger Side';
COMMENT ON COLUMN incident_reports.impact_point_driver_side IS 'Impact point: Driver Side';
COMMENT ON COLUMN incident_reports.impact_point_passenger_side IS 'Impact point: Passenger Side';
COMMENT ON COLUMN incident_reports.impact_point_rear_driver IS 'Impact point: Rear Driver Side';
COMMENT ON COLUMN incident_reports.impact_point_rear_passenger IS 'Impact point: Rear Passenger Side';
COMMENT ON COLUMN incident_reports.impact_point_rear IS 'Impact point: Rear';
COMMENT ON COLUMN incident_reports.impact_point_roof IS 'Impact point: Roof';
COMMENT ON COLUMN incident_reports.impact_point_undercarriage IS 'Impact point: Undercarriage';

-- ========================================
-- STEP 5: Add Damage & Driveability fields
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS damage_to_your_vehicle TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vehicle_driveable TEXT DEFAULT NULL;

COMMENT ON COLUMN incident_reports.damage_to_your_vehicle IS 'Detailed description of vehicle damage (required if damage exists)';
COMMENT ON COLUMN incident_reports.vehicle_driveable IS 'Yes/No/Unsure - Was vehicle driveable after accident';

-- ========================================
-- STEP 6: Add Manual Entry fallback fields
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS manual_make TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS manual_model TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS manual_colour TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS manual_year INTEGER DEFAULT NULL;

COMMENT ON COLUMN incident_reports.manual_make IS 'Manual entry fallback - Make (if DVLA fails)';
COMMENT ON COLUMN incident_reports.manual_model IS 'Manual entry fallback - Model (if DVLA fails)';
COMMENT ON COLUMN incident_reports.manual_colour IS 'Manual entry fallback - Colour (if DVLA fails)';
COMMENT ON COLUMN incident_reports.manual_year IS 'Manual entry fallback - Year (if DVLA fails)';

-- ========================================
-- STEP 7: Log completion
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 020 complete: Added 29 Page 5 fields';
  RAISE NOTICE '📊 Fields breakdown:';
  RAISE NOTICE '   - 2 vehicle info fields (usual_vehicle, vehicle_license_plate)';
  RAISE NOTICE '   - 10 DVLA API fields (make, model, colour, year, fuel, MOT, tax, insurance)';
  RAISE NOTICE '   - 1 no damage checkbox';
  RAISE NOTICE '   - 10 impact point checkboxes';
  RAISE NOTICE '   - 2 damage/driveability fields';
  RAISE NOTICE '   - 4 manual entry fallback fields';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Note: manual_fuel not added per CSV (stored elsewhere)';
END $$;

COMMIT;
