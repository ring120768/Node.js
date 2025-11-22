-- ============================================================
-- Page 7 (Other Vehicle) Field Updates
-- Migration Date: 2025-01-16
-- Purpose: Rename existing fields and add new DVLA lookup fields
--
-- Summary:
-- - 4 existing fields to rename
-- - 17 new fields to add
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: RENAME EXISTING INSURANCE FIELDS
-- ============================================================

-- Rename insurance company field
ALTER TABLE incident_reports
  RENAME COLUMN other_insurance_company TO other_drivers_insurance_company;

-- Rename policy number field
ALTER TABLE incident_reports
  RENAME COLUMN other_policy_number TO other_drivers_policy_number;

-- Rename policy holder field
ALTER TABLE incident_reports
  RENAME COLUMN other_policy_holder TO other_drivers_policy_holder_name;

-- Rename policy cover type field
ALTER TABLE incident_reports
  RENAME COLUMN other_policy_cover TO other_drivers_policy_cover_type;

-- ============================================================
-- STEP 2: ADD NEW DRIVER INFORMATION FIELDS
-- ============================================================

-- Driver contact and identification
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_full_name TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_contact_number TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_email_address TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_driving_license_number TEXT;

-- ============================================================
-- STEP 3: ADD VEHICLE REGISTRATION FIELD
-- ============================================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_registration TEXT;

-- ============================================================
-- STEP 4: ADD DVLA LOOKUP FIELDS (10 fields)
-- ============================================================

-- Basic vehicle information from DVLA
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_make TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_model TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_colour TEXT;  -- British spelling

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_year TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_fuel_type TEXT;

-- MOT information from DVLA
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_mot_status TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_mot_expiry_date TEXT;

-- Tax information from DVLA
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_tax_status TEXT;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_tax_due_date TEXT;

-- Insurance status from DVLA
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS other_vehicle_look_up_insurance_status TEXT;

-- ============================================================
-- STEP 5: ADD DAMAGE DESCRIPTION FIELDS
-- ============================================================

-- "No visible damage" checkbox
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS no_visible_damage BOOLEAN DEFAULT FALSE;

-- Detailed damage description (replaces point of impact)
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS describe_damage_to_vehicle TEXT;

-- ============================================================
-- STEP 6: ADD COMMENTS TO NEW COLUMNS
-- ============================================================

COMMENT ON COLUMN incident_reports.other_full_name IS 'Other driver full legal name';
COMMENT ON COLUMN incident_reports.other_contact_number IS 'Other driver contact phone number (UK format)';
COMMENT ON COLUMN incident_reports.other_email_address IS 'Other driver email address (optional)';
COMMENT ON COLUMN incident_reports.other_driving_license_number IS 'Other driver UK driving license number';

COMMENT ON COLUMN incident_reports.other_vehicle_registration IS 'Other vehicle registration plate (UK format)';

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

COMMENT ON COLUMN incident_reports.other_drivers_insurance_company IS 'Other driver insurance company name (renamed from other_insurance_company)';
COMMENT ON COLUMN incident_reports.other_drivers_policy_number IS 'Other driver insurance policy number (renamed from other_policy_number)';
COMMENT ON COLUMN incident_reports.other_drivers_policy_holder_name IS 'Other driver policy holder name (renamed from other_policy_holder)';
COMMENT ON COLUMN incident_reports.other_drivers_policy_cover_type IS 'Other driver policy cover type (renamed from other_policy_cover)';

COMMENT ON COLUMN incident_reports.no_visible_damage IS 'Checkbox: True if no visible damage to other vehicle';
COMMENT ON COLUMN incident_reports.describe_damage_to_vehicle IS 'Detailed description of damage to other vehicle (free text, 1000 chars max)';

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

-- Run this query to verify all columns exist after migration:
/*
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'incident_reports'
  AND column_name LIKE 'other_%'
ORDER BY column_name;
*/

COMMIT;

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================

-- To rollback this migration, run:
/*
BEGIN;

-- Rename fields back
ALTER TABLE incident_reports RENAME COLUMN other_drivers_insurance_company TO other_insurance_company;
ALTER TABLE incident_reports RENAME COLUMN other_drivers_policy_number TO other_policy_number;
ALTER TABLE incident_reports RENAME COLUMN other_drivers_policy_holder_name TO other_policy_holder;
ALTER TABLE incident_reports RENAME COLUMN other_drivers_policy_cover_type TO other_policy_cover;

-- Drop new fields
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_full_name;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_contact_number;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_email_address;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_driving_license_number;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS other_vehicle_registration;
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
ALTER TABLE incident_reports DROP COLUMN IF EXISTS no_visible_damage;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS describe_damage_to_vehicle;

COMMIT;
*/

-- ============================================================
-- NOTES
-- ============================================================

-- 1. Backward Compatibility:
--    - Frontend loadSavedData() checks for both old and new field names
--    - PDF service falls back to old field names if new ones don't exist
--    - This allows gradual migration without breaking existing data

-- 2. Data Migration:
--    - No existing data needs to be migrated since these are new fields
--    - Old columns were renamed, preserving any existing data

-- 3. Additional Vehicles:
--    - Pattern for additional vehicles: other_1_full_name, other_2_full_name, etc.
--    - These will be stored in sessionStorage.additional_vehicles array
--    - Backend should process this array separately

-- 4. DVLA Fields:
--    - These are auto-populated from UK DVLA vehicle lookup API
--    - User cannot manually edit these fields
--    - Stored as TEXT for flexibility (dates, statuses, etc.)

-- 5. British Spelling:
--    - "colour" used throughout (not "color")
--    - Matches UK DVLA API response format
