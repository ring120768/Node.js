#!/usr/bin/env node
/**
 * Verify temp_uploads table exists and is accessible
 */

// Load environment variables
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const config = require('../src/config');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

async function verifyTable() {
  console.log(colors.cyan, '\n🔍 Verifying temp_uploads table...\n');

  try {
    const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

    // Try to query the table directly using RPC/SQL
    console.log(colors.cyan, '1️⃣  Checking if table exists in database...');

    // Use execute_sql to check table directly
    const { data: tableCheck, error: checkError } = await supabase
      .from('temp_uploads')
      .select('count')
      .limit(0);

    if (checkError) {
      console.log(colors.red, `❌ Table query failed: ${checkError.message}`);
      console.log(colors.yellow, '\n📋 Error details:', checkError);

      console.log(colors.yellow, '\n💡 This error occurs when Supabase\'s PostgREST schema cache hasn\'t refreshed.');
      console.log(colors.cyan, '\n🔧 Solution: Reload Supabase PostgREST schema cache');
      console.log(colors.cyan, '─'.repeat(60));
      console.log(colors.cyan, '\nOption 1: Use Supabase Dashboard (Recommended)');
      console.log(colors.green, '  1. Go to your Supabase project dashboard');
      console.log(colors.green, '  2. Navigate to Settings → API');
      console.log(colors.green, '  3. Scroll to "Schema Cache"');
      console.log(colors.green, '  4. Click "Reload schema" or "Refresh schema"');
      console.log(colors.green, '  5. Wait 10-30 seconds for cache to refresh');
      console.log(colors.green, '  6. Test again\n');

      console.log(colors.cyan, 'Option 2: Use Supabase API');
      console.log(colors.green, '  Run this curl command:');
      console.log(colors.green, `  curl -X POST "${config.supabase.url}/rest/v1/rpc/pg_notify"`);
      console.log(colors.green, `       -H "apikey: ${config.supabase.serviceKey.substring(0, 20)}..."`);
      console.log(colors.green, `       -H "Authorization: Bearer ${config.supabase.serviceKey.substring(0, 20)}..."`);
      console.log(colors.green, '       -H "Content-Type: application/json"');
      console.log(colors.green, '       -d \'{"channel":"pgrst","payload":"reload schema"}\'');

      console.log(colors.cyan, '\nOption 3: Wait (Free tier only)');
      console.log(colors.yellow, '  Schema cache auto-refreshes every 24 hours on free tier\n');

      return false;
    }

    console.log(colors.green, '✅ Table exists and is accessible!');
    console.log(colors.cyan, '\n2️⃣  Checking table structure...');

    // Try inserting a test record
    const testRecord = {
      session_id: 'verify_test',
      field_name: 'test_field',
      storage_path: 'temp/verify/test.jpg',
      file_size: 1024,
      mime_type: 'image/jpeg',
      expires_at: new Date(Date.now() + 86400000).toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('temp_uploads')
      .insert(testRecord)
      .select()
      .single();

    if (insertError) {
      console.log(colors.red, `❌ Insert test failed: ${insertError.message}`);
      return false;
    }

    console.log(colors.green, '✅ Test record inserted successfully!');
    console.log(colors.cyan, `   ID: ${insertData.id}`);

    // Clean up test record
    const { error: deleteError } = await supabase
      .from('temp_uploads')
      .delete()
      .eq('id', insertData.id);

    if (!deleteError) {
      console.log(colors.green, '✅ Test record cleaned up');
    }

    console.log(colors.green, '\n🎉 Table is fully functional!');
    console.log(colors.cyan, '\nYou can now test the temp upload endpoint:\n');
    console.log(colors.green, '  node scripts/test-temp-upload.js\n');

    return true;

  } catch (error) {
    console.log(colors.red, '\n❌ Verification failed:', error.message);
    return false;
  }
}

verifyTable()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error(colors.red, 'Unexpected error:', error);
    process.exit(1);
  });
