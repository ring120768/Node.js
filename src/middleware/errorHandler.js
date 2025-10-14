/**
 * Centralized Error Handler Middleware
 * Prevents stack trace exposure in production
 */

const logger = require('../utils/logger');

// Error codes for client
const ERROR_CODES = {
  VALIDATION_ERROR: 'ERR_001',
  AUTH_ERROR: 'ERR_002',
  NOT_FOUND: 'ERR_003',
  FORBIDDEN: 'ERR_004',
  RATE_LIMIT: 'ERR_005',
  SERVER_ERROR: 'ERR_006',
  EXTERNAL_SERVICE: 'ERR_007',
  DATABASE_ERROR: 'ERR_008'
};

// Production-safe error messages
const SAFE_MESSAGES = {
  ERR_001: 'Invalid request data',
  ERR_002: 'Authentication failed',
  ERR_003: 'Resource not found',
  ERR_004: 'Access denied',
  ERR_005: 'Too many requests',
  ERR_006: 'Internal server error',
  ERR_007: 'External service unavailable',
  ERR_008: 'Database operation failed'
};

/**
 * Global error handler
 * - Logs full error details internally
 * - Returns safe, generic messages to client
 * - Never exposes stack traces in production
 */
function errorHandler(err, req, res, next) {
  const requestId = req.requestId || 'unknown';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log full error details internally (with sanitization)
  logger.error('Request error', {
    error: err.message,
    stack: isDevelopment ? err.stack : undefined,
    code: err.code,
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  }, requestId);

  // Determine error type and response
  const statusCode = err.statusCode || 500;
  const errorCode = determineErrorCode(err);
  
  // Build safe response
  const response = {
    success: false,
    error: {
      code: errorCode,
      message: isDevelopment ? err.message : SAFE_MESSAGES[errorCode],
      requestId
    }
  };

  // In development, include additional debug info
  if (isDevelopment) {
    response.error.stack = err.stack;
    response.error.details = err.details;
  }

  res.status(statusCode).json(response);
}

/**
 * Determine appropriate error code
 */
function determineErrorCode(err) {
  if (err.code === 'VALIDATION_ERROR') return ERROR_CODES.VALIDATION_ERROR;
  if (err.code === 'AUTH_REQUIRED' || err.code === 'INVALID_TOKEN') return ERROR_CODES.AUTH_ERROR;
  if (err.code === 'NOT_FOUND') return ERROR_CODES.NOT_FOUND;
  if (err.code === 'FORBIDDEN') return ERROR_CODES.FORBIDDEN;
  if (err.code === 'RATE_LIMIT_EXCEEDED') return ERROR_CODES.RATE_LIMIT;
  if (err.code === 'EXTERNAL_API_ERROR') return ERROR_CODES.EXTERNAL_SERVICE;
  if (err.code?.startsWith('23')) return ERROR_CODES.DATABASE_ERROR; // PostgreSQL error codes
  
  return ERROR_CODES.SERVER_ERROR;
}

/**
 * Async handler wrapper
 * Catches promise rejections and passes to error handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(req, res) {
  const requestId = req.requestId || 'unknown';
  
  logger.warn('Route not found', {
    path: req.path,
    method: req.method
  }, requestId);

  res.status(404).json({
    success: false,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: 'Endpoint not found',
      requestId
    }
  });
}

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  ERROR_CODES
};
