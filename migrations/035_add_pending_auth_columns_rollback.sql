-- Rollback Migration 035: Remove pending auth columns
-- Only run this if you need to revert the signup flow v2 feature

-- Drop the index first
DROP INDEX IF EXISTS idx_user_signup_auth_pending;

-- Remove the columns
ALTER TABLE user_signup
DROP COLUMN IF EXISTS pending_password;

ALTER TABLE user_signup
DROP COLUMN IF EXISTS auth_pending;

-- Log rollback
DO $$
BEGIN
  RAISE NOTICE 'Rollback 035: Removed pending_password and auth_pending columns from user_signup';
END $$;
