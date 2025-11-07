-- Migration: Add Page 7 Other Vehicle Fields to incident_reports
-- Date: 2025-11-06
-- Purpose: Add 9 Page 7 unmapped fields (other driver/vehicle details)
-- Source: PAGE7_COMPLETE_FIELD_LIST.csv
-- Note: Adding unmapped fields marked with ❌ NO in CSV

BEGIN;

-- ========================================
-- STEP 1: Add Other Driver Information
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_email_address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS other_driving_license_number TEXT DEFAULT NULL;

COMMENT ON COLUMN incident_reports.other_email_address IS 'Other driver''s email address';
COMMENT ON COLUMN incident_reports.other_driving_license_number IS 'UK driving license number (max 16 chars)';

-- ========================================
-- STEP 2: Add Other Vehicle DVLA Lookup Fields
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_fuel_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_mot_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_mot_expiry_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_tax_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_tax_due_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_insurance_status TEXT DEFAULT 'Not Available';

COMMENT ON COLUMN incident_reports.other_vehicle_look_up_fuel_type IS 'Fuel type from DVLA API response';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_mot_status IS 'MOT status from DVLA (Valid/Invalid/Expired) with badge styling';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_mot_expiry_date IS 'MOT expiry date from DVLA - Triggers warning if expired';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_tax_status IS 'Tax status from DVLA (Taxed/Untaxed) with badge styling';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_tax_due_date IS 'Tax due date from DVLA - Triggers warning if expired';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_insurance_status IS 'Insurance status (BETA - not available from DVLA API)';

-- ========================================
-- STEP 3: Add Other Vehicle Damage Field
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS no_visible_damage BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.no_visible_damage IS 'Checkbox: No visible damage to other vehicle - Disables textarea when checked';

-- ========================================
-- STEP 4: Log completion
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 021 complete: Added 9 Page 7 fields';
  RAISE NOTICE '📊 Fields breakdown:';
  RAISE NOTICE '   - 2 other driver fields (email, license number)';
  RAISE NOTICE '   - 6 DVLA lookup fields (fuel, MOT status/expiry, tax status/due, insurance)';
  RAISE NOTICE '   - 1 damage checkbox (no_visible_damage)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Note: Already-mapped fields not duplicated (full_name, contact, registration, etc.)';
  RAISE NOTICE '⚠️  Note: System fields (vehicle_data, warnings, additional_vehicles) stored in localStorage/sessionStorage only';
END $$;

COMMIT;
