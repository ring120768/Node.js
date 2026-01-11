const express = require('express');
const router = express.Router();
const githubWebhookRouter = require('./githubWebhook.routes');
const whatsappWebhookRouter = require('./whatsapp.routes');

/**
 * Webhook Routes
 *
 * Note: Typeform webhooks removed - application now uses in-house HTML forms
 * Active webhooks: GitHub (repository events), WhatsApp (Meta Business Platform)
 */

/**
 * GitHub webhook endpoint
 * Security: Validates HMAC-SHA256 signature in X-Hub-Signature-256 header
 * Handles push, pull_request, and ping events
 */
router.use('/github', githubWebhookRouter);

/**
 * WhatsApp webhook endpoint
 * Security: Validates verify token for GET (Meta verification), processes events for POST
 * Handles incoming messages and delivery status updates from Meta WhatsApp Business Platform
 */
router.use('/whatsapp', whatsappWebhookRouter);

module.exports = router;
