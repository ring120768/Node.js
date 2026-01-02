/**
 * Email Retry Service
 * Handles queuing and retrying failed email sends with exponential backoff
 * Uses Resend via lib/emailService.js
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Import the shared email service (uses Resend)
const { sendEmail, loadTemplate, replacePlaceholders } = require('../../lib/emailService');

// Retry intervals in seconds (exponential backoff)
const RETRY_INTERVALS = [
  60,       // 1 minute
  300,      // 5 minutes
  900,      // 15 minutes
  3600,     // 1 hour
  14400     // 4 hours
];

const MAX_ATTEMPTS = 5;
const PDF_SEND_LOCK_TTL_MS = 30 * 60 * 1000;

let supabase = null;
let tableExists = null; // Cache table existence check

function isSendLockStale(startedAt) {
  if (!startedAt) return true;
  return Date.now() - new Date(startedAt).getTime() > PDF_SEND_LOCK_TTL_MS;
}

async function getIncidentSendState(incidentId) {
  if (!supabase || !incidentId) return null;

  const { data, error } = await supabase
    .from('incident_reports')
    .select('id, pdf_sent_at, pdf_send_in_progress, pdf_send_started_at')
    .eq('id', incidentId)
    .single();

  if (error) {
    logger.warn('Failed to fetch incident send state', { incidentId, error: error.message });
    return null;
  }

  return data;
}

async function tryAcquirePdfSendLock(incidentId) {
  if (!supabase || !incidentId) {
    return { acquired: false, reason: 'missing' };
  }

  const now = new Date();
  const staleBefore = new Date(Date.now() - PDF_SEND_LOCK_TTL_MS);

  // First, check current state to determine if we can acquire lock
  const { data: current, error: fetchError } = await supabase
    .from('incident_reports')
    .select('id, pdf_sent_at, pdf_send_in_progress, pdf_send_started_at')
    .eq('id', incidentId)
    .single();

  if (fetchError) {
    logger.error('Failed to fetch incident for PDF send lock', {
      incidentId,
      error: fetchError.message
    });
    return { acquired: false, reason: 'error' };
  }

  // Already sent - no lock needed
  if (current.pdf_sent_at) {
    return { acquired: false, reason: 'already_sent' };
  }

  // Check if lock is held and not stale
  if (current.pdf_send_in_progress && current.pdf_send_started_at) {
    const lockAge = Date.now() - new Date(current.pdf_send_started_at).getTime();
    if (lockAge < PDF_SEND_LOCK_TTL_MS) {
      return { acquired: false, reason: 'in_progress' };
    }
    // Lock is stale, we can take it
  }

  // Attempt to acquire lock with optimistic locking
  const { data, error } = await supabase
    .from('incident_reports')
    .update({
      pdf_send_in_progress: true,
      pdf_send_started_at: now.toISOString()
    })
    .eq('id', incidentId)
    .is('pdf_sent_at', null)
    .select('id');

  if (error) {
    logger.error('Failed to acquire PDF send lock (email retry)', {
      incidentId,
      error: error.message
    });
    return { acquired: false, reason: 'error' };
  }

  return {
    acquired: Array.isArray(data) && data.length > 0,
    reason: Array.isArray(data) && data.length > 0 ? 'acquired' : 'conflict'
  };
}

async function releasePdfSendLock(incidentId, reason) {
  if (!supabase || !incidentId) return;

  const { error } = await supabase
    .from('incident_reports')
    .update({
      pdf_send_in_progress: false,
      pdf_send_started_at: null
    })
    .eq('id', incidentId);

  if (error) {
    logger.warn('Failed to release PDF send lock (email retry)', {
      incidentId,
      reason,
      error: error.message
    });
  }
}

async function markPdfSent(incidentId) {
  if (!supabase || !incidentId) return;

  const { error } = await supabase
    .from('incident_reports')
    .update({
      pdf_sent_at: new Date().toISOString(),
      pdf_send_in_progress: false,
      pdf_send_started_at: null
    })
    .eq('id', incidentId);

  if (error) {
    logger.warn('Failed to mark incident PDF as sent (email retry)', {
      incidentId,
      error: error.message
    });
  }
}

/**
 * Initialize the service with Supabase client
 */
function initialize(supabaseClient) {
  supabase = supabaseClient;
  tableExists = null; // Reset cache
  logger.info('📧 Email Retry Service initialized');
}

/**
 * Check if email_retry_queue table exists
 */
async function checkTableExists() {
  if (tableExists !== null) return tableExists;

  try {
    const { error } = await supabase
      .from('email_retry_queue')
      .select('id')
      .limit(1);

    tableExists = !error || !error.message.includes('does not exist');

    if (!tableExists) {
      logger.warn('📧 email_retry_queue table does not exist - email retry disabled');
    }

    return tableExists;
  } catch (e) {
    tableExists = false;
    return false;
  }
}

/**
 * Check if Resend is configured
 */
function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Queue a failed email for retry
 *
 * @param {Object} emailData - Email details
 * @param {string} emailData.createUserId - User ID
 * @param {string} emailData.incidentId - Incident ID (optional)
 * @param {string} emailData.completedFormId - Completed form ID (optional)
 * @param {string} emailData.emailType - Type: 'pdf_delivery', 'image_links', 'admin_notification'
 * @param {string} emailData.recipientEmail - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.templateName - Template name (optional)
 * @param {Object} emailData.templateData - Template data (optional)
 * @param {string} emailData.pdfStoragePath - PDF storage path (for pdf_delivery)
 * @param {string} emailData.source - Source of the email request
 * @param {string} emailData.lastError - Last error message
 * @param {number} emailData.priority - Priority (1=highest, 10=default)
 */
async function queueForRetry(emailData) {
  if (!supabase) {
    logger.error('📧 Email Retry Service not initialized');
    return null;
  }

  const exists = await checkTableExists();
  if (!exists) {
    logger.warn('📧 Cannot queue email - table does not exist', {
      type: emailData.emailType,
      recipient: emailData.recipientEmail
    });
    return null;
  }

  const nextRetry = new Date(Date.now() + RETRY_INTERVALS[0] * 1000);

  const queueEntry = {
    create_user_id: emailData.createUserId,
    incident_id: emailData.incidentId || null,
    completed_form_id: emailData.completedFormId || null,
    email_type: emailData.emailType,
    recipient_email: emailData.recipientEmail,
    subject: emailData.subject,
    template_name: emailData.templateName || null,
    template_data: emailData.templateData || null,
    pdf_storage_path: emailData.pdfStoragePath || null,
    source: emailData.source || 'unknown',
    status: 'pending',
    attempt_count: 1,
    last_error: emailData.lastError,
    error_history: [{
      timestamp: new Date().toISOString(),
      attempt: 1,
      error: emailData.lastError
    }],
    next_retry_at: nextRetry.toISOString(),
    priority: emailData.priority || 10
  };

  const { data, error } = await supabase
    .from('email_retry_queue')
    .insert(queueEntry)
    .select()
    .single();

  if (error) {
    logger.error('📧 Failed to queue email for retry', { error: error.message });
    return null;
  }

  logger.info('📧 Email queued for retry', {
    queueId: data.id,
    type: emailData.emailType,
    recipient: emailData.recipientEmail,
    nextRetryAt: nextRetry.toISOString()
  });

  return data;
}

/**
 * Process pending email retries
 * Call this from a cron job or manual trigger
 */
async function processQueue() {
  if (!supabase) {
    logger.warn('📧 Email Retry Service not initialized');
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const exists = await checkTableExists();
  if (!exists) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  if (!isEmailConfigured()) {
    logger.warn('📧 Resend not configured - skipping email retry queue');
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  // Get pending emails ready for retry
  const { data: pendingEmails, error } = await supabase
    .from('email_retry_queue')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lte('next_retry_at', new Date().toISOString())
    .lt('attempt_count', MAX_ATTEMPTS)
    .order('priority', { ascending: true })
    .order('next_retry_at', { ascending: true })
    .limit(10);

  if (error) {
    logger.error('📧 Failed to fetch pending emails', { error: error.message });
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  if (!pendingEmails || pendingEmails.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  logger.info(`📧 Processing ${pendingEmails.length} pending email(s)`);

  let succeeded = 0;
  let failed = 0;

  for (const email of pendingEmails) {
    let sendLockAcquired = false;

    try {
      if (email.email_type === 'pdf_delivery' && email.incident_id) {
        const sendState = await getIncidentSendState(email.incident_id);

        if (sendState?.pdf_sent_at) {
          await supabase
            .from('email_retry_queue')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              last_error: null
            })
            .eq('id', email.id);

          if (email.completed_form_id) {
            await supabase
              .from('completed_incident_forms')
              .update({
                sent_to_user: true,
                email_status: 'sent',
                email_retry_queued: false
              })
              .eq('id', email.completed_form_id);
          }

          succeeded++;
          logger.info('📧 Email retry skipped (already sent)', {
            queueId: email.id,
            incidentId: email.incident_id,
            recipient: email.recipient_email
          });
          continue;
        }

        if (sendState?.pdf_send_in_progress && !isSendLockStale(sendState.pdf_send_started_at)) {
          const nextRetry = new Date(Date.now() + 5 * 60 * 1000);

          await supabase
            .from('email_retry_queue')
            .update({
              status: 'pending',
              next_retry_at: nextRetry.toISOString()
            })
            .eq('id', email.id);

          logger.info('📧 Email retry deferred (send in progress)', {
            queueId: email.id,
            incidentId: email.incident_id,
            nextRetryAt: nextRetry.toISOString()
          });
          continue;
        }

        const lockResult = await tryAcquirePdfSendLock(email.incident_id);
        if (!lockResult.acquired) {
          const nextRetry = new Date(Date.now() + 5 * 60 * 1000);

          await supabase
            .from('email_retry_queue')
            .update({
              status: 'pending',
              next_retry_at: nextRetry.toISOString()
            })
            .eq('id', email.id);

          logger.info('📧 Email retry deferred (lock unavailable)', {
            queueId: email.id,
            incidentId: email.incident_id,
            nextRetryAt: nextRetry.toISOString()
          });
          continue;
        }

        sendLockAcquired = true;
      }

      // Mark as processing
      await supabase
        .from('email_retry_queue')
        .update({
          status: 'processing',
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', email.id);

      // Attempt to send the email
      const success = await retrySendEmail(email);

      if (success) {
        // Mark as completed
        await supabase
          .from('email_retry_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', email.id);

        // Update completed_incident_forms if applicable
        if (email.completed_form_id && email.email_type === 'pdf_delivery') {
          await supabase
            .from('completed_incident_forms')
            .update({
              sent_to_user: true,
              email_status: 'sent',
              email_retry_queued: false
            })
            .eq('id', email.completed_form_id);
        }

        if (email.email_type === 'pdf_delivery' && email.incident_id) {
          await markPdfSent(email.incident_id);
        }

        succeeded++;
        logger.info('📧 Email retry succeeded', {
          queueId: email.id,
          type: email.email_type,
          recipient: email.recipient_email,
          attempts: email.attempt_count + 1
        });
      }
    } catch (sendError) {
      failed++;
      if (sendLockAcquired && email.incident_id) {
        await releasePdfSendLock(email.incident_id, 'retry-failed');
      }
      await handleRetryFailure(email, sendError);
    }
  }

  logger.info('📧 Email retry queue processed', {
    processed: pendingEmails.length,
    succeeded,
    failed
  });

  return { processed: pendingEmails.length, succeeded, failed };
}

/**
 * Handle a failed retry attempt
 */
async function handleRetryFailure(email, error) {
  const newAttemptCount = email.attempt_count + 1;
  const isFinalAttempt = newAttemptCount >= MAX_ATTEMPTS;

  // Calculate next retry with exponential backoff
  const retryIndex = Math.min(newAttemptCount - 1, RETRY_INTERVALS.length - 1);
  const retrySeconds = RETRY_INTERVALS[retryIndex];
  const nextRetry = new Date(Date.now() + retrySeconds * 1000);

  // Update error history
  const errorHistory = [
    ...(email.error_history || []),
    {
      timestamp: new Date().toISOString(),
      attempt: newAttemptCount,
      error: error.message
    }
  ];

  const updateData = {
    status: isFinalAttempt ? 'abandoned' : 'failed',
    attempt_count: newAttemptCount,
    last_error: error.message,
    error_history: errorHistory,
    next_retry_at: isFinalAttempt ? null : nextRetry.toISOString()
  };

  await supabase
    .from('email_retry_queue')
    .update(updateData)
    .eq('id', email.id);

  if (isFinalAttempt) {
    logger.error('📧 Email permanently failed after max attempts', {
      queueId: email.id,
      type: email.email_type,
      recipient: email.recipient_email,
      attempts: newAttemptCount
    });

    // Send admin notification about the permanent failure
    await notifyAdminOfPermanentFailure(email, errorHistory);
  } else {
    logger.warn('📧 Email retry failed, will retry again', {
      queueId: email.id,
      type: email.email_type,
      recipient: email.recipient_email,
      attempt: newAttemptCount,
      nextRetryAt: nextRetry.toISOString()
    });
  }
}

/**
 * Actually send the email (retry attempt)
 */
async function retrySendEmail(email) {
  // For PDF delivery emails, we need to get the PDF from storage
  let attachments = [];

  if (email.email_type === 'pdf_delivery' && email.pdf_storage_path) {
    try {
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from('generated_reports')
        .download(email.pdf_storage_path);

      if (downloadError) {
        throw new Error(`Failed to download PDF: ${downloadError.message}`);
      }

      const buffer = Buffer.from(await pdfData.arrayBuffer());
      attachments.push({
        filename: 'Incident-Report.pdf',
        content: buffer
      });
    } catch (e) {
      logger.error('📧 Failed to get PDF attachment for retry', { error: e.message });
      throw e;
    }
  }

  // Load and process template if specified
  let html = '';
  if (email.template_name && email.template_data) {
    try {
      const template = await loadTemplate(email.template_name);
      html = replacePlaceholders(template, email.template_data);
    } catch (e) {
      logger.warn('📧 Failed to load template, using fallback', { template: email.template_name });
      html = `<p>${email.subject}</p><p>Please contact support if you need assistance.</p>`;
    }
  }

  // Send the email using the shared Resend-based service
  const result = await sendEmail({
    to: email.recipient_email,
    subject: email.subject,
    html: html || `<p>${email.subject}</p>`,
    attachments
  });

  // If send failed, throw with the actual error message so it gets logged
  if (!result.success) {
    throw new Error(result.error || 'Email send failed without error message');
  }

  return true;
}

/**
 * Notify admin when an email permanently fails
 */
async function notifyAdminOfPermanentFailure(email, errorHistory) {
  if (!isEmailConfigured()) return;

  try {
    const errorHistoryHtml = errorHistory.map(e =>
      `<tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${e.attempt}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(e.timestamp).toLocaleString('en-GB')}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${e.error}</td>
      </tr>`
    ).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1>Email Delivery Permanently Failed</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <p><strong>Email Type:</strong> ${email.email_type}</p>
            <p><strong>Recipient:</strong> ${email.recipient_email}</p>
            <p><strong>User ID:</strong> ${email.create_user_id}</p>
            <p><strong>Subject:</strong> ${email.subject}</p>
            <p><strong>Attempts:</strong> ${errorHistory.length}</p>

            <h3>Error History</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background: #eee;">
                <th style="padding: 8px; border: 1px solid #ddd;">Attempt</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Time</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Error</th>
              </tr>
              ${errorHistoryHtml}
            </table>

            <p style="margin-top: 20px; color: #dc3545;">
              <strong>Action Required:</strong> This user did not receive their email.
              Manual intervention may be needed.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@carcrashlawyerai.com';

    await sendEmail({
      to: adminEmail,
      subject: `Email Delivery Failed - ${email.email_type} to ${email.recipient_email}`,
      html
    });

    logger.info('📧 Admin notified of permanent email failure');
  } catch (e) {
    logger.error('📧 Failed to notify admin of email failure', { error: e.message });
  }
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  if (!supabase || !(await checkTableExists())) {
    return null;
  }

  const { data, error } = await supabase
    .from('email_retry_queue')
    .select('status')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) return null;

  const stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    abandoned: 0
  };

  for (const row of data || []) {
    if (stats[row.status] !== undefined) {
      stats[row.status]++;
    }
  }

  return stats;
}

/**
 * Manually retry a specific email
 */
async function retryEmailById(queueId) {
  if (!supabase || !(await checkTableExists())) {
    return { success: false, error: 'Service not available' };
  }

  const { data: email, error } = await supabase
    .from('email_retry_queue')
    .select('*')
    .eq('id', queueId)
    .single();

  if (error || !email) {
    return { success: false, error: 'Email not found in queue' };
  }

  if (email.status === 'completed') {
    return { success: false, error: 'Email already delivered' };
  }

  try {
    const success = await retrySendEmail(email);

    if (success) {
      await supabase
        .from('email_retry_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', queueId);

      return { success: true };
    } else {
      return { success: false, error: 'Send failed' };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  initialize,
  queueForRetry,
  processQueue,
  getQueueStats,
  retryEmailById,
  checkTableExists
};
