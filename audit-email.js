#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function audit() {
  const userId = '62afcde2-80f4-4442-a993-861ed7169d59';

  // Get all recent completed forms
  const { data: forms } = await supabase
    .from('completed_incident_forms')
    .select('id, created_at, sent_to_user, sent_to_accounts, email_status, pdf_storage_path')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('=== COMPLETED FORMS (Last 5) ===');
  forms?.forEach((f, i) => {
    console.log(`\n#${i + 1} - ${f.id}`);
    console.log('  Created:', f.created_at);
    console.log('  Sent to user:', f.sent_to_user);
    console.log('  Sent to accounts:', f.sent_to_accounts);
    console.log('  PDF path:', f.pdf_storage_path ? '✅ ' + f.pdf_storage_path.substring(0, 60) : '❌ Missing');
    console.log('  Email status:', JSON.stringify(f.email_status));
  });

  // Check PDF generation queue
  const { data: queue } = await supabase
    .from('pdf_generation_queue')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('\n=== PDF GENERATION QUEUE (Last 3) ===');
  queue?.forEach((q, i) => {
    console.log(`\n#${i + 1} - ${q.id}`);
    console.log('  Status:', q.status);
    console.log('  Attempts:', q.attempt_count);
    console.log('  Last error:', q.last_error || 'None');
    console.log('  Created:', q.created_at);
  });

  // Check email retry queue
  const { data: emailQueue } = await supabase
    .from('email_retry_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n=== EMAIL RETRY QUEUE (Last 5) ===');
  if (!emailQueue || emailQueue.length === 0) {
    console.log('Empty');
  } else {
    emailQueue.forEach((e, i) => {
      console.log(`\n#${i + 1} - ${e.id}`);
      console.log('  Status:', e.status);
      console.log('  Attempts:', e.attempts);
      console.log('  Last error:', e.last_error ? e.last_error.substring(0, 100) : 'None');
    });
  }
}

audit().catch(console.error);
