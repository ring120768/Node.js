
/**
 * PDF Routes for Car Crash Lawyer AI
 * Handles PDF generation, status checking, and downloads
 */

const express = require('express');
const { checkGDPRConsent } = require('../middleware/gdpr');
const pdfController = require('../controllers/pdf.controller');

const router = express.Router();

/**
 * Authentication middleware for shared key protected endpoints
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
    logger.warn('Authentication failed', { ip: req.clientIp });
    return sendError(res, 401, 'Unauthorized', 'INVALID_API_KEY');
  }

  return next();
}

/**
 * Generate PDF
 * POST /api/pdf/generate
 * Requires API key authentication
 * Body: { create_user_id: string }
 */
router.post('/generate', checkSharedKey, pdfController.generatePdf);

/**
 * PDF status
 * GET /api/pdf/status/:userId
 */
router.get('/status/:userId', pdfController.getPdfStatus);

/**
 * Download PDF
 * GET /api/pdf/download/:userId
 * Requires GDPR consent check
 */
router.get('/download/:userId', checkGDPRConsent, pdfController.downloadPdf);

module.exports = router;
