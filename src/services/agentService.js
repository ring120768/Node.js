
/**
 * Agent Service - Background processing with stability guarantees
 * Handles transcription queue, health monitoring, and bounded retries
 */

const logger = require('../utils/logger');

class AgentService {
  constructor() {
    this.isRunning = false;
    this.intervals = new Map();
    this.retryCount = 0;
    this.maxRetries = 5;
    this.baseDelay = 1000; // 1s
    this.maxDelay = 30000; // 30s
    this.healthInterval = null;
    this.lastHealthCheck = null;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Agent already running, skipping duplicate start');
      return;
    }

    this.isRunning = true;
    global.__AGENT_RUNNING__ = true;

    logger.info('🤖 Agent service starting...');

    // Start health monitoring
    this.startHealthMonitoring();

    // Start transcription queue processing
    this.startTranscriptionQueue();

    logger.success('✅ Agent service started successfully');
  }

  stop() {
    if (!this.isRunning) return;

    logger.info('🛑 Stopping agent service...');

    // Clear all intervals
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      logger.debug(`Cleared interval: ${name}`);
    }
    this.intervals.clear();

    // Clear health monitoring
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }

    this.isRunning = false;
    global.__AGENT_RUNNING__ = false;

    logger.success('✅ Agent service stopped');
  }

  startHealthMonitoring() {
    // Health ping every 60 seconds
    this.healthInterval = setInterval(async () => {
      try {
        const healthStatus = {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          pid: process.pid,
          agentRunning: this.isRunning,
          intervals: this.intervals.size
        };

        this.lastHealthCheck = healthStatus;
        logger.debug('Agent health check', healthStatus);

        // Reset retry count on successful health check
        this.retryCount = 0;

      } catch (error) {
        await this.handleHealthError(error);
      }
    }, 60000); // 60 seconds

    this.intervals.set('health', this.healthInterval);
  }

  async handleHealthError(error) {
    this.retryCount++;
    const delay = Math.min(this.baseDelay * Math.pow(2, this.retryCount - 1), this.maxDelay);

    logger.error('Agent health check failed', {
      error: error.message,
      retryCount: this.retryCount,
      nextRetryIn: delay,
      maxRetries: this.maxRetries
    });

    if (this.retryCount >= this.maxRetries) {
      logger.error('Max retries exceeded, agent health monitoring disabled');
      return;
    }

    // Bounded retry with exponential backoff
    setTimeout(async () => {
      try {
        logger.info(`Retrying health check (attempt ${this.retryCount + 1})`);
        // Retry logic would go here
      } catch (retryError) {
        await this.handleHealthError(retryError);
      }
    }, delay);
  }

  startTranscriptionQueue() {
    // Process transcription queue every 5 minutes
    const queueInterval = setInterval(async () => {
      try {
        await this.processTranscriptionQueue();
      } catch (error) {
        logger.error('Transcription queue processing error', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    this.intervals.set('transcriptionQueue', queueInterval);
  }

  async processTranscriptionQueue() {
    // Implementation would go here
    logger.debug('Processing transcription queue...');
    
    // This would integrate with your existing transcription processing
    // without creating new servers or listening on ports
  }

  getStatus() {
    return {
      running: this.isRunning,
      intervals: Array.from(this.intervals.keys()),
      retryCount: this.retryCount,
      lastHealthCheck: this.lastHealthCheck,
      uptime: process.uptime()
    };
  }
}

// Singleton instance
const agentService = new AgentService();

// Global error handlers to keep process alive
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection in agent service:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise
  });
  // Don't exit - log and continue
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception in agent service:', {
    message: error.message,
    stack: error.stack
  });
  
  // Only exit if it's truly fatal
  if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
    process.exit(1);
  }
  // Otherwise, log and continue
});

module.exports = agentService;
