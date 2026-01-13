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
const { normalizeEmail } = require('../utils/emailNormalizer');
const emailService = require('../../lib/emailService');

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
 * 3. Return success - frontend handles next steps
 */
async function signup(req, res) {
  try {
    let { email, password, fullName, gdprConsent } = req.body;

    // NORMALIZE EMAIL (case-insensitive per RFC 5321)
    email = normalizeEmail(email);

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
    // SEND WELCOME EMAIL (non-blocking)
    // ========================================
    if (process.env.EMAIL_ENABLED === 'true') {
      // Fire-and-forget: don't await, don't block signup response
      emailService.sendSubscriptionWelcome(email, {
        userName: fullName,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      })
        .then(result => {
          if (result.success) {
            logger.success('📧 Welcome email sent', { userId, messageId: result.messageId });
          } else {
            logger.warn('⚠️ Welcome email failed (non-critical)', { userId, error: result.error });
          }
        })
        .catch(error => {
          logger.warn('⚠️ Welcome email error (non-critical)', { userId, error: error.message });
        });

      logger.info('📧 Welcome email queued', { userId, email });
    }

    // ========================================
    // SET AUTHENTICATION COOKIES (both access and refresh)
    // ========================================
    const cookieMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days for new signups

    // CRITICAL: sameSite must be 'none' for cross-site cookies with secure: true
    res.cookie('access_token', authResult.session.access_token, {
      httpOnly: true,
      secure: true, // Always true in production (HTTPS required)
      sameSite: 'none', // Required for cross-origin requests
      path: '/', // CRITICAL: Make cookie available site-wide for API endpoints
      maxAge: cookieMaxAge
    });

    res.cookie('refresh_token', authResult.session.refresh_token, {
      httpOnly: true,
      secure: true, // Always true in production (HTTPS required)
      sameSite: 'none', // Required for cross-origin requests
      path: '/', // CRITICAL: Make cookie available site-wide
      maxAge: cookieMaxAge
    });

    logger.success('🎉 Signup complete (Auth-only)', {
      userId,
      email,
      consentVersion: config.constants.GDPR.CURRENT_POLICY_VERSION
    });

    // ========================================
    // RETURN SUCCESS - FRONTEND HANDLES NEXT STEPS
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
    let { email, password, rememberMe } = req.body;

    // NORMALIZE EMAIL (case-insensitive per RFC 5321)
    email = normalizeEmail(email);

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

    // Session duration: 30 days default, 90 days with "Keep me logged in"
    const cookieMaxAge = rememberMe ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

    // Store BOTH access token and refresh token
    // CRITICAL: sameSite must be 'none' for cross-site cookies
    // This requires secure: true (HTTPS), which Railway/production provides
    res.cookie('access_token', authResult.session.access_token, {
      httpOnly: true,
      secure: true, // Always true in production (HTTPS required)
      sameSite: 'none', // Required for cross-origin requests
      path: '/', // CRITICAL: Make cookie available site-wide for API endpoints
      maxAge: cookieMaxAge
    });

    // Store refresh token (critical for session persistence)
    res.cookie('refresh_token', authResult.session.refresh_token, {
      httpOnly: true,
      secure: true, // Always true in production (HTTPS required)
      sameSite: 'none', // Required for cross-origin requests
      path: '/', // CRITICAL: Make cookie available site-wide
      maxAge: cookieMaxAge // Same duration as access token cookie
    });

    logger.info('✅ Session cookies set', {
      rememberMe,
      durationDays: rememberMe ? 90 : 30,
      hasRefreshToken: !!authResult.session.refresh_token,
      cookieSettings: {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: cookieMaxAge
      },
      accessTokenLength: authResult.session.access_token.length
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
    // Clear BOTH authentication cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

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

/**
 * Set Session Cookies (for client-side signups)
 * POST /api/auth/set-session
 *
 * After client-side supabaseClient.auth.signUp(), this endpoint
 * sets HTTP cookies so server-side pageAuth middleware works.
 */
async function setSessionCookies(req, res) {
  try {
    const { access_token, refresh_token } = req.body;

    if (!access_token || !refresh_token) {
      return sendError(res, 400, 'Missing session tokens', 'MISSING_TOKENS');
    }

    logger.info('🍪 Setting session cookies from client-side signup');

    // Verify the tokens are valid before setting cookies
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(config.supabase.url, config.supabase.anonKey);

    const { data: { user }, error } = await supabase.auth.getUser(access_token);

    if (error || !user) {
      logger.warn('❌ Invalid session tokens', { error: error?.message });
      return sendError(res, 401, 'Invalid session tokens', 'INVALID_TOKENS');
    }

    // Set cookies (same as login/signup)
    const cookieMaxAge = 90 * 24 * 60 * 60 * 1000; // 90 days

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: cookieMaxAge
    });

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: cookieMaxAge
    });

    logger.success('✅ Session cookies set', {
      userId: user.id,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Session cookies set successfully',
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    logger.error('💥 Error setting session cookies:', error);
    sendError(res, 500, 'Failed to set session cookies', 'COOKIE_ERROR');
  }
}

/**
 * Login After Payment (Signup Flow v2)
 * POST /api/auth/login-after-payment
 *
 * After Stripe payment completes and webhook creates the auth account,
 * this endpoint generates a session for auto-login on payment-success page.
 *
 * Body: { sessionId } - The Stripe checkout session ID
 */
async function loginAfterPayment(req, res) {
  try {
    const { sessionId, email: providedEmail } = req.body;

    if (!sessionId && !providedEmail) {
      return sendError(res, 400, 'Either sessionId or email is required', 'MISSING_PARAMS');
    }

    logger.info('🔐 Login after payment request', { sessionId, providedEmail });

    let userEmail = providedEmail;

    // If sessionId provided, get email from Stripe session
    if (sessionId) {
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session) {
        return sendError(res, 404, 'Stripe session not found', 'SESSION_NOT_FOUND');
      }

      userEmail = session.customer_details?.email || session.customer_email;
    }

    if (!userEmail) {
      return sendError(res, 400, 'Could not determine user email', 'NO_EMAIL');
    }

    logger.info('🔍 Looking up user by email:', userEmail);

    // Find the user in user_signup to verify they completed signup
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

    const { data: signupRecord, error: signupError } = await supabase
      .from('user_signup')
      .select('create_user_id, auth_pending, subscription_status')
      .eq('email', userEmail.toLowerCase())
      .single();

    if (signupError || !signupRecord) {
      logger.warn('❌ No signup record found for email:', userEmail);
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    // Check if auth account was created (v2 flow should have set auth_pending = false)
    if (signupRecord.auth_pending) {
      // Webhook hasn't processed yet - tell frontend to wait
      logger.info('⏳ Auth account not yet created, webhook pending');
      return res.json({
        success: false,
        pending: true,
        message: 'Payment processing, please wait...'
      });
    }

    // Get the auth user to generate a session
    const authUserId = signupRecord.create_user_id;

    logger.info('📧 Generating magic link for auto-login', { authUserId, email: userEmail });

    // Use admin API to generate a magic link token
    // This creates a one-time login link that we can extract the token from
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        redirectTo: `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/dashboard.html`
      }
    });

    if (linkError) {
      logger.error('❌ Failed to generate magic link:', linkError);
      return sendError(res, 500, 'Failed to generate login session', 'SESSION_ERROR');
    }

    // The magic link contains a token we can use
    // Format: https://xxx.supabase.co/auth/v1/verify?token=xxx&type=magiclink&redirect_to=xxx
    const magicLink = linkData.properties?.action_link;

    if (!magicLink) {
      logger.error('❌ No magic link generated');
      return sendError(res, 500, 'Failed to generate login link', 'LINK_ERROR');
    }

    logger.success('✅ Magic link generated for:', userEmail);

    // Option 1: Return the magic link for frontend to verify
    // Option 2: Extract token and verify server-side to get session

    // Let's use option 2 - verify the token server-side
    const url = new URL(magicLink);
    const token = url.searchParams.get('token');
    const tokenHash = url.hash.replace('#', '');

    // Use the anon client to verify the token (simulating what the browser would do)
    const anonSupabase = createClient(config.supabase.url, config.supabase.anonKey);

    // verifyOtp method to exchange token for session
    const { data: verifyData, error: verifyError } = await anonSupabase.auth.verifyOtp({
      token_hash: tokenHash || token,
      type: 'magiclink'
    });

    if (verifyError || !verifyData?.session) {
      logger.warn('❌ Failed to verify magic link, falling back to link redirect');
      // Fall back to returning the magic link for frontend redirect
      return res.json({
        success: true,
        method: 'redirect',
        redirectUrl: magicLink,
        message: 'Use magic link to login'
      });
    }

    // We have a session! Set cookies and return tokens
    const { session } = verifyData;

    const cookieMaxAge = 90 * 24 * 60 * 60 * 1000; // 90 days

    res.cookie('access_token', session.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: cookieMaxAge
    });

    res.cookie('refresh_token', session.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: cookieMaxAge
    });

    logger.success('✅ Auto-login successful after payment', {
      userId: authUserId,
      email: userEmail
    });

    res.json({
      success: true,
      method: 'session',
      user: {
        id: authUserId,
        email: userEmail
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token
      },
      message: 'Logged in successfully'
    });

  } catch (error) {
    logger.error('💥 Login after payment error:', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Login failed', 'LOGIN_ERROR');
  }
}

module.exports = {
  signup,
  login,
  logout,
  checkSession,
  generateNonce,
  setSessionCookies,
  loginAfterPayment
};


/**
 * Generate Auth Nonce
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
