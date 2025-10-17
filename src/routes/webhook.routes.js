const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { validateWebhookSignature } = require('../middleware/webhookAuth');
const { validateWebhookPayload } = require('../middleware/validation');
const githubWebhookRouter = require('./githubWebhook.routes');

/**
 * Typeform webhook endpoint
 * Security: Validates HMAC-SHA256 signature in Typeform-Signature header
 * Raw body captured by app.js verify function for signature validation
 */
router.post(
  '/typeform',
  validateWebhookSignature('typeform'),
  validateWebhookPayload,
  webhookController.handleTypeformWebhook
);

/**
 * GitHub webhook endpoint
 * Security: Validates HMAC-SHA256 signature in X-Hub-Signature-256 header
 * Handles push, pull_request, and ping events
 */
router.use('/github', githubWebhookRouter);

// Test endpoints - available in all environments for webhook testing
router.get('/test', webhookController.testWebhook);
router.post('/test', webhookController.testWebhook);

// Typeform test endpoint - no signature or payload validation (for initial testing only)
router.post(
  '/typeform-test',
  webhookController.handleTypeformWebhook
);

module.exports = router;
