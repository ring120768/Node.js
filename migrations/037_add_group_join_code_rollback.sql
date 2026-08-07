-- 037_add_group_join_code_rollback.sql
--
-- Reverses 037. Safe to run repeatedly.
--
-- WARNING: dropping join_code discards every group's current code. Members
-- already linked via group_id are unaffected - they stay in their group - but
-- anyone holding an un-redeemed code will no longer be able to join, and
-- re-running the forward migration issues fresh codes.

BEGIN;

DROP INDEX IF EXISTS subscription_groups_join_code_lookup;
DROP INDEX IF EXISTS subscription_groups_join_code_key;

ALTER TABLE subscription_groups
  DROP COLUMN IF EXISTS join_code_updated_at;

ALTER TABLE subscription_groups
  DROP COLUMN IF EXISTS join_code;

COMMIT;
