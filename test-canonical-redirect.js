/**
 * Self-check for the canonical host redirect (SEO-ACTION-PLAN 2.1).
 * Run: node test-canonical-redirect.js
 */
const assert = require('assert');
const { canonicalHost } = require('./src/middleware/security');

const CHROME = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const ANDROID_WEBVIEW = 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UP1A; wv) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
const IOS_WEBVIEW = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const IOS_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';

function run(hostname, { path = '/', ua = CHROME, url } = {}) {
  const req = {
    hostname,
    path,
    originalUrl: url || path,
    get: (h) => (h.toLowerCase() === 'user-agent' ? ua : undefined)
  };
  let redirect = null;
  let passed = false;
  canonicalHost(req, { redirect: (code, loc) => { redirect = { code, loc }; } }, () => { passed = true; });
  return { redirect, passed };
}

// Legacy hosts redirect for real browsers
assert.deepStrictEqual(
  run('car-crash-lawyer-ai-production.up.railway.app', { path: '/login.html' }).redirect,
  { code: 301, loc: 'https://www.carcrashlawyerai.com/login.html' }
);
assert.deepStrictEqual(
  run('www.carcrashlawyerai.co.uk', { path: '/', url: '/?utm_source=x' }).redirect,
  { code: 301, loc: 'https://www.carcrashlawyerai.com/?utm_source=x' }
);
// Apex redirects to www
assert.strictEqual(run('carcrashlawyerai.com').redirect.loc, 'https://www.carcrashlawyerai.com/');

// Canonical host and localhost pass through
assert.ok(run('www.carcrashlawyerai.com').passed);
assert.ok(run('localhost:5000').passed);

// Native app webviews are NOT redirected off the Railway host (shipped apps would
// otherwise get bounced into the system browser)
assert.ok(run('car-crash-lawyer-ai-production.up.railway.app', { ua: ANDROID_WEBVIEW }).passed);
assert.ok(run('car-crash-lawyer-ai-production.up.railway.app', { ua: IOS_WEBVIEW }).passed);
assert.ok(run('car-crash-lawyer-ai-production.up.railway.app', { ua: `${CHROME} CarCrashLawyerAIApp` }).passed);
// ...but mobile Safari on the Railway host still redirects
assert.ok(run('car-crash-lawyer-ai-production.up.railway.app', { ua: IOS_SAFARI }).redirect);

// Health checks, webhooks and API calls are never redirected
assert.ok(run('car-crash-lawyer-ai-production.up.railway.app', { path: '/healthz' }).passed);
assert.ok(run('carcrashlawyerai.co.uk', { path: '/webhooks/github' }).passed);
assert.ok(run('carcrashlawyerai.co.uk', { path: '/api/profile' }).passed);

console.log('canonical redirect: all checks passed');
