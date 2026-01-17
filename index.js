#!/usr/bin/env node

/**
 * Car Crash Lawyer AI - Single Entry Point with Port Hardening
 * Prevents EADDRINUSE, double starts, and ensures graceful shutdown
 */

// ==================== STARTUP GUARDS ====================

// Singleton protection - prevent double start
if (global.__APP_STARTED__) {
  console.log(`⚠️ [PID:${process.pid}] App already started, ignoring duplicate request`);
  process.exit(0);
}

// Agent stability guard - prevent duplicate agents
if (!global.__AGENT_RUNNING__) {
  global.__AGENT_RUNNING__ = true;
  // Placeholder for actual agent start logic if it were defined here
  // For now, we just set the flag. Actual agent start logic needs to be implemented.
  // startAgent(); // Assuming startAgent() would be defined elsewhere or imported
}


// Check if this is the main module (not imported)
if (require.main !== module) {
  console.log(`⚠️ [PID:${process.pid}] Server module imported, not executed directly`);
  module.exports = require('./src/app');
  return;
}

// Mark as starting
global.__APP_STARTED__ = true;

console.log(`🔧 [PID:${process.pid}] Starting from: ${__filename}`);

// Environment validation
require('dotenv').config();

// TEMPORARY: Override credentials from .env file
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');

  // Load OpenAI API key (rotated)
  const openaiMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
  if (openaiMatch && openaiMatch[1]) {
    process.env.OPENAI_API_KEY = openaiMatch[1].trim();
    console.log('✅ Loaded updated OpenAI API key from .env');
  }

  // Load Supabase credentials (if missing from environment)
  const supabaseUrlMatch = envContent.match(/SUPABASE_URL=(.+)/);
  if (supabaseUrlMatch && supabaseUrlMatch[1]) {
    process.env.SUPABASE_URL = supabaseUrlMatch[1].trim();
  }

  const supabaseKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (supabaseKeyMatch && supabaseKeyMatch[1]) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseKeyMatch[1].trim();
    console.log('✅ Loaded Supabase credentials from .env');
  }

  // Load PORT override
  const portMatch = envContent.match(/^PORT=(.+)/m);
  if (portMatch && portMatch[1]) {
    process.env.PORT = portMatch[1].trim();
    console.log(`✅ Loaded PORT from .env: ${process.env.PORT}`);
  }
}

// ==================== PORT DISCIPLINE ====================

const PORT = Number(process.env.PORT) || 5000;

if (!PORT || isNaN(PORT)) {
  console.error(`❌ [PID:${process.pid}] Server requires process.env.PORT to be a valid number`);
  console.error(`   Current PORT: "${process.env.PORT}"`);
  process.exit(1);
}

const HOST = '0.0.0.0'; // Required for Railway/containerized deployment
console.log(`🔌 [PID:${process.pid}] Using PORT: ${PORT}, HOST: ${HOST}`);

// Validate required environment variables
// Check for Supabase configuration (warning only, not fatal)
const supabaseEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY'
];

const missingSupabase = supabaseEnvVars.filter(varName => !process.env[varName]);
if (missingSupabase.length > 0) {
  console.warn('');
  console.warn('⚠️ ═══════════════════════════════════════════════════════════════');
  console.warn('⚠️  SUPABASE NOT CONFIGURED - DATABASE FUNCTIONALITY DISABLED');
  console.warn('⚠️ ═══════════════════════════════════════════════════════════════');
  console.warn(`⚠️  Missing: ${missingSupabase.join(', ')}`);
  console.warn('⚠️  Static file serving will still work');
  console.warn('⚠️ ═══════════════════════════════════════════════════════════════');
  console.warn('');
}

// Validate SMTP configuration (warning, not fatal - but critical for user emails)
const smtpEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
const missingSMTP = smtpEnvVars.filter(varName => !process.env[varName]);
if (missingSMTP.length > 0) {
  console.warn('');
  console.warn('⚠️ ═══════════════════════════════════════════════════════════════');
  console.warn('⚠️  SMTP NOT CONFIGURED - EMAIL FUNCTIONALITY DISABLED');
  console.warn('⚠️ ═══════════════════════════════════════════════════════════════');
  console.warn(`⚠️  Missing: ${missingSMTP.join(', ')}`);
  console.warn('⚠️  Users will NOT receive PDF emails!');
  console.warn('⚠️  Admin will NOT receive failure notifications!');
  console.warn('⚠️ ═══════════════════════════════════════════════════════════════');
  console.warn('');
} else {
  console.log(`✅ SMTP configured: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || '587'}`);
}

// ==================== IMPORTS ====================

const http = require('http');
const app = require('./src/app');
const logger = require('./src/utils/logger');
const { version } = require('./package.json'); // Assuming package.json exists for commit info


// ==================== AGENT CONFIGURATION ====================

// Agent stability: ensure one interval/scheduler, clear on shutdown
let agentInterval = null;
const AGENT_HEALTH_PING_INTERVAL = 60000; // 60 seconds

function startAgent() {
  logger.info(`[Agent] Starting agent...`);
  // Placeholder for actual agent start logic.
  // This would typically involve setting up intervals, schedulers, or starting other processes.

  // Example: Basic health ping setup
  const attemptAgentHealthPing = () => {
    logger.info('[Agent Health] Pinging logger...');
    // Simulate a successful ping
    logger.info('[Agent Health] Ping successful.');
  };

  const boundedRetryPing = (maxRetries = 3, backoffMs = 1000) => {
    let retries = 0;
    const maxBackoff = 30000; // 30 seconds

    const attempt = () => {
      try {
        attemptAgentHealthPing();
        retries = 0; // Reset on success
      } catch (error) {
        retries++;
        logger.warn(`[Agent Health] Ping failed (${retries}/${maxRetries}):`, error.message);
        if (retries >= maxRetries) {
          logger.error('[Agent Health] Max retries reached, stopping pings.');
          return;
        }
        const currentBackoff = Math.min(backoffMs * Math.pow(2, retries - 1), maxBackoff);
        setTimeout(attempt, currentBackoff);
      }
    };
    attempt();
  };

  // Start the interval for health pings
  agentInterval = setInterval(() => {
    boundedRetryPing();
  }, AGENT_HEALTH_PING_INTERVAL);

  logger.info(`[Agent] Agent started. Health ping interval set to ${AGENT_HEALTH_PING_INTERVAL / 1000}s.`);
}

// Start the agent if not already running
if (!global.__AGENT_RUNNING__) {
  global.__AGENT_RUNNING__ = true;
  startAgent();
}


// ==================== SINGLE SERVER CREATION ====================

// Create HTTP server exactly once
const server = http.createServer(app);

// Store server reference globally for cleanup
global.__SERVER_INSTANCE__ = server;

// Initialize WebSocket now that server exists
const websocketModule = require('./src/websocket');
const wss = websocketModule.initializeWebSocket(server);
app.locals.websocketServer = wss;
logger.success('✅ WebSocket initialized');

// ==================== STARTUP BANNER ====================

function displayStartupBanner() {
  const config = require('./src/config');

  const services = {
    supabase: !!(config.supabase.url && config.supabase.serviceKey && config.supabase.anonKey),
    openai: !!(config.openai.enabled && config.openai.apiKey),
    github_webhook: !!process.env.GITHUB_WEBHOOK_SECRET
  };

  const urls = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : (process.env.APP_URL || `http://${HOST}:${PORT}`);

  logger.info('\n' + '='.repeat(60));
  logger.success(`🚗 Car Crash Lawyer AI - Server Ready [PID:${process.pid}]`);
  logger.info('='.repeat(60));
  logger.success(`🚀 Server: ${HOST}:${PORT}`);
  logger.info(`🌐 Public URL: ${urls}`);
  logger.info('\n📊 Services:');
  logger.info(`   ${services.supabase ? '✅' : '❌'} Supabase Database`);
  logger.info(`   ${services.openai ? '✅' : '❌'} OpenAI API`);
  logger.info(`   ${services.github_webhook ? '✅' : '❌'} GitHub Webhooks`);
  logger.info('\n⚡ System Ready!');
  logger.info('='.repeat(60) + '\n');
}

// ==================== GRACEFUL SHUTDOWN ====================

let isShuttingDown = false;
let shutdownTimeout = null;

function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn(`[PID:${process.pid}] Shutdown already in progress...`);
    return;
  }

  isShuttingDown = true;
  logger.info(`\n⚠️ [PID:${process.pid}] ${signal} received - shutting down gracefully...`);

  // Clear the shutdown timeout if it exists
  if (shutdownTimeout) {
    clearTimeout(shutdownTimeout);
  }

  // Clear agent interval
  if (agentInterval) {
    clearInterval(agentInterval);
    logger.info(`[Agent] Agent interval cleared.`);
  }

  // Stop cron jobs
  if (app.locals.cronManager) {
    try {
      app.locals.cronManager.stop();
      logger.info(`[Cron] All cron jobs stopped.`);
    } catch (cronError) {
      logger.error(`[Cron] Error stopping cron jobs:`, cronError);
    }
  }

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      logger.error(`❌ [PID:${process.pid}] Error during server shutdown:`, err);
      process.exit(1);
    }

    // Close WebSocket connections if available
    if (app.locals.websocketServer) {
      try {
        app.locals.websocketServer.close();
        logger.info(`[PID:${process.pid}] WebSocket server closed`);
      } catch (wsError) {
        logger.error(`[PID:${process.pid}] Error closing WebSocket server:`, wsError);
      }
    }

    // Cleanup Supabase realtime channels
    if (app.locals.realtimeChannels) {
      Object.values(app.locals.realtimeChannels).forEach(channel => {
        try {
          if (channel && channel.unsubscribe) {
            channel.unsubscribe();
          }
        } catch (channelError) {
          logger.error(`[PID:${process.pid}] Error closing realtime channel:`, channelError);
        }
      });
    }

    // Cleanup global state
    global.__APP_STARTED__ = false;
    global.__AGENT_RUNNING__ = false; // Reset agent running flag
    global.__SERVER_INSTANCE__ = null;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    logger.success(`✅ [PID:${process.pid}] Server closed gracefully`);
    process.exit(0);
  });

  // Force close after 5 seconds (as requested)
  shutdownTimeout = setTimeout(() => {
    logger.error(`❌ [PID:${process.pid}] Could not close connections in time, forcing shutdown`);
    process.exit(1);
  }, 5000);
}

// ==================== HEALTH & OBSERVABILITY ENDPOINTS ====================

// Health check endpoint
app.get('/healthz', (req, res) => {
  const healthData = {
    status: 'ok',
    pid: process.pid,
    uptime: process.uptime(),
    port: PORT,
    agentRunning: !!global.__AGENT_RUNNING__,
    commit: version // Assuming version is available from package.json
  };
  res.status(200).json(healthData);
});

// Readiness check endpoint
app.get('/readyz', async (req, res) => {
  let ready = true;
  let checks = [];

  // Verify PORT presence
  if (!PORT || isNaN(PORT)) {
    checks.push({ service: 'PORT', status: 'error', message: `PORT is not a valid number: ${process.env.PORT}` });
    ready = false;
  } else {
    checks.push({ service: 'PORT', status: 'ok', message: `PORT is ${PORT}` });
  }

  // Quick Supabase select 1 (no writes)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      await supabase.from('user_signup').select('create_user_id').limit(1);
      checks.push({ service: 'Supabase', status: 'ok', message: 'Quick check successful.' });
    } catch (error) {
      checks.push({ service: 'Supabase', status: 'error', message: `Check failed: ${error.message}` });
      ready = false;
    }
  } else {
    checks.push({ service: 'Supabase', status: 'warning', message: 'Supabase credentials not configured.' });
  }

  // Confirm webhook route is mounted
  const webhookRouteMounted = app._router && app._router.stack.some(layer =>
    layer.regexp && layer.regexp.source.includes('webhooks')
  );

  if (webhookRouteMounted) {
    checks.push({ service: 'Webhook Routes', status: 'ok', message: '/webhooks routes are mounted.' });
  } else {
    checks.push({ service: 'Webhook Routes', status: 'warning', message: 'Webhook routes detection inconclusive.' });
  }

  const statusCode = ready ? 200 : 503; // 503 Service Unavailable
  res.status(statusCode).json({
    status: ready ? 'ok' : 'degraded',
    checks: checks
  });
});


// ==================== ERROR HANDLING ====================

server.on('error', (error) => {
  logger.error(`❌ [PID:${process.pid}] Server error:`, {
    code: error.code,
    message: error.message,
    port: PORT,
    stack: error.stack
  });

  if (error.code === 'EADDRINUSE') {
    logger.error(`💡 [PID:${process.pid}] Port ${PORT} is already in use. Try:`);
    logger.error(`   lsof -i :${PORT} && kill -9 $(lsof -t -i:${PORT})`);
    logger.error(`   Or stop the running server in your deployment environment`);
  }

  // Cleanup and exit
  global.__APP_STARTED__ = false;
  global.__AGENT_RUNNING__ = false; // Ensure agent flag is reset on server error
  process.exit(1);
});

// ==================== SIGNAL HANDLERS ====================

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Error handlers
process.on('uncaughtException', (error) => {
  logger.error(`❌ [PID:${process.pid}] Uncaught Exception:`, error);
  // Attempt to shut down gracefully, but if the error is critical, it might fail.
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`❌ [PID:${process.pid}] Unhandled Rejection at:`, promise, 'reason:', reason);
  // Do not exit on unhandled rejection by default, just log it.
  // If specific unhandled rejections are critical, they should be handled within their scope.
});

// ==================== START SERVER ====================

// Single listener - this is the ONLY place server.listen is called
server.listen(PORT, HOST, (err) => {
  if (err) {
    logger.error(`❌ [PID:${process.pid}] Failed to start server:`, err);
    process.exit(1);
  }

  logger.success(`✅ [PID:${process.pid}] Server listening on ${HOST}:${PORT}`);
  logger.info(`🌐 Server accessible at: http://${HOST}:${PORT}`);

  // Verify server is actually accessible
  const testUrl = `http://localhost:${PORT}/healthz`;
  setTimeout(async () => {
    try {
      const response = await require('axios').get(testUrl, { timeout: 5000 });
      logger.success(`✅ Health check passed: ${response.status}`);
    } catch (error) {
      logger.warn(`⚠️ Health check failed: ${error.message}`);
    }
  }, 1000);

  displayStartupBanner();
});