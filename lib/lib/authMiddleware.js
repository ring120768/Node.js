// ========================================
// AUTHENTICATION MIDDLEWARE
// Protects routes that require login
// ========================================

const AuthService = require('../authService');

// Initialize auth service
const authService = new AuthService(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided',
        message: 'Please log in to access this resource'
      });
    }

    // Verify the token
    const result = await authService.verifyToken(token);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        message: 'Please log in again'
      });
    }

    // Attach user info to request object
    req.user = result.user;
    req.userId = result.userId;

    // Continue to next middleware/route
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred while verifying your session'
    });
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

    if (token) {
      const result = await authService.verifyToken(token);
      if (result.valid) {
        req.user = result.user;
        req.userId = result.userId;
      }
    }

    next();
  } catch (error) {
    // Continue even if auth fails
    next();
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
  authService
};