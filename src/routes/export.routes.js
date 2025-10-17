/**
 * Export Routes
 * API endpoints for exporting incident reports and user data
 *
 * @version 1.0.0
 * @date 2025-10-17
 */

const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');

// Middleware imports (adjust paths as needed for your auth middleware)
// For now, we'll create placeholder middleware that can be replaced with actual auth
const requireAuth = (req, res, next) => {
  // TODO: Replace with actual authentication middleware
  // For now, extract user from query param or header for testing
  const userId = req.query.user_id || req.get('x-user-id') || req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      hint: 'For testing, include ?user_id=<uuid> or X-User-ID header'
    });
  }

  // Attach user to request
  req.user = req.user || { id: userId, userId };
  next();
};

/**
 * @route GET /api/incidents/:id/export
 * @desc Export incident report as ZIP package
 * @access Private (requires authentication)
 *
 * Returns:
 * - application/zip file containing:
 *   - README.txt
 *   - incident_data.json
 *   - incident_report.pdf (if available)
 *   - images/ directory with all photos
 *   - checksums.txt with SHA-256 hashes
 *
 * Headers:
 * - Content-Type: application/zip
 * - Content-Disposition: attachment; filename="incident_report_<id>_<timestamp>.zip"
 * - X-Incident-ID: <incident_id>
 * - X-Document-Count: <number_of_documents>
 * - X-Days-Until-Deletion: <days_remaining>
 */
router.get('/incidents/:id/export', requireAuth, exportController.exportIncident);

/**
 * @route GET /api/incidents/:id/export/info
 * @desc Get export information for an incident (without downloading)
 * @access Private (requires authentication)
 *
 * Returns:
 * - Incident details
 * - Export package contents and size
 * - Export history for this incident
 * - Days remaining until deletion
 */
router.get('/incidents/:id/export/info', requireAuth, exportController.getExportInfo);

/**
 * @route GET /api/exports/history
 * @desc Get export history for the authenticated user
 * @access Private (requires authentication)
 *
 * Returns:
 * - List of all exports by this user
 * - Export dates, file sizes, incident IDs
 * - Limited to most recent 50 exports
 */
router.get('/exports/history', requireAuth, exportController.getExportHistory);

module.exports = router;
