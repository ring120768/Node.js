#!/usr/bin/env node
/**
 * Process Email Retry Queue
 *
 * This script processes pending email retries from the queue.
 * Run by cron every 2 minutes alongside PDF queue processing.
 *
 * Features:
 * - Processes up to 10 emails per run
 * - Exponential backoff for failed sends
 * - Logs all activity for monitoring
 *
 * Usage:
 *   node scripts/process-email-queue.js
 *
 * Environment:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key
 *   SMTP_HOST, SMTP_USER, SMTP_PASS - SMTP configuration
 */

require('dotenv').config();

const logger = {
  info: (msg, meta = {}) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : ''),
  success: (msg, meta = {}) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : ''),
  warn: (msg, meta = {}) => console.warn(`\x1b[33m[WARN]\x1b[0m ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : ''),
  error: (msg, meta = {}) => console.error(`\x1b[31m[ERROR]\x1b[0m ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '')
};

async function main() {
  logger.info('📧 Starting Email Retry Queue Processor');

  // Validate environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Check for either SMTP or Resend configuration
  const hasSmtp = process.env.SMTP_USER && process.env.SMTP_PASS;
  const hasResend = process.env.RESEND_API_KEY;

  if (!hasSmtp && !hasResend) {
    logger.warn('Email not configured (need SMTP or RESEND_API_KEY) - email retry queue will not process');
    process.exit(0);
  }

  logger.info(`📨 Email provider: ${hasResend ? 'Resend' : 'SMTP'}`);

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Import and initialize the email retry service
    const emailRetryService = require('../src/services/emailRetryService');
    emailRetryService.initialize(supabase);

    // Check if table exists
    const tableExists = await emailRetryService.checkTableExists();
    if (!tableExists) {
      logger.warn('email_retry_queue table does not exist - run migration first');
      process.exit(0);
    }

    // Process the queue
    const result = await emailRetryService.processQueue();

    logger.info('📊 Email queue processing complete', {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed
    });

    // Get current queue stats
    const stats = await emailRetryService.getQueueStats();
    if (stats) {
      logger.info('📈 Queue status (last 24h)', stats);
    }

    process.exit(0);

  } catch (error) {
    logger.error('Failed to process email queue', { error: error.message });
    process.exit(1);
  }
}

main();
