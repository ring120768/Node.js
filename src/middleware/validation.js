
/**
 * Validation Middleware for Car Crash Lawyer AI
 * Centralized input validation and sanitization
 */

const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Validate user ID in request parameters
 */
function validateUserIdParam(req, res, next) {
  const userId = req.params?.userId;

  if (!userId) {
    return sendError(res, 400, 'User ID is required', 'MISSING_USER_ID');
  }

  const validation = validateUserId(userId);
  if (!validation.valid) {
    return sendError(res, 400, validation.error, 'INVALID_USER_ID');
  }

  next();
}

/**
 * Validate user ID in request body
 */
function validateUserIdBody(req, res, next) {
  const userId = req.body?.userId || req.body?.create_user_id;

  if (!userId) {
    return sendError(res, 400, 'User ID is required in request body', 'MISSING_USER_ID');
  }

  const validation = validateUserId(userId);
  if (!validation.valid) {
    return sendError(res, 400, validation.error, 'INVALID_USER_ID');
  }

  next();
}

/**
 * Validate required fields in request body
 */
function validateRequiredFields(requiredFields) {
  return (req, res, next) => {
    const missing = [];
    
    for (const field of requiredFields) {
      if (!req.body[field] && req.body[field] !== 0) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return sendError(res, 400, `Missing required fields: ${missing.join(', ')}`, 'MISSING_FIELDS');
    }

    next();
  };
}

/**
 * Sanitize input data
 */
function sanitizeInput(req, res, next) {
  // Sanitize string fields to prevent XSS
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        // Basic XSS prevention - strip script tags and suspicious content
        req.body[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    }
  }

  next();
}

/**
 * Validate file upload parameters
 */
function validateFileUpload(req, res, next) {
  if (!req.file && !req.files) {
    return sendError(res, 400, 'No file uploaded', 'MISSING_FILE');
  }

  const file = req.file || (req.files && req.files[0]);
  
  if (file && file.size === 0) {
    return sendError(res, 400, 'Empty file uploaded', 'EMPTY_FILE');
  }

  next();
}

/**
 * Validate email format
 */
function validateEmail(req, res, next) {
  const email = req.body?.email;
  
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendError(res, 400, 'Invalid email format', 'INVALID_EMAIL');
  }

  next();
}

/**
 * Validate password strength
 */
function validatePassword(req, res, next) {
  const password = req.body?.password;
  
  if (password) {
    if (password.length < 8) {
      return sendError(res, 400, 'Password must be at least 8 characters long', 'WEAK_PASSWORD');
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      logger.warn('Weak password detected', { hasLower: /[a-z]/.test(password), hasUpper: /[A-Z]/.test(password), hasDigit: /\d/.test(password) });
    }
  }

  next();
}

module.exports = {
  validateUserIdParam,
  validateUserIdBody,
  validateRequiredFields,
  sanitizeInput,
  validateFileUpload,
  validateEmail,
  validatePassword
};
