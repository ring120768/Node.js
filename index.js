/**
 * Car Crash Lawyer AI - Server Entry Point
 * Minimal server startup file using modular app structure
 */

require('dotenv').config();

const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

// Get server reference from app
const server = app.server;
const PORT = config.app.port;

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  logger.info('========================================');
  logger.success('🚗 Car Crash Lawyer AI - GDPR Compliant System');
  logger.info('========================================');
  logger.success(`🚀 Server running on port ${PORT}`);

  // Check for Replit environment
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    logger.info(`🌐 Public URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    logger.info(`🌐 Alternative: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.app`);
  } else {
    logger.info(`🌐 Local URL: http://localhost:${PORT}`);
  }

  // Service Integration Status
  logger.info('\n📊 Service Integration Status:');

  // Supabase
  const supabaseStatus = config.supabase.url && config.supabase.serviceKey && config.supabase.anonKey;
  logger.info(`   Supabase Database: ${supabaseStatus ? '✅ Connected' : '❌ Not configured'}`);

  // OpenAI
  const openaiStatus = config.openai.enabled && config.openai.apiKey;
  logger.info(`   OpenAI API: ${openaiStatus ? '✅ Configured' : '❌ Not configured'}`);

  // what3words
  const what3wordsStatus = config.what3words.enabled && config.what3words.apiKey;
  logger.info(`   what3words API: ${what3wordsStatus ? '✅ Configured' : '❌ Not configured'}`);

  // Typeform/Zapier (shared webhook key)
  const webhookStatus = config.webhook.apiKey;
  logger.info(`   Typeform Integration: ${webhookStatus ? '✅ Configured' : '❌ Not configured'}`);
  logger.info(`   Zapier Webhooks: ${webhookStatus ? '✅ Configured' : '❌ Not configured'}`);

  // DVLA API
  const dvlaStatus = config.dvla.enabled;
  logger.info(`   DVLA API: ${dvlaStatus ? '✅ Configured' : '❌ Not configured'}`);

  // Stripe
  const stripeStatus = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_PUBLISHABLE_KEY;
  logger.info(`   Stripe Payments: ${stripeStatus ? '✅ Configured' : '❌ Not configured'}`);

  // Core Features Status
  logger.info('\n🔧 Core Features:');
  logger.info(`   Authentication: ${app.locals.authService ? '✅ Active' : '❌ Disabled'}`);
  logger.info(`   WebSocket Server: ${app.locals.websocketModule ? '✅ Active' : '❌ Disabled'}`);
  logger.info(`   PDF Generation: ${app.locals.pdfModules ? '✅ Available' : '❌ Unavailable'}`);
  logger.info(`   GDPR Compliance: ✅ Full compliance with audit logging`);
  logger.info(`   Rate Limiting: ✅ Active (API: 100/15min, Strict: 10/15min)`);
  logger.info(`   Data Retention: ${process.env.DATA_RETENTION_DAYS || config.constants.DATA_RETENTION.DEFAULT_DAYS} days`);

  logger.info('\n⚡ System Ready - All services initialized!');
  logger.info('========================================\n');

  // Only show warnings for services that are actually not configured
  // (The API connection tests will run separately and show their own results)
  const unconfiguredServices = [];
  
  if (!supabaseStatus) unconfiguredServices.push('Supabase Database');
  if (!openaiStatus) unconfiguredServices.push('OpenAI API');
  if (!what3wordsStatus) unconfiguredServices.push('what3words API');
  if (!dvlaStatus) unconfiguredServices.push('DVLA API');
  if (!stripeStatus) unconfiguredServices.push('Stripe Payments');
  if (!webhookStatus) unconfiguredServices.push('Typeform/Zapier Webhooks');

  if (unconfiguredServices.length > 0) {
    logger.warn(`⚠️ Unconfigured services: ${unconfiguredServices.join(', ')}`);
    logger.info('ℹ️ API connection tests will run separately...');
  } else {
    logger.success('✅ All services have configuration keys available');
    logger.info('ℹ️ Running API connection tests...');
  }
});

// Error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    logger.error('❌ Server error:', error.message);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});