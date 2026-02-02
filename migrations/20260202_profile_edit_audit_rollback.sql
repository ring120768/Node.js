-- Rollback Migration: Profile Edit Audit Trail
-- Date: 2026-02-02
-- Description: Remove profile_edit_audit table

-- Drop RLS policies
DROP POLICY IF EXISTS profile_audit_select_own ON profile_edit_audit;

-- Drop indexes
DROP INDEX IF EXISTS idx_profile_audit_user_id;
DROP INDEX IF EXISTS idx_profile_audit_changed_at;
DROP INDEX IF EXISTS idx_profile_audit_field_name;

-- Drop table
DROP TABLE IF EXISTS profile_edit_audit CASCADE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Profile edit audit table rolled back successfully';
END $$;
