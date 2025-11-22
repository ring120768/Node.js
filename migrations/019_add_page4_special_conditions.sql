-- Migration: Add Page 4 Special Condition Individual Columns
-- Date: 2025-11-06
-- Purpose: Add 12 special condition BOOLEAN fields as individual columns
-- Source: PAGE4_COMPLETE_FIELD_LIST.csv
-- Note: Replacing JSONB array storage with individual columns for better PDF mapping

BEGIN;

-- ========================================
-- STEP 1: Add Special Condition checkboxes
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS special_condition_roadworks BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_condition_workmen BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_condition_cyclists BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_condition_pedestrians BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_condition_traffic_calming BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_condition_parked_vehicles BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_condition_crossing BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_condition_school_zone BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_condition_narrow_road BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_condition_potholes BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_condition_oil_spills BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_condition_animals BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.special_condition_roadworks IS 'Roadworks or construction';
COMMENT ON COLUMN incident_reports.special_condition_workmen IS 'Workmen in road';
COMMENT ON COLUMN incident_reports.special_condition_cyclists IS 'Cyclists in road';
COMMENT ON COLUMN incident_reports.special_condition_pedestrians IS 'Pedestrians in road';
COMMENT ON COLUMN incident_reports.special_condition_traffic_calming IS 'Traffic calming measures';
COMMENT ON COLUMN incident_reports.special_condition_parked_vehicles IS 'Parked vehicles obstructing view';
COMMENT ON COLUMN incident_reports.special_condition_crossing IS 'Near pedestrian crossing';
COMMENT ON COLUMN incident_reports.special_condition_school_zone IS 'School zone or playground area';
COMMENT ON COLUMN incident_reports.special_condition_narrow_road IS 'Narrow road or single-track';
COMMENT ON COLUMN incident_reports.special_condition_potholes IS 'Pot holes and road defects';
COMMENT ON COLUMN incident_reports.special_condition_oil_spills IS 'Oil spills';
COMMENT ON COLUMN incident_reports.special_condition_animals IS 'Animals in road';

-- ========================================
-- STEP 2: Log completion
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 019 complete: Added 12 special condition fields as individual BOOLEAN columns';
  RAISE NOTICE '📊 Special condition checkboxes:';
  RAISE NOTICE '   - roadworks, workmen, cyclists, pedestrians';
  RAISE NOTICE '   - traffic_calming, parked_vehicles, crossing, school_zone';
  RAISE NOTICE '   - narrow_road, potholes, oil_spills, animals';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Note: Old JSONB array (special_conditions) can be deprecated in favor of individual columns';
END $$;

COMMIT;
