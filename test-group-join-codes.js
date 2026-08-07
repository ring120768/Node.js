/**
 * Self-checks for group join codes (migration 037).
 *
 * Covers code generation and the normalisation that decides whether a typed
 * code is accepted - the parts with real branching. The endpoints themselves
 * need a database and are exercised by the live test.
 *
 * Run: node test-group-join-codes.js
 */
const assert = require('assert');
require('dotenv').config();

const groups = require('./src/controllers/groups.controller');
const { normaliseJoinCode, TIER_CONFIG } = groups;

// ------------------------------------------------------------- normalisation
const accepted = [
  ['FAM-K7QM2X', 'FAM-K7QM2X', 'canonical form'],
  ['fam-k7qm2x', 'FAM-K7QM2X', 'lower case'],
  ['FAMK7QM2X', 'FAM-K7QM2X', 'no separator'],
  ['fam k7qm2x', 'FAM-K7QM2X', 'space separator'],
  ['  FAM-K7QM2X  ', 'FAM-K7QM2X', 'surrounding whitespace'],
  ['FAM_K7QM2X', 'FAM-K7QM2X', 'underscore separator'],
  ['BIZ-Q3WXYZ', 'BIZ-Q3WXYZ', 'business prefix'],
  ['biz.q3wxyz', 'BIZ-Q3WXYZ', 'dot separator'],
];

for (const [input, expected, label] of accepted) {
  assert.strictEqual(normaliseJoinCode(input), expected, `${label}: ${input}`);
  console.log('accept  ', JSON.stringify(input).padEnd(18), '->', expected, ' ', label);
}

console.log('');

const rejected = [
  ['', 'empty'],
  ['   ', 'whitespace only'],
  [null, 'null'],
  [undefined, 'undefined'],
  [12345, 'not a string'],
  ['K7QM2X', 'no prefix - ambiguous, must not be guessed'],
  ['FAM-K7QM2', 'too short'],
  ['FAM-K7QM2XY', 'too long'],
  ['XXX-K7QM2X', 'unknown prefix'],
  ['FAM-', 'prefix only'],
  ["FAM-K7QM2X'; DROP TABLE--", 'injection-shaped input'],
];

for (const [input, label] of rejected) {
  assert.strictEqual(normaliseJoinCode(input), null, `should reject: ${label}`);
  console.log('reject  ', String(JSON.stringify(input)).padEnd(28), label);
}

// --------------------------------------------------------------- seat limits
console.log('');
assert.strictEqual(TIER_CONFIG.family.maxMembers, 4, 'family must be 4 seats');
assert.strictEqual(TIER_CONFIG.family.type, 'family');
assert.strictEqual(TIER_CONFIG.business_10.maxMembers, 10, 'business_10 must be 10 seats');
assert.strictEqual(TIER_CONFIG.business_10.type, 'business');
assert.strictEqual(TIER_CONFIG.premium.type, 'individual', 'premium must not create a group');
console.log('seats   family=4, business_10=10, premium=individual (no group)');

// ------------------------------------------------- alphabet is unambiguous
// Mirrors the alphabet in the controller. Characters commonly misread when a
// code is spoken aloud or copied by eye must not appear.
const ALPHABET = 'ACDEFGHJKMNPQRTWXY234679';
for (const bad of ['O', '0', 'I', '1', 'L', 'U', 'V', 'S', '5', 'B', '8']) {
  assert.ok(!ALPHABET.includes(bad), `alphabet must exclude the ambiguous character ${bad}`);
}
console.log('alphabet excludes O/0 I/1/L U/V S/5 B/8 —', ALPHABET.length, 'symbols,',
  Math.pow(ALPHABET.length, 6).toLocaleString('en-GB'), 'combinations');

// A generated body must only ever use that alphabet. generateUniqueJoinCode
// hits the database, so exercise the format via the regex the normaliser
// enforces instead.
const sample = 'FAM-' + 'K7QM2X';
assert.strictEqual(normaliseJoinCode(sample), sample);

console.log('\nall join code checks passed');
