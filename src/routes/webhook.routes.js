const express = require('express');
const router = express.Router();
const githubWebhookRouter = require('./githubWebhook.routes');

/**
 * Webhook Routes
 *
 * Note: Typeform webhooks removed - application now uses in-house HTML forms
 * Only GitHub webhooks remain for repository event notifications
 */

/**
 * GitHub webhook endpoint
 * Security: Validates HMAC-SHA256 signature in X-Hub-Signature-256 header
 * Handles push, pull_request, and ping events
 */
router.use('/github', githubWebhookRouter);

module.exports = router;
