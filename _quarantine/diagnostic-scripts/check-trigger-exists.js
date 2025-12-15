#!/usr/bin/env node

/**
 * Direct Database Query: Check if Safety Check Trigger/Function Exists
 *
 * This script bypasses Supabase PostgREST and uses raw SQL queries
 * to check PostgreSQL system catalogs for trigger and function existence.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTriggerExists() {
  console.log('🔍 Checking Database for Safety Check Trigger and Function\n');
  console.log('='.repeat(80));

  let triggerExists = null;
  let functionExists = null;

  // Check 1: Query pg_trigger for trigger existence
  console.log('\n1️⃣  Checking for trigger: trigger_check_safety_before_report...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          t.tgname as trigger_name,
          c.relname as table_name,
          p.proname as function_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND c.relname = 'incident_reports'
          AND t.tgname = 'trigger_check_safety_before_report'
          AND NOT t.tgisinternal;
      `
    });

    if (error) {
      console.log('⚠️  RPC method not available, trying alternative approach...\n');

      // Alternative: Try to find trigger by attempting to describe it
      const { error: descError } = await supabase
        .from('incident_reports')
        .select('*')
        .limit(0);

      if (descError) {
        console.log('   Could not access table metadata');
      }

      triggerExists = 'UNKNOWN';
    } else {
      if (data && data.length > 0) {
        console.log('❌ TRIGGER EXISTS!');
        console.log('   Name:', data[0].trigger_name);
        console.log('   Table:', data[0].table_name);
        console.log('   Function:', data[0].function_name);
        triggerExists = true;
      } else {
        console.log('✅ Trigger NOT found (good - it was removed)');
        triggerExists = false;
      }
    }
  } catch (err) {
    console.log('⚠️  Error checking trigger:', err.message);
    triggerExists = 'ERROR';
  }

  // Check 2: Query pg_proc for function existence
  console.log('\n2️⃣  Checking for function: check_user_safety_before_report()...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          p.proname as function_name,
          n.nspname as schema_name,
          pg_get_functiondef(p.oid) as function_definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = 'check_user_safety_before_report';
      `
    });

    if (error) {
      console.log('⚠️  RPC method not available\n');
      functionExists = 'UNKNOWN';
    } else {
      if (data && data.length > 0) {
        console.log('❌ FUNCTION EXISTS!');
        console.log('   Name:', data[0].function_name);
        console.log('   Schema:', data[0].schema_name);
        functionExists = true;
      } else {
        console.log('✅ Function NOT found (good - it was removed)');
        functionExists = false;
      }
    }
  } catch (err) {
    console.log('⚠️  Error checking function:', err.message);
    functionExists = 'ERROR';
  }

  // Check 3: Try actual insert to see if P0001 error occurs
  console.log('\n3️⃣  Testing actual incident report insertion...\n');

  let insertWorks = null;

  try {
    // Use a known test user UUID from logs
    const testUserId = '1048b3ac-11ec-4e98-968d-9de28183a84d';

    const { data, error } = await supabase
      .from('incident_reports')
      .insert({
        create_user_id: testUserId,
        incident_date: new Date().toISOString().split('T')[0],
        incident_time: '14:30:00',
        location: 'Test Location for Trigger Check'
      })
      .select()
      .single();

    if (error) {
      if (error.code === 'P0001' && error.message?.includes('safety check')) {
        console.log('❌ P0001 ERROR OCCURRED!');
        console.log('   Message:', error.message);
        console.log('   Trigger is STILL ACTIVE in database');
        insertWorks = false;
      } else if (error.code === '23503') {
        console.log('✅ No P0001 error (got foreign key error instead)');
        console.log('   Foreign key violation is expected for test user');
        console.log('   This means trigger is NOT blocking the insert');
        insertWorks = true;
      } else if (error.code === 'PGRST204') {
        console.log('⚠️  Schema cache error (PGRST204)');
        console.log('   Details:', error.message);
        console.log('   Cannot determine trigger status from this test');
        insertWorks = 'SCHEMA_CACHE_ERROR';
      } else {
        console.log('⚠️  Different error occurred:', error.code);
        console.log('   Message:', error.message);
        insertWorks = 'OTHER_ERROR';
      }
    } else {
      console.log('✅ Insert succeeded!');
      console.log('   Created test record with ID:', data.id);
      console.log('   Trigger is definitely NOT blocking inserts');
      insertWorks = true;

      // Clean up test record
      await supabase
        .from('incident_reports')
        .delete()
        .eq('id', data.id);
      console.log('   (Test record deleted)');
    }
  } catch (err) {
    console.log('⚠️  Error during insert test:', err.message);
    insertWorks = 'ERROR';
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION SUMMARY\n');

  console.log('Trigger Status:', triggerExists === true ? '❌ EXISTS' :
                                  triggerExists === false ? '✅ REMOVED' :
                                  '⚠️  ' + triggerExists);

  console.log('Function Status:', functionExists === true ? '❌ EXISTS' :
                                   functionExists === false ? '✅ REMOVED' :
                                   '⚠️  ' + functionExists);

  console.log('Insert Test:', insertWorks === true ? '✅ WORKS' :
                              insertWorks === false ? '❌ P0001 BLOCKED' :
                              '⚠️  ' + insertWorks);

  console.log('\n' + '='.repeat(80));

  // Conclusion
  if (triggerExists === false && functionExists === false && insertWorks === true) {
    console.log('\n✅ CONFIRMED: Migration 027 was successful');
    console.log('   • Trigger removed from database');
    console.log('   • Function removed from database');
    console.log('   • Incident reports can be inserted without P0001 errors\n');
  } else if (triggerExists === true || functionExists === true || insertWorks === false) {
    console.log('\n❌ MIGRATION 027 FAILED OR INCOMPLETE');
    console.log('   • Database trigger and/or function still exists');
    console.log('   • P0001 errors will continue to occur');
    console.log('\n🔧 RECOMMENDED ACTION:');
    console.log('   Execute migration 027 via Supabase Dashboard SQL Editor');
    console.log('   URL: https://supabase.com/dashboard/project/[project-id]/sql/new\n');
  } else {
    console.log('\n⚠️  UNABLE TO DEFINITIVELY VERIFY');
    console.log('   • System catalog queries not available via Supabase client');
    console.log('   • Schema cache errors preventing insert test');
    console.log('\n🔧 RECOMMENDED ACTION:');
    console.log('   Manual verification via Supabase Dashboard or psql required\n');
  }

  console.log('='.repeat(80) + '\n');
}

checkTriggerExists().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
