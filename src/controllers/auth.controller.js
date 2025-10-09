/**
 * Authentication Controller for Car Crash Lawyer AI
 * Contains all authentication-related logic moved from index.js
 * 
 * UPDATED: Now includes current_step column for signup flow tracking
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

// Debug: Log config values (with better error handling)
try {
  console.log('🔍 Auth Controller Config Check:', {
    hasSupabaseUrl: !!config?.supabase?.url,
    hasAnonKey: !!config?.supabase?.anonKey,
    hasServiceKey: !!config?.supabase?.serviceKey,
    configExists: !!config
  });
} catch (configError) {
  console.error('❌ Config access error:', configError.message);
}

// Initialize auth service with better error handling
if (config?.supabase?.url && config?.supabase?.anonKey) {
  try {
    authService = new AuthService(config.supabase.url, config.supabase.anonKey);
    logger.success('✅ Auth service initialized in controller');
  } catch (error) {
    logger.error('❌ Failed to initialize auth service:', error.message);
    authService = null;
  }
} else {
  logger.warn('⚠️ Auth service not initialized - missing config');
}

// Initialize Supabase client with better error handling
if (config?.supabase?.url && config?.supabase?.serviceKey) {
  try {
    supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    logger.success('✅ Supabase client initialized in controller');
  } catch (error) {
    logger.error('❌ Failed to initialize Supabase client:', error.message);
    supabase = null;
  }
} else {
  logger.warn('⚠️ Supabase client not initialized - missing config');
}

/**
 * User Signup with GDPR consent capture
 * POST /api/auth/signup
 */
async function signup(req, res) {
  // Ensure we always send JSON responses
  res.setHeader('Content-Type', 'application/json');

  try {
    logger.info('🔵 Signup endpoint hit:', {
      method: req.method,
      url: req.url,
      contentType: req.get('content-type'),
      hasBody: !!req.body,
      bodyType: typeof req.body,
      bodyString: JSON.stringify(req.body),
      headers: {
        'content-type': req.get('content-type'),
        'content-length': req.get('content-length')
      }
    });

    // Check if request body exists and is valid
    if (!req.body || typeof req.body !== 'object') {
      logger.error('❌ Invalid or missing request body:', {
        hasBody: !!req.body,
        bodyType: typeof req.body,
        bodyValue: req.body
      });
      return res.status(400).json({
        success: false,
        error: 'Request body is required and must be valid JSON',
        code: 'INVALID_BODY'
      });
    }

    // Check if request body has any keys
    if (Object.keys(req.body).length === 0) {
      logger.error('❌ Empty request body received');
      return res.status(400).json({
        success: false,
        error: 'Request body cannot be empty',
        code: 'EMPTY_BODY'
      });
    }

    // Log detailed debugging info at start
    logger.info('🔵 Signup attempt started:', {
      timestamp: new Date().toISOString(),
      ip: req.clientIp || req.ip,
      userAgent: req.get('user-agent')?.substring(0, 100),
      hasAuthService: !!authService,
      hasSupabaseClient: !!supabase,
      bodyKeys: Object.keys(req.body || {}),
      contentType: req.get('content-type'),
      method: req.method,
      url: req.url
    });

    // Log the entire request body for debugging
    logger.info('🔵 Raw signup request body:', JSON.stringify(req.body, null, 2));

    const { email, password, gdprConsent } = req.body;

    // Log extracted values for debugging
    logger.info('🔵 Extracted signup values:', {
      email: typeof email,
      password: typeof password,
      gdprConsent: typeof gdprConsent,
      emailValue: email,
      gdprConsentValue: gdprConsent
    });

    // Debug: Log received fields with actual values
    logger.info('🔵 Parsed signup fields:', {
      email: email || 'MISSING',
      password: password ? `[${password.length} chars]` : 'MISSING',
      gdprConsent: gdprConsent,
      allFields: Object.keys(req.body)
    });

    // Validation with specific field checking
    const missingFields = [];
    if (!email || email.trim() === '') missingFields.push('email');
    if (!password || password.trim() === '') missingFields.push('password');

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
      logger.error('❌ Auth service not available during signup attempt:', {
        email,
        hasConfig: !!config,
        hasSupabaseUrl: !!config?.supabase?.url,
        hasAnonKey: !!config?.supabase?.anonKey
      });
      return sendError(res, 503, 'Authentication service unavailable. Please try again later.', 'AUTH_UNAVAILABLE');
    }

    if (!supabase) {
      logger.error('❌ Supabase client not available during signup attempt:', {
        email,
        hasConfig: !!config,
        hasSupabaseUrl: !!config?.supabase?.url,
        hasServiceKey: !!config?.supabase?.serviceKey
      });
      return sendError(res, 503, 'Database service unavailable. Please try again later.', 'DATABASE_UNAVAILABLE');
    }

    logger.info('🟢 Starting auth signup with GDPR consent:', email);

    // Debug: Check if authService is properly initialized
    logger.info('🔵 Pre-signup checks:', {
      hasAuthService: !!authService,
      hasSupabase: !!supabase,
      authServiceType: typeof authService,
      supabaseType: typeof supabase
    });

    // Create auth user (name will be added later via Typeform)
    logger.info('🔵 Calling authService.signUp...');
    const authResult = await authService.signUp(email, password);

    logger.info('🔵 Auth signup result:', {
      success: authResult?.success,
      hasUserId: !!authResult?.userId,
      hasSession: !!authResult?.session,
      errorExists: !!authResult?.error
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

    // ========================================
    // SIMPLIFIED SIGNUP FLOW
    // User data will be collected and stored via Typeform webhook
    // We only need to create the auth user here
    // ========================================

    // ========================================
    // LOG GDPR CONSENT IN AUDIT TRAIL (SIMPLIFIED)
    // Detailed user data will be handled by Typeform webhook
    // ========================================
    try {
      await gdprService.logActivity(userId, 'AUTH_SIGNUP', {
        consent_given: true,
        ip_address: req.clientIp || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        note: 'Auth user created, full profile via Typeform'
      }, req);

      logger.success('✅ GDPR consent logged for auth signup', { userId });
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

    logger.success('✅ Simplified signup complete - auth user created', {
      userId,
      email,
      note: 'Full profile will be created by Typeform webhook'
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
    
    // Ensure proper JSON response with status code
    res.status(200).json(responseData);
  } catch (error) {
    logger.error('❌ SIGNUP CRITICAL ERROR - Full Details:', { 
      error: error.message, 
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method,
      requestId: req.requestId,
      body: JSON.stringify(req.body),
      hasAuthService: !!authService,
      hasSupabase: !!supabase,
      configCheck: {
        hasSupabaseUrl: !!config?.supabase?.url,
        hasAnonKey: !!config?.supabase?.anonKey,
        hasServiceKey: !!config?.supabase?.serviceKey
      }
    });

    // Log the full error object for debugging
    console.error('🚨 FULL ERROR OBJECT:', error);
    console.error('🚨 ERROR STACK TRACE:', error.stack);

    // Ensure JSON response even in unexpected errors
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    }
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
      .eq('user_id', authResult.userId)
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
        fullName: `${userData?.name || ''} ${userData?.surname || ''}`.trim(),
        currentStep: userData?.current_step || 1
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
      .eq('user_id', req.userId)
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
        fullName: `${userData?.name || ''} ${userData?.surname || ''}`.trim(),
        currentStep: userData?.current_step || 1
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