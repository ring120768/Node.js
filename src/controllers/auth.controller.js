/**
 * Authentication Controller - Car Crash Lawyer AI
 * ✅ Pure Auth architecture - NO user_signup table writes
 * ✅ All data in Auth metadata
 * ✅ GDPR consent in Auth metadata
 */

const crypto = require('crypto');
const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const gdprService = require('../services/gdprService');

// Import AuthService (uses ANON key for client operations)
const AuthService = require('../../lib/services/authService');
// Import admin client for privileged operations
const { supabaseAdmin } = require('../../lib/supabaseAdmin');

// Initialize auth service
let authService = null;

if (config.supabase.anonKey) {
  authService = new AuthService(config.supabase.url, config.supabase.anonKey);
  logger.success('✅ Auth service initialized (ANON + SERVICE ROLE keys)');
}

/**
 * User Signup with Auth Metadata Only
 * POST /api/auth/signup
 * 
 * Flow:
 * 1. Create user in Supabase Auth with all metadata
 * 2. Log GDPR consent to storage
 * 3. Redirect to Typeform for detailed profile
 * 4. Typeform webhook populates user_signup table
 */
async function signup(req, res) {
  try {
    const { email, password, fullName, gdprConsent } = req.body;

    logger.info('📝 Signup request received', {
      email,
      hasFullName: !!fullName,
      gdprConsent
    });

    // ========================================
    // VALIDATION
    // ========================================
    const missingFields = [];
    if (!email || email.trim() === '') missingFields.push('email');
    if (!password || password.trim() === '') missingFields.push('password');
    if (!fullName || fullName.trim() === '') missingFields.push('fullName');

    if (missingFields.length > 0) {
      logger.error('❌ Missing required fields:', missingFields);
      return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`, 'MISSING_FIELDS');
    }

    if (password.length < 8) {
      return sendError(res, 400, 'Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    // ========================================
    // GDPR CONSENT VALIDATION (CRITICAL)
    // ========================================
    if (gdprConsent !== true) {
      logger.warn('⚠️ Signup attempt without GDPR consent', { email, ip: req.clientIp });
      return sendError(
        res, 
        400, 
        'GDPR consent is required to create an account', 
        'GDPR_CONSENT_REQUIRED',
        'You must accept our Privacy Policy to proceed'
      );
    }

    if (!authService) {
      return sendError(res, 503, 'Auth service not configured', 'AUTH_UNAVAILABLE');
    }

    logger.info('🔐 Creating Auth user with metadata...');

    // ========================================
    // CREATE USER IN AUTH WITH ALL METADATA
    // ========================================
    const authResult = await authService.signUp(email, password, {
      // User profile
      full_name: fullName.trim(),

      // GDPR consent metadata
      gdpr_consent: true,
      gdpr_consent_date: new Date().toISOString(),
      gdpr_consent_ip: req.clientIp || 'unknown',
      gdpr_consent_version: config.constants.GDPR.CURRENT_POLICY_VERSION,
      gdpr_consent_user_agent: req.get('user-agent') || 'unknown',

      // Account metadata
      username: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Math.floor(Math.random() * 1000000),
      signup_source: 'web_signup',
      signup_date: new Date().toISOString(),
      account_status: 'pending_onboarding',

      // Stats (to be updated over time)
      total_incidents: 0,
      total_transcriptions: 0,
      last_activity: new Date().toISOString(),

      // Typeform completion tracking
      typeform_completed: false,
      typeform_completion_date: null
    });

    if (!authResult.success) {
      logger.error('❌ Auth signup failed:', authResult.error);

      // Check if user already exists
      if (authResult.error && (
        authResult.error.includes('User already registered') ||
        authResult.error.includes('already registered') ||
        authResult.error.includes('already exists') ||
        authResult.error.toLowerCase().includes('duplicate')
      )) {
        logger.info('ℹ️ User already exists:', email);
        return sendError(
          res, 
          409, 
          'An account with this email already exists. Please log in instead.', 
          'USER_EXISTS'
        );
      }

      return sendError(res, 400, authResult.error, 'SIGNUP_FAILED');
    }

    const userId = authResult.userId;

    logger.success('✅ Auth user created successfully', {
      userId,
      email
    });

    // ========================================
    // LOG GDPR CONSENT TO STORAGE
    // ========================================
    try {
      await gdprService.logActivity(userId, 'CONSENT_GIVEN', {
        consent_type: 'signup',
        consent_method: 'checkbox',
        consent_version: config.constants.GDPR.CURRENT_POLICY_VERSION,
        ip_address: req.clientIp || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      }, req);

      logger.success('✅ GDPR consent logged to storage', { userId });
    } catch (auditError) {
      // Non-critical error - don't fail signup if audit log fails
      logger.warn('⚠️ GDPR audit log error (non-critical):', auditError.message);
    }

    // ========================================
    // SET AUTHENTICATION COOKIE
    // ========================================
    res.cookie('access_token', authResult.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.success('🎉 Signup complete (Auth-only)', {
      userId,
      email,
      consentVersion: config.constants.GDPR.CURRENT_POLICY_VERSION
    });

    // ========================================
    // RETURN SUCCESS - FRONTEND REDIRECTS TO TYPEFORM
    // ========================================
    res.json({
      success: true,
      user: {
        id: userId,
        email: email,
        session: authResult.session
      },
      message: 'Account created successfully. Complete your profile to continue.'
    });

  } catch (error) {
    logger.error('💥 Unexpected signup error:', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR');
  }
}

/**
 * User Login
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Missing credentials', 'MISSING_CREDENTIALS');
    }

    if (!authService) {
      return sendError(res, 503, 'Auth service not configured', 'AUTH_UNAVAILABLE');
    }

    logger.info('🔐 Login attempt', { email });

    const authResult = await authService.signIn(email, password);

    if (!authResult.success) {
      logger.warn('❌ Login failed', { email, error: authResult.error });
      return sendError(res, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    logger.success('✅ Login successful', {
      userId: authResult.userId,
      email
    });

    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    res.cookie('access_token', authResult.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge
    });

    // Get user metadata from auth
    const metadata = authResult.user.user_metadata || {};

    res.json({
      success: true,
      user: {
        id: authResult.userId,
        email: authResult.user.email,
        username: metadata.username,
        fullName: metadata.full_name || '',
        typeformCompleted: metadata.typeform_completed || false
      },
      session: {
        access_token: authResult.session.access_token
      }
    });

  } catch (error) {
    logger.error('💥 Login error:', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR');
  }
}

/**
 * User Logout
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    // Clear the authentication cookie
    res.clearCookie('access_token');

    // Sign out from auth service if available
    if (authService) {
      await authService.signOut();
    }

    logger.info('✅ User logged out');

    res.json({ 
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('💥 Logout error:', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Logout failed', 'LOGOUT_FAILED');
  }
}

/**
 * Session Check
 * GET /api/auth/session
 */
async function checkSession(req, res) {
  try {
    if (!req.user) {
      return res.json({ 
        authenticated: false, 
        user: null 
      });
    }

    const metadata = req.user.user_metadata || {};

    res.json({
      authenticated: true,
      user: {
        id: req.userId,
        email: req.user.email,
        username: metadata.username,
        fullName: metadata.full_name || '',
        typeformCompleted: metadata.typeform_completed || false,
        accountStatus: metadata.account_status || 'active'
      }
    });

  } catch (error) {
    logger.error('💥 Session check error:', {
      error: error.message,
      stack: error.stack
    });
    res.json({ 
      authenticated: false, 
      user: null 
    });
  }
}

module.exports = {
  signup,
  login,
  logout,
  checkSession,
  generateNonce
};


/**
 * Generate Auth Nonce for Typeform
 * GET /api/auth/nonce
 */
async function generateNonce(req, res) {
  try {
    if (!req.user || !req.userId) {
      return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Generate short-lived nonce (valid for 10 minutes)
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

    // Store nonce in user metadata temporarily using admin client
    await supabaseAdmin.auth.admin.updateUserById(req.userId, {
      user_metadata: {
        ...req.user.user_metadata,
        temp_nonce: nonce,
        temp_nonce_expires: expiresAt
      }
    });

    logger.info('🎫 Nonce generated', { userId: req.userId, nonce: nonce.substring(0, 8) + '...' });

    res.json({
      success: true,
      nonce: nonce
    });

  } catch (error) {
    logger.error('💥 Nonce generation error:', error);
    sendError(res, 500, 'Failed to generate nonce', 'NONCE_ERROR');
  }
}
