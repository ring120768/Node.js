
/**
 * GDPR Controller
 * Handles GDPR consent management, audit logs, and data export
 */

const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const gdprService = require('../services/gdprService');
const User = require('../models/User');

let supabase = null;

/**
 * Initialize GDPR controller with dependencies
 */
function initializeController(supabaseInstance) {
  supabase = supabaseInstance;
}

/**
 * Get GDPR consent status for a user
 * GET /api/gdpr/consent/:userId
 */
async function getConsent(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;

    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    logger.info('Fetching GDPR consent status', { userId });

    const { data: user, error } = await supabase
      .from('user_signup')
      .select('gdpr_consent, gdpr_consent_date, gdpr_consent_version, gdpr_consent_ip')
      .eq('create_user_id', userId)
      .single();

    if (error || !user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    await gdprService.logActivity(userId, 'CONSENT_STATUS_CHECK', {
      has_consent: user.gdpr_consent
    }, req);

    res.json({
      success: true,
      userId: userId,
      gdprConsent: {
        granted: user.gdpr_consent || false,
        date: user.gdpr_consent_date || null,
        version: user.gdpr_consent_version || null,
        ip: user.gdpr_consent_ip || null
      },
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error fetching GDPR consent:', error);
    sendError(res, 500, 'Failed to fetch consent status', 'CONSENT_FETCH_FAILED');
  }
}

/**
 * Update GDPR consent for a user
 * PUT /api/gdpr/consent/:userId
 */
async function updateConsent(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;
    const { gdprConsent } = req.body;

    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    if (typeof gdprConsent !== 'boolean') {
      return sendError(res, 400, 'gdprConsent must be a boolean value', 'INVALID_CONSENT_VALUE');
    }

    logger.info('Updating GDPR consent', { userId, consent: gdprConsent });

    const updateData = {
      gdpr_consent: gdprConsent,
      updated_at: new Date().toISOString()
    };

    // If granting consent, capture consent metadata
    if (gdprConsent === true) {
      updateData.gdpr_consent_date = new Date().toISOString();
      updateData.gdpr_consent_ip = req.clientIp || 'unknown';
      updateData.gdpr_consent_version = config.constants.GDPR.CURRENT_POLICY_VERSION;
      updateData.gdpr_consent_user_agent = req.get('user-agent') || 'unknown';
    }

    const { data, error } = await supabase
      .from('user_signup')
      .update(updateData)
      .eq('create_user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating GDPR consent:', error);
      return sendError(res, 500, 'Failed to update consent', 'CONSENT_UPDATE_FAILED');
    }

    if (!data) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    // Log the consent change
    await gdprService.logActivity(userId, gdprConsent ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN', {
      consent_type: 'manual_update',
      consent_method: 'api',
      consent_version: gdprConsent ? config.constants.GDPR.CURRENT_POLICY_VERSION : null,
      ip_address: req.clientIp || 'unknown',
      user_agent: req.get('user-agent') || 'unknown'
    }, req);

    logger.success('GDPR consent updated', { userId, consentGranted: gdprConsent });

    res.json({
      success: true,
      message: gdprConsent ? 'Consent granted successfully' : 'Consent withdrawn successfully',
      userId: userId,
      gdprConsent: {
        granted: gdprConsent,
        date: gdprConsent ? updateData.gdpr_consent_date : null,
        version: gdprConsent ? config.constants.GDPR.CURRENT_POLICY_VERSION : null
      },
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error updating GDPR consent:', error);
    sendError(res, 500, 'Failed to update consent', 'INTERNAL_ERROR');
  }
}

/**
 * Get GDPR audit log for a user
 * GET /api/gdpr/audit-log/:userId
 */
async function getAuditLog(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, activityType } = req.query;

    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    logger.info('Fetching GDPR audit log', { userId, limit, offset, activityType });

    let query = supabase
      .from('gdpr_audit_log')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching audit log:', error);
      return sendError(res, 500, 'Failed to fetch audit log', 'AUDIT_FETCH_FAILED');
    }

    res.json({
      success: true,
      userId: userId,
      auditLog: data || [],
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (count || 0) > (parseInt(offset) + parseInt(limit))
      },
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error fetching audit log:', error);
    sendError(res, 500, 'Failed to fetch audit log', 'INTERNAL_ERROR');
  }
}

/**
 * Export all user data for GDPR compliance
 * GET /api/gdpr/export/:userId
 */
async function exportData(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  const { userId } = req.params;

  try {
    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    logger.info('Starting GDPR data export', { userId });

    const { data: user } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    const userDataResult = await User.getUserDataBatch(userId);
    
    if (!userDataResult.success) {
      return sendError(res, 404, userDataResult.error, userDataResult.code || 'USER_DATA_ERROR');
    }

    const userData = userDataResult.data;

    await gdprService.logActivity(userId, 'DATA_EXPORT', {
      requested_by: req.clientIp,
      items_exported: {
        incidents: userData.incidents.length,
        transcriptions: userData.transcriptions.length,
        images: userData.images.length,
        ai_listening: userData.aiListeningTranscripts.length,
        emergency_calls: userData.emergencyCalls.length
      }
    }, req);

    res.json({
      export_date: new Date().toISOString(),
      user_id: userId,
      data: userData,
      gdpr_info: {
        right_to_access: true,
        right_to_portability: true,
        export_format: 'JSON'
      },
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('GDPR export error', error);
    sendError(res, 500, 'Failed to export data', 'EXPORT_FAILED');
  }
}

module.exports = {
  initializeController,
  getConsent,
  updateConsent,
  getAuditLog,
  exportData
};
