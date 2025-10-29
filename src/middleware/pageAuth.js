/**
 * Page Authentication Middleware
 *
 * Protects HTML pages by checking Supabase session at the server level.
 * This is the "security wall" - auth happens before HTML is served.
 *
 * Usage:
 *   app.get('/dashboard.html', pageAuth, (req, res) => {
 *     res.sendFile(path.join(__dirname, 'public/dashboard.html'));
 *   });
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Initialize Supabase client with anon key (for auth verification)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Parse cookies from request header
 */
function parseCookies(req) {
  const cookies = {};
  const cookieHeader = req.headers.cookie || '';

  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
}

/**
 * Page Authentication Middleware
 *
 * Verifies Supabase session before serving protected HTML pages.
 * Returns 401 if no valid session exists.
 */
async function pageAuth(req, res, next) {
  try {
    // Extract session token from cookies
    const cookies = parseCookies(req);
    const sessionToken = cookies['access_token'] || cookies['sb-access-token'] || cookies['sb-auth-token'];

    if (!sessionToken) {
      logger.warn('Page access denied - No session token', {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent']
      });

      // Redirect to login page (browser will follow automatically)
      const redirectUrl = `/login-improved.html?redirect=${encodeURIComponent(req.path)}`;
      return res.redirect(302, redirectUrl);
    }

    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);

    if (error || !user) {
      logger.warn('Page access denied - Invalid or expired session', {
        ip: req.ip,
        path: req.path,
        error: error?.message
      });

      // Redirect to login page (session expired)
      const redirectUrl = `/login-improved.html?redirect=${encodeURIComponent(req.path)}`;
      return res.redirect(302, redirectUrl);
    }

    // ✅ Valid session - attach user to request
    req.user = user;
    req.sessionToken = sessionToken;

    logger.info('Page auth successful', {
      userId: user.id,
      email: user.email,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('Page auth middleware error:', error);

    // Redirect to login page (server error)
    return res.redirect(302, '/login-improved.html');
  }
}

/**
 * Optional API Auth Middleware (for AJAX requests)
 *
 * Similar to pageAuth but returns JSON instead of redirect.
 * Use for API endpoints that need authentication.
 */
async function apiAuth(req, res, next) {
  try {
    // Check Authorization header first (for API calls)
    let sessionToken = req.headers.authorization?.replace('Bearer ', '');

    // Fallback to cookies if no header
    if (!sessionToken) {
      const cookies = parseCookies(req);
      sessionToken = cookies['access_token'] || cookies['sb-access-token'] || cookies['sb-auth-token'];
    }

    if (!sessionToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error?.message || 'Invalid or expired session'
      });
    }

    // Attach user to request
    req.user = user;
    req.sessionToken = sessionToken;

    next();
  } catch (error) {
    logger.error('API auth middleware error:', error);

    return res.status(500).json({
      error: 'Server Error',
      message: 'Authentication service error'
    });
  }
}

module.exports = {
  pageAuth,
  apiAuth,
  parseCookies
};
