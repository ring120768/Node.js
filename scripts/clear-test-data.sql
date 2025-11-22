-- ============================================
-- CLEAR TEST DATA FROM SUPABASE
-- ============================================
-- Run this script to clean up test incident reports
-- while preserving test user accounts
--
-- Test users:
-- - ian.ring@sky.com (9db03736-74ac-4d00-9ae2-3639b58360a3)
-- - page12test@example.com (8d2d2809-bee1-436f-a16b-76edfd8f0792)
--
-- ============================================

BEGIN;

-- Store test user IDs for reference
DO $$
DECLARE
  test_user_1 UUID := '9db03736-74ac-4d00-9ae2-3639b58360a3';  -- ian.ring@sky.com
  test_user_2 UUID := '8d2d2809-bee1-436f-a16b-76edfd8f0792';  -- page12test@example.com
  deleted_count INT;
BEGIN
  RAISE NOTICE '🧹 Starting test data cleanup...';
  RAISE NOTICE '';

  -- ============================================
  -- 1. DELETE INCIDENT REPORTS (CASCADE DELETES)
  -- ============================================
  RAISE NOTICE '📋 Deleting incident reports...';

  DELETE FROM incident_reports
  WHERE create_user_id IN (test_user_1, test_user_2);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Deleted % incident reports', deleted_count;

  -- ============================================
  -- 2. DELETE OTHER VEHICLES
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '🚗 Deleting other vehicles data...';

  DELETE FROM incident_other_vehicles
  WHERE create_user_id IN (test_user_1, test_user_2);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Deleted % other vehicle records', deleted_count;

  -- ============================================
  -- 3. DELETE WITNESSES
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '👥 Deleting witness records...';

  DELETE FROM incident_witnesses
  WHERE create_user_id IN (test_user_1, test_user_2);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Deleted % witness records', deleted_count;

  -- ============================================
  -- 4. DELETE USER DOCUMENTS (IMAGES)
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '📷 Deleting user documents...';

  DELETE FROM user_documents
  WHERE create_user_id IN (test_user_1, test_user_2);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Deleted % document records', deleted_count;

  -- ============================================
  -- 5. DELETE TEMP UPLOADS
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '⏳ Deleting temporary uploads...';

  DELETE FROM temp_uploads
  WHERE user_id IN (test_user_1, test_user_2);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Deleted % temp upload records', deleted_count;

  -- ============================================
  -- 6. DELETE AI TRANSCRIPTIONS
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '🎤 Deleting AI transcriptions...';

  DELETE FROM ai_transcription
  WHERE create_user_id IN (test_user_1, test_user_2);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Deleted % transcription records', deleted_count;

  -- ============================================
  -- 7. DELETE COMPLETED INCIDENT FORMS
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '✅ Deleting completed incident forms...';

  DELETE FROM completed_incident_forms
  WHERE create_user_id IN (test_user_1, test_user_2);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Deleted % completed form records', deleted_count;

  -- ============================================
  -- 8. DELETE TRANSCRIPTION QUEUE
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '📝 Deleting transcription queue items...';

  DELETE FROM transcription_queue
  WHERE create_user_id IN (test_user_1, test_user_2);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Deleted % queue items', deleted_count;

  -- ============================================
  -- 9. DELETE AI SUMMARIES
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '📊 Deleting AI summaries...';

  DELETE FROM ai_summary
  WHERE create_user_id IN (test_user_1, test_user_2);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Deleted % summary records', deleted_count;

  -- ============================================
  -- 10. RESET USER SIGNUP DATA (OPTIONAL)
  -- ============================================
  -- Uncomment if you want to reset user profile data
  -- but keep the accounts active

  /*
  RAISE NOTICE '';
  RAISE NOTICE '👤 Resetting user signup data...';

  UPDATE user_signup
  SET
    -- Reset personal info (keep email)
    name = NULL,
    mobile_number = NULL,
    date_of_birth = NULL,
    address_line_1 = NULL,
    address_line_2 = NULL,
    town = NULL,
    postcode = NULL,

    -- Reset vehicle info
    vehicle_license_plate = NULL,
    vehicle_make = NULL,
    vehicle_model = NULL,
    vehicle_year = NULL,
    vehicle_color = NULL,

    -- Reset insurance info
    insurance_provider = NULL,
    policy_number = NULL,

    -- Reset other fields but keep GDPR consent and safety status
    completed_date = NULL,
    updated_at = NOW()
  WHERE create_user_id IN (test_user_1, test_user_2);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Reset % user profiles', deleted_count;
  */

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Test data cleanup complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Note: User accounts preserved (ian.ring@sky.com, page12test@example.com)';
  RAISE NOTICE '📝 Note: Safety status preserved (are_you_safe = true)';

END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after cleanup to verify:

-- Check remaining records for test users
SELECT 'incident_reports' as table_name, COUNT(*) as count
FROM incident_reports
WHERE create_user_id IN (
  '9db03736-74ac-4d00-9ae2-3639b58360a3',
  '8d2d2809-bee1-436f-a16b-76edfd8f0792'
)
UNION ALL
SELECT 'user_documents', COUNT(*)
FROM user_documents
WHERE create_user_id IN (
  '9db03736-74ac-4d00-9ae2-3639b58360a3',
  '8d2d2809-bee1-436f-a16b-76edfd8f0792'
)
UNION ALL
SELECT 'ai_transcription', COUNT(*)
FROM ai_transcription
WHERE create_user_id IN (
  '9db03736-74ac-4d00-9ae2-3639b58360a3',
  '8d2d2809-bee1-436f-a16b-76edfd8f0792'
);
