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
    logger.info('Raw signup request body:', JSON.stringify(req.body, null, 2));

    const { email, password, name, surname, mobile, gdprConsent } = req.body;

    // Debug: Log received fields with actual values
    logger.info('Parsed signup fields:', {
      email: email || 'MISSING',
      emailType: typeof email,
      password: password ? `[${password.length} chars]` : 'MISSING',
      name: name || 'MISSING',
      nameType: typeof name,
      surname: surname || 'MISSING',
      surnameType: typeof surname,
      mobile: mobile || 'null/empty',
      mobileType: typeof mobile,
      gdprConsent: gdprConsent,
      gdprConsentType: typeof gdprConsent,
      allFields: Object.keys(req.body)
    });

    // Validation with specific field checking
    const missingFields = [];
    if (!email || email.trim() === '') missingFields.push('email');
    if (!password || password.trim() === '') missingFields.push('password');
    if (!name || name.trim() === '') missingFields.push('name');
    if (!surname || surname.trim() === '') missingFields.push('surname');

    if (missingFields.length > 0) {
      logger.error('Missing required fields:', { missing: missingFields });
      return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`, 'MISSING_FIELDS');
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
      phone: mobile || null
    });

    if (!authResult.success) {
      // Log detailed error from auth service
      logger.error('AuthService signUp failed:', {
        error: authResult.error,
        email: email,
        providedData: { name, surname, mobile }
      });

      // Check if user already exists
      if (authResult.error && (
        authResult.error.includes('User already registered') ||
        authResult.error.includes('already registered') ||
        authResult.error.includes('already exists') ||
        authResult.error.toLowerCase().includes('duplicate')
      )) {
        logger.info('Signup attempt with existing email:', { email });
        return sendError(res, 409, 'User already exists. Please log in to your account.', 'USER_EXISTS');
      }

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
      phone: mobile || null,
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
        error: insertError.message, // Log specific error message
        details: insertError,
        userData: {
          uid: userId,
          email: email,
          username: username,
          name: firstName,
          surname: lastName,
          phone: mobile
        }
      });
      // Clean up auth user if database insert fails
      try {
        await authService.deleteUser(userId);
        logger.info('Cleaned up auth user due to database insert failure', { userId });
      } catch (cleanupError) {
        logger.error('Failed to cleanup auth user after database insert failure:', { userId, cleanupError });
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
      logger.warn('GDPR audit log error (non-critical):', { userId, auditError });
    }

    // Generate auth_code for Typeform integration
    const secret = process.env.TYPEFORM_SECRET || 'car-crash-lawyer-ai-secret-2024';
    const authCodeInput = `${authResult.userId}${email}${secret}`;
    const authCode = crypto
      .createHash('sha256')
      .update(authCodeInput)
      .digest('hex')
      .substring(0, 32);

    console.log('Generated auth_code:', authCode);

    // Create initial record in user_signup table
    const { data: userSignupData, error: userSignupError } = await supabase
      .from('user_signup')
      .insert({
        user_id: authResult.userId,              // UUID from Supabase Auth (required)
        create_user_id: authResult.userId,       // Same UUID as text (backwards compat)
        name: name,
        surname: surname,
        email: email,
        mobile: mobile || null,
        created_at: new Date().toISOString(),    // Explicit or let default handle
        gdpr_consent: true,
        gdpr_consent_date: new Date().toISOString(),
        consent_given: true,
        consent_date: new Date().toISOString(),
        consent_source: 'signup',
        gdpr_consent_ip: req.ip || req.connection?.remoteAddress || 'unknown',
        gdpr_consent_version: 'v1.0',
        account_status: 'active'
      })
      .select()
      .single();

    if (userSignupError) {
      console.error('Error creating user_signup record:', userSignupError);
      // Don't fail the signup, webhook will handle it
      console.warn('Proceeding without initial user_signup record');
    } else {
      console.log('Created initial user_signup record:', userSignupData.id);
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

    const responseData = {
      success: true,
      user: {
        id: userId,
        email: email
      },
      authCode: authCode
    };

    logger.info('Sending signup response:', { success: true, userId, email });
    res.json(responseData);
  } catch (error) {
    logger.error('Unexpected signup error:', { error: error.message, stack: error.stack });
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
      // Log failed login attempt
      logger.warn('Failed login attempt:', { email, error: authResult.error });
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const { data: userData } = await supabase
      .from('user_signup')
      .select('*')
      .eq('uid', authResult.userId)
      .single();

    // Log successful login
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
    // Clear the session from Supabase Auth if authService is available
    if (authService) {
      await authService.signOut();
      logger.info('User signed out from Auth service');
    }
    // Clear the authentication cookie
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
      // No user object attached to request, session is invalid or expired
      return res.json({ authenticated: false, user: null });
    }

    // Fetch user details from our user_signup table to ensure consistency
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('uid', req.userId)
      .single();

    if (userError) {
      logger.error('Error fetching user data during session check:', { userId: req.userId, error: userError.message });
      // If user data is not found in our table, consider session invalid
      return res.json({ authenticated: false, user: null });
    }

    // If user data is found, session is considered valid
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
    // In case of unexpected errors, assume not authenticated
    res.json({ authenticated: false, user: null });
  }
}

// The following line is a placeholder for potential JavaScript redirects in the frontend.
// In a real-world scenario, this would be handled within your frontend JavaScript files,
// not in the backend controller. If such redirects existed, they would be updated as follows:
// window.location.href = '/signup-auth.html';

module.exports = {
  signup,
  login,
  logout,
  checkSession
};