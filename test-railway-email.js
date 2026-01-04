#!/usr/bin/env node

/**
 * End-to-End Railway Email Test Script
 *
 * This script tests the FULL production email pipeline via Railway:
 * 1. Generates PDF for a user
 * 2. Uploads PDF to Supabase storage (like production does)
 * 3. Creates a queue entry for Railway to process
 * 4. Monitors the queue until Railway sends the email
 *
 * Usage: node test-railway-email.js [user_id] [--bcc=email@example.com]
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const adobePdfFormFillerService = require('./src/services/adobePdfFormFillerService');
const { fetchAllData } = require('./lib/dataFetcher');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRailwayEmail() {
  log('\n========================================', 'cyan');
  log('  Railway Email End-to-End Test', 'cyan');
  log('========================================\n', 'cyan');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const userId = args.find(a => !a.startsWith('--'));
  const bccArg = args.find(a => a.startsWith('--bcc='));
  const bcc = bccArg ? bccArg.split('=')[1] : null;

  if (!userId) {
    log('Usage: node test-railway-email.js [user_id] [--bcc=email@example.com]', 'yellow');
    log('\nExample: node test-railway-email.js 30d82d89-42d5-406a-9b7d-83345d972f61 --bcc=admin@example.com\n', 'yellow');
    process.exit(1);
  }

  try {
    // ========================================
    // Step 1: Generate PDF
    // ========================================
    log('Step 1: Generating PDF...', 'blue');

    const allData = await fetchAllData(userId);
    if (!allData.user) {
      throw new Error('User not found in database');
    }

    const userName = `${allData.user.name || 'Unknown'} ${allData.user.surname || ''}`.trim();
    const userEmail = allData.user.email;

    log(`   User: ${userName}`, 'green');
    log(`   Email: ${userEmail}`, 'green');

    const result = await adobePdfFormFillerService.fillPdfForm(allData);
    const pdfBuffer = result.pdfBuffer;
    log(`   PDF Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`, 'green');
    log(`   Pages: ${result.pageCount || 'unknown'}`, 'green');
    log('✅ PDF generated successfully\n', 'green');

    // ========================================
    // Step 2: Upload to Supabase Storage
    // ========================================
    log('Step 2: Uploading PDF to Supabase storage...', 'blue');

    const timestamp = Date.now();
    const storagePath = `completed_forms/${userId}/report_${timestamp}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated_reports')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    log(`   Storage path: ${storagePath}`, 'green');
    log('✅ PDF uploaded to storage\n', 'green');

    // ========================================
    // Step 3: Create Queue Entry
    // ========================================
    log('Step 3: Creating queue entry for Railway...', 'blue');

    const queueEntry = {
      create_user_id: userId,
      incident_id: allData.currentIncident?.id || null,
      completed_form_id: null,
      email_type: 'pdf_delivery',
      recipient_email: userEmail,
      subject: `Your Car Crash Lawyer AI Incident Report - Railway Test ${new Date().toLocaleTimeString('en-GB')}`,
      template_name: null,
      template_data: null,
      pdf_storage_path: storagePath,
      status: 'pending',
      attempt_count: 0,
      max_attempts: 5,
      next_retry_at: new Date().toISOString(),
      error_history: [],
      source: 'railway-test',
      priority: 10  // High priority for testing
    };

    const { data: insertedQueue, error: queueError } = await supabase
      .from('email_retry_queue')
      .insert(queueEntry)
      .select()
      .single();

    if (queueError) {
      throw new Error(`Queue insert failed: ${queueError.message}`);
    }

    const queueId = insertedQueue.id;
    log(`   Queue ID: ${queueId}`, 'green');
    log(`   Recipient: ${userEmail}`, 'green');
    if (bcc) {
      log(`   Note: BCC not supported in queue table`, 'yellow');
    }
    log('✅ Queue entry created\n', 'green');

    // ========================================
    // Step 4: Monitor Queue
    // ========================================
    log('Step 4: Waiting for Railway to process...', 'blue');
    log('   Railway cron runs every 2 minutes', 'cyan');
    log('   Press Ctrl+C to stop monitoring\n', 'cyan');

    const startTime = Date.now();
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes max
    let lastStatus = 'pending';
    let checkCount = 0;

    while (Date.now() - startTime < maxWaitTime) {
      checkCount++;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      const { data: queueStatus, error: statusError } = await supabase
        .from('email_retry_queue')
        .select('status, attempt_count, last_error, last_attempt_at, completed_at')
        .eq('id', queueId)
        .single();

      if (statusError) {
        log(`   Error checking status: ${statusError.message}`, 'red');
        continue;
      }

      if (queueStatus.status !== lastStatus) {
        lastStatus = queueStatus.status;

        if (queueStatus.status === 'completed') {
          log(`\n✅ SUCCESS! Email sent by Railway`, 'green');
          log(`   Completed at: ${queueStatus.completed_at}`, 'green');
          log(`   Attempts: ${queueStatus.attempt_count}`, 'green');
          log(`   Total wait: ${elapsed} seconds`, 'green');

          // Cleanup: delete test PDF from storage
          log('\n🧹 Cleaning up test PDF from storage...', 'cyan');
          await supabase.storage.from('generated_reports').remove([storagePath]);
          log('   Test PDF deleted', 'cyan');

          log('\n========================================', 'green');
          log('  🎉 Railway Email Test PASSED', 'green');
          log('========================================\n', 'green');
          return;
        }

        if (queueStatus.status === 'failed' || queueStatus.status === 'abandoned') {
          log(`\n❌ FAILED: Email delivery failed`, 'red');
          log(`   Status: ${queueStatus.status}`, 'red');
          log(`   Attempts: ${queueStatus.attempt_count}`, 'red');
          log(`   Last Error: ${queueStatus.last_error}`, 'red');

          log('\n========================================', 'red');
          log('  ❌ Railway Email Test FAILED', 'red');
          log('========================================\n', 'red');

          // Keep the PDF for debugging
          log(`   PDF retained for debugging: ${storagePath}`, 'yellow');
          process.exit(1);
        }

        if (queueStatus.status === 'processing') {
          log(`   [${elapsed}s] Railway is processing...`, 'yellow');
        }
      }

      // Show progress every 15 seconds
      if (checkCount % 3 === 0) {
        process.stdout.write(`\r   [${elapsed}s] Waiting... (status: ${queueStatus.status}, attempts: ${queueStatus.attempt_count})`);
      }

      await sleep(5000); // Check every 5 seconds
    }

    // Timeout
    log('\n\n⏰ Timeout: Railway did not process within 5 minutes', 'yellow');
    log('   The queue entry is still pending and will be processed by Railway', 'yellow');
    log(`   Queue ID: ${queueId}`, 'yellow');
    log('\n   To check status later:', 'cyan');
    log(`   node -e "require('dotenv').config(); const s = require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); s.from('email_retry_queue').select('status,attempt_count,last_error').eq('id','${queueId}').single().then(r => console.log(r.data));"`, 'cyan');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testRailwayEmail();
