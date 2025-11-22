-- Migration: Add Page 12 (Final Medical Check) fields to incident_reports
-- Date: 2025-11-07
-- Purpose: Add final_feeling column (completed_at already exists from migration 016)

BEGIN;

-- Page 12: Final Medical Check fields
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS final_feeling TEXT,  -- Values: fine, shaken, minor_pain, significant_pain, emergency
  ADD COLUMN IF NOT EXISTS form_completed_at TIMESTAMPTZ DEFAULT NULL;  -- When user completed the entire form

-- Add helpful comments
COMMENT ON COLUMN incident_reports.final_feeling IS 'How the user is feeling at the end of the form (Page 12)';
COMMENT ON COLUMN incident_reports.form_completed_at IS 'Timestamp when the user completed the entire incident form (Page 12)';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 026 complete: Added Page 12 final medical check fields';
  RAISE NOTICE '   - final_feeling (TEXT)';
  RAISE NOTICE '   - form_completed_at (TIMESTAMPTZ)';
END $$;

COMMIT;
