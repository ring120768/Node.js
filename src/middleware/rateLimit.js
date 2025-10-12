
/**
 * Rate limiting middleware configuration for Car Crash Lawyer AI
 * Provides API rate limiting and strict rate limiting for sensitive endpoints
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 15 minutes window, 100 requests per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  validate: { trustProxy: false },
  skip: (req) => req.path === '/health'
});

/**
 * Strict rate limiter for sensitive operations
 * 15 minutes window, 10 requests per IP
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Rate limit exceeded for this operation.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  validate: { trustProxy: false }
});

module.exports = {
  apiLimiter,
  strictLimiter
};
