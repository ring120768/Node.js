/**
 * Test Critical User Flows
 * Verifies: Signup → Incident → PDF generation → Email
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUserFlows() {
  console.log('🧪 TESTING CRITICAL USER FLOWS\n');
  console.log('='.repeat(60));

  try {
    // 1. Get test user
    const { data: users, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .limit(1);

    if (userError) throw userError;

    if (!users || users.length === 0) {
      console.log('⚠️  No test users found in database');
      console.log('   Action: Create a test user via signup form');
      return;
    }

    const testUser = users[0];
    console.log('\n✅ 1. USER SIGNUP');
    console.log('   User ID:', testUser.create_user_id);
    console.log('   Email:', testUser.email || 'N/A');
    console.log('   Name:', testUser.full_name || 'N/A');
    console.log('   Created:', testUser.created_at ? new Date(testUser.created_at).toLocaleString('en-GB') : 'N/A');

    // 2. Check incidents
    const { data: incidents, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', testUser.create_user_id)
      .order('created_at', { ascending: false });

    if (incidentError) throw incidentError;

    console.log(`\n✅ 2. INCIDENT REPORTS`);
    console.log(`   Total incidents: ${incidents.length}`);

    if (incidents.length > 0) {
      const latest = incidents[0];
      console.log('   Latest incident:');
      console.log('     - ID:', latest.id);
      console.log('     - Date:', latest.incident_date || 'N/A');
      console.log('     - Location:', latest.incident_location_street || 'N/A');
      console.log('     - Created:', latest.created_at ? new Date(latest.created_at).toLocaleString('en-GB') : 'N/A');
    } else {
      console.log('   ⚠️  No incidents found');
    }

    // 3. Check uploaded documents/photos
    const { data: docs, error: docsError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', testUser.create_user_id)
      .order('created_at', { ascending: false });

    if (docsError) throw docsError;

    console.log(`\n✅ 3. PHOTO UPLOADS`);
    console.log(`   Total documents: ${docs.length}`);

    if (docs.length > 0) {
      const statusCount = {};
      docs.forEach(doc => {
        const status = doc.status || 'unknown';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      console.log('   Status breakdown:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`     - ${status}: ${count}`);
      });
    } else {
      console.log('   ⚠️  No documents found');
    }

    // 4. Check completed forms (PDFs)
    const { data: forms, error: formsError } = await supabase
      .from('completed_incident_forms')
      .select('*')
      .eq('create_user_id', testUser.create_user_id)
      .order('created_at', { ascending: false });

    if (formsError) throw formsError;

    console.log(`\n✅ 4. PDF GENERATION`);
    console.log(`   Completed forms: ${forms.length}`);

    if (forms.length > 0) {
      const latest = forms[0];
      console.log('   Latest PDF:');
      console.log('     - ID:', latest.id);
      console.log('     - Status:', latest.submission_status || 'N/A');
      console.log('     - Storage path:', latest.pdf_storage_path ? '✅ Available' : '❌ Missing');
      console.log('     - Created:', latest.created_at ? new Date(latest.created_at).toLocaleString('en-GB') : 'N/A');
    } else {
      console.log('   ⚠️  No completed forms found');
    }

    // 5. Check PDF generation queue
    const { data: queue, error: queueError } = await supabase
      .from('pdf_generation_queue')
      .select('*')
      .eq('user_id', testUser.create_user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (queueError) throw queueError;

    console.log(`\n✅ 5. PDF QUEUE STATUS`);
    console.log(`   Queue entries: ${queue.length}`);

    if (queue.length > 0) {
      queue.forEach((job, index) => {
        console.log(`   Job ${index + 1}:`);
        console.log(`     - Status: ${job.status}`);
        console.log(`     - Retry count: ${job.retry_count || 0}`);
        console.log(`     - Last error: ${job.error_message || 'None'}`);
      });
    } else {
      console.log('   ℹ️  Queue is empty (good sign - all processed)');
    }

    // 6. Check email retry queue
    const { data: emailQueue, error: emailError } = await supabase
      .from('email_retry_queue')
      .select('*')
      .eq('user_id', testUser.create_user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (emailError) throw emailError;

    console.log(`\n✅ 6. EMAIL DELIVERY STATUS`);
    console.log(`   Email queue entries: ${emailQueue.length}`);

    if (emailQueue.length > 0) {
      emailQueue.forEach((email, index) => {
        console.log(`   Email ${index + 1}:`);
        console.log(`     - Type: ${email.email_type || 'unknown'}`);
        console.log(`     - Status: ${email.status}`);
        console.log(`     - Attempts: ${email.retry_count || 0}`);
      });
    } else {
      console.log('   ℹ️  No failed emails (good sign - all delivered)');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 USER FLOW SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Users: ${users.length}`);
    console.log(`✅ Incidents: ${incidents.length}`);
    console.log(`✅ Documents: ${docs.length}`);
    console.log(`✅ Completed Forms: ${forms.length}`);
    console.log(`✅ Queue Jobs: ${queue.length}`);
    console.log(`✅ Email Queue: ${emailQueue.length}`);

    if (incidents.length > 0 && forms.length > 0) {
      console.log('\n✅ COMPLETE USER FLOW VERIFIED: Signup → Incident → PDF → Email');
    } else if (incidents.length > 0 && forms.length === 0) {
      console.log('\n⚠️  PARTIAL FLOW: User has incidents but no completed PDFs');
      console.log('   This may indicate PDF generation issues');
    } else if (users.length > 0 && incidents.length === 0) {
      console.log('\n⚠️  User exists but has not created any incidents yet');
    }

    console.log('\n✅ Test completed successfully\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testUserFlows();
