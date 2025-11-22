#!/usr/bin/env node
/**
 * Refresh Supabase PostgREST Schema Cache
 *
 * Forces PostgREST to reload its schema cache. Use when you get PGRST204/PGRST205 errors.
 *
 * Usage: node scripts/refresh-schema-cache.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const config = require('../src/config');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m'
};

async function refreshSchemaCache() {
  console.log(colors.cyan + colors.bold + '\n🔄 Refreshing Supabase Schema Cache\n' + colors.reset);

  try {
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    );

    console.log(colors.cyan + '📊 Supabase URL: ' + config.supabase.url + '\n' + colors.reset);

    // Method 1: Send NOTIFY to PostgreSQL (Pro tier only)
    console.log(colors.bold + '1️⃣  Sending NOTIFY pgrst command...' + colors.reset);

    try {
      const { error } = await supabase.rpc('exec', {
        query: "NOTIFY pgrst, 'reload schema';"
      });

      if (error) {
        console.log(colors.yellow + '   ⚠️  RPC method not available: ' + error.message + colors.reset);
      } else {
        console.log(colors.green + '   ✅ NOTIFY sent successfully\n' + colors.reset);
      }
    } catch (e) {
      console.log(colors.yellow + '   ⚠️  RPC method not available\n' + colors.reset);
    }

    // Method 2: Wait for automatic refresh
    console.log(colors.bold + '2️⃣  Waiting for automatic cache refresh...' + colors.reset);
    console.log(colors.cyan + '   Pro tier: 10-30 seconds' + colors.reset);
    console.log(colors.cyan + '   Free tier: 30-120 seconds\n' + colors.reset);

    console.log(colors.yellow + '⏳ Waiting 30 seconds...\n' + colors.reset);
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Test cache refresh
    console.log(colors.bold + '3️⃣  Testing cache refresh...\n' + colors.reset);

    // Test 1: temp_uploads table
    console.log(colors.cyan + '   Testing temp_uploads table...' + colors.reset);
    const { error: tempError } = await supabase
      .from('temp_uploads')
      .select('count')
      .limit(0);

    if (tempError) {
      console.log(colors.red + '   ❌ temp_uploads: ' + tempError.message + colors.reset);
    } else {
      console.log(colors.green + '   ✅ temp_uploads accessible\n' + colors.reset);
    }

    // Test 2: user_signup table with address_line_1
    console.log(colors.cyan + '   Testing user_signup.address_line_1...' + colors.reset);
    const { error: userError } = await supabase
      .from('user_signup')
      .select('address_line_1')
      .limit(0);

    if (userError) {
      console.log(colors.red + '   ❌ address_line_1: ' + userError.message + colors.reset);
      console.log(colors.yellow + '\n💡 Cache not refreshed yet. Try these:' + colors.reset);
      console.log(colors.cyan + '   1. Wait another 1-2 minutes' + colors.reset);
      console.log(colors.cyan + '   2. Manual refresh in Supabase Dashboard:' + colors.reset);
      console.log(colors.cyan + '      → Settings → API → Reload Schema\n' + colors.reset);
      process.exit(1);
    } else {
      console.log(colors.green + '   ✅ address_line_1 accessible\n' + colors.reset);
    }

    // Success!
    console.log(colors.green + colors.bold + '✅ Schema cache refreshed successfully!\n' + colors.reset);
    console.log(colors.cyan + '🚀 Ready to test signup flow again\n' + colors.reset);

  } catch (error) {
    console.log(colors.red + '\n❌ Error: ' + error.message + '\n' + colors.reset);
    process.exit(1);
  }
}

refreshSchemaCache()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(colors.red + 'Unexpected error:', error);
    process.exit(1);
  });
