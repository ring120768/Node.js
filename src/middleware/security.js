
/**
 * Security middleware configuration for Car Crash Lawyer AI
 * Implements security headers, CORS, compression, and request ID generation
 */

const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * CORS configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Production whitelist
    const allowedOrigins = [
      'https://workspace.ring120768.repl.co',
      'https://workspace.ring120768.replit.app',
      /\.repl\.co$/,
      /\.replit\.app$/
    ];
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      return allowedOrigin.test(origin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id']
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

module.exports = {
  helmet: helmet(helmetOptions),
  cors: cors(corsOptions),
  compression: compression(compressionOptions),
  requestId: requestIdMiddleware,
  requestTimeout: requestTimeoutMiddleware,
  corsOptions,
  helmetOptions,
  compressionOptions
};
