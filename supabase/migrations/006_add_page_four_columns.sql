-- Migration: Add Page Four missing columns
-- Date: 2025-01-03
-- Page: Four (Location, Junction, Special Conditions)
-- Reason: Critical fields exist in HTML form but missing from database

-- Location field: Nearest landmark for emergency services
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS nearestlandmark TEXT;

-- Junction fields: Traffic light status when junction controlled by lights
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS trafficlightstatus TEXT;

-- Junction fields: User's manoeuvre at time of accident
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS usermanoeuvre TEXT;

-- Hazards field: Additional hazards description (textarea)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS additionalhazards TEXT;

-- Add comments for documentation
COMMENT ON COLUMN incident_reports.nearestlandmark IS 'Nearest landmark to accident location (Page Four)';
COMMENT ON COLUMN incident_reports.trafficlightstatus IS 'Traffic light color if junction controlled by lights (Page Four)';
COMMENT ON COLUMN incident_reports.usermanoeuvre IS 'User manoeuvre at time of accident (Page Four)';
COMMENT ON COLUMN incident_reports.additionalhazards IS 'Additional hazards or special circumstances (Page Four)';
