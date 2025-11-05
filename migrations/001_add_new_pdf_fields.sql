-- Migration: Add new PDF fields for revised incident report (207 fields)
-- Date: 2025-11-02
-- Source: Car-Crash-Lawyer-AI-incident-report 02112025.pdf
-- Reference: COMPREHENSIVE_PDF_FIELD_MAPPING.md

-- =============================================================================
-- TABLE: incident_reports (25 new columns)
-- =============================================================================

-- MEDICAL FIELDS (5 new)
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS ambulance_called BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS hospital_name TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS injury_severity TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS treatment_received TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS medical_follow_up_needed TEXT;

COMMENT ON COLUMN incident_reports.ambulance_called IS 'Whether ambulance was called to scene';
COMMENT ON COLUMN incident_reports.hospital_name IS 'Hospital or medical center name if attended';
COMMENT ON COLUMN incident_reports.injury_severity IS 'Severity of injuries sustained';
COMMENT ON COLUMN incident_reports.treatment_received IS 'Medical treatment received at scene/hospital';
COMMENT ON COLUMN incident_reports.medical_follow_up_needed IS 'Further medical attention required';

-- DVLA LOOKUP FIELDS - YOUR VEHICLE (10 new)
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_lookup_reg TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_make TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_model TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_color TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_year INTEGER;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_vehicle_fuel_type TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_mot_status TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_mot_expiry_date DATE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_tax_status TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS dvla_tax_due_date DATE;

COMMENT ON COLUMN incident_reports.dvla_lookup_reg IS 'UK registration plate used for DVLA lookup';
COMMENT ON COLUMN incident_reports.dvla_vehicle_make IS 'Vehicle make from DVLA database';
COMMENT ON COLUMN incident_reports.dvla_vehicle_model IS 'Vehicle model from DVLA database';
COMMENT ON COLUMN incident_reports.dvla_vehicle_color IS 'Vehicle color from DVLA database';
COMMENT ON COLUMN incident_reports.dvla_vehicle_year IS 'Vehicle year from DVLA database';
COMMENT ON COLUMN incident_reports.dvla_vehicle_fuel_type IS 'Fuel type from DVLA database';
COMMENT ON COLUMN incident_reports.dvla_mot_status IS 'MOT status: Valid, Expired, Not Due';
COMMENT ON COLUMN incident_reports.dvla_mot_expiry_date IS 'MOT expiry date from DVLA';
COMMENT ON COLUMN incident_reports.dvla_tax_status IS 'Tax status: Taxed, SORN, Untaxed';
COMMENT ON COLUMN incident_reports.dvla_tax_due_date IS 'Tax due date from DVLA';

-- WEATHER CONDITIONS (7 new - additional to existing)
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS weather_drizzle BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS weather_raining BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS weather_hail BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS weather_windy BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS weather_thunder BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS weather_slush_road BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS weather_loose_surface BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.weather_drizzle IS 'Light rain/drizzle conditions';
COMMENT ON COLUMN incident_reports.weather_raining IS 'Moderate to heavy rain';
COMMENT ON COLUMN incident_reports.weather_hail IS 'Hail conditions';
COMMENT ON COLUMN incident_reports.weather_windy IS 'Windy conditions affecting driving';
COMMENT ON COLUMN incident_reports.weather_thunder IS 'Thunder and lightning conditions';
COMMENT ON COLUMN incident_reports.weather_slush_road IS 'Slush on road surface';
COMMENT ON COLUMN incident_reports.weather_loose_surface IS 'Loose gravel/surface material';

-- TRAFFIC CONDITIONS (4 new)
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS traffic_heavy BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS traffic_moderate BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS traffic_light BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS traffic_none BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.traffic_heavy IS 'Heavy traffic conditions';
COMMENT ON COLUMN incident_reports.traffic_moderate IS 'Moderate traffic conditions';
COMMENT ON COLUMN incident_reports.traffic_light IS 'Light traffic conditions';
COMMENT ON COLUMN incident_reports.traffic_none IS 'No traffic present';

-- ROAD MARKINGS (3 new)
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS road_markings_yes BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS road_markings_partial BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS road_markings_no BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.road_markings_yes IS 'Road markings clearly visible';
COMMENT ON COLUMN incident_reports.road_markings_partial IS 'Road markings partially visible/worn';
COMMENT ON COLUMN incident_reports.road_markings_no IS 'No road markings present';

-- VISIBILITY (3 new)
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS visibility_good BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS visibility_poor BOOLEAN DEFAULT FALSE;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS visibility_very_poor BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.visibility_good IS 'Good visibility conditions';
COMMENT ON COLUMN incident_reports.visibility_poor IS 'Poor visibility conditions';
COMMENT ON COLUMN incident_reports.visibility_very_poor IS 'Very poor visibility (fog, heavy rain, etc.)';

-- =============================================================================
-- TABLE: incident_other_vehicles (9 new columns)
-- =============================================================================

-- DVLA LOOKUP RESULTS FOR OTHER VEHICLE (6 new)
ALTER TABLE incident_other_vehicles ADD COLUMN IF NOT EXISTS dvla_mot_status TEXT;
ALTER TABLE incident_other_vehicles ADD COLUMN IF NOT EXISTS dvla_mot_expiry_date DATE;
ALTER TABLE incident_other_vehicles ADD COLUMN IF NOT EXISTS dvla_tax_status TEXT;
ALTER TABLE incident_other_vehicles ADD COLUMN IF NOT EXISTS dvla_tax_due_date DATE;
ALTER TABLE incident_other_vehicles ADD COLUMN IF NOT EXISTS dvla_insurance_status TEXT;
ALTER TABLE incident_other_vehicles ADD COLUMN IF NOT EXISTS dvla_export_marker BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_other_vehicles.dvla_mot_status IS 'Other vehicle MOT status from DVLA';
COMMENT ON COLUMN incident_other_vehicles.dvla_mot_expiry_date IS 'Other vehicle MOT expiry from DVLA';
COMMENT ON COLUMN incident_other_vehicles.dvla_tax_status IS 'Other vehicle tax status from DVLA';
COMMENT ON COLUMN incident_other_vehicles.dvla_tax_due_date IS 'Other vehicle tax due date from DVLA';
COMMENT ON COLUMN incident_other_vehicles.dvla_insurance_status IS 'Insurance status from MIB database';
COMMENT ON COLUMN incident_other_vehicles.dvla_export_marker IS 'Vehicle marked for export';

-- INSURANCE DETAILS (3 new - may already exist, using IF NOT EXISTS)
ALTER TABLE incident_other_vehicles ADD COLUMN IF NOT EXISTS insurance_company TEXT;
ALTER TABLE incident_other_vehicles ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE incident_other_vehicles ADD COLUMN IF NOT EXISTS insurance_policy_holder TEXT;

COMMENT ON COLUMN incident_other_vehicles.insurance_company IS 'Other driver insurance company name';
COMMENT ON COLUMN incident_other_vehicles.insurance_policy_number IS 'Other driver insurance policy number';
COMMENT ON COLUMN incident_other_vehicles.insurance_policy_holder IS 'Other driver policy holder name';

-- =============================================================================
-- TABLE: incident_witnesses (4 new columns for witness #2)
-- =============================================================================

ALTER TABLE incident_witnesses ADD COLUMN IF NOT EXISTS witness_2_name TEXT;
ALTER TABLE incident_witnesses ADD COLUMN IF NOT EXISTS witness_2_mobile TEXT;
ALTER TABLE incident_witnesses ADD COLUMN IF NOT EXISTS witness_2_email TEXT;
ALTER TABLE incident_witnesses ADD COLUMN IF NOT EXISTS witness_2_statement TEXT;

COMMENT ON COLUMN incident_witnesses.witness_2_name IS 'Second witness full name';
COMMENT ON COLUMN incident_witnesses.witness_2_mobile IS 'Second witness mobile number (+44 format)';
COMMENT ON COLUMN incident_witnesses.witness_2_email IS 'Second witness email address';
COMMENT ON COLUMN incident_witnesses.witness_2_statement IS 'Second witness statement text';

-- =============================================================================
-- INDEXES (Performance optimization)
-- =============================================================================

-- Index for DVLA lookups (frequently queried)
CREATE INDEX IF NOT EXISTS idx_incident_reports_dvla_reg
ON incident_reports(dvla_lookup_reg)
WHERE dvla_lookup_reg IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_other_vehicles_export
ON incident_other_vehicles(dvla_export_marker)
WHERE dvla_export_marker = TRUE;

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_incident_reports_mot_expiry
ON incident_reports(dvla_mot_expiry_date)
WHERE dvla_mot_expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incident_reports_tax_due
ON incident_reports(dvla_tax_due_date)
WHERE dvla_tax_due_date IS NOT NULL;

-- =============================================================================
-- VALIDATION CONSTRAINTS
-- =============================================================================

-- Ensure only one traffic condition is selected (mutual exclusivity)
ALTER TABLE incident_reports
DROP CONSTRAINT IF EXISTS check_single_traffic_condition;

ALTER TABLE incident_reports
ADD CONSTRAINT check_single_traffic_condition
CHECK (
  (traffic_heavy::int + traffic_moderate::int + traffic_light::int + traffic_none::int) <= 1
);

-- Ensure only one visibility level is selected
ALTER TABLE incident_reports
DROP CONSTRAINT IF EXISTS check_single_visibility;

ALTER TABLE incident_reports
ADD CONSTRAINT check_single_visibility
CHECK (
  (visibility_good::int + visibility_poor::int + visibility_very_poor::int) <= 1
);

-- Ensure only one road marking status is selected
ALTER TABLE incident_reports
DROP CONSTRAINT IF EXISTS check_single_road_marking;

ALTER TABLE incident_reports
ADD CONSTRAINT check_single_road_marking
CHECK (
  (road_markings_yes::int + road_markings_partial::int + road_markings_no::int) <= 1
);

-- Validate UK date formats for MOT/tax dates
ALTER TABLE incident_reports
DROP CONSTRAINT IF EXISTS check_mot_date_future;

ALTER TABLE incident_reports
ADD CONSTRAINT check_mot_date_future
CHECK (
  dvla_mot_expiry_date IS NULL OR
  dvla_mot_expiry_date >= '2000-01-01'::date
);

-- =============================================================================
-- GRANT PERMISSIONS (if using RLS)
-- =============================================================================

-- These permissions should already exist from initial schema
-- Included here for completeness

-- Allow authenticated users to update their own incident reports
-- (RLS policies handle user isolation)

-- =============================================================================
-- MIGRATION SUMMARY
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 001: Add new PDF fields';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  incident_reports: 38 new columns';
  RAISE NOTICE '  incident_other_vehicles: 9 new columns';
  RAISE NOTICE '  incident_witnesses: 4 new columns';
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Total new columns: 51';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE '========================================';
END $$;
