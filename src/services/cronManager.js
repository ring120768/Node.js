/**
 * Cron Manager Service
 *
 * Manages all scheduled tasks for the dual retention model:
 * - Incident deletion warnings (daily)
 * - Subscription renewal warnings (daily)
 * - S3 backups (daily)
 * - Auto-delete expired incidents (daily)
 * - Auto-delete expired accounts (daily)
 * - Process subscription renewals (daily)
 * - Cleanup old S3 backups (monthly)
 *
 * @version 1.0.0
 * @date 2025-10-17
 */

const cron = require('node-cron');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const logger = require('../utils/logger');

class CronManager {
  constructor() {
    this.jobs = new Map();
    this.isProduction = process.env.NODE_ENV === 'production';
    this.enabled = process.env.CRON_ENABLED !== 'false'; // Enabled by default
  }

  /**
   * Execute a script and log results
   */
  async executeScript(scriptPath, jobName) {
    logger.info(`[CRON] Starting ${jobName}...`);

    try {
      const { stdout, stderr } = await execPromise(`node ${scriptPath}`, {
        cwd: process.cwd(),
        env: process.env
      });

      if (stdout) {
        logger.info(`[CRON] ${jobName} output:\n${stdout}`);
      }

      if (stderr) {
        logger.warn(`[CRON] ${jobName} warnings:\n${stderr}`);
      }

      logger.info(`[CRON] ${jobName} completed successfully`);
      return { success: true, stdout, stderr };

    } catch (error) {
      logger.error(`[CRON] ${jobName} failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize all cron jobs
   */
  start() {
    if (!this.enabled) {
      logger.info('[CRON] Cron jobs are disabled (CRON_ENABLED=false)');
      return;
    }

    logger.info('[CRON] Starting cron manager...');
    logger.info(`[CRON] Environment: ${this.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);

    // 1. S3 Backups - Daily at 1:00 AM (before deletions)
    this.scheduleJob(
      'backup-incidents',
      '0 1 * * *', // Every day at 1:00 AM
      () => this.executeScript('scripts/backup-incidents-to-s3.js', 'Backup Incidents to S3')
    );

    this.scheduleJob(
      'backup-accounts',
      '30 1 * * *', // Every day at 1:30 AM
      () => this.executeScript('scripts/backup-accounts-to-s3.js', 'Backup Accounts to S3')
    );

    // 2. Auto-Delete - Daily at 2:00 AM (after backups)
    this.scheduleJob(
      'delete-expired-incidents',
      '0 2 * * *', // Every day at 2:00 AM
      () => this.executeScript('scripts/auto-delete-expired-incidents.js', 'Delete Expired Incidents')
    );

    this.scheduleJob(
      'delete-expired-accounts',
      '30 2 * * *', // Every day at 2:30 AM
      () => this.executeScript('scripts/auto-delete-expired-accounts.js', 'Delete Expired Accounts')
    );

    // 3. Subscription Renewals - Daily at 3:00 AM
    this.scheduleJob(
      'process-renewals',
      '0 3 * * *', // Every day at 3:00 AM
      () => this.executeScript('scripts/process-subscription-renewals.js', 'Process Subscription Renewals')
    );

    // 4. Warning Emails - Daily at 9:00 AM
    this.scheduleJob(
      'incident-warnings',
      '0 9 * * *', // Every day at 9:00 AM
      () => this.executeScript('scripts/send-incident-deletion-warnings.js', 'Send Incident Deletion Warnings')
    );

    this.scheduleJob(
      'subscription-warnings',
      '30 9 * * *', // Every day at 9:30 AM
      () => this.executeScript('scripts/send-subscription-warnings.js', 'Send Subscription Renewal Warnings')
    );

    // 5. S3 Cleanup - Monthly on the 1st at 4:00 AM
    this.scheduleJob(
      'cleanup-s3-backups',
      '0 4 1 * *', // 1st day of every month at 4:00 AM
      () => this.executeScript('scripts/cleanup-old-backups.js', 'Cleanup Old S3 Backups')
    );

    logger.info(`[CRON] ${this.jobs.size} cron jobs scheduled successfully`);
    this.printSchedule();
  }

  /**
   * Schedule a cron job
   */
  scheduleJob(name, schedule, task) {
    if (this.jobs.has(name)) {
      logger.warn(`[CRON] Job '${name}' already exists, skipping...`);
      return;
    }

    const job = cron.schedule(schedule, async () => {
      logger.info(`[CRON] Executing scheduled job: ${name}`);
      await task();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'Europe/London'
    });

    this.jobs.set(name, {
      job,
      schedule,
      task,
      lastRun: null
    });

    logger.info(`[CRON] Scheduled '${name}' (${schedule})`);
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    logger.info('[CRON] Stopping all cron jobs...');

    for (const [name, { job }] of this.jobs.entries()) {
      job.stop();
      logger.info(`[CRON] Stopped '${name}'`);
    }

    this.jobs.clear();
    logger.info('[CRON] All cron jobs stopped');
  }

  /**
   * Print cron schedule
   */
  printSchedule() {
    logger.info('\n[CRON] Scheduled Jobs:');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const [name, { schedule }] of this.jobs.entries()) {
      const humanReadable = this.cronToHuman(schedule);
      logger.info(`  ${name.padEnd(30)} ${schedule.padEnd(15)} (${humanReadable})`);
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Convert cron expression to human-readable format
   */
  cronToHuman(cronExpr) {
    const schedules = {
      '0 1 * * *': 'Daily at 1:00 AM',
      '30 1 * * *': 'Daily at 1:30 AM',
      '0 2 * * *': 'Daily at 2:00 AM',
      '30 2 * * *': 'Daily at 2:30 AM',
      '0 3 * * *': 'Daily at 3:00 AM',
      '0 9 * * *': 'Daily at 9:00 AM',
      '30 9 * * *': 'Daily at 9:30 AM',
      '0 4 1 * *': 'Monthly on 1st at 4:00 AM'
    };

    return schedules[cronExpr] || 'Custom schedule';
  }

  /**
   * Get job status
   */
  getStatus() {
    const jobs = [];

    for (const [name, { schedule, lastRun }] of this.jobs.entries()) {
      jobs.push({
        name,
        schedule,
        humanSchedule: this.cronToHuman(schedule),
        lastRun,
        enabled: true
      });
    }

    return {
      enabled: this.enabled,
      jobCount: this.jobs.size,
      jobs
    };
  }

  /**
   * Run a job manually (for testing)
   */
  async runJobManually(jobName) {
    const jobInfo = this.jobs.get(jobName);

    if (!jobInfo) {
      logger.error(`[CRON] Job '${jobName}' not found`);
      return { success: false, error: 'Job not found' };
    }

    logger.info(`[CRON] Manually executing job: ${jobName}`);
    const result = await jobInfo.task();

    jobInfo.lastRun = new Date().toISOString();

    return result;
  }
}

// Singleton instance
const cronManager = new CronManager();

module.exports = cronManager;
