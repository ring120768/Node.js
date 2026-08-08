/**
 * A renewal must move subscription_end_date forward.
 *
 * THE BUG
 * Stripe removed top-level `invoice.subscription` in the 2025 API versions and
 * moved it under parent.subscription_details. This endpoint renders in a 2025
 * version - proven by current_period_end coming back undefined and throwing the
 * RangeError fixed in d0bccce - so `invoice.subscription` is undefined here.
 *
 * handleInvoicePaid was calling subscriptions.retrieve(undefined) and matching
 * stripe_subscription_id against undefined. A renewal payment would succeed,
 * subscription_end_date would never move, and the customer would be locked out
 * while still being billed. It has never fired only because nothing has
 * renewed yet - every row is a trial started 7 Aug or a lifetime comp.
 *
 * The assertion here is deliberately about the DATE, not about the handler
 * completing. A handler that runs without throwing is not a pass - that is
 * precisely what the broken version did.
 *
 * Run: node test-renewal-extends-access.js
 */
const assert = require('assert');
const Module = require('module');
require('dotenv').config();

process.env.STRIPE_SECRET_KEY = 'sk_test_stub';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'stub';

const OLD_END = '2026-08-14T11:53:37.000Z';           // trial end, where the row sits today
const NEW_END_UNIX = Math.floor(Date.parse('2027-08-14T11:53:37.000Z') / 1000);
const NEW_END_ISO = new Date(NEW_END_UNIX * 1000).toISOString();

// ---------------------------------------------------------------------------
// Fakes. Only the network edges: Postgres and the Stripe SDK.
// ---------------------------------------------------------------------------
let userRow = { create_user_id: 'user-1', subscription_end_date: OLD_END };
let lookupError = null;
const writes = [];
const retrieveCalls = [];

const fakeSupabase = {
  rpc: () => Promise.resolve({ data: [{ out_status: 'processing', out_attempts: 1 }], error: null }),
  from(table) {
    const q = {
      _payload: null,
      update(p) { q._payload = p; return q; },
      select() { return q; },
      insert() { return q; },
      eq() { return q; },
      is() { return q; },
      or() { return q; },
      single() { return q.then.call(q); },
      maybeSingle() { return q.then.call(q); },
      then(resolve) {
        if (q._payload) writes.push({ table, payload: q._payload });
        let r;
        if (table === 'user_signup') {
          r = lookupError
            ? { data: null, error: { message: lookupError } }
            : { data: userRow, error: null, count: 1 };
        } else {
          r = { data: [{ id: 'group-1' }], error: null };
        }
        return resolve ? resolve(r) : Promise.resolve(r);
      },
    };
    return q;
  },
};

// The renewed subscription as the SDK returns it (pinned apiVersion, so
// current_period_end IS present here even though the webhook payload omits it).
function FakeStripe() {
  return {
    subscriptions: {
      retrieve: async (id) => {
        retrieveCalls.push(id);
        if (id === undefined || id === null) {
          // What the broken code actually did. Stripe's SDK rejects this.
          throw new Error('Invalid subscriptions.retrieve id: ' + String(id));
        }
        return {
          id,
          status: 'active',
          current_period_end: NEW_END_UNIX,
          items: { data: [{ price: { id: 'price_x' } }] },
        };
      },
    },
    webhooks: { constructEvent: () => { throw new Error('not used'); } },
  };
}

const realLoad = Module._load;
Module._load = function (request) {
  if (request === '@supabase/supabase-js') return { createClient: () => fakeSupabase };
  if (request === 'stripe') return FakeStripe;
  return realLoad.apply(this, arguments);
};
const stripe = require('./src/controllers/stripe.controller');
Module._load = realLoad;

// ---------------------------------------------------------------------------
// A renewal invoice in the 2025 shape: NO top-level subscription.
const renewalInvoice2025 = {
  id: 'in_renewal',
  billing_reason: 'subscription_cycle',
  parent: { subscription_details: { subscription: 'sub_renew_me' } },
};

// The same renewal in the legacy shape, to prove the fallback did not break it.
const renewalInvoiceLegacy = {
  id: 'in_renewal_legacy',
  billing_reason: 'subscription_cycle',
  subscription: 'sub_renew_me',
};

(async () => {
  const checks = [];
  const t = (label, ok) => checks.push([label, ok]);
  const reset = () => { writes.length = 0; retrieveCalls.length = 0; lookupError = null;
    userRow = { create_user_id: 'user-1', subscription_end_date: OLD_END }; };

  // ---------------------------------------- THE POINT: the date moves forward
  reset();
  await stripe.handleInvoicePaid(renewalInvoice2025);
  const userWrite = writes.find(w => w.table === 'user_signup');

  t('subscription id found in the 2025 payload shape',
    retrieveCalls[0] === 'sub_renew_me');
  t('subscriptions.retrieve was never called with undefined',
    !retrieveCalls.includes(undefined));
  t('user_signup was written', !!userWrite);
  t('subscription_end_date MOVED FORWARD to the new period end',
    userWrite?.payload?.subscription_end_date === NEW_END_ISO);
  t('the new date is genuinely later than the old one',
    Date.parse(userWrite?.payload?.subscription_end_date) > Date.parse(OLD_END));
  t('status set active', userWrite?.payload?.subscription_status === 'active');
  t('group members got the new end date too',
    writes.some(w => w.table === 'subscription_groups' && w.payload?.expires_at === NEW_END_ISO));

  // -------------------------------------------- legacy shape still works
  reset();
  await stripe.handleInvoicePaid(renewalInvoiceLegacy);
  t('legacy top-level invoice.subscription still resolves',
    retrieveCalls[0] === 'sub_renew_me');
  t('legacy shape also extends the date',
    writes.find(w => w.table === 'user_signup')?.payload?.subscription_end_date === NEW_END_ISO);

  // ------------------------------- first invoice is skipped, not "renewed"
  reset();
  const first = await stripe.handleInvoicePaid({
    id: 'in_first', billing_reason: 'subscription_create',
    parent: { subscription_details: { subscription: 'sub_renew_me' } },
  });
  t('first invoice is ignored, not processed', first?.ignored === true);
  t('first invoice writes nothing', writes.length === 0);

  // ------------------------------------ no subscription id at all -> ignored
  reset();
  const oneOff = await stripe.handleInvoicePaid({ id: 'in_oneoff', billing_reason: 'manual' });
  t('invoice with no subscription is ignored', oneOff?.ignored === true);
  t('and never calls retrieve(undefined)', retrieveCalls.length === 0);
  t('and writes nothing', writes.length === 0);

  // ---------------- subscription we do not know -> succeeded, NOT an error
  // Test-mode events hit the production database with ids that match no row.
  // If this threw, tests 2 and 3 of the webhook plan could never pass.
  reset();
  userRow = null;
  let threw = null;
  try {
    const unknown = await stripe.handleInvoicePaid(renewalInvoice2025);
    t('unknown subscription resolves without throwing', true);
    t('unknown subscription is not reported as ignored-with-reason',
      !unknown || unknown.ignored !== true || typeof unknown.reason === 'string');
  } catch (e) { threw = e; t('unknown subscription resolves without throwing', false); }
  t('unknown subscription writes nothing',
    !writes.some(w => w.table === 'user_signup'));

  // ------------------------- a FAILED QUERY is not an empty result -> throws
  reset();
  lookupError = 'connection reset by peer';
  threw = null;
  try { await stripe.handleInvoicePaid(renewalInvoice2025); } catch (e) { threw = e; }
  t('a database ERROR throws (-> 500 -> Stripe retries)', !!threw);
  t('the real error survives into the message',
    (threw?.message || '').includes('connection reset by peer'));

  // --------------------------------- payment_failed uses the same resolution
  reset();
  await stripe.handlePaymentFailed({
    id: 'in_failed',
    parent: { subscription_details: { subscription: 'sub_renew_me' } },
  });
  t('payment_failed resolves the 2025 shape too',
    writes.find(w => w.table === 'user_signup')?.payload?.subscription_status === 'past_due');

  reset();
  const failedNoSub = await stripe.handlePaymentFailed({ id: 'in_failed_nosub' });
  t('payment_failed with no subscription is ignored', failedNoSub?.ignored === true);

  reset();
  lookupError = 'permission denied for table user_signup';
  threw = null;
  try {
    await stripe.handlePaymentFailed({
      id: 'in_failed', parent: { subscription_details: { subscription: 'sub_renew_me' } },
    });
  } catch (e) { threw = e; }
  t('payment_failed throws on a database error (it used to discard it)', !!threw);

  // ------------------------------------------ the old shape is really gone
  const source = require('fs').readFileSync('./src/controllers/stripe.controller.js', 'utf8');
  const rawReads = source.split('\n')
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => /(?:retrieve|eq\([^)]*)\(?\s*invoice\.subscription/.test(l));
  t('no raw invoice.subscription left in code', rawReads.length === 0);

  console.log('RENEWAL EXTENDS ACCESS');
  for (const [label, ok] of checks) console.log(' ', (ok ? 'PASS' : 'FAIL').padEnd(5), label);
  console.log(`\n  old end: ${OLD_END}\n  new end: ${NEW_END_ISO}`);

  const failed = checks.filter(c => !c[1]);
  assert.strictEqual(failed.length, 0, `${failed.length} check(s) failed`);
  console.log('\nall renewal checks passed');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
