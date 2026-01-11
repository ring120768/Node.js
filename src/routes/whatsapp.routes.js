/**
 * WhatsApp Webhook Routes
 * Handles webhook verification and incoming events from Meta WhatsApp Business Platform
 */

const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');

/**
 * GET /webhooks/whatsapp
 * Webhook verification endpoint
 * Meta sends this during webhook setup to verify your endpoint
 */
router.get('/whatsapp', whatsappController.verifyWebhook);

/**
 * POST /webhooks/whatsapp
 * Webhook events endpoint
 * Meta sends incoming messages and status updates here
 */
router.post('/whatsapp', whatsappController.handleWebhook);

module.exports = router;
