-- Migration: Rename visibility_severely_restricted to visibility_street_lights
-- Date: 2025-01-03
-- Reason: User feedback - "Street lights" more relevant than "Severely restricted"
--         when "Very poor" and "Poor" options already exist

-- Rename the column
ALTER TABLE incident_reports
RENAME COLUMN visibility_severely_restricted TO visibility_street_lights;

-- Add comment explaining the change
COMMENT ON COLUMN incident_reports.visibility_street_lights IS 'Visibility conditions: street lighting present (replaces severely_restricted for more relevant categorization)';
