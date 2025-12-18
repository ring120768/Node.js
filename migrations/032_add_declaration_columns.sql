-- Migration 032: Add declaration consent columns to incident_reports
-- These columns track when users consent to the declaration before PDF generation

-- Add declaration_consent column (boolean, default false)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS declaration_consent BOOLEAN DEFAULT FALSE;

-- Add declaration_timestamp column (when consent was given)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS declaration_timestamp TIMESTAMPTZ;

-- Add index for querying by declaration status
CREATE INDEX IF NOT EXISTS idx_incident_reports_declaration
ON incident_reports(declaration_consent, declaration_timestamp)
WHERE declaration_consent = TRUE;

-- Comment on columns for documentation
COMMENT ON COLUMN incident_reports.declaration_consent IS 'Whether user has agreed to the declaration statement';
COMMENT ON COLUMN incident_reports.declaration_timestamp IS 'When the declaration consent was given';
