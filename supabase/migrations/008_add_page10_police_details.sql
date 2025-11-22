-- ========================================
-- Migration: Add Page 10 Police & Safety Details
-- Date: 2025-11-04
-- Description: Add missing columns for police attendance details and safety equipment
-- ========================================

-- Page 10 collects 10 fields total:
-- 1. police_attended (BOOLEAN) - Already exists ✓
-- 2. accident_ref_number (TEXT) - Police reference/CAD number
-- 3. police_force (TEXT) - Police force name
-- 4. officer_name (TEXT) - Officer's name
-- 5. officer_badge (TEXT) - Officer's badge/collar number
-- 6. user_breath_test (TEXT) - User's breath test result
-- 7. other_breath_test (TEXT) - Other driver's breath test result
-- 8. airbags_deployed (BOOLEAN) - Were airbags deployed
-- 9. seatbelts_worn (BOOLEAN) - Already exists ✓
-- 10. seatbelt_reason (TEXT) - Reason if seatbelt not worn

-- ========================================
-- Add Police Detail Columns (6 new fields)
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS accident_ref_number TEXT,
ADD COLUMN IF NOT EXISTS police_force TEXT,
ADD COLUMN IF NOT EXISTS officer_name TEXT,
ADD COLUMN IF NOT EXISTS officer_badge TEXT,
ADD COLUMN IF NOT EXISTS user_breath_test TEXT,
ADD COLUMN IF NOT EXISTS other_breath_test TEXT;

-- ========================================
-- Add Safety Equipment Columns (2 new fields)
-- ========================================

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS airbags_deployed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seatbelt_reason TEXT;

-- ========================================
-- Column Comments (Documentation)
-- ========================================

COMMENT ON COLUMN incident_reports.accident_ref_number IS 'Police accident reference or CAD number (Page 10)';
COMMENT ON COLUMN incident_reports.police_force IS 'Name of police force that attended (Page 10)';
COMMENT ON COLUMN incident_reports.officer_name IS 'Name of attending police officer (Page 10)';
COMMENT ON COLUMN incident_reports.officer_badge IS 'Police officer badge/collar number (Page 10)';
COMMENT ON COLUMN incident_reports.user_breath_test IS 'User breath test result (Page 10)';
COMMENT ON COLUMN incident_reports.other_breath_test IS 'Other driver breath test result (Page 10)';
COMMENT ON COLUMN incident_reports.airbags_deployed IS 'Were airbags deployed in user vehicle? (Page 10)';
COMMENT ON COLUMN incident_reports.seatbelt_reason IS 'Explanation if seatbelt not worn (Page 10)';

-- ========================================
-- Indexes (Optional - for query optimization)
-- ========================================

-- Index on police_force for filtering/reporting
CREATE INDEX IF NOT EXISTS idx_incident_reports_police_force
ON incident_reports(police_force)
WHERE police_force IS NOT NULL;

-- Index on airbags_deployed for safety statistics
CREATE INDEX IF NOT EXISTS idx_incident_reports_airbags_deployed
ON incident_reports(airbags_deployed)
WHERE airbags_deployed = TRUE;

-- ========================================
-- Rollback Instructions
-- ========================================

-- To rollback this migration, run:
-- ALTER TABLE incident_reports
-- DROP COLUMN IF EXISTS accident_ref_number,
-- DROP COLUMN IF EXISTS police_force,
-- DROP COLUMN IF EXISTS officer_name,
-- DROP COLUMN IF EXISTS officer_badge,
-- DROP COLUMN IF EXISTS user_breath_test,
-- DROP COLUMN IF EXISTS other_breath_test,
-- DROP COLUMN IF EXISTS airbags_deployed,
-- DROP COLUMN IF EXISTS seatbelt_reason;
--
-- DROP INDEX IF EXISTS idx_incident_reports_police_force;
-- DROP INDEX IF EXISTS idx_incident_reports_airbags_deployed;
