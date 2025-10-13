const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Middleware for raw body capture (needed for signature verification)
router.post('/typeform', 
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.rawBody = req.body.toString();
    req.body = JSON.parse(req.rawBody);
    next();
  },
  webhookController.handleTypeformWebhook
);

// Test endpoint
router.get('/test', webhookController.testWebhook);
router.post('/test', webhookController.testWebhook);

module.exports = router;