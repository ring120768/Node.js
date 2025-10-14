/**
 * Webhook Authentication Middleware
 * Validates signatures from external services (Typeform, Zapier, GitHub)
 * 
 * Security: Uses timing-safe comparison to prevent timing attacks
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

/**
 * Validate webhook signature based on provider
 * @param {string} provider - 'typeform', 'zapier', or 'github'
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
      case 'typeform':
        isValid = verifyTypeformSignature(req, secret);
        break;
      case 'zapier':
        isValid = verifyZapierSignature(req, secret);
        break;
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
    case 'typeform':
      return process.env.TYPEFORM_WEBHOOK_SECRET || process.env.WEBHOOK_API_KEY;
    case 'zapier':
      return process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY;
    case 'github':
      return process.env.GITHUB_WEBHOOK_SECRET;
    default:
      return null;
  }
}

function getSignatureHeader(provider) {
  switch (provider) {
    case 'typeform':
      return 'Typeform-Signature';
    case 'zapier':
      return 'X-Zapier-Secret';
    case 'github':
      return 'X-Hub-Signature-256';
    default:
      return null;
  }
}

function verifyTypeformSignature(req, secret) {
  const header = req.get('Typeform-Signature');
  
  if (!header || !header.startsWith('sha256=')) {
    return false;
  }

  if (!req.rawBodyBuffer && !req.rawBody) {
    logger.warn('Raw body missing for signature verification');
    return false;
  }
  
  // Prefer Buffer, fallback to string for backward compatibility
  const bodyData = req.rawBodyBuffer || req.rawBody;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(bodyData)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch (error) {
    logger.debug('Signature length mismatch', { 
      expectedLength: expected.length,
      receivedLength: header.length
    });
    return false;
  }
}

function verifyZapierSignature(req, secret) {
  const header = req.get('X-Zapier-Secret');
  
  if (!header) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(secret));
  } catch {
    return false;
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
