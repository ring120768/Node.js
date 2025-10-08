/**
 * Authentication Controller for Car Crash Lawyer AI
 * Contains all authentication-related logic moved from index.js
 */

const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const gdprService = require('../services/gdprService');

// Import AuthService and Supabase client
const AuthService = require('../../lib/services/authService');
const { createClient } = require('@supabase/supabase-js');

// Initialize auth service and supabase
let authService = null;
let supabase = null;

if (config.supabase.anonKey) {
  authService = new AuthService(config.supabase.url, config.supabase.anonKey);
  logger.success('✅ Auth service initialized in controller');
}

if (config.supabase.url && config.supabase.serviceKey) {
  supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * User Signup with GDPR consent capture
 * POST /api/auth/signup
 */
async function signup(req, res) {
  try {
    const { email, password, name, surname, phone, gdprConsent } = req.body;

    // Validation
    if (!email || !password || !name || !surname) {
      return sendError(res, 400, 'Missing required fields', 'MISSING_FIELDS');
    }

    if (password.length < 8) {
      return sendError(res, 400, 'Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    // ========================================
    // GDPR CONSENT VALIDATION (CRITICAL)
    // ========================================
    if (gdprConsent !== true) {
      logger.warn('Signup attempt without GDPR consent', { email, ip: req.clientIp });
      return sendError(res, 400, 'GDPR consent is required to create an account', 'GDPR_CONSENT_REQUIRED',
        'You must accept our Privacy Policy and Terms of Service to proceed');
    }

    if (!authService) {
      return sendError(res, 503, 'Auth service not configured', 'AUTH_UNAVAILABLE');
    }

    logger.info('Auth signup with GDPR consent:', email);

    const authResult = await authService.signUp(email, password, {
      full_name: `${name} ${surname}`.trim(),
      phone: phone
    });

    if (!authResult.success) {
      return sendError(res, 400, authResult.error, 'SIGNUP_FAILED');
    }

    const userId = authResult.userId;
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Math.floor(Math.random() * 1000000);

    // Use provided name and surname fields
    const firstName = name || '';
    const lastName = surname || '';

    // ========================================
    // GDPR CONSENT CAPTURE IN DATABASE
    // ========================================
    const { error: insertError } = await supabase.from('user_signup').insert({
      uid: userId,
      create_user_id: userId,
      email: email,
      username: username,
      name: firstName || '',
      surname: lastName || '',
      phone: phone || null,
      created_at: new Date().toISOString(),
      source: 'auth_signup',
      verified: true,

      // ✅ GDPR CONSENT FIELDS
      gdpr_consent: true,
      gdpr_consent_date: new Date().toISOString(),
      gdpr_consent_ip: req.clientIp || 'unknown',
      gdpr_consent_version: config.constants.GDPR.CURRENT_POLICY_VERSION
    });

    if (insertError) {
      logger.error('Error inserting user with GDPR consent:', {
        error: insertError,
        userData: {
          uid: userId,
          email: email,
          username: username,
          name: firstName,
          surname: lastName,
          phone: phone
        }
      });
      // Clean up auth user if database insert fails
      try {
        await authService.deleteUser(userId);
      } catch (cleanupError) {
        logger.error('Failed to cleanup auth user:', cleanupError);
      }
      return sendError(res, 500, 'Failed to create user account', 'USER_CREATION_FAILED');
    }

    // ========================================
    // LOG GDPR CONSENT IN AUDIT TRAIL
    // ========================================
    try {
      await gdprService.logActivity(userId, 'CONSENT_GIVEN', {
        consent_type: config.constants.GDPR.CONSENT_TYPES.SIGNUP,
        consent_method: 'checkbox',
        consent_version: config.constants.GDPR.CURRENT_POLICY_VERSION,
        ip_address: req.clientIp || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      }, req);

      logger.success('GDPR consent logged successfully', { userId });
    } catch (auditError) {
      // Non-critical error - don't fail signup if audit log fails
      logger.warn('GDPR audit log error (non-critical):', auditError);
    }

    // Set authentication cookie
    res.cookie('access_token', authResult.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logger.success('User signup complete with GDPR consent', {
      userId,
      email,
      consentVersion: config.constants.GDPR.CURRENT_POLICY_VERSION
    });

    res.json({
      success: true,
      user: {
        id: userId,
        email: email,
        username: username,
        name: firstName,
        surname: lastName
      },
      session: {
        access_token: authResult.session.access_token
      },
      gdpr: {
        consentGiven: true,
        consentDate: new Date().toISOString(),
        policyVersion: config.constants.GDPR.CURRENT_POLICY_VERSION
      }
    });
  } catch (error) {
    logger.error('Signup error:', error);
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

    const authResult = await authService.signIn(email, password);

    if (!authResult.success) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const { data: userData } = await supabase
      .from('user_signup')
      .select('*')
      .eq('uid', authResult.userId)
      .single();

    const cookieMaxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    res.cookie('access_token', authResult.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge
    });

    res.json({
      success: true,
      user: {
        id: authResult.userId,
        email: authResult.user.email,
        username: userData?.username,
        fullName: `${userData?.name || ''} ${userData?.surname || ''}`.trim()
      },
      session: {
        access_token: authResult.session.access_token
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR');
  }
}

/**
 * User Logout
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    if (authService) await authService.signOut();
    res.clearCookie('access_token');
    res.json({ success: true });
  } catch (error) {
    logger.error('Logout error:', error);
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
      return res.json({ authenticated: false, user: null });
    }

    const { data: userData } = await supabase
      .from('user_signup')
      .select('*')
      .eq('uid', req.userId)
      .single();

    res.json({
      authenticated: true,
      user: {
        id: req.userId,
        email: req.user.email,
        username: userData?.username,
        fullName: `${userData?.name || ''} ${userData?.surname || ''}`.trim()
      }
    });
  } catch (error) {
    logger.error('Session check error:', error);
    res.json({ authenticated: false });
  }
}

module.exports = {
  signup,
  login,
  logout,
  checkSession
};