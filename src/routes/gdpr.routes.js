
/**
 * GDPR Routes
 * Handles all GDPR-related endpoints with proper authentication
 */

const express = require('express');
const router = express.Router();
const gdprController = require('../controllers/gdpr.controller');

/**
 * Authentication middleware for GDPR endpoints
 * Uses shared key authentication for sensitive operations
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
    logger.warn('GDPR endpoint authentication failed', { ip: req.clientIp });
    return sendError(res, 401, 'Unauthorized', 'INVALID_API_KEY');
  }

  return next();
}

/**
 * Get GDPR consent status for a user
 * GET /api/gdpr/consent/:userId
 */
router.get('/consent/:userId', gdprController.getConsent);

/**
 * Update GDPR consent for a user
 * PUT /api/gdpr/consent/:userId
 * Body: { gdprConsent: boolean }
 */
router.put('/consent/:userId', gdprController.updateConsent);

/**
 * Get GDPR audit log for a user
 * GET /api/gdpr/audit-log/:userId
 * Query params: limit, offset, activityType
 * Requires API key authentication
 */
router.get('/audit-log/:userId', checkSharedKey, gdprController.getAuditLog);

/**
 * Export all user data for GDPR compliance
 * GET /api/gdpr/export/:userId
 * Requires API key authentication
 */
router.get('/export/:userId', checkSharedKey, gdprController.exportData);

/**
 * Delete user images (GDPR right to be forgotten)
 * DELETE /api/gdpr/delete-images
 * Body: { userId: string }
 * Requires API key authentication
 */
router.delete('/delete-images', checkSharedKey, async (req, res) => {
  const { sendError } = require('../utils/response');
  const logger = require('../utils/logger');

  // This endpoint needs imageProcessor which is in index.js
  // We'll keep this here temporarily and move it later if needed
  try {
    const { userId } = req.body;

    if (!userId) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID');
    }

    // Get imageProcessor from the main app
    const imageProcessor = req.app.locals.imageProcessor;
    
    if (!imageProcessor) {
      return sendError(res, 503, 'Image service not configured', 'SERVICE_UNAVAILABLE');
    }

    const result = await imageProcessor.deleteAllUserImages(userId);

    res.json({
      success: true,
      ...result,
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error deleting images', error);
    sendError(res, 500, 'Failed to delete images', 'DELETE_FAILED');
  }
});

module.exports = router;
