const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');

// Import controller functions
const safetyController = require('../controllers/safety.controller');

/**
 * Safety Status Routes
 * Handles safety check assessments and validation
 */

/**
 * POST /api/safety-status
 * Update safety status for a user
 * Body: { safetyStatus, areYouSafe, timestamp, location, what3words, what3wordsStoragePath, address }
 * Requires authentication
 */
router.post('/safety-status', requireAuth, safetyController.updateSafetyStatus);

/**
 * GET /api/safety-status/me
 * Get current user's safety status
 * Requires authentication
 */
router.get('/safety-status/me', requireAuth, safetyController.getMyStatus);

/**
 * GET /api/safety-status/:userId
 * Get current safety status for a user
 * Requires authentication
 */
router.get('/safety-status/:userId', requireAuth, safetyController.getSafetyStatus);

module.exports = router;
