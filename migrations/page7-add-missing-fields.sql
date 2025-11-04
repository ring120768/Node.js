-- ============================================================
-- Page 7 (Other Vehicle) - Add Missing Fields Only
-- Migration Date: 2025-01-16
-- Purpose: Add 15 new fields (driver info + DVLA + damage)
--
-- Summary:
-- - 4 insurance fields: ALREADY RENAMED ✅ (skip)
-- - 1 vehicle registration: ALREADY EXISTS ✅ (skip)
-- - 4 driver fields: NEED TO ADD (both old and new are missing)
-- - 10 DVLA fields: NEED TO ADD
-- - 2 damage fields: NEED TO ADD (1 missing)
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: ADD DRIVER INFORMATION FIELDS (4 fields)
-- ============================================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_full_name TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_contact_number TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_email_address TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_driving_license_number TEXT;

-- ============================================================
-- STEP 2: ADD DVLA LOOKUP FIELDS (10 fields)
-- ============================================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_make TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_model TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_colour TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_year TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_fuel_type TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_mot_status TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_mot_expiry_date TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_tax_status TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_tax_due_date TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_insurance_status TEXT;

-- ============================================================
-- STEP 3: ADD DAMAGE DESCRIPTION FIELDS (2 fields)
-- ============================================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS no_visible_damage BOOLEAN DEFAULT FALSE;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS describe_damage_to_vehicle TEXT;

-- ============================================================
-- STEP 4: ADD COMMENTS TO NEW COLUMNS
-- ============================================================

-- Driver information
COMMENT ON COLUMN incident_reports.other_full_name IS 'Other driver full legal name';
COMMENT ON COLUMN incident_reports.other_contact_number IS 'Other driver contact phone number (UK format)';
COMMENT ON COLUMN incident_reports.other_email_address IS 'Other driver email address (optional)';
COMMENT ON COLUMN incident_reports.other_driving_license_number IS 'Other driver UK driving license number';

-- DVLA lookup fields
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_make IS 'Vehicle make from DVLA lookup (auto-populated)';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_model IS 'Vehicle model from DVLA lookup (auto-populated)';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_colour IS 'Vehicle colour from DVLA lookup (British spelling)';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_year IS 'Vehicle year of manufacture from DVLA lookup';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_fuel_type IS 'Vehicle fuel type from DVLA lookup';

COMMENT ON COLUMN incident_reports.other_vehicle_look_up_mot_status IS 'MOT status from DVLA lookup (valid/expired/no record)';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_mot_expiry_date IS 'MOT expiry date from DVLA lookup';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_tax_status IS 'Tax status from DVLA lookup (taxed/untaxed/SORN)';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_tax_due_date IS 'Tax due date from DVLA lookup';
COMMENT ON COLUMN incident_reports.other_vehicle_look_up_insurance_status IS 'Insurance status from DVLA lookup (insured/no record)';

-- Damage description
COMMENT ON COLUMN incident_reports.no_visible_damage IS 'Checkbox: True if no visible damage to other vehicle';
COMMENT ON COLUMN incident_reports.describe_damage_to_vehicle IS 'Detailed description of damage to other vehicle (free text, 1000 chars max)';

COMMIT;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

-- Run this query to verify all columns exist after migration:
/*
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'incident_reports'
  AND column_name IN (
    'other_full_name',
    'other_contact_number',
    'other_email_address',
    'other_driving_license_number',
    'other_vehicle_look_up_make',
    'other_vehicle_look_up_model',
    'other_vehicle_look_up_colour',
    'other_vehicle_look_up_year',
    'other_vehicle_look_up_fuel_type',
    'other_vehicle_look_up_mot_status',
    'other_vehicle_look_up_mot_expiry_date',
    'other_vehicle_look_up_tax_status',
    'other_vehicle_look_up_tax_due_date',
    'other_vehicle_look_up_insurance_status',
    'no_visible_damage',
    'describe_damage_to_vehicle'
  )
ORDER BY column_name;
*/

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================

-- To rollback this migration, run:
/*
BEGIN;

-- Drop driver fields
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_full_name;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_contact_number;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_email_address;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_driving_license_number;

-- Drop DVLA fields
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_vehicle_look_up_make;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_vehicle_look_up_model;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_vehicle_look_up_colour;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_vehicle_look_up_year;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_vehicle_look_up_fuel_type;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_vehicle_look_up_mot_status;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_vehicle_look_up_mot_expiry_date;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_vehicle_look_up_tax_status;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_vehicle_look_up_tax_due_date;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_vehicle_look_up_insurance_status;

-- Drop damage fields
ALTER TABLE incident_reports DROP COLUMN IF EXISTS no_visible_damage;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS describe_damage_to_vehicle;

COMMIT;
*/

-- ============================================================
-- NOTES
-- ============================================================

-- 1. Insurance Fields Already Renamed:
--    - other_drivers_insurance_company ✅
--    - other_drivers_policy_number ✅
--    - other_drivers_policy_holder_name ✅
--    - other_drivers_policy_cover_type ✅
--    These were renamed in a previous migration, so we skip them here.

-- 2. Vehicle Registration Already Exists:
--    - other_vehicle_registration ✅
--    This field already exists, so we skip it here.

-- 3. New Fields Being Added (16 total):
--    - 4 driver information fields
--    - 10 DVLA lookup fields
--    - 2 damage description fields

-- 4. All fields use IF NOT EXISTS for safety:
--    - Safe to run multiple times
--    - Won't error if fields already exist

-- 5. British Spelling:
--    - "colour" used throughout (not "color")
--    - Matches UK DVLA API response format
