
/**
 * GDPR Compliance Middleware and Functions
 * Handles consent verification, activity logging, and data retention
 */

const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');

let supabase = null;
let supabaseEnabled = false;

/**
 * Initialize GDPR middleware with Supabase instance
 */
function initGDPR(supabaseInstance, enabled) {
  supabase = supabaseInstance;
  supabaseEnabled = enabled;
}

// GDPR activity logging moved to gdprService

/**
 * GDPR Consent Check Middleware
 */
async function checkGDPRConsent(req, res, next) {
  const userId = req.body?.userId || req.body?.create_user_id || req.params?.userId;

  if (!userId) {
    return sendError(res, 400, 'User identification required', 'MISSING_USER_ID',
      'A valid user ID must be provided to process personal data');
  }

  // Validate user ID format
  const validation = validateUserId(userId);
  if (!validation.valid) {
    return sendError(res, 400, validation.error, 'INVALID_USER_ID');
  }

  if (!supabaseEnabled) {
    return next();
  }

  try {
    const { data: user } = await supabase
      .from('user_signup')
      .select('gdpr_consent, gdpr_consent_date')
      .eq('create_user_id', userId)
      .single();

    if (!user || !user.gdpr_consent) {
      await logGDPRActivity(userId, 'CONSENT_CHECK_FAILED', {
        reason: 'No consent found',
        ip: req.clientIp,
        requestId: req.requestId
      }, req);

      return sendError(res, 403, 'GDPR consent required', 'CONSENT_REQUIRED',
        'User must provide GDPR consent before processing personal data');
    }

    req.gdprConsent = {
      granted: true,
      date: user.gdpr_consent_date
    };

    next();
  } catch (error) {
    logger.error('GDPR consent check error', error);
    sendError(res, 500, 'Failed to verify consent', 'CONSENT_CHECK_FAILED');
  }
}

// Data retention enforcement moved to gdprService

module.exports = {
  initGDPR,
  checkGDPRConsent
};
