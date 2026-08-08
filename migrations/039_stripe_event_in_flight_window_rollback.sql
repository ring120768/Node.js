-- 039_stripe_event_in_flight_window_rollback.sql
--
-- Restores the 038 claim function and drops claimed_at.
--
-- After this, a second delivery arriving while the first is still running gets
-- 'processing' again and BOTH run. The controller's in_flight/409 branch simply
-- never fires, so nothing breaks - you just lose concurrent-double-run
-- protection. Roll the controller back too if that matters.

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
        status = CASE
                   WHEN stripe_webhook_events.status IN ('succeeded', 'ignored')
                     THEN stripe_webhook_events.status
                   ELSE 'processing'
                 END
  RETURNING status, attempts;
$$;

ALTER TABLE stripe_webhook_events DROP COLUMN IF EXISTS claimed_at;
