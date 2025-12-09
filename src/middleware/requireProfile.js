/**
 * Require Profile Middleware
 *
 * Ensures user has completed their profile (user_signup record exists)
 * before allowing access to protected resources like incident forms.
 *
 * This prevents foreign key constraint errors when users skip profile completion.
 *
 * Usage:
 *   app.get('/incident-form-page1.html', pageAuth, requireProfile, (req, res) => {
 *     res.sendFile(path.join(__dirname, '../public/incident-form-page1.html'));
 *   });
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Initialize Supabase client with service role key (to bypass RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Require Profile Middleware
 *
 * Checks if authenticated user has completed their profile.
 * Redirects to profile form if user_signup record is missing.
 *
 * IMPORTANT: This middleware must come AFTER pageAuth or apiAuth
 * to ensure req.user is populated.
 */
async function requireProfile(req, res, next) {
  try {
    // Ensure user is authenticated (should be set by pageAuth/apiAuth)
    if (!req.user || !req.user.id) {
      logger.warn('requireProfile called without authenticated user', {
        path: req.path,
        hasUser: !!req.user
      });
      return res.redirect(302, '/login.html');
    }

    const userId = req.user.id;

    // Check if user_signup record exists
    const { data: profile, error } = await supabase
      .from('user_signup')
      .select('create_user_id')
      .eq('create_user_id', userId)
      .single();

    if (error || !profile) {
      logger.warn('User attempted to access protected resource without completing profile', {
        userId,
        email: req.user.email,
        path: req.path,
        error: error?.message
      });

      // Redirect to profile form with message
      const redirectUrl = `/signup-profile.html?incomplete=true&redirect=${encodeURIComponent(req.path)}`;
      return res.redirect(302, redirectUrl);
    }

    // Profile exists - allow access
    logger.info('✅ Profile check passed', {
      userId,
      email: req.user.email,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('requireProfile middleware error:', error);

    // On error, redirect to profile form for safety
    return res.redirect(302, '/signup-profile.html?error=true');
  }
}

/**
 * API version of requireProfile
 *
 * Returns JSON error instead of redirect (for AJAX requests)
 */
async function requireProfileApi(req, res, next) {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userId = req.user.id;

    // Check if user_signup record exists
    const { data: profile, error } = await supabase
      .from('user_signup')
      .select('create_user_id')
      .eq('create_user_id', userId)
      .single();

    if (error || !profile) {
      logger.warn('API request without profile completion', {
        userId,
        email: req.user.email,
        path: req.path,
        error: error?.message
      });

      return res.status(403).json({
        error: 'Profile Incomplete',
        message: 'Please complete your profile before submitting incident reports',
        redirectTo: '/signup-profile.html'
      });
    }

    // Profile exists - allow access
    next();
  } catch (error) {
    logger.error('requireProfileApi middleware error:', error);

    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to verify profile completion'
    });
  }
}

module.exports = {
  requireProfile,
  requireProfileApi
};
