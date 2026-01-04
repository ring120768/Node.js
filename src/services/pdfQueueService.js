/**
 * PDF Queue Service
 *
 * Manages a reliable queue for PDF generation with automatic retry.
 * Ensures PDFs are always generated even if initial attempt fails.
 * Guaranteed delivery within 24 hours or admin notification.
 *
 * Features:
 * - Queues PDF generation jobs instead of fire-and-forget
 * - Retries spread over 24 hours (5min, 1hr, 4hr, 8hr, 12hr)
 * - Error tracking and history
 * - Early warning emails on EVERY failed attempt (to admin@carcrashlawyerai.com)
 * - Critical alert if all attempts fail (abandoned job)
 * - Automatic cleanup of old completed jobs
 *
 * Email Notifications:
 * - Attempt 1-4 fails: Early warning email (yellow/orange header)
 * - Attempt 5 fails: Critical alert email (red header, action required)
 *
 * Usage:
 *   const pdfQueue = require('./services/pdfQueueService');
 *   await pdfQueue.enqueue(userId, incidentId, 'incident-form-submission');
 */

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const config = require('../config');

// Initialize Supabase client
let supabase = null;
if (config.supabase.url && config.supabase.serviceKey) {
  supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Admin email from config
const ADMIN_EMAIL = config.smtp.adminEmail;

// Cache table existence check
let tableExists = null;

/**
 * Check if pdf_generation_queue table exists
 */
async function checkTableExists() {
  if (tableExists !== null) return tableExists;

  try {
    const { error } = await supabase
      .from('pdf_generation_queue')
      .select('id')
      .limit(1);

    tableExists = !error || !error.message.includes('does not exist');

    if (!tableExists) {
      logger.warn('📥 PDF Queue: pdf_generation_queue table does not exist - queue disabled');
    }

    return tableExists;
  } catch (e) {
    tableExists = false;
    return false;
  }
}

// Retry intervals in seconds - spread over 24 hours for bandwidth considerations
// Total coverage: ~25 hours (5min + 1hr + 4hr + 8hr + 12hr)
const RETRY_INTERVALS = [
  300,      // 5 minutes  - quick retry for transient errors
  3600,     // 1 hour     - give time for bandwidth to recover
  14400,    // 4 hours    - mid-day retry
  28800,    // 8 hours    - evening/overnight retry
  43200     // 12 hours   - final attempt next day
];

const MAX_ATTEMPTS = 5;

/**
 * Add a PDF generation job to the queue
 *
 * @param {string} createUserId - User ID (UUID)
 * @param {string} incidentId - Incident ID (UUID, optional)
 * @param {string} source - What triggered this job
 * @returns {Object} - The created queue entry
 */
async function enqueue(createUserId, incidentId = null, source = 'incident-form-submission') {
  if (!supabase) {
    logger.error('PDF Queue: Supabase not configured');
    return null; // Return null instead of throwing - allows immediate attempt to proceed
  }

  // Check if table exists before attempting operations
  const exists = await checkTableExists();
  if (!exists) {
    logger.warn('📥 PDF Queue: Cannot queue job - table does not exist', {
      createUserId,
      source
    });
    return null; // Return null - caller should proceed with immediate attempt
  }

  logger.info('📥 PDF Queue: Adding job', { createUserId, incidentId, source });

  // Check if there's already a pending job for this user
  const { data: existing } = await supabase
    .from('pdf_generation_queue')
    .select('id, status, attempt_count')
    .eq('create_user_id', createUserId)
    .in('status', ['pending', 'processing'])
    .single();

  if (existing) {
    logger.info('📥 PDF Queue: Job already exists', {
      createUserId,
      existingJobId: existing.id,
      status: existing.status
    });
    return existing;
  }

  const { data, error } = await supabase
    .from('pdf_generation_queue')
    .insert({
      create_user_id: createUserId,
      incident_id: incidentId,
      source,
      status: 'pending',
      attempt_count: 0,
      max_attempts: MAX_ATTEMPTS,
      next_retry_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    logger.error('📥 PDF Queue: Failed to enqueue job', { error: error.message, createUserId });
    throw error;
  }

  logger.success('📥 PDF Queue: Job added', { jobId: data.id, createUserId });
  return data;
}

/**
 * Process pending jobs in the queue
 * Called by cron job at regular intervals
 *
 * @param {number} batchSize - Max jobs to process at once
 * @returns {Object} - Processing results
 */
async function processQueue(batchSize = 10) {
  if (!supabase) {
    logger.error('PDF Queue: Supabase not configured');
    return { processed: 0, success: 0, failed: 0 };
  }

  // Check if table exists
  const exists = await checkTableExists();
  if (!exists) {
    return { processed: 0, success: 0, failed: 0 };
  }

  const now = new Date().toISOString();

  // Fetch pending jobs that are ready for retry
  const { data: jobs, error } = await supabase
    .from('pdf_generation_queue')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lte('next_retry_at', now)
    .lt('attempt_count', MAX_ATTEMPTS)
    .order('next_retry_at', { ascending: true })
    .limit(batchSize);

  if (error) {
    logger.error('PDF Queue: Failed to fetch jobs', { error: error.message });
    return { processed: 0, success: 0, failed: 0 };
  }

  if (!jobs || jobs.length === 0) {
    logger.debug('PDF Queue: No pending jobs');
    return { processed: 0, success: 0, failed: 0 };
  }

  logger.info(`📤 PDF Queue: Processing ${jobs.length} job(s)`);

  let success = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await processJob(job);
      success++;
    } catch (error) {
      failed++;
      logger.error('PDF Queue: Job processing failed', {
        jobId: job.id,
        createUserId: job.create_user_id,
        error: error.message
      });
    }
  }

  logger.info('📤 PDF Queue: Batch complete', {
    processed: jobs.length,
    success,
    failed
  });

  return { processed: jobs.length, success, failed };
}

/**
 * Process a single PDF generation job
 *
 * @param {Object} job - Queue entry
 */
async function processJob(job) {
  const { id, create_user_id, attempt_count, error_history } = job;

  logger.info('🔄 PDF Queue: Processing job', {
    jobId: id,
    createUserId: create_user_id,
    attempt: attempt_count + 1
  });

  // Mark as processing
  await supabase
    .from('pdf_generation_queue')
    .update({
      status: 'processing',
      last_attempt_at: new Date().toISOString(),
      attempt_count: attempt_count + 1
    })
    .eq('id', id);

  try {
    // Import PDF controller (lazy load to avoid circular deps)
    const pdfController = require('../controllers/pdf.controller');

    // Generate the PDF
    const result = await pdfController.generateUserPDF(create_user_id, 'queue-retry', job.incident_id || null);

    if (result?.already_processing) {
      const nextRetry = new Date(Date.now() + 5 * 60 * 1000);

      await supabase
        .from('pdf_generation_queue')
        .update({
          status: 'pending',
          attempt_count: attempt_count,
          last_error: 'PDF send already in progress',
          next_retry_at: nextRetry.toISOString()
        })
        .eq('id', id);

      logger.info('📥 PDF Queue: Job deferred (send already in progress)', {
        jobId: id,
        createUserId: create_user_id,
        nextRetryAt: nextRetry.toISOString()
      });

      return;
    }

    if (result?.already_sent) {
      await supabase
        .from('pdf_generation_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_form_id: result.form_id || null,
          last_error: null
        })
        .eq('id', id);

      logger.info('✅ PDF Queue: Job completed (already sent)', {
        jobId: id,
        createUserId: create_user_id,
        formId: result.form_id || 'unknown'
      });

      return;
    }

    // Mark as completed
    await supabase
      .from('pdf_generation_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_form_id: result.form_id,
        last_error: null
      })
      .eq('id', id);

    logger.success('✅ PDF Queue: Job completed', {
      jobId: id,
      createUserId: create_user_id,
      formId: result.form_id,
      emailSent: result.email_sent
    });

  } catch (error) {
    // Calculate next retry time with exponential backoff
    const newAttemptCount = attempt_count + 1;
    const retryIntervalIndex = Math.min(newAttemptCount - 1, RETRY_INTERVALS.length - 1);
    const retrySeconds = RETRY_INTERVALS[retryIntervalIndex];
    const nextRetry = new Date(Date.now() + retrySeconds * 1000);

    // Track error in history
    const newHistory = [
      ...(error_history || []),
      {
        timestamp: new Date().toISOString(),
        attempt: newAttemptCount,
        error: error.message
      }
    ];

    // Determine final status
    const isFinalAttempt = newAttemptCount >= MAX_ATTEMPTS;
    const newStatus = isFinalAttempt ? 'abandoned' : 'failed';

    await supabase
      .from('pdf_generation_queue')
      .update({
        status: newStatus,
        last_error: error.message,
        error_history: newHistory,
        next_retry_at: isFinalAttempt ? null : nextRetry.toISOString()
      })
      .eq('id', id);

    if (isFinalAttempt) {
      logger.error('❌ PDF Queue: Job abandoned after max attempts', {
        jobId: id,
        createUserId: create_user_id,
        attempts: newAttemptCount,
        finalError: error.message
      });

      // Send admin notification for abandoned jobs (critical alert)
      await notifyAdminOfFailure(job, error, newHistory);
    } else {
      logger.warn('⚠️ PDF Queue: Job failed, will retry', {
        jobId: id,
        createUserId: create_user_id,
        attempt: newAttemptCount,
        nextRetryAt: nextRetry.toISOString(),
        retryInMinutes: Math.round(retrySeconds / 60),
        error: error.message
      });

      // Send early warning notification on every failed attempt
      await notifyAdminOfAttemptFailure(job, error, newAttemptCount, nextRetry, retrySeconds);
    }

    throw error;
  }
}

/**
 * Get queue status for a user
 *
 * @param {string} createUserId - User ID
 * @returns {Object|null} - Most recent queue entry or null
 */
async function getStatus(createUserId) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('pdf_generation_queue')
    .select('*')
    .eq('create_user_id', createUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Get queue statistics
 *
 * @returns {Object} - Queue stats
 */
async function getStats() {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('pdf_generation_queue')
    .select('status')
    .order('created_at', { ascending: false });

  if (error) return null;

  const stats = {
    total: data.length,
    pending: data.filter(j => j.status === 'pending').length,
    processing: data.filter(j => j.status === 'processing').length,
    completed: data.filter(j => j.status === 'completed').length,
    failed: data.filter(j => j.status === 'failed').length,
    abandoned: data.filter(j => j.status === 'abandoned').length
  };

  return stats;
}

/**
 * Manually retry a failed job
 *
 * @param {string} jobId - Queue entry ID
 * @returns {Object} - Updated queue entry
 */
async function retryJob(jobId) {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  const { data, error } = await supabase
    .from('pdf_generation_queue')
    .update({
      status: 'pending',
      next_retry_at: new Date().toISOString(),
      attempt_count: 0,
      last_error: null,
      error_history: []
    })
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;

  logger.info('🔄 PDF Queue: Job manually reset for retry', { jobId });
  return data;
}

/**
 * Clean up old completed jobs
 *
 * @param {number} daysOld - Delete jobs older than this many days
 */
async function cleanupOldJobs(daysOld = 30) {
  if (!supabase) return;

  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabase
    .from('pdf_generation_queue')
    .delete()
    .eq('status', 'completed')
    .lt('completed_at', cutoff);

  if (!error && count > 0) {
    logger.info(`🧹 PDF Queue: Cleaned up ${count} old completed job(s)`);
  }
}

/**
 * Send admin notification when PDF generation fails after all retry attempts
 *
 * @param {Object} job - The failed queue job
 * @param {Error} error - The final error
 * @param {Array} errorHistory - History of all errors
 */
async function notifyAdminOfFailure(job, error, errorHistory) {
  // Check if SMTP is configured
  if (!config.smtp.enabled) {
    logger.warn('📧 PDF Queue: SMTP not configured - cannot send admin notification');
    return;
  }

  try {
    logger.info('📧 PDF Queue: Sending admin notification for abandoned job', {
      jobId: job.id,
      createUserId: job.create_user_id
    });

    // Fetch user details for the notification
    let userEmail = 'Unknown';
    let userName = 'Unknown';
    if (supabase) {
      const { data: user } = await supabase
        .from('user_signup')
        .select('email, name, surname')
        .eq('create_user_id', job.create_user_id)
        .single();

      if (user) {
        userEmail = user.email || 'Unknown';
        userName = `${user.name || ''} ${user.surname || ''}`.trim() || 'Unknown';
      }
    }

    // Format error history for email
    const errorHistoryHtml = errorHistory.map(e =>
      `<tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${e.attempt}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(e.timestamp).toLocaleString('en-GB')}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${e.error}</td>
      </tr>`
    ).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .alert-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .info-table td { padding: 10px; border-bottom: 1px solid #eee; }
          .info-table td:first-child { font-weight: bold; width: 150px; }
          .error-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .error-table th { background: #f8f9fa; padding: 10px; text-align: left; border: 1px solid #ddd; }
          .action-required { background: #dc3545; color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ PDF Generation Failed</h1>
            <p>All retry attempts exhausted</p>
          </div>

          <div class="content">
            <div class="alert-box">
              <strong>Action Required:</strong> A user's PDF could not be generated after ${MAX_ATTEMPTS} attempts over 24 hours.
              Manual intervention is needed to ensure the user receives their incident report.
            </div>

            <h3>Job Details</h3>
            <table class="info-table">
              <tr>
                <td>Job ID:</td>
                <td><code>${job.id}</code></td>
              </tr>
              <tr>
                <td>User ID:</td>
                <td><code>${job.create_user_id}</code></td>
              </tr>
              <tr>
                <td>User Name:</td>
                <td>${userName}</td>
              </tr>
              <tr>
                <td>User Email:</td>
                <td><a href="mailto:${userEmail}">${userEmail}</a></td>
              </tr>
              <tr>
                <td>Incident ID:</td>
                <td><code>${job.incident_id || 'N/A'}</code></td>
              </tr>
              <tr>
                <td>Source:</td>
                <td>${job.source}</td>
              </tr>
              <tr>
                <td>Created:</td>
                <td>${new Date(job.created_at).toLocaleString('en-GB')}</td>
              </tr>
              <tr>
                <td>Final Error:</td>
                <td style="color: #dc3545;">${error.message}</td>
              </tr>
            </table>

            <h3>Error History (${errorHistory.length} attempts)</h3>
            <table class="error-table">
              <thead>
                <tr>
                  <th>Attempt</th>
                  <th>Timestamp</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                ${errorHistoryHtml}
              </tbody>
            </table>

            <div class="action-required">
              <h4 style="margin: 0 0 10px 0;">🔧 Manual Resolution Steps:</h4>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Check the server logs for detailed error information</li>
                <li>Verify the user's data is complete in the database</li>
                <li>Run: <code>node scripts/send-pdf-email-manual.js ${job.create_user_id}</code></li>
                <li>Contact the user if PDF still cannot be generated</li>
              </ol>
            </div>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This notification was sent automatically by the PDF Queue Service.
              The job has been marked as 'abandoned' in the database.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create transporter using centralized config
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    });

    // Send email
    const result = await transporter.sendMail({
      from: `"Car Crash Lawyer AI - ALERT" <${config.smtp.user}>`,
      to: ADMIN_EMAIL,
      subject: `🚨 PDF Generation Failed - User ${job.create_user_id.substring(0, 8)}... (${MAX_ATTEMPTS} attempts exhausted)`,
      html: htmlContent
    });

    logger.success('📧 PDF Queue: Admin notification sent', {
      jobId: job.id,
      messageId: result.messageId
    });

  } catch (notifyError) {
    // Don't throw - just log the failure
    logger.error('📧 PDF Queue: Failed to send admin notification', {
      jobId: job.id,
      error: notifyError.message
    });
  }
}

/**
 * Send early warning notification when a PDF generation attempt fails
 * This alerts admin to potential issues before all retries are exhausted
 *
 * @param {Object} job - The queue job
 * @param {Error} error - The error that occurred
 * @param {number} attemptNumber - Which attempt this was (1-5)
 * @param {Date} nextRetry - When the next retry will happen
 * @param {number} retrySeconds - Seconds until next retry
 */
async function notifyAdminOfAttemptFailure(job, error, attemptNumber, nextRetry, retrySeconds) {
  // Check if SMTP is configured
  if (!config.smtp.enabled) {
    logger.warn('📧 PDF Queue: SMTP not configured - cannot send early warning notification');
    return;
  }

  try {
    logger.info('📧 PDF Queue: Sending early warning notification', {
      jobId: job.id,
      createUserId: job.create_user_id,
      attempt: attemptNumber
    });

    // Fetch user details for the notification
    let userEmail = 'Unknown';
    let userName = 'Unknown';
    if (supabase) {
      const { data: user } = await supabase
        .from('user_signup')
        .select('email, name, surname')
        .eq('create_user_id', job.create_user_id)
        .single();

      if (user) {
        userEmail = user.email || 'Unknown';
        userName = `${user.name || ''} ${user.surname || ''}`.trim() || 'Unknown';
      }
    }

    // Calculate retry info
    const retryMinutes = Math.round(retrySeconds / 60);
    const retryHours = retryMinutes >= 60 ? Math.round(retryMinutes / 60) : 0;
    const retryTimeDisplay = retryHours > 0 ? `${retryHours} hour(s)` : `${retryMinutes} minute(s)`;
    const attemptsRemaining = MAX_ATTEMPTS - attemptNumber;

    // Determine urgency level based on attempts
    const urgencyColor = attemptNumber <= 2 ? '#ffc107' : '#fd7e14'; // Yellow for early, orange for later
    const urgencyLabel = attemptNumber <= 2 ? 'Early Warning' : 'Warning - Multiple Failures';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${urgencyColor}; color: #000; padding: 15px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .info-table td { padding: 8px; border-bottom: 1px solid #eee; }
          .info-table td:first-child { font-weight: bold; width: 140px; }
          .retry-box { background: #d4edda; border: 1px solid #28a745; padding: 12px; margin: 15px 0; border-radius: 5px; }
          .error-box { background: #f8d7da; border: 1px solid #dc3545; padding: 12px; margin: 15px 0; border-radius: 5px; }
          .progress { display: flex; margin: 15px 0; }
          .progress-dot { width: 30px; height: 30px; border-radius: 50%; margin-right: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
          .dot-failed { background: #dc3545; color: white; }
          .dot-pending { background: #6c757d; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">⚡ PDF Generation - ${urgencyLabel}</h2>
            <p style="margin: 5px 0 0 0;">Attempt ${attemptNumber} of ${MAX_ATTEMPTS} failed</p>
          </div>

          <div class="content">
            <div class="progress">
              ${Array.from({length: MAX_ATTEMPTS}, (_, i) => {
                const num = i + 1;
                const isFailed = num <= attemptNumber;
                return `<div class="progress-dot ${isFailed ? 'dot-failed' : 'dot-pending'}">${num}</div>`;
              }).join('')}
            </div>

            <div class="error-box">
              <strong>Error:</strong> ${error.message}
            </div>

            <div class="retry-box">
              <strong>✅ Auto-Retry Scheduled:</strong> Next attempt in ${retryTimeDisplay}<br>
              <small>At: ${nextRetry.toLocaleString('en-GB')} | ${attemptsRemaining} attempt(s) remaining</small>
            </div>

            <h4>User Details</h4>
            <table class="info-table">
              <tr>
                <td>User ID:</td>
                <td><code>${job.create_user_id}</code></td>
              </tr>
              <tr>
                <td>Name:</td>
                <td>${userName}</td>
              </tr>
              <tr>
                <td>Email:</td>
                <td><a href="mailto:${userEmail}">${userEmail}</a></td>
              </tr>
              <tr>
                <td>Job ID:</td>
                <td><code>${job.id}</code></td>
              </tr>
              <tr>
                <td>Created:</td>
                <td>${new Date(job.created_at).toLocaleString('en-GB')}</td>
              </tr>
            </table>

            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              <strong>No action required yet.</strong> The system will automatically retry.
              You'll receive a critical alert if all ${MAX_ATTEMPTS} attempts fail.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create transporter using centralized config
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    });

    // Send email
    const result = await transporter.sendMail({
      from: `"Car Crash Lawyer AI" <${config.smtp.user}>`,
      to: ADMIN_EMAIL,
      subject: `⚡ PDF Failed (Attempt ${attemptNumber}/${MAX_ATTEMPTS}) - ${userName} - Retry in ${retryTimeDisplay}`,
      html: htmlContent
    });

    logger.success('📧 PDF Queue: Early warning sent', {
      jobId: job.id,
      attempt: attemptNumber,
      messageId: result.messageId
    });

  } catch (notifyError) {
    // Don't throw - just log the failure
    logger.error('📧 PDF Queue: Failed to send early warning', {
      jobId: job.id,
      attempt: attemptNumber,
      error: notifyError.message
    });
  }
}

module.exports = {
  enqueue,
  processQueue,
  processJob,
  getStatus,
  getStats,
  retryJob,
  cleanupOldJobs,
  checkTableExists,
  RETRY_INTERVALS,
  MAX_ATTEMPTS
};
