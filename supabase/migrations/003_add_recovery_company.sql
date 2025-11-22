-- ========================================
-- Migration 003: Add recovery_company Column
-- ========================================
-- Date: 2025-11-03
-- Purpose: Add missing recovery_company field from signup form
-- ========================================

BEGIN;

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS recovery_company TEXT;

COMMENT ON COLUMN user_signup.recovery_company IS 'Name of recovery/breakdown company (from signup form)';

-- Index for searching by recovery company
CREATE INDEX IF NOT EXISTS idx_user_signup_recovery_company
ON user_signup(recovery_company)
WHERE recovery_company IS NOT NULL;

COMMIT;

-- ========================================
-- VERIFICATION QUERY
-- ========================================
-- Run this after migration to verify column was added:
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'user_signup'
-- AND column_name = 'recovery_company';
--
-- Expected: 1 row showing recovery_company as TEXT
-- ========================================

-- ========================================
-- ROLLBACK (if needed)
-- ========================================
-- To undo this migration:
--
-- BEGIN;
-- DROP INDEX IF EXISTS idx_user_signup_recovery_company;
-- ALTER TABLE user_signup DROP COLUMN IF EXISTS recovery_company;
-- COMMIT;
-- ========================================
