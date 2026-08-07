-- 038_stripe_webhook_events_rollback.sql
--
-- Reverses 038_stripe_webhook_events.sql.
--
-- WARNING: this destroys the webhook audit trail. If the ledger is dropped while
-- the controller still expects it, every event insert fails - and the handler
-- treats a ledger failure as fail-open (process the event, do not block payment
-- processing on bookkeeping), so you lose idempotency, not payments. Roll the
-- controller back first if you are reverting deliberately.

DROP FUNCTION IF EXISTS claim_stripe_event(TEXT, TEXT, BOOLEAN);
DROP INDEX IF EXISTS idx_stripe_webhook_events_received;
DROP INDEX IF EXISTS idx_stripe_webhook_events_status;
DROP TABLE IF EXISTS stripe_webhook_events;
