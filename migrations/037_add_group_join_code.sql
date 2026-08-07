-- 037_add_group_join_code.sql
--
-- Adds a shareable join code to subscription_groups, replacing per-person email
-- invitation tokens as the way members join a family or business plan.
--
-- Format: FAM-XXXXXX / BIZ-XXXXXX, where X comes from an unambiguous alphabet
-- (no O/0, I/1/L, U/V) so a code can be read aloud or copied off a screen
-- without transcription errors.
--
-- group_invitations is intentionally left in place and untouched: it becomes an
-- optional audit log. Nothing here depends on it.

BEGIN;

ALTER TABLE subscription_groups
  ADD COLUMN IF NOT EXISTS join_code TEXT;

-- Unique across all groups, but only where set - so existing rows (there are
-- none today) and any future null stay legal.
CREATE UNIQUE INDEX IF NOT EXISTS subscription_groups_join_code_key
  ON subscription_groups (join_code)
  WHERE join_code IS NOT NULL;

-- Lookups are always by exact code, and the code is stored upper-case.
CREATE INDEX IF NOT EXISTS subscription_groups_join_code_lookup
  ON subscription_groups (join_code)
  WHERE join_code IS NOT NULL;

COMMENT ON COLUMN subscription_groups.join_code IS
  'Shareable code (FAM-XXXXXX / BIZ-XXXXXX) used to join this group. Server-generated, unique, regenerable by the group admin without affecting existing members.';

-- Track regeneration so an admin can see when the code last changed, and so a
-- support query can distinguish "never had one" from "rotated recently".
ALTER TABLE subscription_groups
  ADD COLUMN IF NOT EXISTS join_code_updated_at TIMESTAMPTZ;

COMMIT;
