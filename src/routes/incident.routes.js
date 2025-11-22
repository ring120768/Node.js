/**
 * Incident Reports Routes
 * Handles incident report management and personal statement storage
 */

const express = require('express');
const { apiLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/authMiddleware');

// Import controller functions
const {
  savePersonalStatement
} = require('../controllers/ai.controller');

const {
  listIncidentReports
} = require('../controllers/incidentForm.controller');

const router = express.Router();

// Apply rate limiting to incident routes
router.use(apiLimiter);

/**
 * GET /api/incident-reports
 * List incident reports for authenticated user
 *
 * Query params:
 * - limit: number (default 10, max 100)
 * - offset: number (default 0)
 *
 * Returns:
 * {
 *   success: true,
 *   reports: [...],
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
router.get('/', requireAuth, listIncidentReports);

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
