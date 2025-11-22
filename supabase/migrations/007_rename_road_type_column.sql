-- Migration: Rename road_type_other to road_type_private_road
-- Date: 2025-01-03
-- Page: Three (Date/Weather/Road)
-- Reason: Align with existing PDF field and clarify legal distinction

-- Private roads have critical legal implications in UK traffic law:
-- - Different liability rules
-- - Insurance coverage may differ
-- - Different reporting requirements

ALTER TABLE incident_reports
RENAME COLUMN road_type_other TO road_type_private_road;

-- Update comment for documentation
COMMENT ON COLUMN incident_reports.road_type_private_road IS 'Accident occurred on private road (critical for UK legal liability - Page Three)';
