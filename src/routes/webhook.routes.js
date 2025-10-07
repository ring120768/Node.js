
/**
 * Webhook Routes for Car Crash Lawyer AI
 * Handles Typeform webhooks and automated processing
 */

const express = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

/**
 * Authentication middleware for webhook endpoints
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
 * Signup webhook
 * POST /api/webhooks/signup
 * Processes user signup data and images from Typeform
 */
router.post('/signup', checkSharedKey, webhookController.handleSignup);

/**
 * Incident report webhook
 * POST /api/webhooks/incident-report
 * Processes incident report data and files from Typeform
 */
router.post('/incident-report', checkSharedKey, webhookController.handleIncidentReport);

/**
 * PDF generation webhook
 * POST /api/webhooks/generate-pdf
 * Generates and sends PDF reports
 * Body: { create_user_id: string }
 */
router.post('/generate-pdf', checkSharedKey, webhookController.handleGeneratePdf);

module.exports = router;
