
/**
 * Debug Routes for Car Crash Lawyer AI
 * Handles debug endpoints, testing, and system diagnostics
 */

const express = require('express');
const debugController = require('../controllers/debug.controller');

const router = express.Router();

/**
 * Authentication middleware for debug endpoints
 */
function checkSharedKey(req, res, next) {
  const config = require('../config');
  const { sendError } = require('../utils/response');
  const logger = require('../utils/logger');

  const headerKey = req.get('X-Api-Key');
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const provided = headerKey || bearer || '';

  if (!config.webhook.apiKey) {
    logger.warn('No ZAPIER_SHARED_KEY/WEBHOOK_API_KEY set');
    return sendError(res, 503, 'Server missing shared key', 'MISSING_API_KEY');
  }

  if (provided !== config.webhook.apiKey) {
    logger.warn('Debug endpoint authentication failed', { ip: req.clientIp });
    return sendError(res, 401, 'Unauthorized', 'INVALID_API_KEY');
  }

  return next();
}

/**
 * Debug user data
 * GET /api/debug/user/:userId
 * Requires API key authentication
 */
router.get('/user/:userId', checkSharedKey, debugController.debugUser);

/**
 * Test OpenAI API
 * GET /api/debug/test-openai
 */
router.get('/test-openai', debugController.testOpenAI);

/**
 * Manual queue processing
 * GET /api/debug/process-queue
 * Requires API key authentication
 */
router.get('/process-queue', checkSharedKey, debugController.processQueue);

/**
 * Test transcription queue
 * GET /api/debug/transcription-queue
 */
router.get('/transcription-queue', debugController.testTranscriptionQueue);

/**
 * Test process transcription queue
 * POST /api/debug/process-transcription-queue
 * Requires API key authentication
 */
router.post('/process-transcription-queue', checkSharedKey, debugController.testProcessTranscriptionQueue);

/**
 * System health check
 * GET /api/debug/health
 */
router.get('/health', debugController.getHealth);

/**
 * ============================================
 * COOKIE DEBUGGING ENDPOINTS (TEMPORARY)
 * DELETE THESE AFTER FIXING SESSION ISSUE
 * ============================================
 */

/**
 * Test setting a simple cookie
 * GET /api/debug/test-set-cookie
 */
router.get('/test-set-cookie', (req, res) => {
  console.log('🔧 DEBUG: Setting test cookie...');

  res.cookie('test_cookie', 'test_value_123', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  console.log('✅ Test cookie set');

  res.json({
    success: true,
    message: 'Test cookie set successfully',
    cookieName: 'test_cookie',
    cookieValue: 'test_value_123',
    instructions: 'Now call /api/debug/test-read-cookie to verify it was stored'
  });
});

/**
 * Test reading cookies
 * GET /api/debug/test-read-cookie
 */
router.get('/test-read-cookie', (req, res) => {
  console.log('🔧 DEBUG: Reading cookies...');
  console.log('Cookies received:', req.cookies);

  const testCookie = req.cookies.test_cookie;

  res.json({
    success: true,
    allCookies: req.cookies,
    testCookieFound: !!testCookie,
    testCookieValue: testCookie || 'NOT FOUND',
    diagnosis: testCookie
      ? '✅ Cookies are working! Browser stored and sent the cookie.'
      : '❌ Cookie NOT found. Browser did not store or send the cookie.'
  });
});

/**
 * Test auth-like cookie flow
 * POST /api/debug/test-auth-cookies
 */
router.post('/test-auth-cookies', (req, res) => {
  console.log('🔧 DEBUG: Testing auth cookie flow...');

  const testAccessToken = 'test_access_' + Date.now();
  const testRefreshToken = 'test_refresh_' + Date.now();

  res.cookie('access_token', testAccessToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  res.cookie('refresh_token', testRefreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  console.log('✅ Auth-like cookies set');

  res.json({
    success: true,
    message: 'Auth cookies set (simulated)',
    cookiesSet: ['access_token', 'refresh_token'],
    nextStep: 'Call /api/debug/test-verify-auth-cookies to verify'
  });
});

/**
 * Verify auth cookies are sent
 * GET /api/debug/test-verify-auth-cookies
 */
router.get('/test-verify-auth-cookies', (req, res) => {
  console.log('🔧 DEBUG: Verifying auth cookies...');
  console.log('All cookies:', req.cookies);

  const hasAccessToken = !!req.cookies.access_token;
  const hasRefreshToken = !!req.cookies.refresh_token;

  res.json({
    success: true,
    cookiesPresent: {
      access_token: hasAccessToken,
      refresh_token: hasRefreshToken
    },
    diagnosis: hasAccessToken && hasRefreshToken
      ? '✅ Both cookies working! The cookie mechanism is fine.'
      : '❌ Cookies NOT being sent - browser is not storing them!',
    possibleCauses: !hasAccessToken || !hasRefreshToken ? [
      'Browser blocking cookies',
      'Credentials: include not set in fetch',
      'CORS not allowing credentials',
      'SameSite or Secure flags incompatible'
    ] : []
  });
});

module.exports = router;
