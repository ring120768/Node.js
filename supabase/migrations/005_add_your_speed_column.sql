-- Migration: Add your_speed column for user's estimated speed
-- Date: 2025-01-03
-- Page: Three (Date/Time/Weather/Road)
-- Reason: Field exists in HTML form but missing from database

ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS your_speed TEXT;

COMMENT ON COLUMN incident_reports.your_speed IS 'User estimated speed at time of accident (Page Three)';
