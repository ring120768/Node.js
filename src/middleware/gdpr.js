
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

/**
 * Log GDPR activity
 */
async function logGDPRActivity(userId, activityType, details, req = null) {
  if (!supabaseEnabled) return;

  try {
    await supabase
      .from('gdpr_audit_log')
      .insert({
        user_id: userId,
        activity_type: activityType,
        details: details,
        ip_address: req?.clientIp || 'unknown',
        user_agent: req?.get('user-agent') || 'unknown',
        request_id: req?.requestId || null,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    logger.error('GDPR audit log error', error);
  }
}

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

/**
 * Data Retention Policy Enforcement
 */
async function enforceDataRetention() {
  if (!supabaseEnabled) return;

  const retentionDays = config.dataRetention?.days || 365;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    // Archive old incident reports
    const { data: oldReports } = await supabase
      .from('incident_reports')
      .select('id, create_user_id')
      .lt('created_at', cutoffDate.toISOString())
      .eq('archived', false);

    if (oldReports && oldReports.length > 0) {
      for (const report of oldReports) {
        await supabase
          .from('incident_reports')
          .update({
            archived: true,
            archived_at: new Date().toISOString()
          })
          .eq('id', report.id);

        await logGDPRActivity(report.create_user_id, 'DATA_ARCHIVED', {
          report_id: report.id,
          reason: 'Data retention policy'
        });
      }

      logger.info(`Archived ${oldReports.length} old reports per retention policy`);
    }

    // Clean up old transcription queue items
    await supabase
      .from('transcription_queue')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('status', 'completed');
  } catch (error) {
    logger.error('Data retention enforcement error', error);
  }
}

module.exports = {
  initGDPR,
  checkGDPRConsent,
  logGDPRActivity,
  enforceDataRetention
};
