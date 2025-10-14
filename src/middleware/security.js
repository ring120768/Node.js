/**
 * Security middleware configuration for Car Crash Lawyer AI
 * Implements security headers, CORS, compression, and request ID generation
 */

const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * CORS configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://workspace.ring120768.repl.co',
      'https://workspace.ring120768.replit.app',
      'https://workspace.ring120768.replit.dev',
      'http://localhost:3000',
      'http://localhost:5000',
      'https://form.typeform.com',
      'https://typeform.com',
      'https://api.typeform.com'
      // Removed wildcard patterns for security: /.typeform.com$/, /.zapier.com$/, /.replit.co$/,
      
      
      
      
      
    ];

    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      return allowed.test(origin);
    });

    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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
  exposedHeaders: ['X-Request-Id']
};

/**
 * Helmet security configuration
 */
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
      fontSrc: ["'self'", 'https:'],
      mediaSrc: ["'self'", 'blob:', 'data:'],
      frameSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for Replit
  crossOriginOpenerPolicy: false
};

/**
 * Compression configuration
 */
const compressionOptions = {
  filter: (req, res) => {
    // Don't compress responses if the request includes a cache-control: no-transform directive
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }

    // Use the default compression filter for everything else
    return compression.filter(req, res);
  },
  level: 6, // Balance between compression and CPU usage
  threshold: 1024 // Only compress responses larger than 1KB
};

/**
 * Request ID middleware
 * Generates unique ID for each request for tracing
 */
function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

/**
 * Request timeout middleware
 */
function requestTimeoutMiddleware(timeout = 30000) {
  return (req, res, next) => {
    const timeoutHandle = setTimeout(() => {
      if (!res.headersSent) {
        logger.error('Request timeout:', { 
          url: req.url, 
          method: req.method,
          requestId: req.requestId 
        });
        res.status(408).json({ 
          error: 'Request timeout',
          requestId: req.requestId 
        });
      }
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timeoutHandle);
    });

    res.on('close', () => {
      clearTimeout(timeoutHandle);
    });

    next();
  };
}

/**
 * Verify Typeform HMAC signature against the raw request body.
 * Header format: "sha256=<base64digest>"
 */
function verifyTypeform(req, secret) {
  if (!secret) return false;
  const header = req.get('Typeform-Signature') || '';
  if (!header.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(req.rawBody || Buffer.from(''))
    .digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * HTTPS redirect middleware with webhook bypass
 */
function httpsRedirect(req, res, next) {
  // Skip HTTPS redirect for webhook endpoints to prevent 301/302 issues
  if (req.path.startsWith('/webhooks/') || req.path.startsWith('/webhook/')) {
    return next();
  }

  // Skip if already HTTPS or in development
  if (req.secure || req.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'development') {
    return next();
  }

  // Force HTTPS redirect for non-webhook requests
  const httpsUrl = `https://${req.get('host')}${req.originalUrl}`;
  return res.redirect(301, httpsUrl);
}

/**
 * WWW redirect middleware with webhook bypass
 */
function wwwRedirect(req, res, next) {
  // Skip WWW redirect for webhook endpoints
  if (req.path.startsWith('/webhooks/') || req.path.startsWith('/webhook/')) {
    return next();
  }

  const host = req.get('host');
  if (host && !host.startsWith('www.') && process.env.FORCE_WWW === 'true') {
    const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const wwwUrl = `${protocol}://www.${host}${req.originalUrl}`;
    return res.redirect(301, wwwUrl);
  }

  next();
}

module.exports = {
  helmet: helmet(helmetOptions),
  cors: cors(corsOptions),
  compression: compression(compressionOptions),
  requestId: requestIdMiddleware,
  requestTimeout: requestTimeoutMiddleware,
  verifyTypeform,
  httpsRedirect,
  wwwRedirect,
  corsOptions,
  helmetOptions,
  compressionOptions
};