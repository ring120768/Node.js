-- ========================================
-- Migration 027: Remove Safety Check Trigger
-- ========================================
-- Purpose: Remove redundant safety check validation from database layer
--
-- Context: Safety checks are completed earlier in the flow (first two transitions
-- from incident.html), so enforcing them again at the database layer is redundant
-- and causes incorrect UI flow (redirecting to safety-check.html instead of
-- transcription-status.html after page 12 submission).
--
-- This migration removes:
-- 1. trigger_check_safety_before_report (BEFORE INSERT trigger on incident_reports)
-- 2. check_user_safety_before_report() function
--
-- Created: 2025-11-18
-- Author: Claude Code
-- Related Issue: Fix incorrect UI flow from page 12 → transcription-status.html
-- ========================================

BEGIN;

-- ========================================
-- STEP 1: Drop the trigger
-- ========================================

DROP TRIGGER IF EXISTS trigger_check_safety_before_report ON incident_reports;

-- Log the trigger removal
DO $$
BEGIN
  RAISE NOTICE '✅ Dropped trigger: trigger_check_safety_before_report on incident_reports';
END $$;

-- ========================================
-- STEP 2: Drop the validation function
-- ========================================

DROP FUNCTION IF EXISTS check_user_safety_before_report();

-- Log the function removal
DO $$
BEGIN
  RAISE NOTICE '✅ Dropped function: check_user_safety_before_report()';
END $$;

-- ========================================
-- STEP 3: Log completion
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Migration 027 complete';
  RAISE NOTICE '   Removed: Safety check trigger enforcement';
  RAISE NOTICE '   Reason: Safety checks already completed earlier in flow';
  RAISE NOTICE '   Impact: incident_reports INSERT no longer requires are_you_safe = TRUE';
  RAISE NOTICE '============================================';
END $$;

COMMIT;
