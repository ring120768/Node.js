/**
 * Stripe Controller
 *
 * Handles subscription payments via Stripe Checkout.
 * Used for both web and mobile app payments.
 *
 * Endpoints:
 * - POST /api/stripe/create-checkout - Create Stripe Checkout session
 * - POST /api/stripe/webhook - Handle Stripe webhook events
 * - GET  /api/stripe/subscription/:userId - Get subscription status
 * - POST /api/stripe/portal - Create customer portal session
 */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { decryptPassword } = require('../../lib/encryption');
const { supabaseAdmin } = require('../../lib/supabaseAdmin');

// Feature flag for signup flow v2 (auth after payment)
const isSignupFlowV2 = () => process.env.SIGNUP_FLOW_V2 === 'true';

// Lazy-initialize Stripe to prevent crash when API key is missing
let stripe = null;
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripe;
}

// Initialise Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Price IDs from Stripe Dashboard.
// NOTE: the amount actually charged lives on the Stripe Price object, not here.
// These IDs must point at Prices whose amounts match TIER_NAMES below.
const PRICE_IDS = {
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_REPLACE_WITH_PREMIUM_PRICE_ID',
  family: process.env.STRIPE_PRICE_FAMILY || 'price_REPLACE_WITH_FAMILY_PRICE_ID',
  business_10: process.env.STRIPE_PRICE_BUSINESS_10 || 'price_REPLACE_WITH_BUSINESS_10_PRICE_ID',
  // Enterprise (25+ seats) is quoted manually - no self-serve Price ID.
  // Larger business tiers are kept available for manually arranged subscriptions.
  business_25: process.env.STRIPE_PRICE_BUSINESS_25 || 'price_REPLACE_WITH_BUSINESS_25_PRICE_ID',
  business_50: process.env.STRIPE_PRICE_BUSINESS_50 || 'price_REPLACE_WITH_BUSINESS_50_PRICE_ID',
  business_75: process.env.STRIPE_PRICE_BUSINESS_75 || 'price_REPLACE_WITH_BUSINESS_75_PRICE_ID',
  business_100: process.env.STRIPE_PRICE_BUSINESS_100 || 'price_REPLACE_WITH_BUSINESS_100_PRICE_ID',
};

// Tiers that can still be bought self-serve (drives validation on new checkouts).
// 'standard' is deliberately absent - it is retired and no longer sold.
const PURCHASABLE_TIERS = ['premium', 'family', 'business_10'];

/**
 * Work out which tier a subscription is for.
 *
 * The Stripe Pricing Table does NOT set metadata.tier - only our own
 * create-checkout call does. Every pricing-table purchase therefore wrote
 * subscription_tier = null, which is why all existing rows have a null tier.
 * Derive it from the price ID on the subscription instead, falling back to
 * session metadata for programmatic checkouts.
 *
 * @param {object} subscription - a Stripe Subscription object
 * @param {object} [session] - the Checkout Session, if available
 * @returns {string|null} tier key, or null if it cannot be determined
 */
function resolveTier(subscription, session) {
  const fromMetadata = session?.metadata?.tier || subscription?.metadata?.tier;
  if (fromMetadata && PRICE_IDS[fromMetadata]) return fromMetadata;

  const priceId = subscription?.items?.data?.[0]?.price?.id;
  if (priceId) {
    const match = Object.keys(PRICE_IDS).find((key) => PRICE_IDS[key] === priceId);
    if (match) return match;
    console.warn('[Stripe] Price ID not mapped to any tier:', priceId, '- check STRIPE_PRICE_* env vars');
  }

  return fromMetadata || null;
}

// Subscription statuses that entitle a user to the service.
// 'trialing' MUST be here: the pricing table offers a 7-day free trial, so Stripe
// sends customer.subscription.* with status 'trialing' immediately after checkout,
// which overwrites the 'active' set by checkout.session.completed. Without this,
// every trialing customer looks unsubscribed until their first payment clears.
const ENTITLED_STATUSES = ['active', 'trialing'];

/**
 * Read a subscription period boundary as an ISO string, or null.
 *
 * WHY THIS EXISTS
 * `new Date(undefined * 1000).toISOString()` throws RangeError: Invalid time
 * value. handleSubscriptionDeleted built its cascade argument that way, inline,
 * so when current_period_end was absent the throw happened BEFORE the cascade
 * call, was caught by the surrounding try/catch, and logged as "failed to update
 * group status". Three live cancellations updated the user rows and left every
 * group active.
 *
 * It can legitimately be absent: Stripe moved current_period_start/end off the
 * Subscription and onto its items in 2025-03-31.basil. Webhook payloads are
 * rendered in the ENDPOINT's API version, not the SDK's pinned apiVersion, so a
 * subscription fetched via stripe.subscriptions.retrieve() can carry the field
 * while the very same subscription arriving as an event does not.
 *
 * Falls back to the item, then gives up quietly - a missing date is a missing
 * date, not a reason to abandon the status write that matters far more.
 */
function periodDate(subscription, field) {
  const seconds = subscription?.[field] ?? subscription?.items?.data?.[0]?.[field];
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000);
}

function periodDateISO(subscription, field) {
  const date = periodDate(subscription, field);
  return date ? date.toISOString() : null;
}

/**
 * Read the subscription id off an invoice, or null.
 *
 * Same trap as periodDate, same shape of fix. Stripe removed top-level
 * `invoice.subscription` in the 2025 API versions and moved it under
 * `parent.subscription_details`. This endpoint renders in a 2025 version - that
 * is why current_period_end came back undefined and threw the RangeError fixed
 * in d0bccce - so `invoice.subscription` is undefined here today.
 *
 * Unfixed, a renewal payment succeeds while subscriptions.retrieve(undefined)
 * is called and stripe_subscription_id is matched against undefined: the
 * customer keeps being billed and loses access on their old end date. It has
 * never fired only because nothing has renewed yet - every row is a trial
 * started 7 Aug or a lifetime comp.
 *
 * Top-level first so it keeps working if the endpoint is ever pinned back.
 */
function invoiceSubscriptionId(invoice) {
  return invoice?.subscription
      || invoice?.parent?.subscription_details?.subscription
      || null;
}

/**
 * Find the user who owns a subscription.
 *
 * The empty/failed distinction is the entire point of this function, so it is
 * made once here rather than implied at four call sites:
 *
 *   throws  -> the QUERY failed. Becomes a 500, Stripe retries, the ledger
 *              records why. This is the case that bug #2 of the silent-200
 *              trilogy hid: a bad column name returned an error that the code
 *              read as "user not found" and carried on from.
 *   null    -> the query succeeded and nobody owns this subscription. Normal,
 *              not an error - test-mode events legitimately reference ids that
 *              do not exist in this database. Caller logs and returns; the
 *              ledger records 'succeeded'.
 */
async function findUserBySubscriptionId(subscriptionId, columns = 'create_user_id') {
  if (!subscriptionId) return null;

  const { data, error } = await supabase
    .from('user_signup')
    .select(columns)
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (error) {
    throw new Error(`user lookup failed for ${subscriptionId}: ${error.message}`);
  }

  return data || null;
}

// Tier display names and pricing.
// 'standard' is retired but MUST stay here: existing subscribers still carry
// subscription_tier = 'standard' in the database and are looked up by it.
const TIER_NAMES = {
  standard: 'Standard (legacy - no longer sold)',
  premium: 'Premium (£11.99/year)',
  family: 'Family (£35/year - up to 4 members)',
  business_10: 'Company (£80/year - up to 10 members)',
  business_25: 'Enterprise (up to 25 members - priced on request)',
  business_50: 'Enterprise (up to 50 members - priced on request)',
  business_75: 'Enterprise (up to 75 members - priced on request)',
  business_100: 'Enterprise (up to 100 members - priced on request)',
};

// Import groups controller for group creation
const groupsController = require('./groups.controller');

/**
 * Create Stripe Checkout Session
 * POST /api/stripe/create-checkout
 *
 * Body: { tier, userId, successUrl, cancelUrl }
 */
async function createCheckoutSession(req, res) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    console.error('[Stripe] STRIPE_SECRET_KEY not configured');
    return res.status(503).json({ error: 'Payment service temporarily unavailable' });
  }

  const { tier, userId, successUrl, cancelUrl } = req.body;

  // Validate tier. Retired tiers (e.g. 'standard') are rejected for NEW checkouts
  // but remain valid everywhere else so existing subscribers keep working.
  if (!PRICE_IDS[tier] || !PURCHASABLE_TIERS.includes(tier)) {
    return res.status(400).json({
      error: 'Invalid subscription tier',
      validTiers: PURCHASABLE_TIERS,
    });
  }

  // Validate userId
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Get user details from database
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('email, name, stripe_customer_id')
      .eq('create_user_id', userId)
      .single();

    if (userError || !user) {
      console.error('[Stripe] User not found:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      console.log('[Stripe] Creating new customer for:', user.email);

      const customer = await stripeClient.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: userId,
          source: 'car-crash-lawyer-ai',
        },
      });

      customerId = customer.id;

      // Save customer ID to database
      await supabase
        .from('user_signup')
        .update({ stripe_customer_id: customerId })
        .eq('create_user_id', userId);

      console.log('[Stripe] Customer created:', customerId);
    }

    // Check if user already has an active subscription
    const { data: existingUser } = await supabase
      .from('user_signup')
      .select('subscription_status, subscription_tier')
      .eq('create_user_id', userId)
      .single();

    if (existingUser?.subscription_status === 'active') {
      // Redirect to portal for upgrades/downgrades instead
      console.log('[Stripe] User already subscribed, creating portal session');
      const portalSession = await stripeClient.billingPortal.sessions.create({
        customer: customerId,
        return_url: successUrl || `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/dashboard.html`,
      });

      return res.json({
        checkoutUrl: portalSession.url,
        isPortal: true,
        message: 'You already have an active subscription. Redirecting to manage it.',
      });
    }

    // Build success URL with session ID
    const finalSuccessUrl = successUrl
      ? `${successUrl}?session_id={CHECKOUT_SESSION_ID}`
      : `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`;

    const finalCancelUrl = cancelUrl
      || `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/subscribe.html`;

    // Create Checkout Session
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[tier],
          quantity: 1,
        },
      ],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        userId: userId,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          tier: tier,
        },
      },
      // UK-specific options
      locale: 'en-GB',
      currency: 'gbp',
      // Allow promotion codes
      allow_promotion_codes: true,
      // Billing address collection
      billing_address_collection: 'auto',
      // Customer update settings
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    console.log('[Stripe] Checkout session created:', session.id, 'for tier:', tier);

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('[Stripe] Create checkout error:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
    });
  }
}

/**
 * Handle Stripe Webhooks
 * POST /api/stripe/webhook
 *
 * IMPORTANT: This endpoint needs raw body parsing for signature verification
 */
async function handleWebhook(req, res) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    console.error('[Stripe] STRIPE_SECRET_KEY not configured');
    return res.status(503).json({ error: 'Payment service temporarily unavailable' });
  }

  const sig = req.headers['stripe-signature'];

  // Single account: acct_1Rg9mWGDFfktozQP. The old account's subscriptions are
  // being retired and its former users hold lifetime premium in the database, so
  // there is no second secret to fall back to.
  //
  // STRIPE_WEBHOOK_SECRET_TEST is optional and exists so test-mode events can
  // reach this endpoint at all. Stripe signs test and live events with
  // different secrets, so without a second secret the only way to exercise the
  // retry path is to break production on purpose - twice, once to fail and once
  // to recover. Absent, behaviour is exactly as before.
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_TEST,
  ].filter(Boolean);

  if (!secrets.length) {
    console.error('[Stripe] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  let lastSigError;

  // Stripe expects the exact bytes it signed, so prefer the raw Buffer captured
  // by the express.json() verify hook in app.js.
  const rawBody = req.rawBodyBuffer || req.rawBody || req.body;

  for (const secret of secrets) {
    try {
      event = stripeClient.webhooks.constructEvent(rawBody, sig, secret);
      break;
    } catch (err) {
      lastSigError = err;
    }
  }

  if (!event) {
    console.error('[Stripe] Webhook signature verification failed:', lastSigError.message);
    return res.status(400).json({ error: `Webhook Error: ${lastSigError.message}` });
  }

  // Log every event received. The previous silent failure - checkout completing,
  // webhook returning 200, and nobody being activated - was invisible precisely
  // because nothing recorded what arrived or what was done with it.
  console.log('[Stripe] Webhook received:', {
    type: event.type,
    id: event.id,
    account: event.account || 'acct_1Rg9mWGDFfktozQP',
    livemode: event.livemode,
  });

  // ---- Claim the event ----------------------------------------------------
  // Idempotency lands BEFORE the 500s below, never after. Returning 500 makes
  // Stripe retry, and a retry re-runs the handler - without this claim, "fail
  // loudly" would convert a silent-failure bug into a duplicate-data bug that
  // reaches real customers and is harder to spot.
  const claim = await claimEvent(event);

  if (claim.duplicate) {
    console.log('[Stripe] Duplicate delivery, already', claim.status + ':', event.id,
      `(delivery #${claim.attempts})`);
    return res.json({ received: true, duplicate: true, status: claim.status });
  }

  // Another delivery of this same event is running right now. Answering 409
  // rather than 200 makes Stripe come back later, by which time the first
  // delivery has finished and it reads 'succeeded'. Running it concurrently
  // instead would, for checkout.session.completed, create two groups.
  if (claim.inFlight) {
    console.warn('[Stripe] Concurrent delivery of', event.id,
      `(delivery #${claim.attempts}) - another attempt is still running, asking Stripe to retry`);
    return res.status(409).json({
      error: 'Event already being processed',
      event: event.id,
    });
  }

  const handler = HANDLED_EVENTS[event.type];

  // Unhandled types are recorded as 'ignored' and answered 200. A 500 here would
  // buy a permanent retry storm against events that can never succeed - Stripe
  // would redeliver every customer.updated for three days.
  if (!handler) {
    console.log('[Stripe] Event type not handled, ignoring:', event.type, event.id);
    await finishEvent(event.id, 'ignored');
    return res.json({ received: true, ignored: true, type: event.type });
  }

  try {
    // Deliberate failure injection for verifying the retry path end to end.
    // Test-mode only, and only while the env var is set - it cannot fire against
    // a real customer's payment. See STRIPE_WEBHOOK_FORCE_ERROR in .env.example.
    maybeForceError(event);

    // A handler may report that there was legitimately nothing to do - a
    // one-off invoice with no subscription, an event for a subscription this
    // database has never heard of. That is 'ignored', not 'succeeded': the
    // ledger should never claim work happened when none did.
    const result = await handler(event.data.object, event);

    if (result && result.ignored) {
      console.log('[Stripe] Nothing to do for', event.type, event.id, '-', result.reason);
      await finishEvent(event.id, 'ignored');
      return res.json({ received: true, ignored: true, reason: result.reason });
    }

    await finishEvent(event.id, 'succeeded');
    return res.json({ received: true });

  } catch (error) {
    // The whole point of this task. This used to `res.json({ received: true })`,
    // so three separate handler bugs in one week were recorded by Stripe as
    // successful deliveries, never retried, and never alerted. A 500 makes
    // Stripe retry on its own schedule - we do not reimplement backoff.
    console.error('[Stripe] HANDLER FAILED', event.type, event.id,
      `(attempt ${claim.attempts}):`, error.message);
    console.error(error.stack);

    await finishEvent(event.id, 'failed', error);

    // Only on the first failure. Stripe retries a failing event for up to three
    // days; one alert per event is a signal, one per attempt is noise that gets
    // filtered and then ignored.
    if (claim.attempts === 1) {
      await alertWebhookFailure(event, error).catch((alertError) => {
        console.error('[Stripe] Could not send failure alert:', alertError.message);
      });
    }

    return res.status(500).json({
      error: 'Webhook handler failed',
      event: event.id,
      type: event.type,
    });
  }
}

/**
 * Event types this application actually acts on.
 *
 * Explicit map rather than a switch so "do we handle this?" is one lookup that
 * both the dispatcher and the ignored-path share. Anything absent is recorded
 * as 'ignored' - deliberately distinct from 'succeeded', so "we did nothing on
 * purpose" can never be mistaken for "we did the work".
 */
const HANDLED_EVENTS = {
  'checkout.session.completed': (obj) => handleCheckoutComplete(obj),
  'customer.subscription.created': (obj) => handleSubscriptionCreated(obj),
  'customer.subscription.updated': (obj) => handleSubscriptionUpdated(obj),
  'customer.subscription.deleted': (obj) => handleSubscriptionDeleted(obj),
  'invoice.paid': (obj) => handleInvoicePaid(obj),
  'invoice.payment_failed': (obj) => handlePaymentFailed(obj),
};

/**
 * Claim an event for processing.
 *
 * @returns {Promise<{duplicate: boolean, status: string, attempts: number}>}
 *
 * Fails OPEN. If the ledger itself is unreachable we process the event anyway:
 * losing idempotency for one delivery is a far smaller problem than refusing to
 * activate a customer who has just paid because the bookkeeping table is down.
 */
async function claimEvent(event) {
  const { data, error } = await supabase.rpc('claim_stripe_event', {
    p_event_id: event.id,
    p_type: event.type,
    p_livemode: event.livemode,
  });

  if (error) {
    console.error('[Stripe] Ledger claim FAILED for', event.id, '-', error.message,
      '- processing anyway without idempotency protection');
    return { duplicate: false, status: 'processing', attempts: 1, ledgerDown: true };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    console.error('[Stripe] Ledger claim returned no row for', event.id,
      '- processing anyway without idempotency protection');
    return { duplicate: false, status: 'processing', attempts: 1, ledgerDown: true };
  }

  return {
    duplicate: row.out_status === 'succeeded' || row.out_status === 'ignored',
    // Never a stored status - a decision meaning "another delivery of this
    // event is mid-flight". See claim_stripe_event in migration 039.
    inFlight: row.out_status === 'in_flight',
    status: row.out_status,
    attempts: row.out_attempts,
  };
}

/**
 * Record the outcome of an event.
 *
 * Never throws: a ledger write failure must not turn a successful handler into
 * a 500 (which would make Stripe retry work that already happened), nor mask
 * the real error on the failure path.
 */
async function finishEvent(eventId, status, error = null) {
  try {
    const { error: writeError } = await supabase
      .from('stripe_webhook_events')
      .update({
        status,
        processed_at: new Date().toISOString(),
        // Truncated: Stripe errors can carry very long bodies and the column is
        // for triage, not forensics - the stack is in the logs.
        ...(error ? { last_error: String(error.message || error).slice(0, 2000) } : {}),
      })
      .eq('event_id', eventId);

    if (writeError) {
      console.error('[Stripe] Could not record ledger outcome', status, 'for',
        eventId, '-', writeError.message);
    }
  } catch (e) {
    console.error('[Stripe] Ledger outcome write threw for', eventId, '-', e.message);
  }
}

/**
 * Tell a human that a payment event failed.
 *
 * The failure mode this exists for: a handler breaks, Stripe retries quietly for
 * three days, and nobody finds out until a customer says they paid and got
 * nothing. Logs did not work - nobody reads logs at 2am. Email does.
 */
async function alertWebhookFailure(event, error) {
  const to = process.env.ALERT_EMAIL || process.env.ACCOUNTS_EMAIL;

  if (!to) {
    console.error('[Stripe] No ALERT_EMAIL or ACCOUNTS_EMAIL set - failure alert not sent');
    return;
  }

  const emailService = require('../../lib/emailService');
  const mode = event.livemode ? 'LIVE' : 'TEST';

  await emailService.sendEmail({
    to,
    subject: `[${mode}] Stripe webhook failed: ${event.type}`,
    html: `
      <h2 style="color:#b91c1c;margin:0 0 12px">Stripe webhook handler failed</h2>
      <p>Stripe will retry this automatically. If the retries also fail, the
         customer's account has not been updated.</p>
      <table cellpadding="6" style="border-collapse:collapse;font-family:monospace;font-size:13px">
        <tr><td><strong>Event</strong></td><td>${escapeAlertHtml(event.id)}</td></tr>
        <tr><td><strong>Type</strong></td><td>${escapeAlertHtml(event.type)}</td></tr>
        <tr><td><strong>Mode</strong></td><td>${mode}</td></tr>
        <tr><td><strong>Time</strong></td><td>${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}</td></tr>
        <tr><td valign="top"><strong>Error</strong></td>
            <td style="color:#b91c1c">${escapeAlertHtml(String(error.message || error))}</td></tr>
      </table>
      <p style="margin-top:16px">
        Ledger row:
        <code>select * from stripe_webhook_events where event_id = '${escapeAlertHtml(event.id)}';</code>
      </p>
      <p>Once fixed, resend the event from the Stripe dashboard rather than editing rows by hand.</p>
    `,
  });

  console.log('[Stripe] Failure alert sent to', to, 'for', event.id);
}

/**
 * Daily sweep for events the ledger never finished.
 *
 * A 'failed' row means Stripe gave up retrying, or is still trying and nobody
 * noticed the first alert. A row stuck in 'processing' means a delivery claimed
 * the event and never came back - the process was killed mid-handler, which no
 * error path can report because no error was ever raised.
 *
 * Deliberately a once-a-day digest rather than a poll: one email covering
 * everything outstanding needs no dedup state and cannot turn into hourly spam
 * for the same stuck row, which is how alerting stops being read.
 *
 * @returns {Promise<{stuck: number, failed: number, alerted: boolean}>}
 */
async function reportStuckWebhookEvents() {
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .select('event_id, type, status, attempts, last_error, received_at, claimed_at')
    .in('status', ['processing', 'failed'])
    .lt('claimed_at', staleBefore)
    .order('received_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[Stripe] Stuck-event sweep failed:', error.message);
    throw new Error(`stuck-event sweep failed: ${error.message}`);
  }

  const rows = data || [];
  const stuck = rows.filter((r) => r.status === 'processing').length;
  const failed = rows.filter((r) => r.status === 'failed').length;

  if (!rows.length) {
    console.log('[Stripe] Webhook ledger clean - no stuck or failed events');
    return { stuck: 0, failed: 0, alerted: false };
  }

  console.error('[Stripe] Webhook ledger has unfinished events:',
    `${failed} failed, ${stuck} stuck in processing`);

  const to = process.env.ALERT_EMAIL || process.env.ACCOUNTS_EMAIL;
  if (!to) {
    console.error('[Stripe] No ALERT_EMAIL or ACCOUNTS_EMAIL set - digest not sent');
    return { stuck, failed, alerted: false };
  }

  const emailService = require('../../lib/emailService');

  const rowsHtml = rows.map((r) => `
    <tr>
      <td>${escapeAlertHtml(r.event_id)}</td>
      <td>${escapeAlertHtml(r.type)}</td>
      <td>${escapeAlertHtml(r.status)}</td>
      <td style="text-align:center">${r.attempts}</td>
      <td>${escapeAlertHtml((r.received_at || '').slice(0, 19).replace('T', ' '))}</td>
      <td style="color:#b91c1c">${escapeAlertHtml(r.last_error || '')}</td>
    </tr>`).join('');

  await emailService.sendEmail({
    to,
    subject: `Stripe webhook: ${failed} failed, ${stuck} stuck`,
    html: `
      <h2 style="color:#b91c1c;margin:0 0 12px">Unfinished Stripe webhook events</h2>
      <p><strong>${failed}</strong> failed and <strong>${stuck}</strong> stuck in
         <code>processing</code> for more than 15 minutes. A stuck row means a
         delivery claimed the event and never returned - usually the process was
         killed mid-handler, which raises no error to report.</p>
      <table cellpadding="6" style="border-collapse:collapse;font-family:monospace;font-size:12px">
        <tr style="background:#f3f4f6;text-align:left">
          <th>Event</th><th>Type</th><th>Status</th><th>Attempts</th><th>Received</th><th>Last error</th>
        </tr>
        ${rowsHtml}
      </table>
      <p style="margin-top:16px">Fix the cause, then resend from the Stripe
         dashboard rather than editing rows by hand.</p>
    `,
  });

  return { stuck, failed, alerted: true };
}

function escapeAlertHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Throw on demand, so the retry path can be verified without shipping code that
 * is deliberately broken to production twice.
 *
 * Two locks: the env var must be set, AND the event must be test mode. Set
 * STRIPE_WEBHOOK_FORCE_ERROR to an event type, or to '*' for every type.
 * A live event can never trigger it.
 */
function maybeForceError(event) {
  const target = process.env.STRIPE_WEBHOOK_FORCE_ERROR;
  if (!target) return;
  if (event.livemode) return;
  if (target !== '*' && target !== event.type) return;

  throw new Error(
    `Forced failure via STRIPE_WEBHOOK_FORCE_ERROR (${target}) - this is a deliberate test, not a real fault`
  );
}

/**
 * Handle checkout.session.completed
 *
 * Supports two flows:
 * - v1: userId is a real Supabase auth UUID (user already authenticated)
 * - v2: userId is a temp_signup_id (auth account created here after payment)
 */
async function handleCheckoutComplete(session) {
  console.log('[Stripe] Checkout complete:', session.id);

  // For Stripe Pricing Table, the user ID is in client_reference_id
  // For programmatic checkout, it's in metadata.userId
  let tempOrUserId = session.client_reference_id || session.metadata?.userId;
  // Resolved properly once the subscription is retrieved below - the Pricing
  // Table never sets metadata.tier, so this is null for most real purchases.
  const metadataTier = session.metadata?.tier;

  if (!tempOrUserId) {
    console.error('[Stripe] No userId in session (checked client_reference_id and metadata)');
    return;
  }

  console.log('[Stripe] Processing checkout for ID:', tempOrUserId, '| session:', session.id);

  // Look up the signup record
  const { data: signup, error: lookupError } = await supabase
    .from('user_signup')
    .select('email, name, surname, pending_password, auth_pending, create_user_id')
    .eq('create_user_id', tempOrUserId)
    .single();

  if (lookupError || !signup) {
    console.error('[Stripe] No signup record found for ID:', tempOrUserId, lookupError);
    return;
  }

  // Determine which flow we're in
  // auth_pending = true means v2 flow (need to create auth account)
  const needsAuthCreation = signup.auth_pending === true && signup.pending_password;
  let finalUserId = tempOrUserId;

  // ===== V2 FLOW: Create auth account after payment =====
  if (needsAuthCreation) {
    console.log('[Stripe] v2 flow detected - creating auth account for:', signup.email);

    try {
      // Decrypt the stored password
      const plainPassword = decryptPassword(signup.pending_password);

      // Create auth account using admin API (auto-confirmed, no email verification)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: signup.email,
        password: plainPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: `${signup.name} ${signup.surname}`,
          signup_flow: 'v2_after_payment'
        }
      });

      if (authError) {
        console.error('[Stripe] Failed to create auth account:', authError);
        // This is critical - we can't complete signup without auth
        // The user will need to contact support
        throw new Error(`Auth creation failed: ${authError.message}`);
      }

      const newAuthUserId = authData.user.id;
      console.log('[Stripe] Auth account created:', newAuthUserId, 'for email:', signup.email);

      // Update user_signup with real auth user ID
      const { error: updateIdError } = await supabase
        .from('user_signup')
        .update({
          create_user_id: newAuthUserId, // Replace temp ID with real auth ID
          pending_password: null, // SECURITY: Clear stored password immediately
          auth_pending: false // Auth is now created
        })
        .eq('create_user_id', tempOrUserId);

      if (updateIdError) {
        console.error('[Stripe] Failed to update create_user_id:', updateIdError);
        // Auth exists but signup record has wrong ID - admin intervention needed
      }

      // Update any related records that used the temp ID
      // (user_documents, incident_reports if any were created somehow)
      await supabase
        .from('user_documents')
        .update({ create_user_id: newAuthUserId })
        .eq('create_user_id', tempOrUserId);

      await supabase
        .from('dvla_vehicle_info_new')
        .update({ create_user_id: newAuthUserId })
        .eq('create_user_id', tempOrUserId);

      // Use the new auth user ID for the rest of the function
      finalUserId = newAuthUserId;

      console.log('[Stripe] v2 flow: Updated all records from temp ID', tempOrUserId, 'to auth ID', finalUserId);

    } catch (authCreationError) {
      console.error('[Stripe] v2 auth creation failed:', authCreationError);
      // Don't throw - still update subscription status so payment isn't lost
      // The auth issue will need manual resolution
    }
  } else {
    console.log('[Stripe] v1 flow: Auth already exists for:', finalUserId);
  }

  // ===== COMMON: Update subscription status =====
  const stripeClient = getStripe();
  const subscription = await stripeClient.subscriptions.retrieve(session.subscription, {
    expand: ['items.data.price'],
  });

  // Derive the tier from the price actually purchased. metadataTier is only
  // populated by our own create-checkout call, never by the Pricing Table.
  const tier = resolveTier(subscription, session) || metadataTier || null;
  if (!tier) {
    console.warn('[Stripe] Could not resolve tier for subscription', subscription.id,
      '- price:', subscription.items?.data?.[0]?.price?.id);
  }

  const { error: subError } = await supabase
    .from('user_signup')
    .update({
      subscription_status: 'active',
      subscription_tier: tier,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: session.customer, // Also store customer ID
      ...(periodDateISO(subscription, 'current_period_start')
        ? { subscription_start_date: periodDateISO(subscription, 'current_period_start') } : {}),
      ...(periodDateISO(subscription, 'current_period_end')
        ? { subscription_end_date: periodDateISO(subscription, 'current_period_end') } : {}),
    })
    .eq('create_user_id', finalUserId);

  if (subError) {
    console.error('[Stripe] Failed to update user subscription:', subError);
    return;
  }

  console.log('[Stripe] User subscription activated:', finalUserId, 'tier:', tier);

  // Check if this tier requires a subscription group (family or business plans)
  const tierConfig = groupsController.TIER_CONFIG[tier];

  // Hoisted so the welcome email below can carry the join code. The email is
  // deliberately sequenced AFTER this: if group creation fails loudly, the
  // buyer gets the generic email rather than one promising a code that does
  // not exist.
  let createdGroup = null;

  if (tierConfig && tierConfig.type !== 'individual') {
    try {
      // Create subscription group for family/business plans
      createdGroup = await groupsController.createGroup(finalUserId, tier, subscription.id);

      if (createdGroup) {
        console.log('[Stripe] Subscription group created:', createdGroup.id,
          'type:', tierConfig.type, 'joinCode:', createdGroup.join_code);
      }
    } catch (groupError) {
      console.error('[Stripe] Failed to create subscription group:', groupError);
      // Don't fail the checkout - subscription is still valid
      // User can manage group later
    }
  }

  // Send welcome email
  try {
    const emailService = require('../../lib/emailService');

    const { data: user } = await supabase
      .from('user_signup')
      .select('email, name, surname')
      .eq('create_user_id', finalUserId)
      .single();

    if (user) {
      // Customise message for group plans
      const isGroupPlan = tierConfig && tierConfig.type !== 'individual';
      const tierDisplayName = TIER_NAMES[tier] || tier;

      // Accurate billing dates. current_period_end during a trial is the TRIAL
      // end, not the renewal - labelling it "Renewal Date" was why the email
      // showed a date a week away next to "protected for 12 months".
      const trialEndsAt = subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null;

      const unitAmount = subscription.items?.data?.[0]?.price?.unit_amount;
      const currency = (subscription.items?.data?.[0]?.price?.currency || 'gbp').toUpperCase();
      const firstPaymentAmount = typeof unitAmount === 'number'
        ? (currency === 'GBP' ? `£${(unitAmount / 100).toFixed(2)}` : `${(unitAmount / 100).toFixed(2)} ${currency}`)
        : null;

      await emailService.sendSubscriptionWelcome(user.email, {
        userName: user.name || `${user.name} ${user.surname}`,
        tier: tierDisplayName,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: periodDate(subscription, 'current_period_end'),
        trialEndsAt,
        firstPaymentDate: trialEndsAt || periodDate(subscription, 'current_period_start'),
        firstPaymentAmount,
        isGroupPlan,
        maxMembers: isGroupPlan ? tierConfig.maxMembers : 1,
        // Only present when the group actually exists - a failed createGroup
        // leaves these null and the generic email is sent instead.
        joinCode: createdGroup?.join_code || null,
        joinUrl: createdGroup?.join_code
          ? `${process.env.APP_URL || 'https://www.carcrashlawyerai.com'}/join?code=${encodeURIComponent(createdGroup.join_code)}`
          : null,
        seatsUsed: createdGroup ? 1 : null,
        seatsTotal: createdGroup?.max_members || null,
        // v2 flow extra info
        isNewAccount: needsAuthCreation,
      });
    }
  } catch (emailError) {
    console.error('[Stripe] Failed to send welcome email:', emailError);
    // Don't throw - subscription is still valid
  }
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(subscription) {
  console.log('[Stripe] Subscription created:', subscription.id);
  // Usually handled by checkout.session.completed
  // This is a backup handler
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription) {
  console.log('[Stripe] Subscription updated:', subscription.id, '->', subscription.status);

  // NOTE: `user` used to be declared with const INSIDE the `if (!userId)` block
  // and then read outside it, which is a ReferenceError. Pricing Table
  // subscriptions never carry metadata.userId, so !userId was always true and
  // this function threw on every real subscription update - silently, because
  // the webhook's try/catch returns 200 regardless. Look the user up here, in
  // scope, and fall back to the subscription id as well as the customer id.
  let finalUserId = subscription.metadata?.userId || null;

  if (!finalUserId) {
    const { data: user, error: findError } = await supabase
      .from('user_signup')
      .select('create_user_id')
      .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${subscription.customer}`)
      .is('deleted_at', null)
      .maybeSingle();

    // A failed query is not an empty result. This line used to discard `error`
    // entirely, so a broken query was indistinguishable from "no such user".
    if (findError) {
      throw new Error(`user lookup failed for ${subscription.id}: ${findError.message}`);
    }

    if (!user) {
      // Normal for test-mode events against the production database, and for
      // subscriptions belonging to the retired Stripe account.
      console.log('[Stripe] No user holds subscription', subscription.id,
        '(customer:', subscription.customer, ') - nothing to update');
      return { ignored: true, reason: 'no user holds this subscription' };
    }

    finalUserId = user.create_user_id;
  }

  // Map Stripe status to our status
  const statusMap = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'inactive',
    paused: 'paused',
  };

  const mappedStatus = statusMap[subscription.status] || subscription.status;
  const periodEnd = periodDateISO(subscription, 'current_period_end');

  const { error } = await supabase
    .from('user_signup')
    .update({
      subscription_status: mappedStatus,
      ...(periodEnd ? { subscription_end_date: periodEnd } : {}),
    })
    .eq('create_user_id', finalUserId);

  if (error) {
    throw new Error(`failed to update ${finalUserId} to ${mappedStatus}: ${error.message}`);
  }

  // Cascade to the group, if this subscription pays for one. Previously only
  // customer.subscription.deleted cascaded, so a family plan going past_due or
  // paused left every member reading 'active' indefinitely - and a renewal
  // never extended members' end dates, so they lost access at the old date
  // while the subscription was healthy.
  try {
    await groupsController.updateGroupSubscriptionStatus(
      subscription.id,
      mappedStatus,
      periodEnd
    );
  } catch (groupError) {
    console.error('[Stripe] Failed to cascade status to group:', groupError.message);
  }
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription) {
  console.log('[Stripe] Subscription deleted:', subscription.id);

  // Throws on a real query failure; returns null when nobody owns this
  // subscription. `findError || !user` used to conflate the two, which is how a
  // non-existent column read as "user not found" for three live cancellations.
  const user = await findUserBySubscriptionId(subscription.id, 'create_user_id, email, name');

  // Normal, not an error: test-mode events reference subscriptions that do not
  // exist in this database. Returning here still lets the group cascade below
  // run - a group could be paid for by a subscription whose user row has since
  // been removed, and it should still be cancelled.
  if (!user) {
    console.log('[Stripe] No user holds cancelled subscription', subscription.id,
      '- cascading to any group anyway');
  } else {
    const { error } = await supabase
      .from('user_signup')
      .update({
        subscription_status: 'cancelled',
        // Keep subscription_end_date as the access expiry
      })
      .eq('create_user_id', user.create_user_id);

    if (error) {
      throw new Error(`failed to cancel ${user.create_user_id}: ${error.message}`);
    }
  }

  // Cascade to the group, if this subscription pays for one.
  //
  // The period end is computed BEFORE the call and tolerates absence. Building
  // it inline as `new Date(sub.current_period_end * 1000).toISOString()` threw
  // RangeError when the field was missing, which aborted the cascade before it
  // started - the user row said cancelled while the group and its join code
  // stayed live. See periodDateISO.
  try {
    await groupsController.updateGroupSubscriptionStatus(
      subscription.id,
      'cancelled',
      periodDateISO(subscription, 'current_period_end')
    );
  } catch (groupError) {
    console.error('[Stripe] Group cascade threw for cancelled subscription:',
      subscription.id, '-', groupError.message);
  }

  // Send cancellation email
  try {
    const emailService = require('../../lib/emailService');
    // TODO: Implement sendSubscriptionCancelled in emailService
    console.log('[Stripe] TODO: Send cancellation email to:', user.email);
  } catch (emailError) {
    console.error('[Stripe] Failed to send cancellation email:', emailError);
  }
}

/**
 * Handle invoice.paid - subscription renewal success
 */
async function handleInvoicePaid(invoice) {
  // Skip first invoice (handled by checkout.session.completed)
  if (invoice.billing_reason === 'subscription_create') {
    return { ignored: true, reason: 'first invoice, handled by checkout.session.completed' };
  }

  console.log('[Stripe] Invoice paid (renewal):', invoice.id);

  const subscriptionId = invoiceSubscriptionId(invoice);

  // No subscription on the invoice at all - a one-off charge, or a payload
  // shape we do not understand. Either way there is nothing to renew, and
  // retrying forever will not make one appear.
  if (!subscriptionId) {
    console.warn('[Stripe] Invoice has no subscription id, nothing to renew:', invoice.id,
      '- checked invoice.subscription and invoice.parent.subscription_details.subscription');
    return { ignored: true, reason: 'invoice carries no subscription id' };
  }

  const user = await findUserBySubscriptionId(subscriptionId);

  // Query succeeded, nobody owns this subscription. Normal for test-mode events
  // against the production database. Not an error, so no 500 and no retry.
  if (!user) {
    console.log('[Stripe] No user holds subscription', subscriptionId,
      '- nothing to renew for invoice', invoice.id);
    return;
  }

  // Retrieved through the SDK's pinned apiVersion, so current_period_end is
  // present here even though the webhook payload omits it.
  const stripeClient = getStripe();
  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);

  // Extend subscription period
  const renewedTo = periodDateISO(subscription, 'current_period_end');

  if (!renewedTo) {
    // Renewing without moving the date forward is the exact silent failure this
    // handler exists to prevent - it would log success while the customer is
    // locked out on their old end date.
    throw new Error(
      `renewal for ${subscriptionId} has no current_period_end - refusing to report success without extending access`
    );
  }

  const { error } = await supabase
    .from('user_signup')
    .update({
      subscription_status: 'active',
      subscription_end_date: renewedTo,
    })
    .eq('create_user_id', user.create_user_id);

  // Throw, do not log-and-continue: if the date did not move, the renewal did
  // not happen as far as the customer is concerned. 500 -> Stripe retries.
  if (error) {
    throw new Error(`failed to extend access for ${user.create_user_id}: ${error.message}`);
  }

  // Carry the renewal to the group's members too. customer.subscription.updated
  // normally fires on renewal and cascades, but relying on that leaves members'
  // access expiring on the old date if the event ordering ever differs. The
  // cascade is idempotent, so running it twice costs nothing.
  try {
    await groupsController.updateGroupSubscriptionStatus(
      subscriptionId, 'active', renewedTo
    );
  } catch (groupError) {
    console.error('[Stripe] Group cascade threw on renewal:',
      subscriptionId, '-', groupError.message);
  }

  console.log('[Stripe] Subscription renewed for user:', user.create_user_id,
    '- access now runs to', renewedTo);
}

/**
 * Handle invoice.payment_failed
 */
async function handlePaymentFailed(invoice) {
  console.log('[Stripe] Payment failed:', invoice.id);

  const subscriptionId = invoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    console.warn('[Stripe] Failed invoice has no subscription id:', invoice.id,
      '- no subscription to mark past_due');
    return { ignored: true, reason: 'invoice carries no subscription id' };
  }

  // This lookup previously discarded `error` entirely - a failed query and an
  // absent user were literally the same line of code.
  const user = await findUserBySubscriptionId(subscriptionId, 'create_user_id, email, name');

  if (!user) {
    console.log('[Stripe] No user holds subscription', subscriptionId,
      '- nothing to mark past_due for invoice', invoice.id);
    return;
  }

  // Update status
  const { error: updateError } = await supabase
    .from('user_signup')
    .update({ subscription_status: 'past_due' })
    .eq('create_user_id', user.create_user_id);

  if (updateError) {
    throw new Error(`failed to mark ${user.create_user_id} past_due: ${updateError.message}`);
  }

  // Send payment failed email
  try {
    const emailService = require('../../lib/emailService');
    // TODO: Implement sendPaymentFailed in emailService
    console.log('[Stripe] TODO: Send payment failed email to:', user.email);
  } catch (emailError) {
    console.error('[Stripe] Failed to send payment failed email:', emailError);
  }
}

/**
 * Get subscription status
 * GET /api/stripe/subscription/:userId
 */
async function getSubscriptionStatus(req, res) {
  const { userId } = req.params;

  try {
    const { data: user, error } = await supabase
      .from('user_signup')
      .select('subscription_status, subscription_tier, subscription_start_date, subscription_end_date')
      .eq('create_user_id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if subscription is still valid
    const now = new Date();
    const endDate = user.subscription_end_date ? new Date(user.subscription_end_date) : null;
    const isActive = ENTITLED_STATUSES.includes(user.subscription_status) && endDate && endDate > now;

    res.json({
      status: user.subscription_status || 'inactive',
      tier: user.subscription_tier,
      startDate: user.subscription_start_date,
      endDate: user.subscription_end_date,
      isActive,
      daysRemaining: endDate ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))) : 0,
    });

  } catch (error) {
    console.error('[Stripe] Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
}

/**
 * Create customer portal session
 * POST /api/stripe/portal
 *
 * Body: { userId, returnUrl }
 */
async function createPortalSession(req, res) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    console.error('[Stripe] STRIPE_SECRET_KEY not configured');
    return res.status(503).json({ error: 'Payment service temporarily unavailable' });
  }

  const { userId, returnUrl } = req.body;

  try {
    // Get customer ID
    const { data: user, error } = await supabase
      .from('user_signup')
      .select('stripe_customer_id')
      .eq('create_user_id', userId)
      .single();

    if (error || !user || !user.stripe_customer_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    // Create portal session
    const session = await stripeClient.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: returnUrl || `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/dashboard.html`,
    });

    res.json({ portalUrl: session.url });

  } catch (error) {
    console.error('[Stripe] Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}

/**
 * Verify Checkout Session
 * POST /api/stripe/verify-session
 *
 * Called by payment-success page to verify the checkout was successful.
 * The webhook should have already processed it, but this provides confirmation.
 *
 * Body: { sessionId, userId }
 */
async function verifySession(req, res) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    console.error('[Stripe] STRIPE_SECRET_KEY not configured');
    return res.status(503).json({ error: 'Payment service temporarily unavailable' });
  }

  const { sessionId, userId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    console.log('[Stripe] Verifying session:', sessionId);

    // Retrieve the session from Stripe
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check payment status
    if (session.payment_status !== 'paid') {
      console.log('[Stripe] Session not paid:', session.payment_status);
      return res.status(400).json({
        error: 'Payment not completed',
        status: session.payment_status,
      });
    }

    // Get subscription details
    const subscription = session.subscription;
    const customerId = session.customer?.id || session.customer;

    console.log('[Stripe] Session verified:', {
      sessionId,
      customerId,
      subscriptionId: subscription?.id || subscription,
      paymentStatus: session.payment_status,
    });

    // If userId is provided, ensure the database is updated
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from('user_signup')
        .select('subscription_status, subscription_tier')
        .eq('create_user_id', userId)
        .single();

      // If subscription isn't active yet, the webhook might not have processed
      // Return success anyway - the webhook will update it shortly
      if (userData && userData.subscription_status !== 'active') {
        console.log('[Stripe] User subscription not yet active, webhook may be pending');
      }
    }

    res.json({
      success: true,
      verified: true,
      paymentStatus: session.payment_status,
      subscriptionId: subscription?.id || subscription,
      customerId: customerId,
    });

  } catch (error) {
    console.error('[Stripe] Session verification error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
}

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getSubscriptionStatus,
  createPortalSession,
  verifySession,

  // Exported so the cascade can be exercised directly. Driving it through
  // handleWebhook would need a forged Stripe signature, which tests the
  // signature check rather than the cascade that actually broke.
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
  handleInvoicePaid,
  handlePaymentFailed,
  periodDateISO,
  invoiceSubscriptionId,

  // Called by the daily cron sweep in cronManager
  reportStuckWebhookEvents,
};
