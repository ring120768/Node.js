/**
 * Authentication Middleware for Car Crash Lawyer AI
 * Validates user sessions using Supabase Auth
 * ✅ NO TABLE QUERIES - Uses Auth metadata only
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../../src/utils/logger');

// Initialize Supabase client with ANON key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Extract access token from request
 * Checks both cookie and Authorization header
 */
function extractAccessToken(req) {
  // Priority 1: Cookie (most common for web app)
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }

  // Priority 2: Authorization header (for API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Extract refresh token from request cookies
 */
function extractRefreshToken(req) {
  if (req.cookies && req.cookies.refresh_token) {
    return req.cookies.refresh_token;
  }
  return null;
}

/**
 * Required Authentication Middleware
 * Blocks request if user is not authenticated
 */
async function requireAuth(req, res, next) {
  try {
    let accessToken = extractAccessToken(req);
    const refreshToken = extractRefreshToken(req);

    if (!accessToken && !refreshToken) {
      logger.warn('Authentication required - no tokens provided', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // First, try to use the access token
    if (accessToken) {
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);

      if (!error && user) {
        // Access token is still valid
        req.userId = user.id;
        req.user = user;
        req.userMetadata = user.user_metadata || {};

        logger.info('User authenticated with access token', {
          userId: user.id,
          email: user.email,
          path: req.path
        });

        return next();
      }

      // Access token is expired or invalid - try to refresh if we have a refresh token
      logger.info('Access token expired, attempting refresh', {
        path: req.path,
        hasRefreshToken: !!refreshToken
      });
    }

    // Try to refresh the session using the refresh token
    if (refreshToken) {
      const { data, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (!refreshError && data.session) {
        // Successfully refreshed! Update cookies with new tokens
        const cookieMaxAge = 30 * 24 * 60 * 60 * 1000; // Default 30 days

        res.cookie('access_token', data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: cookieMaxAge
        });

        res.cookie('refresh_token', data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: cookieMaxAge
        });

        // Attach user data
        req.userId = data.user.id;
        req.user = data.user;
        req.userMetadata = data.user.user_metadata || {};

        logger.success('Session refreshed successfully', {
          userId: data.user.id,
          email: data.user.email,
          path: req.path
        });

        return next();
      }

      logger.warn('Failed to refresh session', {
        path: req.path,
        error: refreshError?.message
      });
    }

    // Both access and refresh failed
    logger.warn('All authentication attempts failed', {
      path: req.path
    });

    // Clear invalid cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return res.status(401).json({
      success: false,
      error: 'Session expired. Please log in again.',
      code: 'SESSION_EXPIRED'
    });

  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path
    });
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Optional Authentication Middleware
 * Continues even if user is not authenticated
 * Useful for endpoints that work both with and without auth
 */
async function optionalAuth(req, res, next) {
  try {
    let accessToken = extractAccessToken(req);
    const refreshToken = extractRefreshToken(req);

    if (!accessToken && !refreshToken) {
      // No tokens provided - continue without auth
      req.userId = null;
      req.user = null;
      req.userMetadata = {};
      return next();
    }

    // First, try to use the access token
    if (accessToken) {
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);

      if (!error && user) {
        // Access token is still valid
        req.userId = user.id;
        req.user = user;
        req.userMetadata = user.user_metadata || {};

        logger.info('Optional auth - user authenticated with access token', {
          userId: user.id,
          path: req.path
        });

        return next();
      }
    }

    // Try to refresh the session using the refresh token
    if (refreshToken) {
      const { data, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (!refreshError && data.session) {
        // Successfully refreshed! Update cookies with new tokens
        const cookieMaxAge = 30 * 24 * 60 * 60 * 1000; // Default 30 days

        res.cookie('access_token', data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: cookieMaxAge
        });

        res.cookie('refresh_token', data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: cookieMaxAge
        });

        // Attach user data
        req.userId = data.user.id;
        req.user = data.user;
        req.userMetadata = data.user.user_metadata || {};

        logger.info('Optional auth - session refreshed', {
          userId: data.user.id,
          path: req.path
        });

        return next();
      }
    }

    // Authentication failed - continue without auth (optional)
    logger.info('Optional auth - no valid session, continuing without auth', {
      path: req.path
    });

    // Clear invalid cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    req.userId = null;
    req.user = null;
    req.userMetadata = {};
    next();

  } catch (error) {
    logger.error('Optional auth middleware error', {
      error: error.message,
      path: req.path
    });
    // On error, continue without auth (fail open for optional auth)
    req.userId = null;
    req.user = null;
    req.userMetadata = {};
    next();
  }
}

/**
 * Role-based Authorization Middleware
 * Checks if user has required role in their metadata
 * Usage: requireRole('admin') or requireRole(['admin', 'moderator'])
 */
function requireRole(allowedRoles) {
  // Normalize to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (req, res, next) => {
    try {
      // Must be authenticated first
      if (!req.user || !req.userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      // ✅ Check role from Auth metadata (no table query)
      const userRole = req.userMetadata.role || 'user';

      if (!roles.includes(userRole)) {
        logger.warn('Insufficient permissions', {
          userId: req.userId,
          userRole,
          requiredRoles: roles,
          path: req.path
        });
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: roles,
          current: userRole
        });
      }

      logger.info('Role authorization successful', {
        userId: req.userId,
        userRole,
        path: req.path
      });

      next();

    } catch (error) {
      logger.error('Role authorization error', {
        error: error.message,
        path: req.path
      });
      return res.status(500).json({
        success: false,
        error: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  };
}

/**
 * GDPR Consent Check Middleware
 * Ensures user has given GDPR consent
 */
function requireGDPRConsent(req, res, next) {
  try {
    // Must be authenticated first
    if (!req.user || !req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // ✅ Check GDPR consent from Auth metadata (no table query)
    const hasConsent = req.userMetadata.gdpr_consent === true;

    if (!hasConsent) {
      logger.warn('GDPR consent not found', {
        userId: req.userId,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        error: 'GDPR consent required',
        code: 'GDPR_CONSENT_REQUIRED',
        message: 'You must accept our Privacy Policy to use this feature'
      });
    }

    next();

  } catch (error) {
    logger.error('GDPR consent check error', {
      error: error.message,
      path: req.path
    });
    return res.status(500).json({
      success: false,
      error: 'Consent check error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Email Verification Check Middleware
 * Ensures user has verified their email
 */
function requireEmailVerification(req, res, next) {
  try {
    // Must be authenticated first
    if (!req.user || !req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // ✅ Check email verification from Auth (no table query)
    const isVerified = req.user.email_confirmed_at !== null;

    if (!isVerified) {
      logger.warn('Email not verified', {
        userId: req.userId,
        email: req.user.email,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        error: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address to access this feature'
      });
    }

    next();

  } catch (error) {
    logger.error('Email verification check error', {
      error: error.message,
      path: req.path
    });
    return res.status(500).json({
      success: false,
      error: 'Verification check error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Rate Limiting by User ID
 * Can be used with express-rate-limit to rate limit per user
 */
function userRateLimitKey(req) {
  return req.userId || req.ip;
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requireGDPRConsent,
  requireEmailVerification,
  userRateLimitKey,
  extractAccessToken
};