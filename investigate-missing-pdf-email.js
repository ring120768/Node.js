#!/usr/bin/env node

/**
 * Investigate Missing PDF Email
 *
 * PDF queue shows completed but email not sent to user/admin/accounts
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = '30d82d89-42d5-406a-9b7d-83345d972f61';

async function investigate() {
  console.log('🔍 Investigating missing PDF email for user:', USER_ID);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // ========================================
    // 1. Check PDF Generation Queue
    // ========================================
    console.log('📋 Step 1: PDF Generation Queue Status\n');

    const { data: queueData, error: queueError } = await supabase
      .from('pdf_generation_queue')
      .select('*')
      .eq('create_user_id', USER_ID)
      .order('created_at', { ascending: false })
      .limit(5);

    if (queueError) {
      console.error('❌ Error fetching queue:', queueError.message);
    } else if (queueData && queueData.length > 0) {
      console.log(`Found ${queueData.length} queue record(s):\n`);
      queueData.forEach((record, i) => {
        console.log(`Record ${i + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  Status: ${record.status}`);
        console.log(`  Attempts: ${record.attempts}`);
        console.log(`  Created: ${new Date(record.created_at).toLocaleString('en-GB')}`);
        console.log(`  Updated: ${record.updated_at ? new Date(record.updated_at).toLocaleString('en-GB') : 'NULL'}`);
        console.log(`  Error: ${record.last_error || 'None'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No queue records found\n');
    }

    // ========================================
    // 2. Check Completed Incident Forms
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 Step 2: Completed Incident Forms\n');

    const { data: formsData, error: formsError } = await supabase
      .from('completed_incident_forms')
      .select('*')
      .eq('create_user_id', USER_ID)
      .order('created_at', { ascending: false })
      .limit(5);

    if (formsError) {
      console.error('❌ Error fetching forms:', formsError.message);
    } else if (formsData && formsData.length > 0) {
      console.log(`Found ${formsData.length} form record(s):\n`);
      formsData.forEach((record, i) => {
        console.log(`Record ${i + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  incident_id: ${record.incident_id || '❌ NULL'}`);
        console.log(`  storage_path: ${record.storage_path || '❌ NULL'}`);
        console.log(`  email_sent: ${record.email_sent ? '✅ true' : '❌ false'}`);
        console.log(`  sent_to_user: ${record.sent_to_user ? '✅ true' : '❌ false'}`);
        console.log(`  sent_to_accounts: ${record.sent_to_accounts ? '✅ true' : '❌ false'}`);
        console.log(`  Created: ${new Date(record.created_at).toLocaleString('en-GB')}`);
        console.log(`  error_message: ${record.error_message || 'None'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No completed forms found\n');
    }

    // ========================================
    // 3. Check Email Retry Queue
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Step 3: Email Retry Queue\n');

    const { data: emailQueue, error: emailQueueError } = await supabase
      .from('email_retry_queue')
      .select('*')
      .eq('create_user_id', USER_ID)
      .order('created_at', { ascending: false })
      .limit(5);

    if (emailQueueError) {
      console.error('❌ Error fetching email queue:', emailQueueError.message);
    } else if (emailQueue && emailQueue.length > 0) {
      console.log(`Found ${emailQueue.length} email queue record(s):\n`);
      emailQueue.forEach((record, i) => {
        console.log(`Record ${i + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  Status: ${record.status}`);
        console.log(`  Attempts: ${record.attempts}`);
        console.log(`  Created: ${new Date(record.created_at).toLocaleString('en-GB')}`);
        console.log(`  Error: ${record.last_error || 'None'}`);
        console.log('');
      });
    } else {
      console.log('✅ No email queue records (expected if email succeeded)\n');
    }

    // ========================================
    // 4. Check Incident Reports (for pdf_sent_at)
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Step 4: Incident Reports (PDF Send Guard)\n');

    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('id, pdf_sent_at, pdf_send_in_progress, pdf_send_started_at, created_at')
      .eq('create_user_id', USER_ID)
      .order('created_at', { ascending: false })
      .limit(5);

    if (incidentError) {
      console.error('❌ Error fetching incidents:', incidentError.message);
    } else if (incidentData && incidentData.length > 0) {
      console.log(`Found ${incidentData.length} incident record(s):\n`);
      incidentData.forEach((record, i) => {
        console.log(`Record ${i + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  pdf_sent_at: ${record.pdf_sent_at || '❌ NULL (not sent)'}`);
        console.log(`  pdf_send_in_progress: ${record.pdf_send_in_progress ? '⚠️ true' : '✅ false'}`);
        console.log(`  pdf_send_started_at: ${record.pdf_send_started_at || 'NULL'}`);
        console.log(`  Created: ${new Date(record.created_at).toLocaleString('en-GB')}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No incident records found\n');
    }

    // ========================================
    // 5. Check User Signup Info
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Step 5: User Signup Info\n');

    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('create_user_id, name, surname, email')
      .eq('create_user_id', USER_ID)
      .single();

    if (userError) {
      console.error('❌ Error fetching user:', userError.message);
    } else if (userData) {
      console.log('User Info:');
      console.log(`  Name: ${userData.name} ${userData.surname}`);
      console.log(`  Email: ${userData.email}`);
      console.log(`  User ID: ${userData.create_user_id}`);
    } else {
      console.log('⚠️  User not found\n');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Analyze the situation
    if (formsData && formsData.length > 0) {
      const latestForm = formsData[0];

      console.log('Latest PDF Generation:');
      console.log(`  PDF Generated: ${latestForm.storage_path ? '✅ YES' : '❌ NO'}`);
      console.log(`  Email Sent Flag: ${latestForm.email_sent ? '✅ true' : '❌ false'}`);
      console.log(`  Sent to User: ${latestForm.sent_to_user ? '✅ true' : '❌ false'}`);
      console.log(`  Sent to Accounts: ${latestForm.sent_to_accounts ? '✅ true' : '❌ false'}`);
      console.log('');

      if (latestForm.storage_path && !latestForm.email_sent) {
        console.log('🚨 ISSUE IDENTIFIED:');
        console.log('   PDF was generated and stored successfully');
        console.log('   BUT email_sent flag is FALSE');
        console.log('');
        console.log('💡 Possible causes:');
        console.log('   1. Email sending failed silently');
        console.log('   2. sendEmails() function threw error but was caught');
        console.log('   3. Email service (Resend) failed without retrying');
        console.log('   4. SMTP credentials incorrect');
        console.log('');
      }
    }

    if (queueData && queueData.length > 0) {
      const latestQueue = queueData[0];
      console.log(`PDF Queue Status: ${latestQueue.status}`);
      console.log(`Attempts: ${latestQueue.attempts}`);
      if (latestQueue.last_error) {
        console.log(`Last Error: ${latestQueue.last_error}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('\n💥 Investigation failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

investigate();
