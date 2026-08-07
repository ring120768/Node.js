/**
 * Guards against querying columns that do not exist on user_signup.
 *
 * WHY THIS EXISTS
 * handleSubscriptionDeleted selected `driver_name`, which is not a column on
 * user_signup - it lives on the vehicle and incident tables. PostgREST returned
 * an error, the handler treated that as "user not found", logged it and
 * returned. Three live cancellations produced ZERO database writes, and because
 * the early return sits above the group cascade, both groups stayed active too.
 *
 * A column typo is invisible in JavaScript, so this asserts every column the
 * controllers select from user_signup actually exists.
 *
 * Run: node test-user-signup-columns.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FILES = [
  'src/controllers/stripe.controller.js',
  'src/controllers/groups.controller.js',
];

/**
 * Find every .from('user_signup') ... .select('a, b, c') pair and collect the
 * column names. Deliberately simple: it only understands the literal-string
 * form, which is what these controllers use.
 */
function selectedColumns(source) {
  const cols = new Set();
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(".from('user_signup')")) continue;

    // The .select() usually follows within a few lines
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      const m = lines[j].match(/\.select\(\s*'([^']+)'/);
      if (!m) continue;
      if (m[1].trim() === '*') break;
      m[1].split(',').forEach(c => {
        const name = c.trim();
        if (name && !name.includes('(')) cols.add(name);
      });
      break;
    }
  }
  return cols;
}

(async () => {
  // Ground truth from the database itself
  const { data, error } = await supabase.from('user_signup').select('*').limit(1);
  assert.ok(!error, `could not read user_signup: ${error && error.message}`);
  assert.ok(data && data.length, 'user_signup is empty - cannot derive its columns');

  const actual = new Set(Object.keys(data[0]));
  console.log(`user_signup has ${actual.size} columns\n`);

  let bad = 0;
  for (const file of FILES) {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    const cols = selectedColumns(source);
    if (!cols.size) continue;

    const missing = [...cols].filter(c => !actual.has(c));
    console.log(`${file}`);
    console.log(`  selects: ${[...cols].sort().join(', ')}`);
    if (missing.length) {
      console.log(`  ❌ NOT ON user_signup: ${missing.join(', ')}`);
      bad += missing.length;
    } else {
      console.log('  ✅ every column exists');
    }
    console.log('');
  }

  // The specific column that caused the incident
  assert.ok(!actual.has('driver_name'),
    'driver_name unexpectedly exists now - this test assumed it does not');
  console.log("confirmed: user_signup has no 'driver_name' (it lives on the vehicle tables)");
  console.log("           the name columns are: " +
    [...actual].filter(c => /name|surname/i.test(c)).join(', '));

  assert.strictEqual(bad, 0, `${bad} column(s) selected from user_signup do not exist`);
  console.log('\nall user_signup column checks passed');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
