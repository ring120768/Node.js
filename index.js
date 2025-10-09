
/**
 * Car Crash Lawyer AI - Server Entry Point
 * Minimal startup file for the new modular architecture
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');

// Validate environment
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Set default port if not specified
const PORT = process.env.PORT || 5000;
process.env.PORT = PORT;

console.log('🚀 Starting Car Crash Lawyer AI Server...');
console.log(`📍 Port: ${PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Check for required modular files
const requiredFiles = [
  'src/app.js',
  'src/config/index.js',
  'src/utils/logger.js',
  'src/routes/index.js'
];

console.log('🔍 Checking required files...');
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing required file: ${file}`);
    console.log('💡 Run migration or restore from backup if needed');
    process.exit(1);
  }
}
console.log('✅ All required files present');

// Initialize logger early
const logger = require('./src/utils/logger');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing server gracefully...');
  process.exit(0);
});

try {
  // Start the modular application
  const app = require('./src/app');
  
  // Start server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n========================================');
    console.log('🚗 Car Crash Lawyer AI - Server Started');
    console.log('========================================');
    console.log(`🌐 Server running on http://0.0.0.0:${PORT}`);
    console.log('🔗 Public URL: https://workspace.ring120768.repl.co\n');
    
    logger.info('Server startup complete', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      architecture: 'modular',
      services: {
        supabase: !!process.env.SUPABASE_URL,
        openai: !!process.env.OPENAI_API_KEY,
        what3words: !!process.env.WHAT3WORDS_API_KEY,
        dvla: !!process.env.DVLA_API_KEY,
        stripe: !!process.env.STRIPE_SECRET_KEY
      }
    });
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      logger.error('Server error:', error);
      process.exit(1);
    }
  });

} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  logger.error('Server startup failed:', error);
  process.exit(1);
}
