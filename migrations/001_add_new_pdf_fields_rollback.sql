-- Rollback Migration: Remove new PDF fields
-- Date: 2025-11-02
-- Reverts: 001_add_new_pdf_fields.sql
-- WARNING: This will delete data in the affected columns!

-- =============================================================================
-- SAFETY CHECK
-- =============================================================================

DO $$
BEGIN
  RAISE WARNING '========================================';
  RAISE WARNING 'ROLLBACK MIGRATION STARTING';
  RAISE WARNING '========================================';
  RAISE WARNING 'This will DROP columns and DELETE data!';
  RAISE WARNING 'Ensure you have a backup before proceeding.';
  RAISE WARNING '========================================';
END $$;

-- =============================================================================
-- DROP CONSTRAINTS (in reverse order of creation)
-- =============================================================================

ALTER TABLE incident_reports DROP CONSTRAINT IF EXISTS check_mot_date_future;
ALTER TABLE incident_reports DROP CONSTRAINT IF EXISTS check_single_road_marking;
ALTER TABLE incident_reports DROP CONSTRAINT IF EXISTS check_single_visibility;
ALTER TABLE incident_reports DROP CONSTRAINT IF EXISTS check_single_traffic_condition;

-- =============================================================================
-- DROP INDEXES
-- =============================================================================

DROP INDEX IF EXISTS idx_incident_reports_tax_due;
DROP INDEX IF EXISTS idx_incident_reports_mot_expiry;
DROP INDEX IF EXISTS idx_other_vehicles_export;
DROP INDEX IF EXISTS idx_incident_reports_dvla_reg;

-- =============================================================================
-- TABLE: incident_witnesses (remove 4 columns)
-- =============================================================================

ALTER TABLE incident_witnesses DROP COLUMN IF EXISTS witness_2_statement;
ALTER TABLE incident_witnesses DROP COLUMN IF EXISTS witness_2_email;
ALTER TABLE incident_witnesses DROP COLUMN IF EXISTS witness_2_mobile;
ALTER TABLE incident_witnesses DROP COLUMN IF EXISTS witness_2_name;

-- =============================================================================
-- TABLE: incident_other_vehicles (remove 9 columns)
-- =============================================================================

-- Insurance details
ALTER TABLE incident_other_vehicles DROP COLUMN IF EXISTS insurance_policy_holder;
ALTER TABLE incident_other_vehicles DROP COLUMN IF EXISTS insurance_policy_number;
ALTER TABLE incident_other_vehicles DROP COLUMN IF EXISTS insurance_company;

-- DVLA lookup results
ALTER TABLE incident_other_vehicles DROP COLUMN IF EXISTS dvla_export_marker;
ALTER TABLE incident_other_vehicles DROP COLUMN IF EXISTS dvla_insurance_status;
ALTER TABLE incident_other_vehicles DROP COLUMN IF EXISTS dvla_tax_due_date;
ALTER TABLE incident_other_vehicles DROP COLUMN IF EXISTS dvla_tax_status;
ALTER TABLE incident_other_vehicles DROP COLUMN IF EXISTS dvla_mot_expiry_date;
ALTER TABLE incident_other_vehicles DROP COLUMN IF EXISTS dvla_mot_status;

-- =============================================================================
-- TABLE: incident_reports (remove 38 columns)
-- =============================================================================

-- Visibility (3 columns)
ALTER TABLE incident_reports DROP COLUMN IF EXISTS visibility_very_poor;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS visibility_poor;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS visibility_good;

-- Road markings (3 columns)
ALTER TABLE incident_reports DROP COLUMN IF EXISTS road_markings_no;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS road_markings_partial;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS road_markings_yes;

-- Traffic conditions (4 columns)
ALTER TABLE incident_reports DROP COLUMN IF EXISTS traffic_none;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS traffic_light;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS traffic_moderate;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS traffic_heavy;

-- Weather conditions (7 columns)
ALTER TABLE incident_reports DROP COLUMN IF EXISTS weather_loose_surface;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS weather_slush_road;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS weather_thunder;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS weather_windy;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS weather_hail;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS weather_raining;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS weather_drizzle;

-- DVLA lookup fields (10 columns)
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_tax_due_date;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_tax_status;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_mot_expiry_date;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_mot_status;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_fuel_type;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_year;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_color;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_model;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_make;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_lookup_reg;

-- Medical fields (5 columns)
ALTER TABLE incident_reports DROP COLUMN IF EXISTS medical_follow_up_needed;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS treatment_received;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS injury_severity;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS hospital_name;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS ambulance_called;

-- =============================================================================
-- ROLLBACK SUMMARY
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Rollback Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Removed columns:';
  RAISE NOTICE '  incident_reports: 38 columns';
  RAISE NOTICE '  incident_other_vehicles: 9 columns';
  RAISE NOTICE '  incident_witnesses: 4 columns';
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Total columns removed: 51';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database reverted to previous state.';
  RAISE NOTICE '========================================';
END $$;
