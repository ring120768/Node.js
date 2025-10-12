
/**
 * Request logging middleware for Car Crash Lawyer AI
 * Adds timestamp, client IP, request ID, and sets response headers
 */

const logger = require('../utils/logger');

/**
 * Enhanced request logging middleware with sanitization
 */
function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  const sanitizedPath = req.path.replace(/\/user\/[^/]+/g, '/user/[REDACTED]');
  logger.debug(`${req.method} ${sanitizedPath}`, { timestamp });

  // Store IP for GDPR audit logging
  req.clientIp = req.ip ||
    req.connection?.remoteAddress ||
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    'unknown';

  // Add request ID for tracing
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-Id', req.requestId);

  next();
}

module.exports = requestLogger;
