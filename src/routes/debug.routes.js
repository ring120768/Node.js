
/**
 * Debug Routes for Car Crash Lawyer AI
 * Handles debug endpoints, testing, and system diagnostics
 */

const express = require('express');
const debugController = require('../controllers/debug.controller');

const router = express.Router();

/**
 * Authentication middleware for debug endpoints
 */
function checkSharedKey(req, res, next) {
  const config = require('../config');
  const { sendError } = require('../utils/response');
  const logger = require('../utils/logger');

  const headerKey = req.get('X-Api-Key');
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const provided = headerKey || bearer || '';

  if (!config.webhook.apiKey) {
    logger.warn('No ZAPIER_SHARED_KEY/WEBHOOK_API_KEY set');
    return sendError(res, 503, 'Server missing shared key', 'MISSING_API_KEY');
  }

  if (provided !== config.webhook.apiKey) {
    logger.warn('Debug endpoint authentication failed', { ip: req.clientIp });
    return sendError(res, 401, 'Unauthorized', 'INVALID_API_KEY');
  }

  return next();
}

/**
 * Debug user data
 * GET /api/debug/user/:userId
 * Requires API key authentication
 */
router.get('/user/:userId', checkSharedKey, debugController.debugUser);

/**
 * Test OpenAI API
 * GET /api/debug/test-openai
 */
router.get('/test-openai', debugController.testOpenAI);

/**
 * Manual queue processing
 * GET /api/debug/process-queue
 * Requires API key authentication
 */
router.get('/process-queue', checkSharedKey, debugController.processQueue);

/**
 * Test transcription queue
 * GET /api/debug/transcription-queue
 */
router.get('/transcription-queue', debugController.testTranscriptionQueue);

/**
 * Test process transcription queue
 * POST /api/debug/process-transcription-queue
 * Requires API key authentication
 */
router.post('/process-transcription-queue', checkSharedKey, debugController.testProcessTranscriptionQueue);

/**
 * System health check
 * GET /api/debug/health
 */
router.get('/health', debugController.getHealth);

module.exports = router;
