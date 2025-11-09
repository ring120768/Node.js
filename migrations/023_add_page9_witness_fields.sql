-- Migration 023: Add Page 9 Witness Fields to incident_reports
-- Date: 2025-11-09
-- Purpose: Add witness-related columns for Page 9 (witnesses) of incident form
-- Related: incident-form-page9-witnesses.html

BEGIN;

-- Add witness boolean flag (replaces old 'any_witness' column)
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS witnesses_present TEXT,  -- 'yes' or 'no' (matches HTML form)
  ADD COLUMN IF NOT EXISTS witness_name TEXT,
  ADD COLUMN IF NOT EXISTS witness_mobile_number TEXT,
  ADD COLUMN IF NOT EXISTS witness_email_address TEXT,
  ADD COLUMN IF NOT EXISTS witness_statement TEXT;

-- Add helpful comments
COMMENT ON COLUMN incident_reports.witnesses_present IS 'Whether witnesses were present at the scene (yes/no)';
COMMENT ON COLUMN incident_reports.witness_name IS 'Primary witness full name';
COMMENT ON COLUMN incident_reports.witness_mobile_number IS 'Primary witness contact number';
COMMENT ON COLUMN incident_reports.witness_email_address IS 'Primary witness email address';
COMMENT ON COLUMN incident_reports.witness_statement IS 'Primary witness statement/account';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 023 complete: Added 5 Page 9 witness fields to incident_reports';
  RAISE NOTICE '✅ Columns: witnesses_present, witness_name, witness_mobile_number, witness_email_address, witness_statement';
  RAISE NOTICE 'ℹ️  Note: Detailed witness information is now stored in incident_witnesses table';
  RAISE NOTICE 'ℹ️  These columns are for backward compatibility and simple yes/no tracking';
END $$;

COMMIT;
