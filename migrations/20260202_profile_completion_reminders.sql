-- Migration: Profile Completion Reminders Table
-- Date: 2026-02-02
-- Description: Track reminder emails sent to users about incomplete profiles

-- Create profile_completion_reminders table
CREATE TABLE IF NOT EXISTS profile_completion_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES user_signup(create_user_id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL, -- 'initial', 'followup', 'final'
    missing_items TEXT[] NOT NULL, -- Array of missing document types
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Indexes
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES user_signup(create_user_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_reminders_user_id
    ON profile_completion_reminders(user_id);

CREATE INDEX IF NOT EXISTS idx_profile_reminders_sent_at
    ON profile_completion_reminders(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_reminders_reminder_type
    ON profile_completion_reminders(reminder_type);

-- Add comment
COMMENT ON TABLE profile_completion_reminders IS 'Tracks reminder emails sent to users about incomplete profile items (photos, documents)';
COMMENT ON COLUMN profile_completion_reminders.reminder_type IS 'Type of reminder: initial (2 days), followup (7 days), or final (14 days)';
COMMENT ON COLUMN profile_completion_reminders.missing_items IS 'Array of document_type values that were missing when reminder was sent';

-- Enable RLS
ALTER TABLE profile_completion_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own reminders
CREATE POLICY profile_reminders_select_own
    ON profile_completion_reminders
    FOR SELECT
    USING (user_id = CAST(auth.uid() AS TEXT));

-- RLS Policy: Service role can insert/update/delete (for background jobs)
-- Note: No policy needed for service role as it bypasses RLS

-- Grant permissions
GRANT SELECT ON profile_completion_reminders TO authenticated;
GRANT ALL ON profile_completion_reminders TO service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Profile completion reminders table created successfully';
END $$;
