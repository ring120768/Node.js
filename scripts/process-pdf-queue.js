#!/usr/bin/env node
/**
 * Process PDF Generation Queue
 *
 * This script processes pending PDF generation jobs from the queue.
 * Run by cron every 2 minutes to ensure failed PDFs are retried promptly.
 *
 * Features:
 * - Processes up to 10 jobs per run
 * - Exponential backoff for failed jobs
 * - Logs all activity for monitoring
 *
 * Usage:
 *   node scripts/process-pdf-queue.js
 *
 * Environment:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key
 */

require('dotenv').config();

// Configure logger
const logger = {
  info: (msg, meta = {}) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : ''),
  success: (msg, meta = {}) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : ''),
  warn: (msg, meta = {}) => console.warn(`\x1b[33m[WARN]\x1b[0m ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : ''),
  error: (msg, meta = {}) => console.error(`\x1b[31m[ERROR]\x1b[0m ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '')
};

async function main() {
  logger.info('📤 Starting PDF Queue Processor');

  // Validate environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  try {
    // Import the queue service (after dotenv is loaded)
    const pdfQueueService = require('../src/services/pdfQueueService');

    // Process the queue
    const result = await pdfQueueService.processQueue(10);

    logger.info('📊 Queue processing complete', {
      processed: result.processed,
      success: result.success,
      failed: result.failed
    });

    // Get current queue stats
    const stats = await pdfQueueService.getStats();
    if (stats) {
      logger.info('📈 Queue status', stats);
    }

    // Cleanup old completed jobs (older than 30 days)
    await pdfQueueService.cleanupOldJobs(30);

    process.exit(0);

  } catch (error) {
    logger.error('Failed to process PDF queue', { error: error.message });
    process.exit(1);
  }
}

main();
