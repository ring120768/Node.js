
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Typeform webhook - raw body is captured by app.js verify function
router.post('/typeform', webhookController.handleTypeformWebhook);

// Test endpoints
router.get('/test', webhookController.testWebhook);
router.post('/test', webhookController.testWebhook);

module.exports = router;
