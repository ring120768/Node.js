/**
 * Incident Reports Routes
 * Handles incident report management and personal statement storage
 */

const express = require('express');
const { apiLimiter } = require('../middleware/rateLimit');
const { authenticateUser } = require('../middleware/auth');

// Import controller functions
const {
  savePersonalStatement
} = require('../controllers/ai.controller');

const router = express.Router();

// Apply rate limiting to incident routes
router.use(apiLimiter);

// Apply authentication middleware (optional - can work without auth)
// router.use(authenticateUser);

/**
 * POST /api/incident-reports/save-statement
 * Save personal statement to incident report
 *
 * Body:
 * {
 *   userId: string,
 *   incidentId: string (optional - creates new if not provided),
 *   personalStatement: string
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   message: string,
 *   incidentId: string
 * }
 */
router.post('/save-statement', savePersonalStatement);

module.exports = router;
