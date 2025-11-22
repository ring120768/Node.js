-- ROLLBACK: Remove Six Point Safety Check Fields from user_signup Table
-- Date: 2025-11-06
-- Purpose: Rollback migration 017 if needed
-- WARNING: Only use if migration needs to be reversed

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_signup_six_point_safety_check;
DROP INDEX IF EXISTS idx_user_signup_safety_status;

-- Drop columns
ALTER TABLE user_signup
  DROP COLUMN IF EXISTS six_point_safety_check,
  DROP COLUMN IF EXISTS six_point_safety_check_completed_at;

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE '⚠️ ROLLBACK complete: Removed six point safety check fields from user_signup';
  RAISE NOTICE '⚠️ Dropped: six_point_safety_check, six_point_safety_check_completed_at';
  RAISE NOTICE '⚠️ Dropped: Indexes idx_user_signup_six_point_safety_check, idx_user_signup_safety_status';
  RAISE NOTICE '⚠️ Table returned to previous state';
END $$;

COMMIT;
