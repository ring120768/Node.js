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
  logger.success(`🚗 Car Crash Lawyer AI Server running on port ${PORT}`);
  logger.info(`🌐 Access your app at: http://localhost:${PORT}`);
  logger.info('✅ Server ready!');
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