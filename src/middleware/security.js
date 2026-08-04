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
      // Canonical domain
      'https://www.carcrashlawyerai.com',
      'https://carcrashlawyerai.com',
      // Legacy hosts (301 to canonical, kept for the shipped mobile apps)
      'https://carcrashlawyerai.co.uk',
      'https://www.carcrashlawyerai.co.uk',
      'https://carcrashlawyerai.up.railway.app',
      'https://car-crash-lawyer-ai-production.up.railway.app'
    ];

    // Add localhost origins only in development/test environments
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:5000');
    }

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
  crossOriginEmbedderPolicy: false, // Allow embedding for external integrations
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
 * Canonical host redirect (SEO)
 *
 * Keeps *.up.railway.app and carcrashlawyerai.co.uk out of Google so all
 * ranking signals land on https://www.carcrashlawyerai.com.
 *
 * IMPORTANT: the shipped Capacitor apps have server.url pinned to the Railway
 * host with allowNavigation limited to *.railway.app. Redirecting their webview
 * would bounce users into the system browser, so native webviews are exempt.
 * New app builds identify themselves via appendUserAgent; already-installed
 * builds are matched by the WebView UA signature.
 */
const CANONICAL_HOST = process.env.CANONICAL_HOST || 'www.carcrashlawyerai.com';

function isNativeAppWebview(req) {
  const ua = req.get('user-agent') || '';
  if (ua.includes('CarCrashLawyerAIApp')) return true;       // new builds (appendUserAgent)
  if (/;\s*wv\)/.test(ua)) return true;                       // Android WebView
  if (/iPhone|iPad/.test(ua) && !/Safari\//.test(ua)) return true; // iOS WKWebView
  return false;
}

function canonicalHost(req, res, next) {
  if (process.env.CANONICAL_REDIRECT === 'false') return next();

  // Health checks and webhooks must never be redirected
  if (req.path === '/healthz' || req.path === '/livez' || req.path === '/readyz') return next();
  if (req.path.startsWith('/webhooks/') || req.path.startsWith('/webhook/')) return next();
  if (req.path.startsWith('/api/')) return next();

  const host = (req.hostname || '').toLowerCase();
  if (!host || host === CANONICAL_HOST) return next();
  if (host.includes('localhost') || host.includes('127.0.0.1')) return next();

  const isLegacyHost = host.endsWith('up.railway.app') || host.includes('carcrashlawyerai.co.uk');
  const isApex = host === 'carcrashlawyerai.com';
  if (!isLegacyHost && !isApex) return next();

  if (isLegacyHost && isNativeAppWebview(req)) return next();

  return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
}

/**
 * HTTPS redirect middleware with health check and webhook bypass
 */
function httpsRedirect(req, res, next) {
  // Bypass for Railway health checks (must accept HTTP for internal container checks)
  if (req.path === '/healthz' || req.path === '/livez' || req.path === '/readyz') {
    return next();
  }

  // Skip HTTPS redirect for webhook endpoints to prevent 301/302 issues
  if (req.path.startsWith('/webhooks/') || req.path.startsWith('/webhook/')) {
    return next();
  }

  // Skip if already HTTPS, in development, or localhost
  const host = req.get('host') || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  if (req.secure || req.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'development' || isLocalhost) {
    return next();
  }

  // Force HTTPS redirect for non-webhook requests
  const httpsUrl = `https://${host}${req.originalUrl}`;
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
  canonicalHost,
  httpsRedirect,
  wwwRedirect,
  corsOptions,
  helmetOptions,
  compressionOptions
};