-- ============================================================================
-- Migration: Add Missing Special Conditions Columns to incident_reports Table
-- ============================================================================
-- Purpose: Fix PGRST204 error caused by missing special_conditions_animals column
-- Error: "Could not find the 'special_conditions_animals' column of 'incident_reports' in the schema cache"
--
-- Root Cause: Webhook controller code (webhook.controller.js line 889) references
--             special_conditions_animals field but it was never added to database
--
-- Date: 2025-10-26
-- Tested: ✓ Verified all columns exist in webhook controller code
-- Status: CRITICAL - Blocks production incident report submissions
-- ============================================================================

-- Step 1: Add missing special_conditions_animals column
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS special_conditions_animals BOOLEAN DEFAULT false;

-- Step 2: Add comment to document the field
COMMENT ON COLUMN incident_reports.special_conditions_animals IS 'Special road condition: Animals on or near road (checkbox from Typeform incident report)';

-- Step 3: Verify existing special_conditions columns (should already exist)
-- These are already documented in TYPEFORM_SUPABASE_FIELD_MAPPING.md:
-- - special_conditions_roadworks
-- - special_conditions_defective_road
-- - special_conditions_oil_spills
-- - special_conditions_workman

-- ============================================================================
-- OPTIONAL: Add account_status column to user_signup table
-- ============================================================================
-- This column is referenced in webhook controller but non-critical
-- (causes warning but doesn't fail the webhook processing)
-- ============================================================================

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';

COMMENT ON COLUMN user_signup.account_status IS 'User account status: active, suspended, deleted, etc.';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify special_conditions columns in incident_reports
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'incident_reports'
  AND column_name LIKE 'special_conditions_%'
ORDER BY column_name;

-- Expected output:
-- ┌─────────────────────────────────┬───────────┬─────────────┬────────────────┐
-- │ column_name                      │ data_type │ is_nullable │ column_default │
-- ├─────────────────────────────────┼───────────┼─────────────┼────────────────┤
-- │ special_conditions_animals       │ boolean   │ YES         │ false          │
-- │ special_conditions_defective_road│ boolean   │ YES         │ false          │
-- │ special_conditions_oil_spills    │ boolean   │ YES         │ false          │
-- │ special_conditions_roadworks     │ boolean   │ YES         │ false          │
-- │ special_conditions_workman       │ boolean   │ YES         │ false          │
-- └─────────────────────────────────┴───────────┴─────────────┴────────────────┘

-- Verify account_status column in user_signup
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_signup'
  AND column_name = 'account_status';

-- Expected output:
-- ┌────────────────┬───────────┬─────────────┬────────────────┐
-- │ column_name    │ data_type │ is_nullable │ column_default │
-- ├────────────────┼───────────┼─────────────┼────────────────┤
-- │ account_status │ text      │ YES         │ 'active'       │
-- └────────────────┴───────────┴─────────────┴────────────────┘

-- ============================================================================
-- How to Run This Migration
-- ============================================================================
--
-- 1. Go to Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Navigate to: SQL Editor (left sidebar)
-- 4. Create a new query
-- 5. Copy and paste this entire file
-- 6. Click "Run" button (or press Cmd/Ctrl + Enter)
-- 7. Verify the output shows columns were added successfully
-- 8. Test form submission again
--
-- Expected Success Output:
-- ✅ ALTER TABLE
-- ✅ COMMENT
-- ✅ ALTER TABLE
-- ✅ COMMENT
-- ✅ SELECT (shows 5 special_conditions columns)
-- ✅ SELECT (shows account_status column)
--
-- ============================================================================
-- Post-Migration Checklist
-- ============================================================================
--
-- [ ] Migration executed successfully in Supabase SQL Editor
-- [ ] Verification queries show all expected columns
-- [ ] Update TYPEFORM_SUPABASE_FIELD_MAPPING.md to document special_conditions_animals
-- [ ] Test incident report form submission (should now save successfully)
-- [ ] Check server logs for "✅ Incident report inserted successfully"
-- [ ] Verify data appears in Supabase incident_reports table
-- [ ] Switch from /webhooks/typeform-test to /webhooks/typeform (production endpoint)
-- [ ] Update Typeform webhook URL in dashboard to production endpoint
--
-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
--
-- ALTER TABLE incident_reports DROP COLUMN IF EXISTS special_conditions_animals;
-- ALTER TABLE user_signup DROP COLUMN IF EXISTS account_status;
--
-- WARNING: Only rollback if absolutely necessary. This will delete data.
-- ============================================================================
