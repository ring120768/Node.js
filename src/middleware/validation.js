/**
 * Input Validation Middleware
 * Protects against SSRF, injection attacks, and malformed data
 */

const validator = require('validator');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

// Validation constants
const LIMITS = {
  TEXT_FIELD: 1000,
  NAME_FIELD: 50,
  EMAIL: 254,
  PHONE: 20,
  URL: 2048,
  UUID: 36
};

// Private IP ranges for SSRF protection
const PRIVATE_IP_PATTERNS = [
  /^127\./,           // Loopback
  /^10\./,            // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Private Class B
  /^192\.168\./,      // Private Class C
  /^169\.254\./,      // Link-local
  /^::1$/,            // IPv6 loopback
  /^fe80:/,           // IPv6 link-local
  /^fc00:/,           // IPv6 unique local
  /^fd00:/            // IPv6 unique local
];

/**
 * Validate webhook payload
 * Checks file URLs, user IDs, field lengths
 */
function validateWebhookPayload(req, res, next) {
  const requestId = req.requestId || 'unknown';
  const payload = req.body;

  if (!payload || typeof payload !== 'object') {
    return sendError(res, 400, 'Invalid payload format', 'INVALID_PAYLOAD');
  }

  const errors = [];

  // Validate any URL fields (images, audio, files)
  const urlFields = findUrlFields(payload);
  for (const [field, url] of urlFields) {
    const urlError = validateUrl(url, field);
    if (urlError) errors.push(urlError);
  }

  // Validate user IDs
  const userIdFields = findUserIdFields(payload);
  for (const [field, userId] of userIdFields) {
    if (!validateUUID(userId)) {
      errors.push(`${field}: Invalid UUID format`);
    }
  }

  // Validate field lengths
  const lengthErrors = validateFieldLengths(payload);
  errors.push(...lengthErrors);

  if (errors.length > 0) {
    logger.warn('Webhook payload validation failed', { errors, fieldCount: errors.length }, requestId);
    return sendError(res, 400, 'Invalid payload data', 'VALIDATION_ERROR', errors);
  }

  next();
}

/**
 * Find URL fields in payload recursively
 */
function findUrlFields(obj, prefix = '') {
  const urls = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string' && (
      key.toLowerCase().includes('url') ||
      key.toLowerCase().includes('link') ||
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('file://')
    )) {
      urls.push([fieldPath, value]);
    } else if (typeof value === 'object' && value !== null) {
      urls.push(...findUrlFields(value, fieldPath));
    }
  }
  
  return urls;
}

/**
 * Find user ID fields
 */
function findUserIdFields(obj, prefix = '') {
  const userIds = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string' && (
      key.toLowerCase().includes('userid') ||
      key.toLowerCase().includes('user_id') ||
      key === 'id'
    )) {
      userIds.push([fieldPath, value]);
    } else if (typeof value === 'object' && value !== null) {
      userIds.push(...findUserIdFields(value, fieldPath));
    }
  }
  
  return userIds;
}

/**
 * Validate URL and check for SSRF
 */
function validateUrl(url, fieldName) {
  // Check dangerous protocols FIRST (before validator)
  if (url.match(/^(file|ftp|gopher|dict|sftp|tftp):/i)) {
    return `${fieldName}: Unsupported protocol`;
  }

  // Check localhost BEFORE validator
  if (url.match(/^https?:\/\/(localhost|127\.0\.0\.1|::1)($|\/|:)/i)) {
    return `${fieldName}: Cannot access localhost`;
  }

  // Check basic URL format
  if (!validator.isURL(url, { 
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true
  })) {
    return `${fieldName}: Invalid URL format`;
  }

  // Extract hostname for SSRF check
  try {
    const urlObj = new URL(url);

    // Block private IP ranges
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(urlObj.hostname)) {
        return `${fieldName}: Cannot access private IP addresses`;
      }
    }

    // Block metadata service IPs (AWS, GCP, Azure)
    if (urlObj.hostname === '169.254.169.254' || 
        urlObj.hostname === 'metadata.google.internal') {
      return `${fieldName}: Cannot access cloud metadata services`;
    }

  } catch (err) {
    return `${fieldName}: Malformed URL`;
  }

  return null;
}

/**
 * Validate UUID format
 */
function validateUUID(uuid) {
  return validator.isUUID(uuid, 4); // UUIDv4
}

/**
 * Validate field lengths to prevent DoS
 */
function validateFieldLengths(obj, prefix = '') {
  const errors = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      const limit = getFieldLimit(key);
      if (value.length > limit) {
        errors.push(`${fieldPath}: Exceeds maximum length of ${limit} characters`);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      errors.push(...validateFieldLengths(value, fieldPath));
    }
  }
  
  return errors;
}

/**
 * Get length limit for field type
 */
function getFieldLimit(fieldName) {
  const lower = fieldName.toLowerCase();
  
  if (lower.includes('email')) return LIMITS.EMAIL;
  if (lower.includes('phone')) return LIMITS.PHONE;
  if (lower.includes('url') || lower.includes('link')) return LIMITS.URL;
  if (lower.includes('name') || lower.includes('title')) return LIMITS.NAME_FIELD;
  
  return LIMITS.TEXT_FIELD; // Default
}

/**
 * Validate user ID parameter in routes
 */
function validateUserIdParam(req, res, next) {
  const { userId } = req.params;
  
  if (!userId || !validateUUID(userId)) {
    return sendError(res, 400, 'Invalid user ID format', 'INVALID_USER_ID');
  }
  
  next();
}

module.exports = {
  validateWebhookPayload,
  validateUserIdParam,
  validateUUID,
  validateUrl
};
