-- 038_stripe_webhook_events.sql
--
-- An event ledger for the Stripe webhook: idempotency key, retry counter and
-- audit trail in one table.
--
-- WHY
-- Three production bugs in one week (block-scoped ReferenceError, a column name
-- that does not exist, and RangeError from NaN date maths) all threw, were all
-- caught by the webhook's try/catch, and all returned HTTP 200. Stripe recorded
-- successful delivery, never retried, and nothing alerted. They were invisible
-- until someone read the database directly.
--
-- The fix is to return 500 so Stripe retries. But a retry re-runs the handler,
-- and nothing today stops a re-delivered event writing a second member row or
-- sending a second email. This table has to exist BEFORE the 500s do, or a
-- silent-failure bug becomes a duplicate-data bug.
--
-- event_id is Stripe's evt_... and is the primary key: the insert itself is the
-- idempotency check, so two concurrent deliveries of the same event cannot both
-- win. Postgres decides, not application logic.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id     TEXT PRIMARY KEY,
  type         TEXT        NOT NULL,
  -- processing | succeeded | failed | ignored
  --   processing - claimed, handler running (or died mid-flight)
  --   succeeded  - handler completed; further deliveries are no-ops
  --   ignored    - an event type we deliberately do not handle; also a no-op.
  --                Distinct from succeeded so "we did nothing on purpose" never
  --                reads as "we did the work".
  --   failed     - handler threw; we returned 500 and Stripe will retry
  status       TEXT        NOT NULL DEFAULT 'processing',
  attempts     INT         NOT NULL DEFAULT 1,
  livemode     BOOLEAN,
  last_error   TEXT,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- "What is broken right now?" is the only question this table gets asked in
-- anger, and it must stay fast while the succeeded rows accumulate forever.
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
  ON stripe_webhook_events (status, received_at DESC);

-- Supports the retention sweep and "what arrived this morning?"
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received
  ON stripe_webhook_events (received_at DESC);

-- Service role only. The webhook runs with the service key and bypasses RLS;
-- enabling RLS with no permissive policy means the anon key cannot read the
-- ledger, which carries Stripe event ids and error strings.
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE stripe_webhook_events IS
  'Stripe webhook idempotency ledger and audit trail. Insert-on-receipt; a conflict with status succeeded/ignored means duplicate delivery -> no-op 200.';
COMMENT ON COLUMN stripe_webhook_events.attempts IS
  'Total deliveries seen for this event id, including duplicates that were no-ops.';
COMMENT ON COLUMN stripe_webhook_events.last_error IS
  'Error message from the most recent failed attempt. Populated only when status = failed.';

-- ---------------------------------------------------------------------------
-- Claim a Stripe event for processing, atomically.
--
-- Returns the row as it stands AFTER the claim. The caller decides from
-- out_status:
--   'processing'            -> this delivery owns the work, run the handler
--   'succeeded' / 'ignored' -> already done, duplicate delivery, no-op
--
-- Done as ONE statement on purpose. A read-then-write claim lets two concurrent
-- deliveries of the same event both see "not done" and both run the handler,
-- which is precisely the duplicate write the ledger exists to prevent. Postgres
-- arbitrates via the primary key instead.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_stripe_event(
  p_event_id TEXT,
  p_type     TEXT,
  p_livemode BOOLEAN
)
RETURNS TABLE (out_status TEXT, out_attempts INT)
LANGUAGE sql
AS $$
  INSERT INTO stripe_webhook_events (event_id, type, livemode, status)
  VALUES (p_event_id, p_type, p_livemode, 'processing')
  ON CONFLICT (event_id) DO UPDATE
    SET attempts = stripe_webhook_events.attempts + 1,
        -- A terminal status is never reopened: that is what makes a duplicate
        -- delivery a no-op. Anything else (processing, failed) is reclaimed so
        -- a Stripe retry, or a delivery that died mid-flight, can run again.
        status = CASE
                   WHEN stripe_webhook_events.status IN ('succeeded', 'ignored')
                     THEN stripe_webhook_events.status
                   ELSE 'processing'
                 END
  RETURNING status, attempts;
$$;
