/**
 * Self-checks for the Stripe webhook fixes (6 Aug 2026).
 *
 * Covers the two failures that made live checkouts silently no-op:
 *   1. Dual-account signature verification (current + legacy secrets)
 *   2. Tier derivation from the price ID, since the Pricing Table never
 *      sets metadata.tier
 *
 * Run: node test-stripe-webhook-logic.js
 */
const assert = require('assert');
require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

// ---------------------------------------------------------------- signatures
const CURRENT = 'whsec_current_account_secret';
const LEGACY = 'whsec_legacy_account_secret';

function verifyAgainst(secrets, payload, header) {
  for (const c of secrets) {
    try {
      return { event: stripe.webhooks.constructEvent(payload, header, c.secret), source: c.name };
    } catch (e) { /* try next */ }
  }
  return null;
}

const secrets = [
  { name: 'current', secret: CURRENT },
  { name: 'legacy', secret: LEGACY },
];

const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: {} } });

// An event signed by the CURRENT account verifies, and is tagged as such
let hdr = stripe.webhooks.generateTestHeaderString({ payload, secret: CURRENT });
let got = verifyAgainst(secrets, payload, hdr);
assert.ok(got, 'current-account event must verify');
assert.strictEqual(got.source, 'current');
console.log('current-account event  -> verified, tagged "current"');

// An event signed by the LEGACY account also verifies, via the fallback.
// This is what keeps the 8 legacy subscriptions processing.
hdr = stripe.webhooks.generateTestHeaderString({ payload, secret: LEGACY });
got = verifyAgainst(secrets, payload, hdr);
assert.ok(got, 'legacy-account event must verify via fallback');
assert.strictEqual(got.source, 'legacy');
console.log('legacy-account event   -> verified, tagged "legacy"');

// A forged event matches neither and must be rejected
hdr = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_not_ours' });
assert.strictEqual(verifyAgainst(secrets, payload, hdr), null, 'unknown secret must be rejected');
console.log('unknown-secret event   -> rejected');

// With only the current secret configured, legacy events are rejected -
// proves the fallback is doing real work rather than being permissive
hdr = stripe.webhooks.generateTestHeaderString({ payload, secret: LEGACY });
assert.strictEqual(verifyAgainst([secrets[0]], payload, hdr), null,
  'without the legacy secret, legacy events must fail');
console.log('legacy event, no fallback configured -> rejected (fallback is load-bearing)');

// ---------------------------------------------------------------------- tier
// Mirrors resolveTier() in src/controllers/stripe.controller.js
const PRICE_IDS = {
  premium: 'price_PREMIUM',
  family: 'price_FAMILY',
  business_10: 'price_COMPANY',
};

function resolveTier(subscription, session) {
  const fromMetadata = session?.metadata?.tier || subscription?.metadata?.tier;
  if (fromMetadata && PRICE_IDS[fromMetadata]) return fromMetadata;
  const priceId = subscription?.items?.data?.[0]?.price?.id;
  if (priceId) {
    const match = Object.keys(PRICE_IDS).find((k) => PRICE_IDS[k] === priceId);
    if (match) return match;
  }
  return fromMetadata || null;
}

const sub = (priceId, meta) => ({ items: { data: [{ price: { id: priceId } }] }, metadata: meta || {} });

console.log('');
// The real-world case: Pricing Table purchase, no metadata anywhere.
// This previously wrote subscription_tier = null on every single row.
assert.strictEqual(resolveTier(sub('price_PREMIUM'), { metadata: {} }), 'premium');
console.log('pricing-table purchase, no metadata -> "premium"  <- the bug that nulled all 10 rows');

assert.strictEqual(resolveTier(sub('price_FAMILY'), {}), 'family');
assert.strictEqual(resolveTier(sub('price_COMPANY'), {}), 'business_10');
console.log('family and company prices           -> resolved from price ID');

// Programmatic checkout still honours metadata
assert.strictEqual(resolveTier(sub('price_PREMIUM'), { metadata: { tier: 'premium' } }), 'premium');
console.log('programmatic checkout metadata      -> still honoured');

// An unmapped price must not silently guess a tier
assert.strictEqual(resolveTier(sub('price_SOMETHING_ELSE'), {}), null);
console.log('unmapped price ID                   -> null, not a wrong guess');

// No subscription data at all
assert.strictEqual(resolveTier(null, {}), null);
console.log('no subscription data                -> null');

console.log('\nall webhook logic checks passed');
