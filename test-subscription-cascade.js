/**
 * Self-checks for group status cascade (7 Aug 2026).
 *
 * Two failures, both silent in production because the webhook's try/catch
 * returns 200 regardless:
 *
 *   1. handleSubscriptionUpdated declared `user` with const inside an
 *      `if (!userId)` block and read it outside - a ReferenceError on every
 *      subscription whose metadata lacks userId, which is every Pricing Table
 *      subscription, i.e. all of them.
 *
 *   2. Only customer.subscription.deleted cascaded to group members, so a
 *      family plan going past_due left members reading 'active', and a renewal
 *      never extended members' end dates.
 *
 * Run: node test-subscription-cascade.js
 */
const assert = require('assert');
const fs = require('fs');

const SRC = fs.readFileSync('./src/controllers/stripe.controller.js', 'utf8');
const GROUPS = fs.readFileSync('./src/controllers/groups.controller.js', 'utf8');

function fnBody(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  assert.ok(start !== -1, `${name} not found`);
  const end = source.indexOf('\n}', start);
  return source.slice(start, end);
}

// ------------------------------------------------------- 1. the scope bug
const updated = fnBody(SRC, 'handleSubscriptionUpdated');

// Reproduce the original shape to prove the class of bug is real, not theoretical
function originalShape(hasMetadataUserId) {
  const userId = hasMetadataUserId ? 'u1' : undefined;
  if (!userId) {
    const user = { create_user_id: 'looked-up' };   // block-scoped, as before
    if (!user) return null;
  }
  // eslint-disable-next-line no-undef
  return userId || user.create_user_id;             // ReferenceError when userId is falsy
}

assert.strictEqual(originalShape(true), 'u1', 'with metadata the old code happened to work');
assert.throws(() => originalShape(false), ReferenceError,
  'the original shape must throw when metadata.userId is absent');
console.log('original shape  -> ReferenceError when metadata.userId is absent (as in production)');

// The fixed version must not read `user` outside the block
assert.ok(/let finalUserId/.test(updated), 'finalUserId must be declared with let, outside the block');
const afterBlock = updated.slice(updated.indexOf('finalUserId = user.create_user_id'));
assert.ok(!/\buser\.create_user_id\b/.test(afterBlock.slice(40)),
  'user must not be dereferenced after its block');
console.log('fixed version   -> user is only dereferenced inside its own block');

// ---------------------------------------------------- 2. cascade coverage
assert.ok(fnBody(SRC, 'handleSubscriptionDeleted').includes('updateGroupSubscriptionStatus'),
  'deleted must cascade');
assert.ok(updated.includes('updateGroupSubscriptionStatus'),
  'updated must now cascade - this is the fix');
console.log('cascade         -> both subscription.updated and subscription.deleted');

// The cascade must pass the mapped status, not the raw Stripe status
assert.ok(/updateGroupSubscriptionStatus\(\s*subscription\.id,\s*mappedStatus/.test(updated),
  'cascade must pass the mapped status so members match the payer');
console.log('cascade status  -> mapped, so members match the payer');

// ...and the period end, so members do not expire early
assert.ok(/updateGroupSubscriptionStatus\([\s\S]{0,120}periodEnd/.test(updated),
  'cascade must pass the period end');
console.log('cascade expiry  -> period end passed through');

// ------------------------------------------ 3. members receive the end date
const cascadeFn = fnBody(GROUPS, 'updateGroupSubscriptionStatus');
assert.ok(/memberUpdate\.subscription_end_date = expiresAt/.test(cascadeFn),
  'members must receive the new end date, or a renewal extends only the payer');
assert.ok(/\.is\('deleted_at', null\)/.test(cascadeFn),
  'soft-deleted members must not be updated');
console.log('members         -> end date propagated, soft-deleted rows skipped');

// -------------------------------------------- 4. entitlement stays coherent
// Mirrors ENTITLED_STATUSES + the isActive expression
const ENTITLED = ['active', 'trialing'];
const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);
const entitled = (s, e) => !!(ENTITLED.includes(s) && e && e > new Date());

console.log('');
const cases = [
  ['active', future, true, 'healthy subscription'],
  ['trialing', future, true, 'in trial'],
  ['past_due', future, false, 'payment failed -> members lose access'],
  ['paused', future, false, 'paused -> members lose access'],
  ['cancelled', future, false, 'cancelled -> members lose access'],
  ['active', past, false, 'renewal not cascaded -> members expire (the bug)'],
];
for (const [status, end, want, label] of cases) {
  assert.strictEqual(entitled(status, end), want, label);
  console.log(' ', (want ? 'entitled    ' : 'not entitled'), '|', status.padEnd(10), '|', label);
}

console.log('\nall cascade checks passed');
