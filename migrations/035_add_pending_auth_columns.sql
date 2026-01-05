-- Migration 035: Add pending auth columns for signup flow v2
-- This migration adds columns needed to store user credentials temporarily
-- until payment is completed and an auth account can be created.
--
-- Part of the "auth after payment" feature (SIGNUP_FLOW_V2)
-- See: .claude/plans/dapper-riding-blanket.md

-- Add pending_password column for encrypted password storage
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS pending_password TEXT;

-- Add auth_pending flag to track signups awaiting payment
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS auth_pending BOOLEAN DEFAULT false;

-- Index for efficiently finding pending signups (for cleanup job)
CREATE INDEX IF NOT EXISTS idx_user_signup_auth_pending
ON user_signup (auth_pending) WHERE auth_pending = true;

-- Add comments for documentation
COMMENT ON COLUMN user_signup.pending_password IS 'Encrypted password stored until payment completes and auth account is created. Cleared immediately after auth creation.';
COMMENT ON COLUMN user_signup.auth_pending IS 'True if signup form completed but auth account not yet created (awaiting Stripe payment)';

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 035: Added pending_password and auth_pending columns to user_signup';
END $$;
