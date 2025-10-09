/**
 * Authentication Controller for Car Crash Lawyer AI
 * Contains all authentication-related logic moved from index.js
 */

const crypto = require('crypto');
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
    // Log the entire request body for debugging
    logger.info('🔵 Raw signup request body:', JSON.stringify(req.body, null, 2));

    const { email, password, name, surname, gdprConsent } = req.body;

    // Debug: Log received fields with actual values
    logger.info('🔵 Parsed signup fields:', {
      email: email || 'MISSING',
      password: password ? `[${password.length} chars]` : 'MISSING',
      name: name || 'MISSING',
      surname: surname || 'MISSING',
      gdprConsent: gdprConsent,
      allFields: Object.keys(req.body)
    });

    // Validation with specific field checking
    const missingFields = [];
    if (!email || email.trim() === '') missingFields.push('email');
    if (!password || password.trim() === '') missingFields.push('password');
    if (!name || name.trim() === '') missingFields.push('name');
    if (!surname || surname.trim() === '') missingFields.push('surname');

    if (missingFields.length > 0) {
      logger.error('❌ Missing required fields:', { missing: missingFields });
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
      return sendError(res, 400, 'GDPR consent is required to create an account', 'GDPR_CONSENT_REQUIRED',
        'You must accept our Privacy Policy and Terms of Service to proceed');
    }

    if (!authService) {
      return sendError(res, 503, 'Auth service not configured', 'AUTH_UNAVAILABLE');
    }

    logger.info('🟢 Starting auth signup with GDPR consent:', email);

    // Create auth user
    const authResult = await authService.signUp(email, password, {
      full_name: `${name} ${surname}`.trim()
    });

    if (!authResult.success) {
      logger.error('❌ AuthService signUp failed:', {
        error: authResult.error,
        email: email
      });

      // Check if user already exists
      if (authResult.error && (
        authResult.error.includes('User already registered') ||
        authResult.error.includes('already registered') ||
        authResult.error.includes('already exists') ||
        authResult.error.toLowerCase().includes('duplicate')
      )) {
        logger.info('ℹ️ Signup attempt with existing email:', { email });
        return sendError(res, 409, 'User already exists. Please log in to your account.', 'USER_EXISTS');
      }

      return sendError(res, 400, authResult.error, 'SIGNUP_FAILED');
    }

    const userId = authResult.userId;
    logger.success('✅ Auth user created successfully:', { userId, email });

    // Generate username
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Math.floor(Math.random() * 1000000);

    // ========================================
    // DATABASE INSERT WITH PROPER FIELD MAPPING
    // ========================================

    // Prepare the insert data - only include fields that exist in your table
    const insertData = {
      // User identification
      uid: userId,
      create_user_id: userId,
      user_id: userId, // Some tables use user_id instead of uid

      // Basic info
      email: email,
      username: username,
      name: name || '',
      surname: surname || '',
      first_name: name || '', // Some tables use first_name
      last_name: surname || '', // Some tables use last_name

      // Phone - set to null or empty string if not collected
      phone: null,
      mobile_number: null, // Some tables use mobile_number

      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      // Metadata
      source: 'auth_signup',
      verified: true,
      signup_completed: false, // They still need to complete Typeform
      current_step: 1,

      // GDPR CONSENT FIELDS
      gdpr_consent: true,
      gdpr_consent_date: new Date().toISOString(),
      gdpr_consent_ip: req.clientIp || 'unknown',
      gdpr_consent_version: config.constants.GDPR.CURRENT_POLICY_VERSION
    };

    logger.info('🔵 Attempting database insert with data:', {
      uid: insertData.uid,
      email: insertData.email,
      username: insertData.username,
      name: insertData.name,
      surname: insertData.surname,
      phone: insertData.phone,
      gdpr_consent: insertData.gdpr_consent
    });

    const { data: insertedData, error: insertError } = await supabase
      .from('user_signup')
      .insert(insertData)
      .select();

    if (insertError) {
      logger.error('❌ DATABASE INSERT FAILED - Full Error Details:', {
        errorMessage: insertError.message,
        errorCode: insertError.code,
        errorDetails: insertError.details,
        errorHint: insertError.hint,
        fullError: JSON.stringify(insertError, null, 2),
        attemptedData: {
          uid: insertData.uid,
          email: insertData.email,
          username: insertData.username
        }
      });

      // Clean up auth user if database insert fails
      try {
        await authService.deleteUser(userId);
        logger.info('🧹 Cleaned up auth user due to database insert failure', { userId });
      } catch (cleanupError) {
        logger.error('❌ Failed to cleanup auth user after database insert failure:', { 
          userId, 
          cleanupError: cleanupError.message 
        });
      }

      // Return detailed error to help debug
      return sendError(
        res, 
        500, 
        `Failed to create user account: ${insertError.message}`, 
        'USER_CREATION_FAILED',
        insertError.hint || 'Please check server logs for details'
      );
    }

    logger.success('✅ User record inserted into database successfully:', { 
      userId, 
      insertedRecordCount: insertedData?.length 
    });

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

      logger.success('✅ GDPR consent logged successfully', { userId });
    } catch (auditError) {
      // Non-critical error - don't fail signup if audit log fails
      logger.warn('⚠️ GDPR audit log error (non-critical):', { 
        userId, 
        error: auditError.message 
      });
    }

    // Generate auth_code for Typeform integration
    const secret = process.env.TYPEFORM_SECRET || 'car-crash-lawyer-ai-secret-2024';
    const authCodeInput = `${authResult.userId}${email}${secret}`;
    const authCode = crypto
      .createHash('sha256')
      .update(authCodeInput)
      .digest('hex')
      .substring(0, 32);

    logger.info('🔑 Generated auth_code:', authCode);

    // Set authentication cookie
    res.cookie('access_token', authResult.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logger.success('✅ User signup complete with GDPR consent', {
      userId,
      email,
      consentVersion: config.constants.GDPR.CURRENT_POLICY_VERSION
    });

    const responseData = {
      success: true,
      user: {
        id: userId,
        email: email
      },
      authCode: authCode
    };

    logger.info('📤 Sending signup response:', { success: true, userId, email });
    res.json(responseData);
  } catch (error) {
    logger.error('❌ Unexpected signup error:', { 
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

    const authResult = await authService.signIn(email, password);

    if (!authResult.success) {
      logger.warn('Failed login attempt:', { email, error: authResult.error });
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const { data: userData } = await supabase
      .from('user_signup')
      .select('*')
      .eq('uid', authResult.userId)
      .single();

    logger.info('User login successful', { userId: authResult.userId, email: email });

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
    logger.error('Login error:', { error: error.message, stack: error.stack });
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR');
  }
}

/**
 * User Logout
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    if (authService) {
      await authService.signOut();
      logger.info('User signed out from Auth service');
    }
    res.clearCookie('access_token');
    logger.info('Access token cookie cleared');
    res.json({ success: true });
  } catch (error) {
    logger.error('Logout error:', { error: error.message, stack: error.stack });
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

    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('uid', req.userId)
      .single();

    if (userError) {
      logger.error('Error fetching user data during session check:', { 
        userId: req.userId, 
        error: userError.message 
      });
      return res.json({ authenticated: false, user: null });
    }

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
    logger.error('Session check error:', { error: error.message, stack: error.stack });
    res.json({ authenticated: false, user: null });
  }
}

module.exports = {
  signup,
  login,
  logout,
  checkSession
};