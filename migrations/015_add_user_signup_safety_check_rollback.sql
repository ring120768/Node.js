-- ROLLBACK: Remove Safety Check Fields from user_signup Table
-- Date: 2025-11-06
-- Purpose: Rollback migration 015 if needed
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_check_safety_before_report ON incident_reports;
DROP FUNCTION IF EXISTS check_user_safety_before_report();

-- Drop indexes
DROP INDEX IF EXISTS idx_user_signup_are_you_safe;
DROP INDEX IF EXISTS idx_user_signup_safe_to_proceed;

-- Drop columns
ALTER TABLE user_signup
  DROP COLUMN IF EXISTS are_you_safe,
  DROP COLUMN IF EXISTS safety_status,
  DROP COLUMN IF EXISTS safety_status_timestamp;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed safety check fields from user_signup';
  RAISE NOTICE '⚠️ Dropped: are_you_safe, safety_status, safety_status_timestamp';
  RAISE NOTICE '⚠️ Dropped: Indexes and safety check trigger';
  RAISE NOTICE '⚠️ Table returned to previous state';
END $$;

COMMIT;
