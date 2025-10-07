
/**
 * Authentication Middleware for Car Crash Lawyer AI
 * Consolidated authentication logic moved from lib/middleware/authMiddleware.js
 */

const AuthService = require('../../lib/services/authService');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');

// Initialize auth service
let authService = null;

if (config.supabase.url && config.supabase.anonKey) {
  authService = new AuthService(config.supabase.url, config.supabase.anonKey);
  logger.success('✅ Auth middleware service initialized');
}

/**
 * Middleware to check if user is authenticated
 * Extracts token from Authorization header or cookies
 */
async function requireAuth(req, res, next) {
  try {
    // Try to get token from multiple sources
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.access_token;

    let token = null;

    // Check Authorization header first (Bearer token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      return sendError(res, 401, 'No authentication token provided', 'MISSING_TOKEN',
        'Please log in to access this resource');
    }

    if (!authService) {
      return sendError(res, 503, 'Auth service not configured', 'AUTH_UNAVAILABLE');
    }

    // Verify the token
    const result = await authService.verifyToken(token);

    if (!result.valid) {
      return sendError(res, 401, 'Invalid or expired token', 'INVALID_TOKEN',
        'Please log in again');
    }

    // Attach user info to request object
    req.user = result.user;
    req.userId = result.userId;

    // Continue to next middleware/route
    next();

  } catch (error) {
    logger.error('Auth middleware error:', error);
    return sendError(res, 500, 'Authentication error', 'AUTH_ERROR',
      'An error occurred while verifying your session');
  }
}

/**
 * Optional auth middleware - doesn't block if not authenticated
 * but attaches user info if token is valid
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.access_token;

    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (token && authService) {
      const result = await authService.verifyToken(token);
      if (result.valid) {
        req.user = result.user;
        req.userId = result.userId;
      }
    }

    next();
  } catch (error) {
    // Continue even if auth fails
    logger.debug('Optional auth failed (non-critical):', error.message);
    next();
  }
}

/**
 * Initialize auth middleware with custom auth service instance
 */
function initializeAuth(customAuthService) {
  authService = customAuthService;
  logger.info('Auth middleware initialized with custom service');
}

module.exports = {
  requireAuth,
  optionalAuth,
  initializeAuth,
  authService
};
