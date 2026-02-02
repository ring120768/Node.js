-- Rollback Migration: Profile Completion Reminders Table
-- Date: 2026-02-02
-- Description: Remove profile_completion_reminders table

-- Drop RLS policies
DROP POLICY IF EXISTS profile_reminders_select_own ON profile_completion_reminders;

-- Drop indexes
DROP INDEX IF EXISTS idx_profile_reminders_user_id;
DROP INDEX IF EXISTS idx_profile_reminders_sent_at;
DROP INDEX IF EXISTS idx_profile_reminders_reminder_type;

-- Drop table
DROP TABLE IF EXISTS profile_completion_reminders CASCADE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Profile completion reminders table rolled back successfully';
END $$;
