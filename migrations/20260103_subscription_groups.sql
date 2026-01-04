-- =============================================================================
-- SUBSCRIPTION GROUPS MIGRATION
-- Supports: Family (4), Business 10/25/50/75/100
-- =============================================================================
-- NOTE: user_signup.create_user_id is TEXT (not UUID) in this codebase
-- All user ID references must use TEXT type to match
-- =============================================================================

-- 1. Subscription Groups Table
-- Stores family and business group information
CREATE TABLE IF NOT EXISTS subscription_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Group details
  name TEXT NOT NULL DEFAULT 'My Group',
  type TEXT NOT NULL CHECK (type IN ('family', 'business')),

  -- Member limits based on plan
  max_members INT NOT NULL DEFAULT 4,

  -- Admin (the person who pays) - TEXT to match user_signup.create_user_id
  admin_user_id TEXT NOT NULL,

  -- Stripe subscription tracking
  stripe_subscription_id TEXT,
  subscription_tier TEXT NOT NULL,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'expired')),

  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Foreign key constraint to user_signup
  CONSTRAINT fk_subscription_groups_admin
    FOREIGN KEY (admin_user_id)
    REFERENCES public.user_signup(create_user_id)
    ON DELETE CASCADE
);

-- 2. Group Invitations Table
-- Tracks pending invites to join a group
CREATE TABLE IF NOT EXISTS group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which group
  group_id UUID NOT NULL REFERENCES subscription_groups(id) ON DELETE CASCADE,

  -- Invitation details
  email TEXT NOT NULL,
  invited_by TEXT NOT NULL,  -- TEXT to match user_signup.create_user_id

  -- Invitation token (for secure acceptance)
  token UUID DEFAULT gen_random_uuid(),

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),

  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  -- Prevent duplicate pending invites
  UNIQUE(group_id, email, status),

  -- Foreign key constraint to user_signup for invited_by
  CONSTRAINT fk_group_invitations_invited_by
    FOREIGN KEY (invited_by)
    REFERENCES public.user_signup(create_user_id)
    ON DELETE CASCADE
);

-- 3. Add group columns to user_signup
-- Links users to their subscription group
ALTER TABLE user_signup ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES subscription_groups(id);
ALTER TABLE user_signup ADD COLUMN IF NOT EXISTS group_role TEXT CHECK (group_role IN ('admin', 'member'));
ALTER TABLE user_signup ADD COLUMN IF NOT EXISTS group_joined_at TIMESTAMPTZ;

-- Also add the Stripe columns if not already present
ALTER TABLE user_signup ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE user_signup ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE user_signup ADD COLUMN IF NOT EXISTS subscription_tier TEXT;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_groups_admin ON subscription_groups(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_groups_stripe_sub ON subscription_groups(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_groups_status ON subscription_groups(subscription_status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_email ON group_invitations(email);
CREATE INDEX IF NOT EXISTS idx_group_invitations_token ON group_invitations(token);
CREATE INDEX IF NOT EXISTS idx_group_invitations_pending ON group_invitations(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_user_signup_group ON user_signup(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_signup_stripe_customer ON user_signup(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- 5. Helper function to count group members
CREATE OR REPLACE FUNCTION count_group_members(p_group_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM user_signup
  WHERE group_id = p_group_id
    AND deleted_at IS NULL;
$$ LANGUAGE SQL STABLE;

-- 6. Helper function to check if group has space
CREATE OR REPLACE FUNCTION group_has_space(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT count_group_members(p_group_id) < (
    SELECT max_members FROM subscription_groups WHERE id = p_group_id
  );
$$ LANGUAGE SQL STABLE;

-- 7. Trigger to update subscription_groups.updated_at
CREATE OR REPLACE FUNCTION update_subscription_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscription_groups_updated ON subscription_groups;
CREATE TRIGGER trigger_subscription_groups_updated
  BEFORE UPDATE ON subscription_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_groups_timestamp();

-- 8. Comments for documentation
COMMENT ON TABLE subscription_groups IS 'Family and business subscription groups with member management';
COMMENT ON TABLE group_invitations IS 'Pending invitations to join subscription groups';
COMMENT ON COLUMN subscription_groups.type IS 'Group type: family (4 members) or business (10-100 members)';
COMMENT ON COLUMN subscription_groups.max_members IS 'Maximum members allowed: 4 (family), 10/25/50/100 (business)';
COMMENT ON COLUMN user_signup.group_role IS 'Role in group: admin (payer) or member (invited)';
