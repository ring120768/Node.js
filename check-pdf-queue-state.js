/**
 * Debug script to check PDF generation queue and related tables state
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkState() {
  console.log('\n=== PDF QUEUE STATE DEBUG ===\n');

  // 1. Check pdf_generation_queue
  console.log('📥 PDF Generation Queue:');
  const { data: queueData, error: queueError } = await supabase
    .from('pdf_generation_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (queueError) {
    console.error('Error:', queueError.message);
  } else if (queueData?.length === 0) {
    console.log('  (empty)');
  } else {
    queueData.forEach(q => {
      console.log(`  ID: ${q.id}`);
      console.log(`    User: ${q.create_user_id}`);
      console.log(`    Incident: ${q.incident_id || 'NULL'}`);
      console.log(`    Status: ${q.status}`);
      console.log(`    Source: ${q.source}`);
      console.log(`    Attempts: ${q.attempt_count}`);
      console.log(`    Completed Form ID: ${q.completed_form_id || 'NULL'}`);
      console.log(`    Last Error: ${q.last_error || 'none'}`);
      console.log(`    Created: ${q.created_at}`);
      console.log(`    Completed: ${q.completed_at || 'not completed'}`);
      console.log('');
    });
  }

  // 2. Check completed_incident_forms
  console.log('\n📄 Completed Incident Forms:');
  const { data: formsData, error: formsError } = await supabase
    .from('completed_incident_forms')
    .select('id, create_user_id, incident_id, generated_at, sent_to_user, sent_to_accounts, email_status, pdf_storage_path')
    .order('generated_at', { ascending: false })
    .limit(10);

  if (formsError) {
    console.error('Error:', formsError.message);
  } else if (formsData?.length === 0) {
    console.log('  (empty - NO PDFs have been generated!)');
  } else {
    formsData.forEach(f => {
      console.log(`  ID: ${f.id}`);
      console.log(`    User: ${f.create_user_id}`);
      console.log(`    Incident: ${f.incident_id || 'NULL'}`);
      console.log(`    Generated: ${f.generated_at}`);
      console.log(`    Sent to User: ${f.sent_to_user}`);
      console.log(`    Sent to Accounts: ${f.sent_to_accounts}`);
      console.log(`    PDF Storage: ${f.pdf_storage_path || 'NOT STORED'}`);
      console.log(`    Email Status: ${JSON.stringify(f.email_status)}`);
      console.log('');
    });
  }

  // 3. Check incidents with declaration
  console.log('\n🚗 Incidents with Declaration:');
  const { data: incidentsData, error: incidentsError } = await supabase
    .from('incident_reports')
    .select('id, create_user_id, declaration_consent, declaration_timestamp, pdf_sent_at, pdf_send_in_progress, created_at')
    .eq('declaration_consent', true)
    .order('declaration_timestamp', { ascending: false })
    .limit(10);

  if (incidentsError) {
    console.error('Error:', incidentsError.message);
  } else if (incidentsData?.length === 0) {
    console.log('  (no incidents with declaration_consent = true)');
  } else {
    incidentsData.forEach(i => {
      console.log(`  ID: ${i.id}`);
      console.log(`    User: ${i.create_user_id}`);
      console.log(`    Declaration Timestamp: ${i.declaration_timestamp}`);
      console.log(`    PDF Sent At: ${i.pdf_sent_at || 'NOT SENT'}`);
      console.log(`    PDF In Progress: ${i.pdf_send_in_progress}`);
      console.log(`    Created: ${i.created_at}`);
      console.log('');
    });
  }

  // 4. Check email retry queue
  console.log('\n📧 Email Retry Queue:');
  const { data: emailData, error: emailError } = await supabase
    .from('email_retry_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (emailError) {
    console.error('Error:', emailError.message);
  } else if (emailData?.length === 0) {
    console.log('  (empty)');
  } else {
    emailData.forEach(e => {
      console.log(`  ID: ${e.id}`);
      console.log(`    User: ${e.create_user_id}`);
      console.log(`    Email Type: ${e.email_type}`);
      console.log(`    Status: ${e.status}`);
      console.log(`    Recipient: ${e.recipient_email}`);
      console.log(`    Attempts: ${e.attempt_count}`);
      console.log(`    Last Error: ${e.last_error || 'none'}`);
      console.log('');
    });
  }

  // 5. Summary
  console.log('\n=== SUMMARY ===');
  const pendingQueue = (queueData || []).filter(q => q.status === 'pending').length;
  const completedQueue = (queueData || []).filter(q => q.status === 'completed').length;
  const failedQueue = (queueData || []).filter(q => q.status === 'failed').length;

  console.log(`Queue: ${pendingQueue} pending, ${completedQueue} completed, ${failedQueue} failed`);
  console.log(`Completed Forms: ${formsData?.length || 0}`);
  console.log(`Incidents with Declaration: ${incidentsData?.length || 0}`);
  console.log(`Email Retries: ${emailData?.length || 0}`);

  // Check for the specific issue
  const completedWithNullFormId = (queueData || []).filter(
    q => q.status === 'completed' && !q.completed_form_id
  );

  if (completedWithNullFormId.length > 0) {
    console.log(`\n⚠️  ISSUE DETECTED: ${completedWithNullFormId.length} queue entries marked 'completed' but have NULL completed_form_id`);
    console.log('   This means the PDF was never actually generated!');
  }
}

checkState()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
