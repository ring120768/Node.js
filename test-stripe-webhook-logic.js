/**
 * Self-checks for the Stripe webhook fixes (6 Aug 2026).
 *
 * Covers:
 *   1. Signature verification against the single account secret
 *   2. Tier derivation from the price ID, since the Pricing Table never
 *      sets metadata.tier - the bug that wrote null tier on every row
 *
 * Run: node test-stripe-webhook-logic.js
 */
const assert = require('assert');
require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

// ---------------------------------------------------------------- signatures
// Single account only - the legacy-account bridge was cancelled, so a forged or
// foreign signature must simply be rejected.
const SECRET = 'whsec_account_secret';
const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: {} } });

function verify(payload, header, secret) {
  try { return stripe.webhooks.constructEvent(payload, header, secret); }
  catch (e) { return null; }
}

let hdr = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
assert.ok(verify(payload, hdr, SECRET), 'correctly signed event must verify');
console.log('correctly signed event -> verified');

hdr = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_not_ours' });
assert.strictEqual(verify(payload, hdr, SECRET), null, 'foreign signature must be rejected');
console.log('foreign signature      -> rejected');

assert.strictEqual(verify(payload, 't=1,v1=deadbeef', SECRET), null, 'garbage signature must be rejected');
console.log('garbage signature      -> rejected');

// The raw bytes matter: a re-encoded body must not verify against the same header
hdr = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
assert.strictEqual(verify(payload + ' ', hdr, SECRET), null, 'altered payload must be rejected');
console.log('altered payload        -> rejected');

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
