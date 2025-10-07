
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

/**
 * Check external services
 */
async function checkExternalServices() {
  const services = {
    supabase: !!config.supabase.url && !!config.supabase.serviceKey,
    openai: !!config.openai.apiKey,
    what3words: !!config.what3words.apiKey
  };
  return services;
}

/**
 * Start server with startup checks
 */
async function startServer() {
  try {
    const externalServices = await checkExternalServices();
    
    // Check for required configuration
    const missingConfig = [];
    if (!config.supabase.url) missingConfig.push('SUPABASE_URL');
    if (!config.supabase.serviceKey) missingConfig.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!config.openai.apiKey) missingConfig.push('OPENAI_API_KEY');

    if (missingConfig.length > 0) {
      logger.warn('⚠️  WARNING: Missing required environment variables:');
      missingConfig.forEach(varName => {
        logger.warn(`   - ${varName}`);
      });
    }

    if (!config.what3words.enabled) {
      logger.warn('⚠️  WARNING: WHAT3WORDS_API_KEY not set - location services limited');
    }

    if (!config.supabase.anonKey) {
      logger.warn('⚠️  WARNING: SUPABASE_ANON_KEY not set - auth features disabled');
    }

    // Validate that server and app are properly configured
    if (!server) {
      throw new Error('HTTP server not initialized');
    }

    // Start server
    server.listen(config.server.port, '0.0.0.0', () => {
      console.log('\n========================================');
      console.log('🚗 Car Crash Lawyer AI - Server Started');
      console.log('========================================');
      console.log(`\n🌐 Server running on http://0.0.0.0:${config.server.port}`);

      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        console.log(`🔗 Public URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
      }

      console.log('\n📊 Service Status:');
      console.log(`   Supabase: ${externalServices.supabase ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`   OpenAI: ${externalServices.openai ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`   what3words: ${externalServices.what3words ? '✅ Configured' : '⚠️  Not configured'}`);
      console.log(`   GDPR Compliance: ✅ Active`);
      console.log(`   WebSocket: ✅ Active`);

      console.log('\n✨ Server ready!');
      console.log('========================================\n');

      logger.success('Server startup complete', {
        port: config.server.port,
        environment: config.server.env,
        services: externalServices
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.server.port} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
