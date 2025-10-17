/**
 * Advanced CORS Configuration with Environment-Based Origin Validation
 * Provides flexible, secure CORS handling with comprehensive logging
 *
 * @module middleware/corsConfig
 */

const logger = require('../utils/logger');

/**
 * Parse allowed origins from environment variable
 * @returns {string[]} Array of allowed origin URLs
 */
function parseAllowedOrigins() {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(o => o.length > 0)
    : [];

  // Static origins that should always be allowed (webhooks, third-party services)
  const staticOrigins = [
    'https://form.typeform.com',
    'https://typeform.com',
    'https://api.typeform.com'
  ];

  // Deduplicate and return
  return [...new Set([...envOrigins, ...staticOrigins])];
}

/**
 * Check if an origin is allowed based on configuration
 * @param {string} origin - The origin to check
 * @returns {boolean} True if origin is allowed
 */
function isOriginAllowed(origin) {
  // Allow same-origin requests (no Origin header)
  if (!origin) {
    return true;
  }

  const allowedOrigins = parseAllowedOrigins();

  // Check exact string matches first (fastest)
  if (allowedOrigins.includes(origin)) {
    logger.debug(`CORS: Allowed origin (exact match): ${origin}`);
    return true;
  }

  // Development mode: Allow localhost/127.0.0.1 on any port
  if (process.env.NODE_ENV === 'development' &&
      process.env.CORS_ALLOW_LOCALHOST === 'true') {
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    if (localhostPattern.test(origin)) {
      logger.debug(`CORS: Allowed localhost origin (dev mode): ${origin}`);
      return true;
    }
  }

  // Allow Replit subdomains (secure patterns only - HTTPS required)
  if (process.env.CORS_ALLOW_REPLIT_SUBDOMAINS === 'true') {
    // Match: https://[alphanumeric-hyphens].replit.app or .replit.dev
    const replitPattern = /^https:\/\/[a-z0-9-]+\.replit\.(app|dev)$/;
    if (replitPattern.test(origin)) {
      logger.info(`CORS: Allowed Replit subdomain: ${origin}`);
      return true;
    }
  }

  // Check against any regex patterns in allowedOrigins
  const regexMatched = allowedOrigins.some(allowed => {
    if (allowed instanceof RegExp) {
      return allowed.test(origin);
    }
    return false;
  });

  if (regexMatched) {
    logger.debug(`CORS: Allowed origin (regex match): ${origin}`);
    return true;
  }

  // Log rejection for security auditing
  logger.warn(`CORS: Rejected unauthorized origin: ${origin}`, {
    origin,
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV
  });

  return false;
}

/**
 * CORS middleware options with dynamic origin validation
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = isOriginAllowed(origin);

    if (allowed) {
      // Allow the request
      callback(null, true);
    } else {
      // Reject with CORS error
      logger.error(`CORS: Blocked request from unauthorized origin: ${origin}`, {
        origin,
        referer: 'N/A',
        timestamp: new Date().toISOString()
      });

      // In production, reject with error; in development, log but allow for debugging
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        logger.warn('CORS: Would reject in production, allowing for development debugging');
        callback(null, false); // Don't set CORS headers but don't error
      }
    }
  },

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],

  // Allowed request headers
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Api-Key',
    'X-Request-Id',
    'Typeform-Signature',
    'X-Zapier-Secret',
    'X-Hub-Signature-256',
    'X-GitHub-Delivery',
    'X-GitHub-Event'
  ],

  // Headers exposed to the client
  exposedHeaders: ['X-Request-Id'],

  // Preflight cache duration (24 hours)
  maxAge: 86400,

  // Pass the CORS preflight response to the next handler
  preflightContinue: false,

  // Provide a status code to use for successful OPTIONS requests
  optionsSuccessStatus: 204
};

/**
 * Get current CORS configuration summary (for debugging)
 * @returns {object} Configuration summary
 */
function getCorsConfigSummary() {
  return {
    allowedOrigins: parseAllowedOrigins(),
    development: {
      nodeEnv: process.env.NODE_ENV,
      allowLocalhost: process.env.CORS_ALLOW_LOCALHOST === 'true',
      allowReplitSubdomains: process.env.CORS_ALLOW_REPLIT_SUBDOMAINS === 'true'
    },
    security: {
      credentialsAllowed: corsOptions.credentials,
      maxAge: corsOptions.maxAge,
      allowedMethods: corsOptions.methods,
      allowedHeadersCount: corsOptions.allowedHeaders.length
    }
  };
}

module.exports = {
  corsOptions,
  isOriginAllowed,
  parseAllowedOrigins,
  getCorsConfigSummary
};
