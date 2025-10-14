const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { validateWebhookSignature } = require('../middleware/webhookAuth');
const { validateWebhookPayload } = require('../middleware/validation');

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

// Test endpoints - only available in development
if (process.env.NODE_ENV !== 'production') {
  router.get('/test', webhookController.testWebhook);
  router.post('/test', webhookController.testWebhook);
}

module.exports = router;
