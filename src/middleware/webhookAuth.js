/**
 * Webhook Authentication Middleware
 * Validates signatures from external services (GitHub)
 *
 * Security: Uses timing-safe comparison to prevent timing attacks
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

/**
 * Validate webhook signature based on provider
 * @param {string} provider - 'github'
 * @returns {Function} Express middleware
 */
function validateWebhookSignature(provider) {
  return (req, res, next) => {
    const requestId = req.requestId || 'unknown';
    
    const secret = getWebhookSecret(provider);
    
    if (!secret) {
      logger.error('Webhook secret not configured', { provider }, requestId);
      return sendError(res, 500, 'Webhook authentication not configured', 'CONFIG_ERROR');
    }

    let isValid = false;

    switch (provider) {
      case 'github':
        isValid = verifyGitHubSignature(req, secret);
        break;
      default:
        logger.error('Unknown webhook provider', { provider }, requestId);
        return sendError(res, 400, 'Invalid webhook provider', 'INVALID_PROVIDER');
    }

    if (!isValid) {
      logger.warn('Webhook signature validation failed', { 
        provider,
        hasSignatureHeader: !!req.get(getSignatureHeader(provider)),
        hasRawBody: !!req.rawBody
      }, requestId);
      
      return sendError(res, 401, 'Invalid webhook signature', 'INVALID_SIGNATURE');
    }

    logger.debug('Webhook signature validated', { provider }, requestId);
    next();
  };
}

function getWebhookSecret(provider) {
  switch (provider) {
    case 'github':
      return process.env.GITHUB_WEBHOOK_SECRET;
    default:
      return null;
  }
}

function getSignatureHeader(provider) {
  switch (provider) {
    case 'github':
      return 'X-Hub-Signature-256';
    default:
      return null;
  }
}

function verifyGitHubSignature(req, secret) {
  const header = req.get('X-Hub-Signature-256');
  
  if (!header || !header.startsWith('sha256=')) {
    return false;
  }

  if (!req.rawBodyBuffer && !req.rawBody) {
    return false;
  }
  
  const bodyData = req.rawBodyBuffer || req.rawBody;
  
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(bodyData)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

module.exports = {
  validateWebhookSignature
};
