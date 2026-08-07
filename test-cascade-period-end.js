/**
 * The cancellation cascade must survive a subscription with no period end.
 *
 * WHAT WENT WRONG
 * Three live "cancel immediately" cancellations updated user_signup correctly
 * and left every subscription_groups row untouched - still active, updated_at
 * unchanged, join codes still working on an unpaid plan.
 *
 * handleSubscriptionDeleted built the cascade's third argument inline:
 *
 *     await updateGroupSubscriptionStatus(
 *       subscription.id, 'cancelled',
 *       new Date(subscription.current_period_end * 1000).toISOString()
 *     );
 *
 * When current_period_end is absent, `undefined * 1000` is NaN and
 * `new Date(NaN).toISOString()` throws RangeError. Arguments evaluate before
 * the call, so the cascade never ran - and the surrounding try/catch logged it
 * as "failed to update group status" and moved on. A silent 200.
 *
 * The field is legitimately absent: Stripe moved current_period_start/end onto
 * subscription items in 2025-03-31.basil, and webhook payloads are rendered in
 * the endpoint's API version, not the SDK's pinned apiVersion.
 *
 * Run: node test-cascade-period-end.js
 */
const assert = require('assert');
const Module = require('module');
require('dotenv').config();

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'stub';

// ---------------------------------------------------------------------------
// Fake Supabase. Records writes; never touches the network.
// ---------------------------------------------------------------------------
const writes = [];

function makeQuery(table) {
  const q = {
    _table: table,
    _payload: null,
    select() { return q; },
    eq() { return q; },
    in() { return q; },
    is() { return q; },
    or() { return q; },
    update(payload) { q._payload = payload; writes.push({ table, payload }); return q; },
    insert(payload) { writes.push({ table, payload, insert: true }); return q; },
    single() { return q.then.call(q); },
    maybeSingle() { return q.then.call(q); },
    then(resolve) {
      const result = q._table === 'user_signup'
        ? { data: { create_user_id: 'user-1', email: 'a@b.com', name: 'Ringo' }, error: null, count: 2 }
        : { data: [{ id: 'group-1', max_members: 4 }], error: null };
      return resolve ? resolve(result) : Promise.resolve(result);
    },
  };
  return q;
}

const fakeSupabase = { from: (table) => makeQuery(table) };

// Intercept @supabase/supabase-js before either controller requires it
const realLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@supabase/supabase-js') {
    return { createClient: () => fakeSupabase };
  }
  return realLoad.apply(this, arguments);
};

const stripeController = require('./src/controllers/stripe.controller');
const groupsController = require('./src/controllers/groups.controller');

Module._load = realLoad;

// ---------------------------------------------------------------------------
const cascadeCalls = [];
const realCascade = groupsController.updateGroupSubscriptionStatus;
groupsController.updateGroupSubscriptionStatus = async (...args) => {
  cascadeCalls.push(args);
  return realCascade(...args);
};

// The webhook handlers are not exported individually; drive them through the
// dispatcher the way Stripe does.
const handle = stripeController.__testHandleEvent || null;

(async () => {
  const results = [];

  // ------------------------------------------------------------- the regression
  // A cancelled subscription as the NEWER Stripe API renders it: no top-level
  // current_period_end. This is the exact shape that killed the cascade.
  const noPeriodEnd = {
    id: 'sub_TEST_no_period_end',
    customer: 'cus_TEST',
    status: 'canceled',
    items: { data: [{ price: { id: 'price_x' } }] },
  };

  cascadeCalls.length = 0;
  writes.length = 0;
  await stripeController.handleSubscriptionDeleted(noPeriodEnd);

  results.push([
    'cascade RUNS when current_period_end is absent',
    cascadeCalls.length === 1,
  ]);
  results.push([
    'cascade gets null, not a thrown RangeError',
    cascadeCalls[0] && cascadeCalls[0][2] === null,
  ]);
  results.push([
    'group row is written',
    writes.some(w => w.table === 'subscription_groups' && w.payload?.subscription_status === 'cancelled'),
  ]);
  results.push([
    'user row is written',
    writes.some(w => w.table === 'user_signup' && w.payload?.subscription_status === 'cancelled'),
  ]);
  results.push([
    'no expires_at written when the date is unknown',
    !writes.some(w => w.table === 'subscription_groups' && 'expires_at' in (w.payload || {})),
  ]);

  // --------------------------------------------- period end on the ITEM instead
  const itemPeriodEnd = {
    id: 'sub_TEST_item_period',
    customer: 'cus_TEST',
    status: 'canceled',
    items: { data: [{ price: { id: 'price_x' }, current_period_end: 1786000000 }] },
  };

  cascadeCalls.length = 0;
  writes.length = 0;
  await stripeController.handleSubscriptionDeleted(itemPeriodEnd);

  results.push([
    'period end read off the item when absent up top',
    cascadeCalls[0] && cascadeCalls[0][2] === new Date(1786000000 * 1000).toISOString(),
  ]);
  results.push([
    'expires_at written when the date IS known',
    writes.some(w => w.table === 'subscription_groups' && w.payload?.expires_at),
  ]);

  // ------------------------------------------------- top-level still preferred
  const topPeriodEnd = {
    id: 'sub_TEST_top_period',
    customer: 'cus_TEST',
    status: 'canceled',
    current_period_end: 1790000000,
    items: { data: [{ price: { id: 'price_x' }, current_period_end: 1786000000 }] },
  };

  cascadeCalls.length = 0;
  await stripeController.handleSubscriptionDeleted(topPeriodEnd);

  results.push([
    'top-level wins over the item',
    cascadeCalls[0] && cascadeCalls[0][2] === new Date(1790000000 * 1000).toISOString(),
  ]);

  console.log('CANCELLATION CASCADE');
  for (const [label, ok] of results) console.log(' ', (ok ? 'PASS' : 'FAIL').padEnd(5), label);
  assert.ok(results.every(r => r[1]), 'cascade checks failed');

  // ------------------------------------------------------ trialing join guard
  // A group in its 7-day trial must still accept members. `status !== 'active'`
  // would have refused every join code for the first week of every plan the
  // moment the updated-cascade wrote Stripe's real status onto the group.
  const source = require('fs').readFileSync('./src/controllers/groups.controller.js', 'utf8');
  const guardChecks = [
    ['no bare "!== \'active\'" status guards left', !/subscription_status !== 'active'/.test(source)],
    ['trialing groups accept members', /ACCEPTING_STATUSES\s*=\s*\['active',\s*'trialing'\]/.test(source)],
    ['all three guards use the shared list', (source.match(/ACCEPTING_STATUSES\.includes/g) || []).length === 3],
  ];

  console.log('\nJOIN GUARDS');
  for (const [label, ok] of guardChecks) console.log(' ', (ok ? 'PASS' : 'FAIL').padEnd(5), label);
  assert.ok(guardChecks.every(c => c[1]), 'join guard checks failed');

  // --------------------------------------------- no unguarded date maths left
  const stripeSource = require('fs').readFileSync('./src/controllers/stripe.controller.js', 'utf8');
  const unguarded = stripeSource
    .split('\n')
    .map((line, i) => [i + 1, line])
    .filter(([, line]) => /new Date\((?:subscription|invoice)\.current_period/.test(line));

  console.log('\nDATE MATHS');
  if (unguarded.length) {
    unguarded.forEach(([n, l]) => console.log(`  FAIL  line ${n}: ${l.trim()}`));
  } else {
    console.log('  PASS  no unguarded new Date(...current_period_*) left');
  }
  assert.strictEqual(unguarded.length, 0,
    'unguarded current_period_* date maths can throw RangeError and abort the handler');

  console.log('\nall cascade checks passed');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
