
/**
 * Authentication Routes for Car Crash Lawyer AI
 * Defines all authentication endpoints and connects them to controller functions
 */

const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Middleware to ensure JSON responses for all auth routes
router.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

/**
 * User signup with GDPR consent capture
 * POST /api/auth/signup
 */
router.post('/signup', (req, res, next) => {
  console.log('🔍 Signup route hit:', {
    method: req.method,
    url: req.url,
    contentType: req.get('content-type'),
    hasBody: !!req.body,
    bodyKeys: Object.keys(req.body || {}),
    timestamp: new Date().toISOString()
  });
  next();
}, authController.signup);

/**
 * User login
 * POST /api/auth/login
 */
router.post('/login', authController.login);

/**
 * User logout
 * POST /api/auth/logout
 */
router.post('/logout', authController.logout);

/**
 * Session check (without auth middleware for now)
 * GET /api/auth/session
 */
router.get('/session', authController.checkSession);

/**
 * Test route to verify auth endpoints are working
 * GET /api/auth/test
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

/**
 * Debug route to test signup endpoint specifically
 * POST /api/auth/debug-signup
 */
router.post('/debug-signup', (req, res) => {
  console.log('🔍 Debug signup endpoint hit:', {
    method: req.method,
    body: req.body,
    headers: {
      'content-type': req.get('content-type'),
      'content-length': req.get('content-length')
    },
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Debug signup endpoint working',
    receivedBody: req.body,
    bodyType: typeof req.body,
    bodyKeys: Object.keys(req.body || {}),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
