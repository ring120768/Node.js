
/**
 * Authentication Routes for Car Crash Lawyer AI
 * Defines all authentication endpoints and connects them to controller functions
 */

const express = require('express');
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
 * Session check (without auth middleware for now)
 * GET /api/auth/session
 */
router.get('/session', authController.checkSession);

module.exports = router;
