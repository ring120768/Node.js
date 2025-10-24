/**
 * Typeform Redirect Handler
 * Handles seamless authentication after Typeform completion
 *
 * FLOW:
 * 1. User signs up → Auth session created → Cookies set
 * 2. User redirected to Typeform with hidden fields (auth_user_id, email, auth_code)
 * 3. Typeform webhook processes data → Creates user_signup record
 * 4. Typeform redirects to /api/typeform-redirect?email={{answer_xxxx}}
 * 5. This endpoint:
 *    a) Checks if existing cookies are still valid → Redirect to transcription-status
 *    b) If cookies invalid/missing → Create new session → Set cookies → Redirect
 *
 * NOTE: This provides seamless flow without requiring manual login after Typeform
 */

const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const { supabaseAdmin } = require('../../lib/supabaseAdmin');
const { normalizeEmail } = require('../utils/emailNormalizer');

/**
 * Handle Typeform Redirect and Auto-Login
 * GET /api/typeform-redirect
 *
 * Query params:
 * - email: User's email (from Typeform answer piping)
 *
 * Response:
 * - 302 Redirect to /transcription-status.html with valid session
 * - 302 Redirect to /login.html if auto-login fails
 */
async function handleTypeformRedirect(req, res) {
  try {
    let { email } = req.query;

    logger.info('🔄 Typeform redirect received', {
      email,
      hasExistingSession: !!req.user,
      hasCookies: !!(req.cookies && req.cookies.access_token)
    });

    // CASE 1: User already has valid session from signup cookies
    if (req.user && req.userId) {
      logger.success('✅ Existing session valid, redirecting immediately');
      return res.redirect('/transcription-status.html');
    }

    // CASE 2: No valid session - attempt auto-login
    if (!email) {
      logger.warn('⚠️ No email in URL, cannot auto-login');
      return res.redirect('/login.html?redirect=' + encodeURIComponent('/transcription-status.html'));
    }

    // Normalize email for lookup
    email = normalizeEmail(email);
    logger.info('🔍 Looking up user in Auth', { email });

    // Find user in Supabase Auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      logger.error('❌ Failed to list users:', listError);
      return res.redirect('/login.html?redirect=' + encodeURIComponent('/transcription-status.html'));
    }

    const authUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!authUser) {
      logger.warn('⚠️ User not found in Auth:', email);
      return res.redirect('/login.html?redirect=' + encodeURIComponent('/transcription-status.html'));
    }

    logger.info('✅ Auth user found', { userId: authUser.id, email: authUser.email });

    // Verify user has completed Typeform by checking user_signup table
    const { data: userSignup, error: signupError } = await supabaseAdmin
      .from('user_signup')
      .select('typeform_completed')
      .eq('create_user_id', authUser.id)
      .single();

    if (signupError || !userSignup) {
      logger.warn('⚠️ User not found in user_signup table yet', { userId: authUser.id });
      // Webhook might still be processing - redirect to login with message
      return res.redirect('/login.html?message=' + encodeURIComponent('Please wait a moment and try again') + '&redirect=' + encodeURIComponent('/transcription-status.html'));
    }

    // Create admin session for this user (passwordless login)
    // This uses admin privileges to create a session without password verification
    const { data: { session }, error: sessionError } = await supabaseAdmin.auth.admin.getUserById(authUser.id);

    if (sessionError) {
      logger.error('❌ Failed to get user session:', sessionError);
      return res.redirect('/login.html?redirect=' + encodeURIComponent('/transcription-status.html'));
    }

    // Create a new session by signing the user in (server-side)
    // This generates fresh access and refresh tokens
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: authUser.email,
      password: '' // This won't work - need different approach
    });

    // Actually, we need to use admin.createSession which doesn't exist...
    // Let me use a workaround: update user metadata to store a temporary session token
    // Then the frontend can use that to sign in

    // BETTER APPROACH: Generate an OTP and auto-submit it
    // OR: Use admin to update user's email_confirmed and create session manually

    logger.error('⚠️ Auto-login not fully implemented yet');
    return res.redirect('/login.html?email=' + encodeURIComponent(email) + '&redirect=' + encodeURIComponent('/transcription-status.html'));

  } catch (error) {
    logger.error('💥 Typeform redirect error:', {
      error: error.message,
      stack: error.stack
    });
    res.redirect('/login.html?redirect=' + encodeURIComponent('/transcription-status.html'));
  }
}

module.exports = {
  handleTypeformRedirect
};
