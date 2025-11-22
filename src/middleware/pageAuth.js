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

    // ENHANCED DEBUGGING: Log everything we receive
    logger.info('🔍 PageAuth debug', {
      path: req.path,
      rawCookieHeader: req.headers.cookie ? req.headers.cookie.substring(0, 100) + '...' : 'NONE',
      parsedCookieKeys: Object.keys(cookies),
      hasAccessToken: !!cookies['access_token'],
      hasSbAccessToken: !!cookies['sb-access-token'],
      hasSbAuthToken: !!cookies['sb-auth-token'],
      accessTokenLength: cookies['access_token'] ? cookies['access_token'].length : 0,
      allCookieNames: Object.keys(cookies).join(', ')
    });

    const sessionToken = cookies['access_token'] || cookies['sb-access-token'] || cookies['sb-auth-token'];

    if (!sessionToken) {
      logger.warn('Page access denied - No session token', {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent'],
        cookiesReceived: Object.keys(cookies).length,
        cookieNames: Object.keys(cookies).join(', ')
      });

      // Redirect to login page (browser will follow automatically)
      const redirectUrl = `/login.html?redirect=${encodeURIComponent(req.path)}`;
      return res.redirect(302, redirectUrl);
    }

    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);

    if (error || !user) {
      logger.warn('Page access denied - Token validation failed', {
        ip: req.ip,
        path: req.path,
        error: error?.message
      });

      // Try to refresh the session using the refresh token
      const refreshToken = cookies['refresh_token'];

      if (refreshToken) {
        logger.info('Attempting to refresh expired session', {
          path: req.path,
          userId: user?.id
        });

        try {
          const { data, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
          });

          if (!refreshError && data.session) {
            // Successfully refreshed! Update cookies with new tokens
            const cookieMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

            res.cookie('access_token', data.session.access_token, {
              httpOnly: true,
              secure: true,
              sameSite: 'none',
              path: '/',
              maxAge: cookieMaxAge
            });

            res.cookie('refresh_token', data.session.refresh_token, {
              httpOnly: true,
              secure: true,
              sameSite: 'none',
              path: '/',
              maxAge: cookieMaxAge
            });

            // Attach user data
            req.user = data.user;
            req.sessionToken = data.session.access_token;

            logger.success('Session refreshed successfully', {
              userId: data.user.id,
              email: data.user.email,
              path: req.path
            });

            return next();
          } else {
            logger.warn('Session refresh failed', {
              path: req.path,
              error: refreshError?.message
            });
          }
        } catch (refreshErr) {
          logger.error('Error refreshing session', {
            path: req.path,
            error: refreshErr.message
          });
        }
      }

      // If refresh failed or no refresh token, redirect to login
      logger.warn('Page access denied - Session expired and refresh failed', {
        ip: req.ip,
        path: req.path,
        hadRefreshToken: !!refreshToken
      });

      const redirectUrl = `/login.html?redirect=${encodeURIComponent(req.path)}`;
      return res.redirect(302, redirectUrl);
    }

    // ✅ Valid session - attach user to request
    req.user = user;
    req.sessionToken = sessionToken;

    logger.info('✅ Page auth successful', {
      userId: user.id,
      email: user.email,
      path: req.path,
      tokenSource: cookies['access_token'] ? 'access_token' :
                   cookies['sb-access-token'] ? 'sb-access-token' :
                   'sb-auth-token',
      tokenLength: sessionToken.length
    });

    next();
  } catch (error) {
    logger.error('Page auth middleware error:', error);

    // Redirect to login page (server error)
    return res.redirect(302, '/login.html');
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
    // LOG EVERYTHING at the start for debugging
    const initialCookies = parseCookies(req);
    logger.info('🔍 API auth start', {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!req.headers.authorization,
      authHeaderValue: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'none',
      rawCookieHeader: req.headers.cookie ? req.headers.cookie.substring(0, 100) + '...' : 'none',
      parsedCookieKeys: Object.keys(initialCookies),
      hasAccessToken: !!initialCookies['access_token'],
      hasSbAccessToken: !!initialCookies['sb-access-token'],
      hasSbAuthToken: !!initialCookies['sb-auth-token'],
      accessTokenLength: initialCookies['access_token'] ? initialCookies['access_token'].length : 0
    });

    // Check Authorization header first (for API calls)
    let sessionToken = req.headers.authorization?.replace('Bearer ', '');

    // Fallback to cookies if no header
    if (!sessionToken) {
      const cookies = parseCookies(req);
      sessionToken = cookies['access_token'] || cookies['sb-access-token'] || cookies['sb-auth-token'];

      logger.info('API auth - using cookies', {
        path: req.path,
        cookieKeys: Object.keys(cookies),
        hasAccessToken: !!cookies['access_token'],
        tokenFound: !!sessionToken
      });
    } else {
      logger.info('API auth - using Authorization header', {
        path: req.path,
        tokenLength: sessionToken.length
      });
    }

    if (!sessionToken) {
      logger.warn('API auth failed: No token found', {
        path: req.path,
        hasAuthHeader: !!req.headers.authorization,
        cookieCount: Object.keys(parseCookies(req)).length
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);

    if (error || !user) {
      logger.warn('API auth failed: Token validation failed', {
        path: req.path,
        error: error?.message,
        hasUser: !!user
      });

      // Try to refresh the session using the refresh token
      const cookies = parseCookies(req);
      const refreshToken = cookies['refresh_token'];

      if (refreshToken) {
        logger.info('Attempting to refresh expired session (API)', {
          path: req.path
        });

        try {
          const { data, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
          });

          if (!refreshError && data.session) {
            // Successfully refreshed! Update cookies with new tokens
            const cookieMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

            res.cookie('access_token', data.session.access_token, {
              httpOnly: true,
              secure: true,
              sameSite: 'none',
              path: '/',
              maxAge: cookieMaxAge
            });

            res.cookie('refresh_token', data.session.refresh_token, {
              httpOnly: true,
              secure: true,
              sameSite: 'none',
              path: '/',
              maxAge: cookieMaxAge
            });

            // Attach user data
            req.user = data.user;
            req.sessionToken = data.session.access_token;

            logger.success('Session refreshed successfully (API)', {
              userId: data.user.id,
              email: data.user.email,
              path: req.path
            });

            return next();
          } else {
            logger.warn('Session refresh failed (API)', {
              path: req.path,
              error: refreshError?.message
            });
          }
        } catch (refreshErr) {
          logger.error('Error refreshing session (API)', {
            path: req.path,
            error: refreshErr.message
          });
        }
      }

      // If refresh failed or no refresh token, return 401
      return res.status(401).json({
        error: 'Unauthorized',
        message: error?.message || 'Invalid or expired session'
      });
    }

    logger.info('API auth successful', {
      userId: user.id,
      email: user.email,
      path: req.path
    });

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
