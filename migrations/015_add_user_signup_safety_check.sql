-- Migration: Add Safety Check Fields to user_signup Table
-- Date: 2025-11-06
-- Purpose: Add are_you_safe boolean field with supporting fields and validation trigger
-- Source: Emergency/Safety check workflow

BEGIN;

-- ========================================
-- STEP 1: Add are_you_safe boolean field
-- ========================================

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS are_you_safe BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN user_signup.are_you_safe IS
'Boolean indicator: TRUE if user was safe to complete incident report (selected option 1 or 2), FALSE if user needed assistance (options 3-6), NULL if safety check not completed';

-- ========================================
-- STEP 2: Add supporting fields
-- ========================================

-- Safety status text (detailed audit trail)
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_status TEXT;

COMMENT ON COLUMN user_signup.safety_status IS
'Full text of safety status selected: "Yes, I''m safe and can complete this form", "The Emergency services have been called", "Call Emergency contact", "I''m injured and need medical attention", "I''m in danger and need immediate help", "I''m not sure about my safety"';

-- Safety status timestamp
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS safety_status_timestamp TIMESTAMPTZ;

COMMENT ON COLUMN user_signup.safety_status_timestamp IS
'Timestamp when safety status was assessed (ISO 8601 format)';

-- ========================================
-- STEP 3: Create indexes for performance
-- ========================================

-- General index for filtering by safety status
CREATE INDEX IF NOT EXISTS idx_user_signup_are_you_safe
ON user_signup(are_you_safe)
WHERE are_you_safe IS NOT NULL;

-- Partial index for users who were safe to proceed (most common query)
CREATE INDEX IF NOT EXISTS idx_user_signup_safe_to_proceed
ON user_signup(are_you_safe, created_at)
WHERE are_you_safe = TRUE;

-- ========================================
-- STEP 4: Backfill existing records
-- ========================================

-- Backfill are_you_safe for existing records based on safety_status
UPDATE user_signup
SET are_you_safe = (
  CASE
    WHEN safety_status IN (
      'Yes, I''m safe and can complete this form',
      'The Emergency services have been called'
    ) THEN TRUE
    WHEN safety_status IN (
      'Call Emergency contact',
      'I''m injured and need medical attention',
      'I''m in danger and need immediate help',
      'I''m not sure about my safety'
    ) THEN FALSE
    ELSE NULL
  END
)
WHERE safety_status IS NOT NULL
  AND are_you_safe IS NULL;

-- ========================================
-- STEP 5: Create safety check trigger for incident_reports
-- ========================================

-- Function to check user safety before allowing incident report
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
    RAISE EXCEPTION 'User must complete safety check and be marked as safe before submitting incident report';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to incident_reports table
DROP TRIGGER IF EXISTS trigger_check_safety_before_report ON incident_reports;

CREATE TRIGGER trigger_check_safety_before_report
BEFORE INSERT ON incident_reports
FOR EACH ROW
EXECUTE FUNCTION check_user_safety_before_report();

COMMENT ON FUNCTION check_user_safety_before_report() IS
'Validates that user has completed safety check and is marked as safe (are_you_safe = TRUE) before allowing incident report submission';

-- ========================================
-- STEP 6: Log completion
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 015 complete: are_you_safe boolean field added';
  RAISE NOTICE '📊 Fields added: are_you_safe (BOOLEAN), safety_status (TEXT), safety_status_timestamp (TIMESTAMPTZ)';
  RAISE NOTICE '🗂️  Indexes created: idx_user_signup_are_you_safe, idx_user_signup_safe_to_proceed';
  RAISE NOTICE '⚙️  Trigger created: trigger_check_safety_before_report (validates safety before incident submission)';
  RAISE NOTICE '🔄 Backfill: Existing safety_status records migrated to are_you_safe boolean';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Business Logic:';
  RAISE NOTICE '  ✅ TRUE  = Safe to proceed (options 1-2)';
  RAISE NOTICE '  ❌ FALSE = Needs assistance (options 3-6)';
  RAISE NOTICE '  ⚪ NULL  = Safety check not completed';
END $$;

COMMIT;
