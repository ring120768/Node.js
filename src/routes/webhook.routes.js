// src/routes/webhook.routes.js - COMPLETE FIXED VERSION

/**
 * Webhook Routes for Typeform Integration
 * Handles all incoming webhook requests from Typeform
 */

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const logger = require('../utils/logger');

// ==================== HEALTH & STATUS ENDPOINTS ====================

/**
 * Webhook Health Check
 * GET /webhooks/health
 * No authentication required
 */
router.get('/health', webhookController.health);

/**
 * Alternative health check
 * GET /health (for direct access)
 */
router.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    service: 'webhooks',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    confirmed_endpoints: {
      user_signup: {
        url: `${baseUrl}/webhooks/user_signup`,
        method: 'POST',
        status: '✅ Confirmed with Zapier/Typeform',
        authentication: 'required'
      },
      incident_reports: {
        url: `${baseUrl}/webhooks/incident_reports`,
        method: 'POST',
        status: '✅ Confirmed with Zapier/Typeform',
        authentication: 'required'
      },
      demo: {
        url: `${baseUrl}/webhooks/demo`,
        method: 'POST',
        status: '✅ Confirmed with Zapier/Typeform',
        authentication: 'required'
      },
      test: {
        url: `${baseUrl}/webhooks/test`,
        method: 'POST',
        status: '✅ Confirmed with Zapier/Typeform',
        authentication: 'none'
      },
      health: {
        url: `${baseUrl}/webhooks/health`,
        method: 'GET',
        status: '✅ Confirmed with Zapier/Typeform',
        authentication: 'none'
      }
    },
    legacy_endpoints: {
      user_signup: {
        url: `${baseUrl}/webhooks/user_signup`,
        method: 'POST',
        status: 'available but not confirmed',
        authentication: 'required'
      }
    },
  });
});

/**
 * Simple Test Endpoint  
 * POST /webhooks/test
 * No authentication required - for testing connectivity
 */
router.post('/test', webhookController.handleWebhookTest);

/**
 * GET version of test endpoint for browser testing
 * GET /webhooks/test
 */
router.get('/test', (req, res) => {
  logger.info('🧪 GET Test webhook called');
  
  res.json({
    success: true,
    message: 'Webhook endpoint is accessible via GET',
    timestamp: new Date().toISOString(),
    path: req.path,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    method: req.method
  });
});

/**
 * Debug endpoint - shows all available routes
 * GET /webhooks/debug
 */
router.get('/debug', (req, res) => {
  const routes = [];
  router.stack.forEach(layer => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods);
      routes.push({
        path: layer.route.path,
        methods: methods,
        fullPath: `/webhooks${layer.route.path}`
      });
    }
  });

  res.json({
    message: 'Webhook debug info',
    availableRoutes: routes,
    currentPath: req.path,
    baseUrl: req.baseUrl,
    timestamp: new Date().toISOString()
  });
});

// ==================== PROTECTED WEBHOOK ENDPOINTS ====================

/**
 * Authentication Middleware
 * Checks for valid API key in headers OR Typeform signature
 */
function authenticateWebhook(req, res, next) {
  const apiKey = req.get('X-Api-Key') || 
                 req.get('Authorization')?.replace('Bearer ', '') ||
                 req.get('x-api-key');

  const typeformSignature = req.get('Typeform-Signature');
  
  const expectedKey = process.env.WEBHOOK_API_KEY ||
                      process.env.TYPEFORM_WEBHOOK_SECRET ||
                      process.env.TYPEFORM_X_API_KEY ||
                      process.env.ZAPIER_SHARED_KEY;

  // Allow Typeform signature-based auth OR API key
  if (typeformSignature) {
    logger.info('🔐 Typeform signature detected, delegating to controller verification');
    return next();
  }

  if (!expectedKey) {
    logger.warn('⚠️ No webhook authentication configured - allowing in development mode');
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    return res.status(503).json({
      success: false,
      error: 'Webhook authentication not configured',
      code: 'AUTH_NOT_CONFIGURED'
    });
  }

  if (!apiKey || apiKey !== expectedKey) {
    logger.warn('⚠️ Invalid webhook API key attempt', {
      ip: req.ip,
      path: req.path,
      hasApiKey: !!apiKey,
      hasTypeformSig: !!typeformSignature
    });
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'INVALID_API_KEY'
    });
  }

  next();
}

/**
 * User Signup Webhook
 * POST /webhooks/user_signup
 * Handles Typeform user profile completion
 */
router.post('/user_signup', authenticateWebhook, webhookController.handleSignup);

/**
 * Incident Report Webhook
 * POST /webhooks/incident_reports
 * Handles Typeform incident report submissions
 */
router.post('/incident_reports', authenticateWebhook, webhookController.handleIncidentReport);

/**
 * Demo Webhook
 * POST /webhooks/demo
 * Handles demo/test submissions
 */
router.post('/demo', authenticateWebhook, webhookController.handleDemo);

// ==================== LEGACY/ALTERNATIVE ENDPOINTS ====================

/**
 * Alternative user signup endpoint (for backward compatibility)
 */
router.post('/signup', authenticateWebhook, webhookController.handleSignup);

/**
 * Alternative incident report endpoint
 */
router.post('/incident-report', authenticateWebhook, webhookController.handleIncidentReport);

/**
 * Typeform simulation endpoint (for testing)
 */
router.post('/simulate-typeform', authenticateWebhook, webhookController.handleTypeformSimulation);

// ==================== ERROR HANDLER ====================

/**
 * Webhook-specific error handler
 */
router.use((err, req, res, next) => {
  logger.error('❌ Webhook error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Webhook processing failed',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal error',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;