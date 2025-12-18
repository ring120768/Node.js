-- Rollback Migration 032: Remove declaration consent columns

-- Drop index first
DROP INDEX IF EXISTS idx_incident_reports_declaration;

-- Remove columns
ALTER TABLE incident_reports DROP COLUMN IF EXISTS declaration_timestamp;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS declaration_consent;
