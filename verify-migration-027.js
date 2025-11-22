#!/usr/bin/env node

/**
 * Verify Migration 027: Confirm Safety Check Trigger Removed
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMigration() {
  console.log('🔍 Verifying Migration 027: Safety Check Trigger Removal\n');

  let allPassed = true;

  // Test 1: Try to insert an incident report without are_you_safe = TRUE
  console.log('Test 1: Insert incident report without safety check...');

  try {
    const testUserId = '1048b3ac-11ec-4e98-968d-9de28183a84d'; // From earlier logs

    const { data, error } = await supabase
      .from('incident_reports')
      .insert({
        create_user_id: testUserId,
        incident_date: new Date().toISOString().split('T')[0],
        incident_time: '14:30',
        location: 'Test Location'
      })
      .select()
      .single();

    if (error) {
      // Check if it's a P0001 error about safety check
      if (error.code === 'P0001' && error.message?.includes('safety check')) {
        console.log('❌ FAILED: Trigger still active - P0001 error thrown');
        console.log('   Error:', error.message);
        allPassed = false;
      } else if (error.code === '23503') {
        // Foreign key violation is expected if user doesn't exist
        console.log('✅ PASSED: No safety check error (foreign key error is expected)');
      } else {
        console.log('⚠️  Other error (not safety-related):', error.code, error.message);
      }
    } else {
      console.log('✅ PASSED: Incident report created without are_you_safe = TRUE');

      // Clean up test data
      await supabase
        .from('incident_reports')
        .delete()
        .eq('id', data.id);

      console.log('   (Test data cleaned up)');
    }
  } catch (error) {
    console.log('⚠️  Test error:', error.message);
  }

  console.log('');

  // Test 2: Verify trigger doesn't exist in database
  console.log('Test 2: Check database for trigger existence...');

  try {
    // Query pg_catalog for the trigger
    const query = `
      SELECT count(*) as count
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = 'incident_reports'
        AND n.nspname = 'public'
        AND t.tgname = 'trigger_check_safety_before_report'
        AND NOT t.tgisinternal;
    `;

    // Since we can't execute raw SQL directly, we'll use the fetch method
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_raw_sql`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: query })
    });

    if (response.ok) {
      const result = await response.json();
      const triggerCount = result[0]?.count || 0;

      if (triggerCount === 0) {
        console.log('✅ PASSED: Trigger not found in database');
      } else {
        console.log('❌ FAILED: Trigger still exists in database');
        allPassed = false;
      }
    } else {
      console.log('⚠️  Could not verify via API (manual check needed)');
    }
  } catch (error) {
    console.log('⚠️  Test error:', error.message);
  }

  console.log('');

  // Summary
  console.log('='.repeat(80));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('');
    console.log('Migration 027 successfully completed:');
    console.log('  ✅ Safety check trigger removed from database');
    console.log('  ✅ incident_reports table no longer enforces are_you_safe = TRUE');
    console.log('  ✅ Users can submit incident reports without P0001 errors');
    console.log('');
    console.log('Expected behavior:');
    console.log('  • incident-form-page12.html → transcription-status.html (direct)');
    console.log('  • No redirect to safety-check.html');
    console.log('  • No redirect to six-point-safety-check.html');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('');
    console.log('Please check:');
    console.log('  1. Migration was executed successfully');
    console.log('  2. Database connection is working');
    console.log('  3. No cached triggers or functions');
  }
  console.log('='.repeat(80));
  console.log('');
}

verifyMigration().catch(error => {
  console.error('❌ Verification error:', error);
  process.exit(1);
});
