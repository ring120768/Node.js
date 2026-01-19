-- Track user permissions for app functionality
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Permission states: 'granted', 'denied', 'prompt', 'not-requested'
  camera_permission VARCHAR(20) DEFAULT 'not-requested',
  microphone_permission VARCHAR(20) DEFAULT 'not-requested',
  location_permission VARCHAR(20) DEFAULT 'not-requested',

  -- Timestamps for audit trail
  camera_granted_at TIMESTAMPTZ,
  camera_denied_at TIMESTAMPTZ,
  camera_last_requested_at TIMESTAMPTZ,

  microphone_granted_at TIMESTAMPTZ,
  microphone_denied_at TIMESTAMPTZ,
  microphone_last_requested_at TIMESTAMPTZ,

  location_granted_at TIMESTAMPTZ,
  location_denied_at TIMESTAMPTZ,
  location_last_requested_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id)
);

-- Index for fast user lookups
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);

-- RLS Policies
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own permissions
CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own permissions
CREATE POLICY "Users can update own permissions"
  ON user_permissions FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create permissions record on user signup
CREATE POLICY "Users can insert own permissions"
  ON user_permissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_permissions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_permissions_timestamp
  BEFORE UPDATE ON user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_permissions_timestamp();
