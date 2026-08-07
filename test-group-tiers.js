/**
 * Pre-flight assertions for the family/business group flow.
 *
 * Covers the chain that has to hold before a real purchase is worth making:
 *   Stripe price ID -> resolveTier -> TIER_CONFIG -> group type, seats, prefix
 * and that unresolvable tiers fail SAFELY (no group, loud log) rather than
 * creating a wrong-sized group.
 *
 * Business is asserted here rather than purchased, since the only difference
 * from family is the price ID and the seat count.
 *
 * Run: node test-group-tiers.js
 */
const assert = require('assert');
require('dotenv').config();

const { TIER_CONFIG } = require('./src/controllers/groups.controller');

// Live price IDs (acct_1Rg9mWGDFfktozQP). Every live object carries the
// GDFfktozQP fingerprint - a price from the retired account ends ...DjVI87TYBm
// and must never appear here.
const LIVE_PRICES = {
  premium: 'price_1U0nnqGDFfktozQP5MQzyKkM',
  family: 'price_1RgkEdGDFfktozQPX2VVUsZH',
  business_10: 'price_1RgkZKGDFfktozQPU6JYPUqM',
};

const ACCOUNT_FINGERPRINT = 'GDFfktozQP';
const RETIRED_FINGERPRINT = 'DjVI87TYBm';

// Mirrors resolveTier() in stripe.controller.js
function makeResolveTier(priceIds) {
  return function resolveTier(subscription, session) {
    const fromMetadata = session?.metadata?.tier || subscription?.metadata?.tier;
    if (fromMetadata && priceIds[fromMetadata]) return fromMetadata;
    const priceId = subscription?.items?.data?.[0]?.price?.id;
    if (priceId) {
      const match = Object.keys(priceIds).find((k) => priceIds[k] === priceId);
      if (match) return match;
    }
    return fromMetadata || null;
  };
}

const resolveTier = makeResolveTier(LIVE_PRICES);
const sub = (priceId) => ({ items: { data: [{ price: { id: priceId } }] }, metadata: {} });

const JOIN_CODE_PREFIX = { family: 'FAM', business: 'BIZ' };

// ------------------------------------------------- 1. price ID -> tier -> config
console.log('price ID -> tier -> group config\n');

const purchasable = [
  { tier: 'family', expectType: 'family', expectSeats: 4, expectPrefix: 'FAM' },
  { tier: 'business_10', expectType: 'business', expectSeats: 10, expectPrefix: 'BIZ' },
];

for (const c of purchasable) {
  const priceId = LIVE_PRICES[c.tier];

  // fingerprint: right Stripe account
  assert.ok(priceId.includes(ACCOUNT_FINGERPRINT),
    `${c.tier} price must belong to acct_1Rg9mWGDFfktozQP`);
  assert.ok(!priceId.includes(RETIRED_FINGERPRINT),
    `${c.tier} price must NOT come from the retired account`);

  // resolveTier
  const resolved = resolveTier(sub(priceId), {});
  assert.strictEqual(resolved, c.tier, `${priceId} must resolve to ${c.tier}`);

  // TIER_CONFIG
  const cfg = TIER_CONFIG[resolved];
  assert.ok(cfg, `TIER_CONFIG must have an entry for ${resolved}`);
  assert.strictEqual(cfg.type, c.expectType, `${resolved} type`);
  assert.notStrictEqual(cfg.type, 'individual', `${resolved} must create a group`);
  assert.strictEqual(cfg.maxMembers, c.expectSeats, `${resolved} seats`);
  assert.strictEqual(JOIN_CODE_PREFIX[cfg.type], c.expectPrefix, `${resolved} join code prefix`);

  console.log(`  ${priceId}`);
  console.log(`    -> tier=${resolved}  type=${cfg.type}  seats=${cfg.maxMembers}  code=${c.expectPrefix}-XXXXXX\n`);
}

// ------------------------------------------------- 2. premium must NOT group
const premiumTier = resolveTier(sub(LIVE_PRICES.premium), {});
assert.strictEqual(premiumTier, 'premium');
assert.strictEqual(TIER_CONFIG.premium.type, 'individual');
console.log('  premium resolves to an individual tier -> createGroup returns null, no group\n');

// ------------------------------------------------- 3. fail-safe on unknown tier
console.log('fail-safe behaviour\n');

// An unmapped price must resolve to null, not guess
assert.strictEqual(resolveTier(sub('price_1UNKNOWNGDFfktozQPxxxx'), {}), null);
console.log('  unmapped price          -> null (no guess)');

// A price from the RETIRED account must not resolve
assert.strictEqual(resolveTier(sub('price_1RgkEdDjVI87TYBmX2VVUsZH'), {}), null);
console.log('  retired-account price   -> null');

// TIER_CONFIG lookups that must not produce a group
for (const bad of [null, undefined, '', 'nonsense', 'FAMILY', 'family ']) {
  const cfg = TIER_CONFIG[bad];
  assert.ok(!cfg || cfg.type === 'individual',
    `TIER_CONFIG[${JSON.stringify(bad)}] must not yield a group config`);
  console.log(`  TIER_CONFIG[${String(JSON.stringify(bad)).padEnd(11)}] -> ${cfg ? cfg.type : 'undefined'} (no group created)`);
}

// The webhook guard: `if (tierConfig && tierConfig.type !== 'individual')`
function wouldCreateGroup(tier) {
  const cfg = TIER_CONFIG[tier];
  return !!(cfg && cfg.type !== 'individual');
}
assert.strictEqual(wouldCreateGroup(null), false, 'null tier must not create a group');
assert.strictEqual(wouldCreateGroup('premium'), false);
assert.strictEqual(wouldCreateGroup('family'), true);
assert.strictEqual(wouldCreateGroup('business_10'), true);
console.log('\n  webhook guard: null/premium -> no group; family/business_10 -> group');

// ------------------------------------------------- 4. env expectations
console.log('\nenv variables the code reads');
const REQUIRED = {
  STRIPE_PRICE_PREMIUM: LIVE_PRICES.premium,
  STRIPE_PRICE_FAMILY: LIVE_PRICES.family,
  STRIPE_PRICE_BUSINESS_10: LIVE_PRICES.business_10,
};
for (const [name, expectedLive] of Object.entries(REQUIRED)) {
  console.log(`  ${name.padEnd(26)} live value should be ${expectedLive}`);
}
console.log('  NOTE: the variable is STRIPE_PRICE_BUSINESS_10, not STRIPE_PRICE_BUSINESS.');

console.log('\nall group tier pre-flight checks passed');
