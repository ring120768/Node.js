const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Import controller functions directly to avoid timing issues
const safetyController = require('../controllers/safety.controller');

/**
 * Safety Status Routes
 * Handles safety check assessments and validation
 */

/**
 * POST /api/safety-status
 * Update safety status for a user
 * Body: { userId, safetyStatus, areYouSafe, timestamp, location, what3words, what3wordsStoragePath, address }
 */
router.post('/safety-status', requireAuth, (req, res) => {
  return safetyController.updateSafetyStatus(req, res);
});

/**
 * GET /api/safety-status/:userId
 * Get current safety status for a user
 */
router.get('/safety-status/:userId', requireAuth, (req, res) => {
  return safetyController.getSafetyStatus(req, res);
});

/**
 * POST /api/update-safety-status (Legacy alias)
 * Redirect to new endpoint
 */
router.post('/update-safety-status', requireAuth, (req, res) => {
  return safetyController.updateSafetyStatus(req, res);
});

module.exports = router;
