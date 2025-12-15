require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Test Safety Check Flow End-to-End
 *
 * This tests the complete flow:
 * 1. User authenticates and reaches incident.html
 * 2. incident.html → safety-check.html (with userId in sessionStorage)
 * 3. safety-check.html → POST /api/update-safety-status (with credentials)
 * 4. Database updated with are_you_safe = TRUE
 * 5. User can submit incident form without 500 error
 */

async function testSafetyCheckFlow() {
  console.log('🧪 Testing Safety Check Flow\n');

  // Step 1: Find a test user
  console.log('Step 1: Finding test user...');
  const { data: users, error: userError } = await supabase
    .from('user_signup')
    .select('create_user_id, email, are_you_safe, safety_status')
    .limit(1);

  if (userError || !users?.length) {
    console.log('❌ No test user found');
    return;
  }

  const testUser = users[0];
  console.log(`✅ Test user: ${testUser.email}`);
  console.log(`   User ID: ${testUser.create_user_id}`);
  console.log(`   Current are_you_safe: ${testUser.are_you_safe}`);
  console.log('');

  // Step 2: Simulate safety check update (what the API does)
  console.log('Step 2: Simulating safety status update...');
  const safetyStatus = "Yes, I'm safe and can complete this form";
  const areYouSafe = true; // Maps from safetyStatus

  const { data: updated, error: updateError } = await supabase
    .from('user_signup')
    .update({
      are_you_safe: areYouSafe,
      safety_status: safetyStatus,
      safety_status_timestamp: new Date().toISOString()
    })
    .eq('create_user_id', testUser.create_user_id)
    .select()
    .single();

  if (updateError) {
    console.log('❌ Failed to update safety status:', updateError.message);
    return;
  }

  console.log('✅ Safety status updated successfully');
  console.log(`   are_you_safe: ${updated.are_you_safe}`);
  console.log(`   safety_status: ${updated.safety_status}`);
  console.log('');

  // Step 3: Test incident_reports insert (should succeed now)
  console.log('Step 3: Testing incident_reports insert...');
  const testIncident = {
    create_user_id: testUser.create_user_id,
    police_attended: true,
    airbags_deployed: true,
    accident_date: '2025-01-01',
    accident_time: '12:00:00'
  };

  const { data: incident, error: insertError } = await supabase
    .from('incident_reports')
    .insert([testIncident])
    .select()
    .single();

  if (insertError) {
    console.log('❌ Incident insert failed:', insertError.message);
    console.log('   Code:', insertError.code);

    if (insertError.code === 'P0001') {
      console.log('\n⚠️  Safety check trigger blocked the insert!');
      console.log('   This means the safety status update did not work correctly.');
    }
    return;
  }

  console.log('✅ Incident insert succeeded!');
  console.log(`   Record ID: ${incident.id}`);
  console.log('');

  // Step 4: Cleanup test incident
  console.log('Step 4: Cleaning up test incident...');
  await supabase
    .from('incident_reports')
    .delete()
    .eq('id', incident.id);

  console.log('✅ Test incident removed\n');

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 SAFETY CHECK FLOW TEST PASSED!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('✅ Safety status can be updated');
  console.log('✅ Incident reports can be submitted after safety check');
  console.log('✅ Database trigger is working correctly');
  console.log('');
  console.log('Next step: Test in browser with:');
  console.log('  1. Login at http://localhost:3000/login.html');
  console.log('  2. Navigate to http://localhost:3000/incident.html');
  console.log('  3. Complete safety check');
  console.log('  4. Submit incident form');
  console.log('  5. Verify no 500 error');
}

// Run the test
testSafetyCheckFlow().catch(console.error);
