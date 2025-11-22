-- Migration: Add Page 4 Location/Junction/Visibility Fields to incident_reports
-- Date: 2025-11-06
-- Purpose: Add 13 Page 4 fields (location, junction details, visibility factors)
-- Source: PAGE4_COMPLETE_FIELD_LIST.csv

BEGIN;

-- ========================================
-- STEP 1: Add Location fields
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS what3words TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nearest_landmark TEXT DEFAULT NULL;

COMMENT ON COLUMN incident_reports.location IS 'Full address or location description - CRITICAL REQUIRED FIELD';
COMMENT ON COLUMN incident_reports.what3words IS 'what3words address (e.g., ///filled.count.soap)';
COMMENT ON COLUMN incident_reports.nearest_landmark IS 'Nearest landmark or notable feature';

-- ========================================
-- STEP 2: Add Junction/Intersection fields
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS junction_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS junction_control TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS traffic_light_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS user_manoeuvre TEXT DEFAULT NULL;

COMMENT ON COLUMN incident_reports.junction_type IS 'Junction type selection (T-junction, roundabout, crossroads, etc.)';
COMMENT ON COLUMN incident_reports.junction_control IS 'What controlled junction (traffic lights, give way, priority, etc.)';
COMMENT ON COLUMN incident_reports.traffic_light_status IS 'Traffic light colour for user''s direction (green, amber, red)';
COMMENT ON COLUMN incident_reports.user_manoeuvre IS 'User''s manoeuvre at time of collision (going ahead, turning right, etc.)';

-- ========================================
-- STEP 3: Add Visibility Factor checkboxes
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS visibility_clear BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility_restricted_structure BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility_restricted_bend BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility_large_vehicle BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility_sun_glare BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN incident_reports.visibility_clear IS 'Clear visibility - no issues';
COMMENT ON COLUMN incident_reports.visibility_restricted_structure IS 'Restricted by hedge, wall, or fence';
COMMENT ON COLUMN incident_reports.visibility_restricted_bend IS 'Restricted by bend or corner';
COMMENT ON COLUMN incident_reports.visibility_large_vehicle IS 'Large vehicle obstructing view';
COMMENT ON COLUMN incident_reports.visibility_sun_glare IS 'Sun glare or low sun';

-- ========================================
-- STEP 4: Add Additional Hazards description
-- ========================================

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS additional_hazards TEXT DEFAULT NULL;

COMMENT ON COLUMN incident_reports.additional_hazards IS 'Additional hazards or conditions description';

-- ========================================
-- STEP 5: Log completion
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 018 complete: Added 13 Page 4 fields';
  RAISE NOTICE '📊 Fields breakdown:';
  RAISE NOTICE '   - 3 location fields (location, what3words, nearest_landmark)';
  RAISE NOTICE '   - 4 junction fields (junction_type, junction_control, traffic_light_status, user_manoeuvre)';
  RAISE NOTICE '   - 5 visibility checkboxes';
  RAISE NOTICE '   - 1 additional hazards field';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Note: special_condition_* fields already exist as JSONB array';
  RAISE NOTICE '⚠️  Note: System fields (session_id, map_screenshot_captured, completed_at) not stored in DB';
END $$;

COMMIT;
