/**
 * Self-checks for the subscription welcome email (REQ 2).
 *
 * Two things were wrong for EVERY tier:
 *   - "Renewal Date" showed current_period_end, which during a trial is the
 *     TRIAL end - so it read 14/08/2026 for a subscription that renews in 2027
 *   - "you're protected for the next 12 months" sat next to that 7-day date
 *
 * And family/business buyers were never sent their join code.
 *
 * Renders the real template through the real sender, intercepting only the
 * network call. Run: node test-welcome-email.js
 */
const assert = require('assert');
require('dotenv').config();
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_dummy';

const emailService = require('./lib/emailService');

// Capture what would be sent, by intercepting the HTTP call the Resend SDK
// makes. sendTemplateEmail calls a module-internal sendEmail, so patching the
// export would not intercept - the network boundary is the honest seam.
const sent = [];
const realFetch = globalThis.fetch;

globalThis.fetch = async function (url, init) {
  if (String(url).includes('api.resend.com')) {
    try { sent.push(JSON.parse(init.body)); } catch (e) { sent.push({ parseError: e.message }); }
    return new Response(JSON.stringify({ id: 'stub-id' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch.apply(this, arguments);
};

async function capture(fn) {
  sent.length = 0;
  await fn();
}

const TRIAL_END = new Date('2026-08-14T12:00:00Z');
const START = new Date('2026-08-07T12:00:00Z');

(async () => {
  // ---------------------------------------------------------------- FAMILY
  await capture(() => emailService.sendSubscriptionWelcome('buyer@example.com', {
    userName: 'Ringo',
    tier: 'Family (£35/year - up to 4 members)',
    subscriptionStartDate: START,
    subscriptionEndDate: TRIAL_END,
    trialEndsAt: TRIAL_END,
    firstPaymentDate: TRIAL_END,
    firstPaymentAmount: '£35.00',
    isGroupPlan: true,
    joinCode: 'FAM-X22TFP',
    joinUrl: 'https://www.carcrashlawyerai.com/join?code=FAM-X22TFP',
    seatsUsed: 1,
    seatsTotal: 4,
  }));

  assert.strictEqual(sent.length, 1, 'family email should be sent');
  const fam = sent[0];
  const famText = fam.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

  const famChecks = [
    ['no unreplaced placeholders',        !/{{\w+}}/.test(fam.html)],
    ['dropped "protected for 12 months"', !famText.includes('protected for the next 12 months')],
    ['dropped "Renewal Date:" label',     !famText.includes('Renewal Date:')],
    ['trial end stated',                   famText.includes('Free trial ends') && famText.includes('14/08/2026')],
    ['first payment named with amount',    famText.includes('£35.00 on 14/08/2026')],
    ['renews annually',                    famText.includes('Renews') && famText.includes('Annually')],
    ['join code present',                  famText.includes('FAM-X22TFP')],
    ['join link present',                  fam.html.includes('/join?code=FAM-X22TFP')],
    ['seats stated',                       famText.includes('1 of 4 seats used')],
    ['sharing caution present',            famText.includes('take a seat on your plan')],
    ['subject mentions inviting',          /invite/i.test(fam.subject)],
    ['says family, not team',              famText.includes('Invite your family')],
  ];
  console.log('FAMILY welcome email');
  for (const [label, ok] of famChecks) console.log(' ', (ok ? 'PASS' : 'FAIL').padEnd(5), label);
  assert.ok(famChecks.every(c => c[1]), 'family email checks failed');

  // -------------------------------------------------------------- INDIVIDUAL
  await capture(() => emailService.sendSubscriptionWelcome('solo@example.com', {
    userName: 'Solo',
    tier: 'Premium (£11.99/year)',
    subscriptionStartDate: START,
    subscriptionEndDate: TRIAL_END,
    trialEndsAt: TRIAL_END,
    firstPaymentDate: TRIAL_END,
    firstPaymentAmount: '£11.99',
    isGroupPlan: false,
  }));

  const solo = sent[0];
  const soloText = solo.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const soloChecks = [
    ['no unreplaced placeholders',   !/{{\w+}}/.test(solo.html)],
    ['no join code leaked',          !/FAM-|BIZ-/.test(soloText)],
    ['no invite section',            !soloText.includes('Invite your')],
    ['dates still corrected',        soloText.includes('£11.99 on 14/08/2026')],
    ['subject unchanged for solo',   !/invite/i.test(solo.subject)],
  ];
  console.log('\nINDIVIDUAL welcome email');
  for (const [label, ok] of soloChecks) console.log(' ', (ok ? 'PASS' : 'FAIL').padEnd(5), label);
  assert.ok(soloChecks.every(c => c[1]), 'individual email checks failed');

  // ------------------------------- GROUP PLAN WHERE createGroup FAILED
  // The webhook passes joinCode: null when group creation failed loudly.
  // The buyer must get the generic email, never one promising a missing code.
  await capture(() => emailService.sendSubscriptionWelcome('nogroup@example.com', {
    userName: 'Unlucky',
    tier: 'Family (£35/year - up to 4 members)',
    subscriptionStartDate: START,
    trialEndsAt: TRIAL_END,
    firstPaymentDate: TRIAL_END,
    firstPaymentAmount: '£35.00',
    isGroupPlan: true,
    joinCode: null,      // createGroup failed
    joinUrl: null,
  }));

  const degraded = sent[0];
  const degText = degraded.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const degChecks = [
    ['no empty invite box',        !degText.includes('Invite your')],
    ['no dangling code',           !/FAM-|BIZ-/.test(degText)],
    ['no unreplaced placeholders', !/{{\w+}}/.test(degraded.html)],
    ['still a valid welcome',      degText.includes('Ringo') === false && degText.includes('Unlucky')],
  ];
  console.log('\nGROUP PLAN, createGroup FAILED -> generic email');
  for (const [label, ok] of degChecks) console.log(' ', (ok ? 'PASS' : 'FAIL').padEnd(5), label);
  assert.ok(degChecks.every(c => c[1]), 'degraded email checks failed');

  console.log('\nall welcome email checks passed');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
