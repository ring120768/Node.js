// src/routes/webhook.routes.js - COMPLETE FIXED VERSION

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const logger = require('../utils/logger');

// ==================== HEALTH & TEST ENDPOINTS ====================

/**
 * Health check - GET /webhooks/health
 */
router.get('/health', webhookController.health);

/**
 * Root endpoint - GET /webhooks/
 */
router.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    service: 'webhooks',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: `${baseUrl}/webhooks/health`,
      test: `${baseUrl}/webhooks/test`,
      user_signup: `${baseUrl}/webhooks/user_signup`,
      incident_reports: `${baseUrl}/webhooks/incident_reports`,
      demo: `${baseUrl}/webhooks/demo`
    }
  });
});

/**
 * Test endpoint - POST /webhooks/test
 */
router.post('/test', webhookController.handleWebhookTest);
router.get('/test', webhookController.handleWebhookTest);

// ==================== AUTHENTICATION MIDDLEWARE ====================

/**
 * Simple webhook authentication
 */
function authenticateWebhook(req, res, next) {
  // Check for API key or Typeform signature
  const apiKey = req.get('X-Api-Key') || req.get('x-api-key');
  const typeformSignature = req.get('Typeform-Signature');
  const expectedKey = process.env.WEBHOOK_API_KEY ||
                      process.env.TYPEFORM_SECRET ||
                      '4SJem6FtyEUgLUATL8yQ4LGDDiBNybLXik6nV1N2S25Q';

  // Allow Typeform signature OR API key OR development mode
  if (typeformSignature) {
    logger.debug('Typeform signature detected, delegating to controller');
    return next();
  }

  if (process.env.NODE_ENV === 'development') {
    logger.debug('Development mode - allowing webhook without auth');
    return next();
  }

  if (apiKey && apiKey === expectedKey) {
    logger.debug('API key authentication successful');
    return next();
  }

  logger.warn('Webhook authentication failed', {
    hasApiKey: !!apiKey,
    hasTypeformSig: !!typeformSignature,
    ip: req.ip
  });

  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
    timestamp: new Date().toISOString()
  });
}

// ==================== WEBHOOK ENDPOINTS ====================

/**
 * User signup webhook - POST /webhooks/user_signup
 */
router.post('/user_signup', authenticateWebhook, webhookController.handleSignup);

/**
 * Incident report webhook - POST /webhooks/incident_reports
 */
router.post('/incident_reports', authenticateWebhook, webhookController.handleIncidentReport);

/**
 * Demo webhook - POST /webhooks/demo
 */
router.post('/demo', authenticateWebhook, webhookController.handleDemo);

// ==================== LEGACY/ALTERNATIVE ENDPOINTS ====================

/**
 * Legacy endpoints for backward compatibility
 * These handle requests to singular paths without underscores
 */
router.post('/user-signup', authenticateWebhook, webhookController.handleSignup);
router.post('/incident-report', authenticateWebhook, webhookController.handleIncidentReport);

// ==================== CATCH-ALL WEBHOOK HANDLER ====================

/**
 * Catch-all for unmatched webhook paths
 */
router.all('*', (req, res) => {
  const requestId = `catchall_${Date.now()}`;
  
  logger.warn(`[${requestId}] Unmatched webhook endpoint`, {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    headers: {
      'user-agent': req.get('user-agent'),
      'content-type': req.get('content-type'),
      'typeform-signature': req.get('typeform-signature') ? 'present' : 'missing'
    }
  });

  // Return successful response to prevent retries
  return res.status(200).json({
    success: true,
    message: 'Webhook endpoint not found',
    request_id: requestId,
    available_endpoints: [
      '/webhooks/health',
      '/webhooks/test',
      '/webhooks/user_signup',
      '/webhooks/incident_reports', 
      '/webhooks/demo',
      '/webhooks/user-signup',
      '/webhooks/incident-report'
    ],
    timestamp: new Date().toISOString()
  });
});

// ==================== ERROR HANDLER ====================

router.use((err, req, res, next) => {
  logger.error('Webhook route error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(200).json({
    success: false,
    error: 'Webhook processing failed',
    timestamp: new Date().toISOString(),
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal error'
  });
});

module.exports = router;