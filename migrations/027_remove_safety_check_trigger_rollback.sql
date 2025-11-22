-- ========================================
-- Migration 027 ROLLBACK: Restore Safety Check Trigger
-- ========================================
-- Purpose: Restore the safety check validation trigger and function
--
-- This rollback recreates:
-- 1. check_user_safety_before_report() function
-- 2. trigger_check_safety_before_report (BEFORE INSERT trigger on incident_reports)
--
-- WARNING: Rolling back this migration will restore the P0001 error enforcement
-- that redirects users to safety-check.html instead of transcription-status.html
-- after completing page 12.
--
-- Created: 2025-11-18
-- Author: Claude Code
-- ========================================

BEGIN;

-- ========================================
-- STEP 1: Recreate the validation function
-- ========================================

CREATE OR REPLACE FUNCTION check_user_safety_before_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user was marked as safe
  IF EXISTS (
    SELECT 1 FROM user_signup
    WHERE create_user_id = NEW.create_user_id
      AND are_you_safe = TRUE
  ) THEN
    RETURN NEW;  -- Allow insert
  ELSE
    -- User must complete safety check first
    RAISE EXCEPTION 'User must complete safety check and be marked as safe before submitting incident report'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_user_safety_before_report() IS
'Validates that user has completed safety check and is marked as safe (are_you_safe = TRUE) before allowing incident report submission';

-- Log function recreation
DO $$
BEGIN
  RAISE NOTICE '✅ Recreated function: check_user_safety_before_report()';
END $$;

-- ========================================
-- STEP 2: Recreate the trigger
-- ========================================

DROP TRIGGER IF EXISTS trigger_check_safety_before_report ON incident_reports;

CREATE TRIGGER trigger_check_safety_before_report
BEFORE INSERT ON incident_reports
FOR EACH ROW
EXECUTE FUNCTION check_user_safety_before_report();

-- Log trigger recreation
DO $$
BEGIN
  RAISE NOTICE '✅ Recreated trigger: trigger_check_safety_before_report on incident_reports';
END $$;

-- ========================================
-- STEP 3: Log rollback completion
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '⚠️  Migration 027 ROLLBACK complete';
  RAISE NOTICE '   Restored: Safety check trigger enforcement';
  RAISE NOTICE '   WARNING: P0001 errors will now be thrown if are_you_safe != TRUE';
  RAISE NOTICE '   Impact: incident_reports INSERT requires are_you_safe = TRUE';
  RAISE NOTICE '============================================';
END $$;

COMMIT;
