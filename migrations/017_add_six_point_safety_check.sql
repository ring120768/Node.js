-- =============================================
-- Migration 017: Add Six Point Safety Check Field to user_signup
-- Created: 2025-11-06
-- Purpose: Track completion of mandatory 6-point safety verification checklist
-- Based on: SIX_POINT_SAFETY_CHECK_DOCUMENTATION.md (simplified)
-- =============================================

BEGIN;

-- ========================================
-- STEP 1: Add six point safety check boolean
-- ========================================

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS six_point_safety_check BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN user_signup.six_point_safety_check IS
'TRUE if user completed all six mandatory safety checks before incident report, FALSE/NULL if not completed. Six checks: 1) Medical status, 2) Location safety, 3) Vehicle safety, 4) Road obstruction, 5) Fire risk, 6) Occupant safety';

-- ========================================
-- STEP 2: Add completion timestamp
-- ========================================

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS six_point_safety_check_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN user_signup.six_point_safety_check_completed_at IS
'ISO 8601 timestamp when all six safety checks were completed';

-- ========================================
-- STEP 3: Create performance index
-- ========================================

-- Index for quick filtering of completed checks
CREATE INDEX IF NOT EXISTS idx_user_signup_six_point_safety_check
ON user_signup(six_point_safety_check)
WHERE six_point_safety_check = TRUE;

-- Composite index for analytics queries (both safety checks)
CREATE INDEX IF NOT EXISTS idx_user_signup_safety_status
ON user_signup(are_you_safe, six_point_safety_check)
WHERE are_you_safe IS NOT NULL AND six_point_safety_check IS NOT NULL;

-- ========================================
-- STEP 4: Log completion
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 017 complete: Six point safety check field added';
  RAISE NOTICE '📊 Fields added: six_point_safety_check (BOOLEAN), six_point_safety_check_completed_at (TIMESTAMPTZ)';
  RAISE NOTICE '🗂️  Indexes created: idx_user_signup_six_point_safety_check, idx_user_signup_safety_status';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Six Point Safety Checks (UI only - not stored individually):';
  RAISE NOTICE '  1. 🏥 Medical Status - Injuries requiring immediate assistance?';
  RAISE NOTICE '  2. 🚗 Location Safety - Safe location or still in carriageway?';
  RAISE NOTICE '  3. ⚠️  Vehicle Safety - Vehicles off, hazards on, high-vis worn?';
  RAISE NOTICE '  4. 🚧 Road Obstruction - Road blocked creating hazard?';
  RAISE NOTICE '  5. 🔥 Fire Risk - Fuel leaks, smoke, or fire signs?';
  RAISE NOTICE '  6. 👥 Occupant Safety - All occupants out and safe?';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Data Flow:';
  RAISE NOTICE '  safety-check.html (are_you_safe = TRUE)';
  RAISE NOTICE '    ↓';
  RAISE NOTICE '  six-point-safety-check.html (user checks all 6 → six_point_safety_check = TRUE)';
  RAISE NOTICE '    ↓';
  RAISE NOTICE '  incident-form-page1.html (begin incident report)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Note: Individual checkbox states stored in sessionStorage only (not database)';
  RAISE NOTICE '💡 Database only records: "Did user complete all 6 checks?" (TRUE/FALSE)';
END $$;

COMMIT;
