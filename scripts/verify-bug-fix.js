#!/usr/bin/env node

/**
 * Verify Bug Fix: Pages 5, 7, 9, 10 Data Saving
 *
 * This script checks if the safety check trigger fix is working
 * by verifying:
 * 1. Test user is marked as safe
 * 2. Recent incident reports exist
 * 3. Pages 5, 7, 9, 10 data is saved correctly
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_USER_ID = '9db03736-74ac-4d00-9ae2-3639b58360a3';

async function verifyBugFix() {
  console.log('🔍 Verifying Bug Fix: Pages 5, 7, 9, 10 Data Saving');
  console.log('=====================================================\n');

  try {
    // Step 1: Check user safety status
    console.log('Step 1: Checking user safety status...');
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('email, are_you_safe, safety_status, safety_status_timestamp')
      .eq('create_user_id', TEST_USER_ID)
      .single();

    if (userError) {
      console.error('❌ Error checking user safety:', userError.message);
      process.exit(1);
    }

    console.log(`✅ User found: ${user.email}`);
    console.log(`   are_you_safe: ${user.are_you_safe ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`   safety_status: ${user.safety_status || 'NULL'}`);
    console.log(`   Timestamp: ${user.safety_status_timestamp ? new Date(user.safety_status_timestamp).toLocaleString('en-GB') : 'NULL'}`);
    console.log('');

    if (!user.are_you_safe) {
      console.log('❌ FAILED: User is not marked as safe');
      console.log('💡 Run: node scripts/mark-test-user-safe.js');
      process.exit(1);
    }

    // Step 2: Check incident reports
    console.log('Step 2: Checking recent incident reports...');
    const { data: reports, error: reportsError } = await supabase
      .from('incident_reports')
      .select(`
        id,
        created_at,
        usual_vehicle,
        vehicle_license_plate,
        dvla_make,
        dvla_model,
        other_full_name,
        other_contact_number,
        other_vehicle_registration,
        witnesses_present,
        police_attended,
        accident_ref_number,
        airbags_deployed,
        seatbelts_worn
      `)
      .eq('create_user_id', TEST_USER_ID)
      .order('created_at', { ascending: false })
      .limit(5);

    if (reportsError) {
      console.error('❌ Error querying incident reports:', reportsError.message);
      process.exit(1);
    }

    if (!reports || reports.length === 0) {
      console.log('⚠️  No incident reports found');
      console.log('');
      console.log('📝 This is normal if:');
      console.log('   1. User has not submitted the form yet');
      console.log('   2. All previous submissions failed (before the fix)');
      console.log('');
      console.log('✅ User is now marked as safe and ready to submit!');
      console.log('');
      console.log('🧪 Next step: Test form submission at:');
      console.log('   http://localhost:5000/incident-form-page1.html');
      return;
    }

    console.log(`✅ Found ${reports.length} report(s)\n`);

    // Step 3: Verify data from pages 5, 7, 9, 10
    reports.forEach((report, index) => {
      console.log(`📄 Report #${index + 1} (ID: ${report.id})`);
      console.log(`   Created: ${new Date(report.created_at).toLocaleString('en-GB')}`);
      console.log('');

      // Page 5: Your Vehicle
      console.log('   Page 5 - Your Vehicle:');
      console.log(`     usual_vehicle: ${report.usual_vehicle || '❌ NULL'}`);
      console.log(`     vehicle_license_plate: ${report.vehicle_license_plate || '❌ NULL'}`);
      console.log(`     dvla_make: ${report.dvla_make || '❌ NULL'}`);
      console.log(`     dvla_model: ${report.dvla_model || '❌ NULL'}`);

      // Page 7: Other Driver
      console.log('   Page 7 - Other Driver:');
      console.log(`     other_full_name: ${report.other_full_name || '❌ NULL'}`);
      console.log(`     other_contact_number: ${report.other_contact_number || '❌ NULL'}`);
      console.log(`     other_vehicle_registration: ${report.other_vehicle_registration || '❌ NULL'}`);

      // Page 9: Witnesses
      console.log('   Page 9 - Witnesses:');
      console.log(`     witnesses_present: ${report.witnesses_present || '❌ NULL'}`);

      // Page 10: Police & Safety
      console.log('   Page 10 - Police & Safety:');
      console.log(`     police_attended: ${report.police_attended !== null ? (report.police_attended ? '✅ TRUE' : 'FALSE') : '❌ NULL'}`);
      console.log(`     accident_ref_number: ${report.accident_ref_number || '❌ NULL'}`);
      console.log(`     airbags_deployed: ${report.airbags_deployed !== null ? (report.airbags_deployed ? '✅ TRUE' : 'FALSE') : '❌ NULL'}`);
      console.log(`     seatbelts_worn: ${report.seatbelts_worn || '❌ NULL'}`);
      console.log('');

      // Analyze data quality
      const page5HasData = report.usual_vehicle || report.vehicle_license_plate || report.dvla_make;
      const page7HasData = report.other_full_name || report.other_contact_number || report.other_vehicle_registration;
      const page9HasData = report.witnesses_present !== null;
      const page10HasData = report.police_attended !== null || report.airbags_deployed !== null || report.seatbelts_worn;

      console.log('   Data Quality Assessment:');
      console.log(`     Page 5: ${page5HasData ? '✅ Has data' : '⚠️  No data'}`);
      console.log(`     Page 7: ${page7HasData ? '✅ Has data' : '⚠️  No data'}`);
      console.log(`     Page 9: ${page9HasData ? '✅ Has data' : '⚠️  No data'}`);
      console.log(`     Page 10: ${page10HasData ? '✅ Has data' : '⚠️  No data'}`);
      console.log('');
    });

    // Final verdict
    console.log('═══════════════════════════════════════════════════');
    console.log('🎯 Verification Complete');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Safety check: PASSED (user is marked as safe)');
    console.log(`✅ Database access: PASSED (found ${reports.length} report(s))`);
    console.log('');
    console.log('💡 To test new submissions:');
    console.log('   1. Login as ian.ring@sky.com');
    console.log('   2. Go to http://localhost:5000/incident-form-page1.html');
    console.log('   3. Fill all 12 pages');
    console.log('   4. Submit');
    console.log('   5. Run this script again to verify');

  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

verifyBugFix();
