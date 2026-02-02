-- Migration: Profile Edit Audit Trail
-- Date: 2026-02-02
-- Description: GDPR-compliant audit logging for profile changes

-- Create profile_edit_audit table
CREATE TABLE IF NOT EXISTS profile_edit_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES user_signup(create_user_id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Indexes
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES user_signup(create_user_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_audit_user_id
    ON profile_edit_audit(user_id);

CREATE INDEX IF NOT EXISTS idx_profile_audit_changed_at
    ON profile_edit_audit(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_audit_field_name
    ON profile_edit_audit(field_name);

-- Add comment
COMMENT ON TABLE profile_edit_audit IS 'GDPR-compliant audit trail for profile changes';
COMMENT ON COLUMN profile_edit_audit.field_name IS 'Name of the field that was changed (e.g., address_line1, mobile_number)';
COMMENT ON COLUMN profile_edit_audit.old_value IS 'Previous value before change';
COMMENT ON COLUMN profile_edit_audit.new_value IS 'New value after change';

-- Enable RLS
ALTER TABLE profile_edit_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own audit logs
CREATE POLICY profile_audit_select_own
    ON profile_edit_audit
    FOR SELECT
    USING (user_id = CAST(auth.uid() AS TEXT));

-- RLS Policy: Service role can insert (for backend logging)
-- Note: No policy needed for service role as it bypasses RLS

-- Grant permissions
GRANT SELECT ON profile_edit_audit TO authenticated;
GRANT ALL ON profile_edit_audit TO service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Profile edit audit table created successfully';
END $$;
