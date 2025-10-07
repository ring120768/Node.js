
/**
 * Error Handling Middleware for Car Crash Lawyer AI
 * Centralized error handling extracted from app.js
 */

const multer = require('multer');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    requestId: req.requestId
  });

  // Handle multer errors (file upload)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 400, 'File too large', 'FILE_TOO_LARGE',
        `Maximum file size is ${config.constants.FILE_SIZE_LIMITS.AUDIO / 1024 / 1024}MB`);
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return sendError(res, 400, 'Too many files', 'TOO_MANY_FILES',
        'Maximum 5 files allowed per upload');
    }
    return sendError(res, 400, err.message, 'UPLOAD_ERROR');
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return sendError(res, 400, 'Invalid input data', 'VALIDATION_ERROR',
      process.env.NODE_ENV === 'development' ? err.message : 'Please check your input');
  }

  // Handle database errors
  if (err.code === '23505') { // Unique constraint violation
    return sendError(res, 409, 'Resource already exists', 'DUPLICATE_RESOURCE');
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 400, 'Invalid JSON format', 'JSON_PARSE_ERROR');
  }

  // Handle rate limit errors
  if (err.status === 429) {
    return sendError(res, 429, 'Too many requests', 'RATE_LIMIT_EXCEEDED',
      'Please slow down and try again later');
  }

  // Default internal server error
  sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR',
    process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred');
}

/**
 * 404 handler for unmatched routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path,
    message: 'The requested resource was not found',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
