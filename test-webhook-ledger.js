/**
 * The Stripe webhook must stop answering 200 to its own failures.
 *
 * WHAT THIS IS FOR
 * Three separate production bugs in one week - a block-scoped ReferenceError, a
 * column name that does not exist, and RangeError from NaN date maths - all
 * threw, were all caught by the webhook's try/catch, and all returned HTTP 200.
 * Stripe recorded successful delivery, never retried, and nothing alerted. They
 * were invisible until someone read the database directly.
 *
 * The enabler was the catch-and-200, not any one mistake. This asserts it is
 * gone, and - just as importantly - that the idempotency which makes retrying
 * safe went in with it. Failing loudly without idempotency would turn a silent
 * -failure bug into a duplicate-data bug.
 *
 * Drives the REAL handleWebhook over a real Express request with a genuinely
 * Stripe-signed body. Only the database and the handlers are faked, so the
 * signature check, the ledger claim, the status code and the dispatch are all
 * exercised as deployed.
 *
 * Run: node test-webhook-ledger.js
 */
const assert = require('assert');
const crypto = require('crypto');
const express = require('express');
const Module = require('module');
require('dotenv').config();

const SECRET = 'whsec_test_' + 'x'.repeat(32);
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_stub';
process.env.STRIPE_WEBHOOK_SECRET = SECRET;
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'stub';
process.env.ALERT_EMAIL = 'alerts@example.com';
delete process.env.STRIPE_WEBHOOK_FORCE_ERROR;

// ---------------------------------------------------------------------------
// In-memory ledger that mirrors claim_stripe_event's real semantics, which were
// verified against Postgres before this test was written:
//   - attempts increments on EVERY delivery, duplicates included
//   - a terminal status (succeeded/ignored) is never reopened
// ---------------------------------------------------------------------------
const ledger = new Map();
const sideEffects = [];   // anything a handler "wrote" - proves no duplicates

const STALE_MS = 5 * 60 * 1000;

function claim(eventId, type, livemode) {
  const existing = ledger.get(eventId);
  if (!existing) {
    ledger.set(eventId, {
      event_id: eventId, type, livemode,
      status: 'processing', attempts: 1, claimed_at: Date.now(),
    });
    return { out_status: 'processing', out_attempts: 1 };
  }

  existing.attempts += 1;

  if (['succeeded', 'ignored'].includes(existing.status)) {
    return { out_status: existing.status, out_attempts: existing.attempts };
  }

  // 'in_flight' is a decision, never a stored status - matching the plpgsql.
  if (existing.status === 'processing' && Date.now() - existing.claimed_at < STALE_MS) {
    return { out_status: 'in_flight', out_attempts: existing.attempts };
  }

  existing.status = 'processing';
  existing.claimed_at = Date.now();
  return { out_status: 'processing', out_attempts: existing.attempts };
}

const fakeSupabase = {
  rpc(fn, args) {
    assert.strictEqual(fn, 'claim_stripe_event', 'unexpected rpc: ' + fn);
    return Promise.resolve({ data: [claim(args.p_event_id, args.p_type, args.p_livemode)], error: null });
  },
  from(table) {
    const q = {
      _id: null,
      _payload: null,
      update(payload) { q._payload = payload; return q; },
      select() { return q; },
      insert() { return q; },
      eq(col, val) { if (col === 'event_id') q._id = val; return q; },
      is() { return q; },
      or() { return q; },
      single() { return q.then.call(q); },
      maybeSingle() { return q.then.call(q); },
      then(resolve) {
        if (q._payload) {
          if (table === 'stripe_webhook_events') {
            if (q._id) Object.assign(ledger.get(q._id) || {}, q._payload);
          } else {
            // Every write a handler makes to a business table. Test 3 asserts
            // this stays empty on a duplicate delivery - which is the whole
            // reason idempotency had to ship alongside the 500s.
            sideEffects.push({ table, payload: q._payload });
          }
        }
        const r = table === 'user_signup'
          ? { data: { create_user_id: 'user-1', email: 'a@b.com', name: 'Ringo' }, error: null, count: 1 }
          : { data: [{ id: 'group-1', max_members: 4 }], error: null };
        return resolve ? resolve(r) : Promise.resolve(r);
      },
    };
    return q;
  },
};

// Intercept the Supabase client and the email sender before the controller loads
const emails = [];
const realLoad = Module._load;
Module._load = function (request) {
  if (request === '@supabase/supabase-js') return { createClient: () => fakeSupabase };
  return realLoad.apply(this, arguments);
};
const stripeController = require('./src/controllers/stripe.controller');
Module._load = realLoad;

const emailService = require('./lib/emailService');
emailService.sendEmail = async (msg) => { emails.push(msg); return { id: 'stub' }; };

// ---------------------------------------------------------------------------
// A real Express app, mounted the way app.js mounts it (raw body captured
// before JSON parsing, because the signature is over the exact bytes).
// ---------------------------------------------------------------------------
const app = express();
app.post('/api/stripe/webhook',
  express.json({ verify: (req, res, buf) => { req.rawBodyBuffer = Buffer.from(buf); } }),
  stripeController.handleWebhook);

const server = app.listen(0);
const PORT = server.address().port;

function sign(payload, secret) {
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
  return `t=${ts},v1=${sig}`;
}

async function deliver(event, { secret = SECRET } = {}) {
  const body = JSON.stringify(event);
  const res = await fetch(`http://127.0.0.1:${PORT}/api/stripe/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': sign(body, secret) },
    body,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

function makeEvent(id, type, livemode = false) {
  return { id, type, livemode, data: { object: { id: 'sub_x', customer: 'cus_x', status: 'canceled' } } };
}

// ---------------------------------------------------------------------------
// Failure is injected through the SHIPPED mechanism, not by stubbing a handler.
// HANDLED_EVENTS closes over the module-internal function references, so
// reassigning the export would not stub anything - and a test that quietly
// tests nothing is exactly the failure mode this whole task is about.
const forceFailure = (on) => {
  if (on) process.env.STRIPE_WEBHOOK_FORCE_ERROR = 'customer.subscription.deleted';
  else delete process.env.STRIPE_WEBHOOK_FORCE_ERROR;
};

(async () => {
  const checks = [];
  const t = (label, ok) => checks.push([label, ok]);

  // ------------------------------------------------ 1. failure returns 500
  forceFailure(true);
  emails.length = 0;
  const fail = await deliver(makeEvent('evt_fail', 'customer.subscription.deleted'));
  const failRow = ledger.get('evt_fail');

  t('a throwing handler returns 500, not 200', fail.status === 500);
  t('ledger row reads failed', failRow?.status === 'failed');
  t('last_error carries the real message',
    (failRow?.last_error || '').includes('Forced failure'));
  t('an alert email was sent', emails.length === 1);
  t('alert names the event id', (emails[0]?.html || '').includes('evt_fail'));
  t('alert subject names the event type',
    (emails[0]?.subject || '').includes('customer.subscription.deleted'));

  // ------------------------------------- retry of a failure does NOT re-alert
  emails.length = 0;
  const retry = await deliver(makeEvent('evt_fail', 'customer.subscription.deleted'));
  t('a retry of a failing event still returns 500', retry.status === 500);
  t('attempts counts the retry', ledger.get('evt_fail').attempts === 2);
  t('no second alert on retry (one signal, not a storm)', emails.length === 0);

  // ------------------------------------------------------- 2. recovery works
  forceFailure(false);
  sideEffects.length = 0;
  const recovered = await deliver(makeEvent('evt_fail', 'customer.subscription.deleted'));
  t('same event succeeds once the fault is removed', recovered.status === 200);
  t('ledger moves failed -> succeeded', ledger.get('evt_fail').status === 'succeeded');
  t('processed_at is stamped', !!ledger.get('evt_fail').processed_at);
  t('the work actually ran on recovery', sideEffects.length > 0);

  // --------------------------------------------- 3. duplicate delivery no-ops
  sideEffects.length = 0;
  const dup = await deliver(makeEvent('evt_fail', 'customer.subscription.deleted'));
  t('duplicate delivery returns 200', dup.status === 200);
  t('duplicate is reported as such', dup.body.duplicate === true);
  t('NO second write from the duplicate', sideEffects.length === 0);
  t('attempts still counts the duplicate delivery', ledger.get('evt_fail').attempts === 4);
  t('status stays succeeded', ledger.get('evt_fail').status === 'succeeded');

  // ---------------------------------- concurrency: a mid-flight event gets 409
  // The previous claim returned 'processing' to a second delivery arriving while
  // the first was still running, so BOTH executed. For
  // checkout.session.completed that means two groups for one payment.
  ledger.set('evt_busy', {
    event_id: 'evt_busy', type: 'customer.subscription.deleted', livemode: false,
    status: 'processing', attempts: 1, claimed_at: Date.now(),
  });
  sideEffects.length = 0;
  const busy = await deliver(makeEvent('evt_busy', 'customer.subscription.deleted'));
  t('a concurrent delivery gets 409, not 200', busy.status === 409);
  t('and the handler does NOT run concurrently', sideEffects.length === 0);
  t('and in_flight is never stored', ledger.get('evt_busy').status === 'processing');

  // a handler that died mid-flight must still be recoverable
  ledger.get('evt_busy').claimed_at = Date.now() - (6 * 60 * 1000);
  sideEffects.length = 0;
  const staleRetry = await deliver(makeEvent('evt_busy', 'customer.subscription.deleted'));
  t('a stale processing row is reclaimed after the window', staleRetry.status === 200);
  t('and the work then runs', sideEffects.length > 0);

  // ------------------------------------------ 4. unknown type does not storm
  const unknown = await deliver(makeEvent('evt_unknown', 'customer.discount.created'));
  t('unhandled event type returns 200 (no retry storm)', unknown.status === 200);
  t('unhandled type is recorded as ignored', ledger.get('evt_unknown')?.status === 'ignored');
  t('ignored is distinct from succeeded', ledger.get('evt_unknown')?.status !== 'succeeded');

  const dupIgnored = await deliver(makeEvent('evt_unknown', 'customer.discount.created'));
  t('re-delivered unknown type is a duplicate no-op', dupIgnored.body.duplicate === true);

  // ------------------------------------------------- signature still enforced
  const badSig = await deliver(makeEvent('evt_badsig', 'customer.subscription.deleted'),
    { secret: 'whsec_wrong_' + 'y'.repeat(32) });
  t('a bad signature is still rejected with 400', badSig.status === 400);
  t('a rejected event is never written to the ledger', !ledger.has('evt_badsig'));

  // ------------------------------- force-error cannot fire against live money
  process.env.STRIPE_WEBHOOK_FORCE_ERROR = '*';
  sideEffects.length = 0;
  const live = await deliver(makeEvent('evt_live', 'customer.subscription.deleted', true));
  t('STRIPE_WEBHOOK_FORCE_ERROR is ignored for live events', live.status === 200);
  t('the live event was really processed', sideEffects.length > 0);

  const testMode = await deliver(makeEvent('evt_forced', 'customer.subscription.deleted', false));
  t('STRIPE_WEBHOOK_FORCE_ERROR does fire in test mode', testMode.status === 500);
  delete process.env.STRIPE_WEBHOOK_FORCE_ERROR;

  // ------------------------------------------- the catch-and-200 is really gone
  const source = require('fs').readFileSync('./src/controllers/stripe.controller.js', 'utf8');
  t('no "Return 200 to prevent Stripe from retrying" left',
    !/Return 200 to prevent Stripe from retrying/i.test(source));
  t('handler failure path returns 500', /res\.status\(500\)[\s\S]{0,120}Webhook handler failed/.test(source));

  console.log('STRIPE WEBHOOK LEDGER');
  for (const [label, ok] of checks) console.log(' ', (ok ? 'PASS' : 'FAIL').padEnd(5), label);

  server.close();
  const failed = checks.filter(c => !c[1]);
  assert.strictEqual(failed.length, 0, `${failed.length} check(s) failed`);
  console.log('\nall webhook ledger checks passed');
})().catch((e) => { server.close(); console.error('FAILED:', e.message); process.exit(1); });
