
/**
 * GitHub Webhook Routes with HMAC SHA-256 Verification
 * Handles GitHub webhook events with proper security and idempotency
 */

const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { LRUCache } = require('lru-cache');

const router = express.Router();

// Idempotency cache for delivery IDs (prevents duplicate processing)
const deliveryCache = new LRUCache({
  max: 1000,
  ttl: 1000 * 60 * 60 // 1 hour
});

/**
 * GitHub Webhook Status Check
 * GET /webhooks/github
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    endpoint: 'GitHub Webhook',
    method: 'POST',
    webhook_secret_configured: !!process.env.GITHUB_WEBHOOK_SECRET,
    message: 'This endpoint accepts POST requests from GitHub webhooks',
    timestamp: new Date().toISOString()
  });
});

/**
 * GitHub Webhook Event Handler
 * POST /webhooks/github
 */
router.post('/', (req, res) => {
  const signature = req.get('X-Hub-Signature-256');
  const deliveryId = req.get('X-GitHub-Delivery');
  const event = req.get('X-GitHub-Event');

  logger.debug('GitHub webhook received', {
    hasSignature: !!signature,
    hasDeliveryId: !!deliveryId,
    event,
    bodyLength: req.body ? req.body.length : 0
  }, req.requestId);

  // Fast 200 acknowledgment first
  res.status(200).json({
    received: true,
    delivery_id: deliveryId,
    event: event,
    timestamp: new Date().toISOString()
  });

  // Process webhook asynchronously
  setImmediate(() => processWebhookAsync(req.body, signature, deliveryId, event, req.requestId));
});

/**
 * Debug endpoint to view recent webhook deliveries
 * GET /webhooks/github/debug
 */
router.get('/debug', (req, res) => {
  const recentDeliveries = Array.from(deliveryCache.keys()).map(key => ({
    delivery_id: key,
    processed_at: deliveryCache.get(key)
  }));
  
  res.json({
    status: 'ok',
    webhook_secret_configured: !!process.env.GITHUB_WEBHOOK_SECRET,
    recent_deliveries: recentDeliveries.slice(-10), // Last 10
    cache_size: deliveryCache.size
  });
});

/**
 * Async webhook processing with full verification
 */
async function processWebhookAsync(body, signature, deliveryId, event, requestId) {
  try {
    // Environment guard
    if (!process.env.GITHUB_WEBHOOK_SECRET) {
      logger.error('GitHub webhook secret not configured', {}, requestId);
      return;
    }
    
    // Idempotency check
    if (deliveryCache.has(deliveryId)) {
      logger.info('Duplicate GitHub webhook delivery ignored', { deliveryId }, requestId);
      return;
    }
    
    // Signature verification
    if (!signature || !deliveryId) {
      logger.warn('Missing GitHub webhook headers', { 
        signature: !!signature, 
        deliveryId: !!deliveryId 
      }, requestId);
      return;
    }
    
    // HMAC SHA-256 verification
    const expectedSignature = crypto
      .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))) {
      logger.warn('Invalid GitHub webhook signature', { 
        deliveryId, 
        event,
        expectedLength: expectedSignature.length,
        providedLength: providedSignature.length
      }, requestId);
      return;
    }
    
    // Mark as processed (idempotency)
    deliveryCache.set(deliveryId, new Date().toISOString());
    
    // Process the webhook based on event type
    await handleGitHubEvent(event, body, deliveryId, requestId);
    
    logger.success('GitHub webhook processed successfully', { 
      deliveryId, 
      event 
    }, requestId);
    
  } catch (error) {
    logger.error('GitHub webhook processing error', { 
      error: error.message,
      deliveryId,
      event
    }, requestId);
  }
}

/**
 * Handle specific GitHub events
 */
async function handleGitHubEvent(event, payload, deliveryId, requestId) {
  switch (event) {
    case 'push':
      logger.info('GitHub push event received', { 
        repository: payload.repository?.name,
        ref: payload.ref,
        commits: payload.commits?.length || 0
      }, requestId);
      break;
      
    case 'pull_request':
      logger.info('GitHub PR event received', { 
        repository: payload.repository?.name,
        action: payload.action,
        number: payload.number
      }, requestId);
      break;
      
    case 'ping':
      logger.info('GitHub ping event received', { 
        hook_id: payload.hook_id 
      }, requestId);
      break;
      
    default:
      logger.debug('Unhandled GitHub event', { event }, requestId);
  }
}

module.exports = router;
