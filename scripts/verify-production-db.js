#!/usr/bin/env node
/**
 * Verify Production Database Setup
 *
 * Checks if temp_uploads table exists in production Supabase.
 * If missing, provides instructions to create it.
 *
 * Usage: node scripts/verify-production-db.js
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

async function verifyProductionDatabase() {
  console.log(colors.cyan + colors.bold + '\n🔍 Verifying Production Database Setup\n' + colors.reset);

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    );

    console.log(colors.cyan + '📊 Checking Supabase connection...' + colors.reset);
    console.log(colors.cyan + `   URL: ${config.supabase.url}\n` + colors.reset);

    // Test 1: Check if temp_uploads table exists
    console.log(colors.bold + '1️⃣  Testing temp_uploads table...' + colors.reset);

    const { data: tempUploads, error: tempError } = await supabase
      .from('temp_uploads')
      .select('count')
      .limit(0);

    if (tempError) {
      if (tempError.code === 'PGRST116' || tempError.message.includes('does not exist')) {
        console.log(colors.red + '   ❌ temp_uploads table NOT FOUND\n' + colors.reset);
        printMigrationInstructions();
        process.exit(1);
      } else if (tempError.code === 'PGRST205') {
        console.log(colors.yellow + '   ⚠️  Schema cache not refreshed yet' + colors.reset);
        console.log(colors.yellow + '   💡 Table may exist but PostgREST needs refresh\n' + colors.reset);
        printSchemaRefreshInstructions();
        process.exit(1);
      } else {
        throw tempError;
      }
    }

    console.log(colors.green + '   ✅ temp_uploads table exists\n' + colors.reset);

    // Test 2: Check if user_signup table exists (sanity check)
    console.log(colors.bold + '2️⃣  Testing user_signup table...' + colors.reset);

    const { error: userError } = await supabase
      .from('user_signup')
      .select('count')
      .limit(0);

    if (userError) {
      console.log(colors.red + '   ❌ user_signup table NOT FOUND' + colors.reset);
      console.log(colors.red + '   🚨 This is a critical table - check database setup!\n' + colors.reset);
      process.exit(1);
    }

    console.log(colors.green + '   ✅ user_signup table exists\n' + colors.reset);

    // Test 3: Check if user_documents table exists
    console.log(colors.bold + '3️⃣  Testing user_documents table...' + colors.reset);

    const { error: docsError } = await supabase
      .from('user_documents')
      .select('count')
      .limit(0);

    if (docsError) {
      console.log(colors.red + '   ❌ user_documents table NOT FOUND' + colors.reset);
      console.log(colors.red + '   🚨 This is a critical table - check database setup!\n' + colors.reset);
      process.exit(1);
    }

    console.log(colors.green + '   ✅ user_documents table exists\n' + colors.reset);

    // Test 4: Check Supabase Storage bucket
    console.log(colors.bold + '4️⃣  Testing Supabase Storage (user-documents bucket)...' + colors.reset);

    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.log(colors.red + '   ❌ Storage access failed: ' + bucketError.message + '\n' + colors.reset);
    } else {
      const userDocsBucket = buckets.find(b => b.name === 'user-documents');
      if (userDocsBucket) {
        console.log(colors.green + '   ✅ user-documents bucket exists\n' + colors.reset);
      } else {
        console.log(colors.yellow + '   ⚠️  user-documents bucket NOT FOUND' + colors.reset);
        console.log(colors.yellow + '   💡 Create bucket in Supabase Dashboard → Storage\n' + colors.reset);
      }
    }

    // Success!
    console.log(colors.green + colors.bold + '\n✅ Production database is ready!\n' + colors.reset);
    console.log(colors.cyan + '🚀 Next steps:' + colors.reset);
    console.log(colors.cyan + '   1. Wait 2-3 minutes for Replit deployment to complete' + colors.reset);
    console.log(colors.cyan + '   2. Open: https://nodejs-1-ring120768.replit.app/signup-form.html' + colors.reset);
    console.log(colors.cyan + '   3. Test complete signup flow with image uploads' + colors.reset);
    console.log(colors.cyan + '   4. Watch browser console for upload confirmations\n' + colors.reset);

  } catch (error) {
    console.log(colors.red + '\n❌ Verification failed: ' + error.message + '\n' + colors.reset);
    console.log(colors.yellow + '💡 Check:' + colors.reset);
    console.log(colors.yellow + '   1. SUPABASE_URL in .env is correct' + colors.reset);
    console.log(colors.yellow + '   2. SUPABASE_SERVICE_ROLE_KEY in .env is correct' + colors.reset);
    console.log(colors.yellow + '   3. Network connection to Supabase is working\n' + colors.reset);
    process.exit(1);
  }
}

function printMigrationInstructions() {
  console.log(colors.yellow + '📝 CREATE temp_uploads TABLE IN PRODUCTION:\n' + colors.reset);
  console.log(colors.cyan + '1. Open Supabase Dashboard:' + colors.reset);
  console.log(colors.cyan + '   https://supabase.com/dashboard/project/kctlcmbjmhcfoobmkfrs\n' + colors.reset);

  console.log(colors.cyan + '2. Go to: SQL Editor (left sidebar)\n' + colors.reset);

  console.log(colors.cyan + '3. Click "New Query"\n' + colors.reset);

  console.log(colors.cyan + '4. Copy this SQL:' + colors.reset);
  console.log(colors.cyan + '   File: migrations/create-temp-uploads-table.sql\n' + colors.reset);

  console.log(colors.cyan + '5. Paste and click "Run"\n' + colors.reset);

  console.log(colors.cyan + '6. Wait 10-30 seconds for schema cache refresh\n' + colors.reset);

  console.log(colors.cyan + '7. Re-run this script to verify:' + colors.reset);
  console.log(colors.cyan + '   node scripts/verify-production-db.js\n' + colors.reset);
}

function printSchemaRefreshInstructions() {
  console.log(colors.yellow + '⏳ WAITING FOR SCHEMA CACHE REFRESH:\n' + colors.reset);
  console.log(colors.cyan + 'The table exists in PostgreSQL but PostgREST API cache not refreshed yet.\n' + colors.reset);

  console.log(colors.cyan + 'Option 1: Wait (Recommended)' + colors.reset);
  console.log(colors.cyan + '   • Supabase Pro tier: 10-30 seconds' + colors.reset);
  console.log(colors.cyan + '   • Wait 1 minute and re-run this script\n' + colors.reset);

  console.log(colors.cyan + 'Option 2: Manual Refresh (Faster)' + colors.reset);
  console.log(colors.cyan + '   • Go to Supabase Dashboard → Settings → API' + colors.reset);
  console.log(colors.cyan + '   • Look for "Reload Schema" or "Refresh Cache" button' + colors.reset);
  console.log(colors.cyan + '   • Click and wait 10 seconds\n' + colors.reset);
}

// Run verification
verifyProductionDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(colors.red + 'Unexpected error:', error);
    process.exit(1);
  });
