
/**
 * GDPR Routes
 * Handles all GDPR-related endpoints with proper authentication
 */

const express = require('express');
const router = express.Router();
const gdprController = require('../controllers/gdpr.controller');
const { apiAuth } = require('../middleware/pageAuth');

/**
 * Authentication middleware for GDPR endpoints
 * Uses shared key authentication for sensitive operations
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
    logger.warn('GDPR endpoint authentication failed', { ip: req.clientIp });
    return sendError(res, 401, 'Unauthorized', 'INVALID_API_KEY');
  }

  return next();
}

/**
 * Flexible auth middleware - accepts either API key or user token
 * Allows both admin (API key) and user (token) access
 */
async function flexibleAuth(req, res, next) {
  const config = require('../config');
  const { sendError } = require('../utils/response');

  // Check for API key first
  const headerKey = req.get('X-Api-Key');
  if (headerKey && headerKey === config.webhook.apiKey) {
    return next();
  }

  // Otherwise require user token (from header OR cookies)
  return apiAuth(req, res, next);
}

/**
 * Get GDPR consent status for a user
 * GET /api/gdpr/consent/:userId
 */
router.get('/consent/:userId', gdprController.getConsent);

/**
 * Update GDPR consent for a user
 * PUT /api/gdpr/consent/:userId
 * Body: { gdprConsent: boolean }
 */
router.put('/consent/:userId', gdprController.updateConsent);

/**
 * Get GDPR audit log for a user
 * GET /api/gdpr/audit-log/:userId
 * Query params: limit, offset, activityType
 * Requires API key authentication
 */
router.get('/audit-log/:userId', checkSharedKey, gdprController.getAuditLog);

/**
 * Export all user data for GDPR compliance
 * GET /api/gdpr/export/:userId
 * Requires authentication (API key OR user token)
 * Users can only export their own data
 */
router.get('/export/:userId', flexibleAuth, async (req, res, next) => {
  const { sendError } = require('../utils/response');

  // If authenticated as user (not API key), verify they can only access their own data
  if (req.user && req.params.userId !== req.user.id) {
    return sendError(res, 403, 'Forbidden: Can only export your own data', 'FORBIDDEN');
  }

  return gdprController.exportData(req, res, next);
});

/**
 * Delete user images (GDPR right to be forgotten)
 * DELETE /api/gdpr/delete-images
 * Body: { userId: string }
 * Requires API key authentication
 */
router.delete('/delete-images', checkSharedKey, async (req, res) => {
  const { sendError } = require('../utils/response');
  const logger = require('../utils/logger');

  // This endpoint needs imageProcessor which is in index.js
  // We'll keep this here temporarily and move it later if needed
  try {
    const { userId } = req.body;

    if (!userId) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID');
    }

    // Get imageProcessor from the main app
    const imageProcessor = req.app.locals.imageProcessor;

    if (!imageProcessor) {
      return sendError(res, 503, 'Image service not configured', 'SERVICE_UNAVAILABLE');
    }

    const result = await imageProcessor.deleteAllUserImages(userId);

    res.json({
      success: true,
      ...result,
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error deleting images', error);
    sendError(res, 500, 'Failed to delete images', 'DELETE_FAILED');
  }
});

/**
 * Delete user data only (keeps account active) - GDPR Article 17
 * POST /api/gdpr/delete-data
 * Body: { userId: string }
 * Requires authentication (API key OR user token)
 * Users can only delete their own data
 *
 * This endpoint soft-deletes database records and removes storage files
 * while preserving the auth account for future use
 */
router.post('/delete-data', flexibleAuth, async (req, res) => {
  const { sendError } = require('../utils/response');
  const logger = require('../utils/logger');
  const config = require('../config');
  const gdprService = require('../services/gdprService');
  const { sendTemplateEmail } = require('../../lib/emailService');

  try {
    const { userId } = req.body;

    if (!userId) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID');
    }

    // If authenticated as user (not API key), verify they can only delete their own data
    if (req.user && userId !== req.user.id) {
      return sendError(res, 403, 'Forbidden: Can only delete your own data', 'FORBIDDEN');
    }

    logger.info('Data deletion requested (keeping account)', { userId });

    // Get supabase from app locals
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return sendError(res, 503, 'Database service unavailable', 'SERVICE_UNAVAILABLE');
    }

    // Get user info before deletion (for email)
    const { data: user } = await supabase
      .from('user_signup')
      .select('email, first_name, last_name, subscription_end_date')
      .eq('create_user_id', userId)
      .single();

    // Delete user data only (keeps auth account)
    const result = await gdprService.deleteUserDataOnly(userId, 'user_request');

    if (!result.success) {
      return sendError(res, 500, result.error || 'Failed to delete data', 'DELETE_FAILED');
    }

    logger.success('User data deleted successfully (account preserved)', { userId });

    // Send email notification
    if (user && user.email) {
      try {
        await sendTemplateEmail(
          user.email,
          'Your Data Has Been Deleted - Car Crash Lawyer AI',
          'gdpr-data-deleted',
          {
            userName: `${user.first_name || 'User'} ${user.last_name || ''}`.trim(),
            deletionDate: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            }),
            subscriptionEndDate: user.subscription_end_date
              ? new Date(user.subscription_end_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })
              : 'N/A',
            requestId: req.requestId || 'N/A',
            supportEmail: config.email?.supportEmail || process.env.SMTP_USER
          }
        );
        logger.info('Data deletion email sent', { userId, email: user.email });
      } catch (emailError) {
        logger.error('Failed to send data deletion email', {
          userId,
          error: emailError.message
        });
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Data deleted successfully. Your account remains active.',
      accountStatus: result.accountStatus,
      deletedAt: result.deletedAt,
      deletionResults: result.deletionResults,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Data deletion error', error);
    sendError(res, 500, 'Failed to delete data', 'DELETE_FAILED');
  }
});

/**
 * Delete entire user account and all data (GDPR right to be forgotten)
 * POST /api/gdpr/delete-account
 * Body: { userId: string }
 * Requires authentication (API key OR user token)
 * Users can only delete their own account
 */
router.post('/delete-account', flexibleAuth, async (req, res) => {
  const { sendError } = require('../utils/response');
  const logger = require('../utils/logger');
  const config = require('../config');
  const gdprService = require('../services/gdprService');
  const { sendTemplateEmail } = require('../../lib/emailService');

  try {
    const { userId } = req.body;

    if (!userId) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID');
    }

    // If authenticated as user (not API key), verify they can only delete their own account
    if (req.user && userId !== req.user.id) {
      return sendError(res, 403, 'Forbidden: Can only delete your own account', 'FORBIDDEN');
    }

    logger.info('Account deletion requested', { userId });

    // Get supabase from app locals
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return sendError(res, 503, 'Database service unavailable', 'SERVICE_UNAVAILABLE');
    }

    // Get user info before deletion (for email)
    const { data: user } = await supabase
      .from('user_signup')
      .select('email, first_name, last_name')
      .eq('create_user_id', userId)
      .single();

    // Delete all user data (storage, auth, etc.)
    const result = await gdprService.deleteUserData(userId, 'user_request');

    if (!result.success) {
      return sendError(res, 500, 'Failed to delete account', 'DELETE_FAILED');
    }

    logger.success('Account deleted successfully', { userId });

    // Send email notification
    if (user && user.email) {
      try {
        await sendTemplateEmail(
          user.email,
          'Account Deletion Confirmed - Car Crash Lawyer AI',
          'gdpr-account-deleted',
          {
            userName: `${user.first_name || 'User'} ${user.last_name || ''}`.trim(),
            deletionDate: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            }),
            requestId: req.requestId || 'N/A',
            supportEmail: config.email?.supportEmail || process.env.SMTP_USER
          }
        );
        logger.info('Account deletion email sent', { userId, email: user.email });
      } catch (emailError) {
        logger.error('Failed to send account deletion email', {
          userId,
          error: emailError.message
        });
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Account and all data deleted successfully',
      deletedAt: result.deletedAt,
      deletionResults: result.deletionResults,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Account deletion error', error);
    sendError(res, 500, 'Failed to delete account', 'DELETE_FAILED');
  }
});

module.exports = router;
