/**
 * Authentication Routes for Car Crash Lawyer AI
 * Defines all authentication endpoints and connects them to controller functions
 */

const express = require('express');
const { optionalAuth } = require('../../lib/middleware/authMiddleware');
const authController = require('../controllers/auth.controller');

const router = express.Router();

/**
 * User signup with GDPR consent capture
 * POST /api/auth/signup
 */
router.post('/signup', authController.signup);

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
 * Session check (with optional auth middleware)
 * GET /api/auth/session
 */
router.get('/session', optionalAuth, authController.checkSession);

/**
 * Generate a nonce for Typeform authentication
 * GET /api/auth/nonce
 */
router.get('/nonce', optionalAuth, authController.generateNonce);

/**
 * Set session cookies after client-side signup
 * POST /api/auth/set-session
 *
 * Called after supabaseClient.auth.signUp() to set HTTP cookies
 * required by server-side pageAuth middleware
 */
router.post('/set-session', authController.setSessionCookies);

module.exports = router;