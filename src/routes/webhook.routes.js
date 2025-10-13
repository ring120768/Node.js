
// src/routes/webhook.routes.js - COMPLETE FIXED VERSION

const express = require('express');
const router = express.Router();
const typeformController = require('../controllers/typeform.controller');
const zapierController = require('../controllers/zapier.controller');
const logger = require('../utils/logger');

// ==================== HEALTH & TEST ENDPOINTS ====================

/**
 * Health check - GET /webhooks/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

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
const handleWebhookTest = (req, res) => {
  const requestId = `test_${Date.now()}`;
  logger.info(`[${requestId}] Test webhook called`);
  return res.status(200).json({
    success: true,
    message: 'Webhook test successful',
    request_id: requestId,
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  });
};

router.post('/test', handleWebhookTest);
router.get('/test', handleWebhookTest);

// ==================== AUTHENTICATION MIDDLEWARE ====================

/**
 * Simple webhook authentication - deprecated, individual controllers handle auth
 * @deprecated Use controller-specific authentication instead
 */
function authenticateWebhook(req, res, next) {
  logger.warn('Using deprecated authenticateWebhook middleware');
  const apiKey = req.get('X-Api-Key') || req.get('x-api-key');
  const expectedKey = process.env.WEBHOOK_API_KEY;

  if (process.env.NODE_ENV === 'development') {
    logger.debug('Development mode - allowing webhook without auth');
    return next();
  }

  if (apiKey && apiKey === expectedKey) {
    logger.debug('API key authentication successful');
    return next();
  }

  logger.warn('Webhook authentication failed', { hasApiKey: !!apiKey, ip: req.ip });
  return res.status(401).json({ error: 'Unauthorized' });
}

// ==================== PROVIDER-SPECIFIC ENDPOINTS ====================

/**
 * Typeform webhook endpoint - POST /webhooks/typeform
 */
router.post('/typeform', typeformController);

/**
 * Zapier webhook endpoint - POST /webhooks/zapier
 */
router.post('/zapier', zapierController);

// ==================== WEBHOOK ENDPOINTS ====================

/**
 * User signup webhook - POST /webhooks/user_signup
 */
router.post('/user_signup', authenticateWebhook, (req, res) => {
  logger.info('Legacy user_signup endpoint called - use /webhooks/typeform instead');
  res.sendStatus(204);
});

/**
 * Incident report webhook - POST /webhooks/incident_reports  
 */
router.post('/incident_reports', authenticateWebhook, (req, res) => {
  logger.info('Legacy incident_reports endpoint called');
  res.sendStatus(204);
});

/**
 * Demo webhook - POST /webhooks/demo
 */
router.post('/demo', authenticateWebhook, (req, res) => {
  logger.info('Legacy demo endpoint called');
  res.sendStatus(204);
});

// ==================== LEGACY/ALTERNATIVE ENDPOINTS ====================

/**
 * Legacy endpoints for backward compatibility
 * These handle requests to singular paths without underscores
 */
router.post('/user-signup', authenticateWebhook, (req, res) => {
  logger.info('Legacy user-signup endpoint called - use /webhooks/typeform instead');
  res.sendStatus(204);
});
router.post('/incident-report', authenticateWebhook, (req, res) => {
  logger.info('Legacy incident-report endpoint called');
  res.sendStatus(204);
});

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

  // Return 204 to prevent retries from webhook providers
  res.sendStatus(204);
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
