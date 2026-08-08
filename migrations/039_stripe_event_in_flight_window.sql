-- 039_stripe_event_in_flight_window.sql
--
-- Closes a concurrency hole in claim_stripe_event (migration 038).
--
-- The 038 claim returned 'processing' to a second delivery that arrived while
-- the first was still running, so BOTH executed. It guaranteed a single ledger
-- row and a correct attempts count; it did NOT prevent a concurrent double-run.
-- Two deliveries of one checkout.session.completed would create two groups for
-- one payment.
--
-- 'in_flight' is a DECISION, never a stored status. The controller answers 409;
-- Stripe retries later and finds 'succeeded'. A handler that died mid-flight
-- leaves status='processing' with an old claimed_at, so after five minutes the
-- next delivery reclaims it and crash recovery still works.

ALTER TABLE stripe_webhook_events
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN stripe_webhook_events.claimed_at IS
  'When the most recent attempt claimed this event. Distinct from received_at (first delivery) because the staleness window must measure from the LAST claim, or a repeatedly-crashing handler stops being protected after five minutes.';

CREATE OR REPLACE FUNCTION claim_stripe_event(
  p_event_id TEXT,
  p_type     TEXT,
  p_livemode BOOLEAN
)
RETURNS TABLE (out_status TEXT, out_attempts INT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev_status  TEXT;
  v_prev_claimed TIMESTAMPTZ;
  v_attempts     INT;
  v_inserted     BOOLEAN;
BEGIN
  -- On conflict this takes a row lock, so two concurrent deliveries of the same
  -- event serialise here rather than both reading "not done". RETURNING gives
  -- the PRE-EXISTING status and claimed_at, because the SET does not touch them.
  INSERT INTO stripe_webhook_events (event_id, type, livemode, status, claimed_at)
  VALUES (p_event_id, p_type, p_livemode, 'processing', NOW())
  ON CONFLICT (event_id) DO UPDATE
    SET attempts = stripe_webhook_events.attempts + 1
  RETURNING status, claimed_at, attempts, (xmax = 0)
  INTO v_prev_status, v_prev_claimed, v_attempts, v_inserted;

  IF v_inserted THEN
    RETURN QUERY SELECT 'processing'::TEXT, v_attempts;

  ELSIF v_prev_status IN ('succeeded', 'ignored') THEN
    -- Terminal. Duplicate delivery, the work is already done.
    RETURN QUERY SELECT v_prev_status, v_attempts;

  ELSIF v_prev_status = 'processing'
        AND v_prev_claimed > NOW() - INTERVAL '5 minutes' THEN
    -- Another delivery is running it right now.
    RETURN QUERY SELECT 'in_flight'::TEXT, v_attempts;

  ELSE
    -- Previously failed, or a stale 'processing' left by a handler that died.
    UPDATE stripe_webhook_events
       SET status = 'processing', claimed_at = NOW()
     WHERE event_id = p_event_id;
    RETURN QUERY SELECT 'processing'::TEXT, v_attempts;
  END IF;
END;
$$;

-- Verified against the live database before the controller depended on it:
--   A. first delivery                          -> processing  (attempts 1)
--   B. concurrent delivery, first still running -> in_flight   (attempts 2)
--   C. stale processing, handler died           -> processing  (attempts 3)
--   D. failed                                   -> processing  (attempts 4)
--   E. succeeded                                -> succeeded   (attempts 5)
--   F. status actually stored                   -> succeeded   ('in_flight' never persisted)
