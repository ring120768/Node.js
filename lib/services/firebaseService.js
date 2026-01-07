/**
 * Firebase Cloud Messaging (FCM) Service
 * Sends push notifications to mobile devices
 *
 * COST: FREE (unlimited notifications)
 * SETUP: Requires FIREBASE_SERVER_KEY in .env
 */

const axios = require('axios');
const logger = require('../../src/utils/logger');

const FCM_API_URL = 'https://fcm.googleapis.com/fcm/send';
const FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY;

/**
 * Check if Firebase is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!FIREBASE_SERVER_KEY;
}

/**
 * Send push notification to a device
 *
 * @param {string} fcmToken - Device FCM token
 * @param {Object} notification - Notification payload
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} [notification.data] - Custom data payload
 * @returns {Promise<Object>} FCM response
 */
async function sendNotification(fcmToken, notification) {
  if (!isConfigured()) {
    logger.warn('Firebase not configured - skipping push notification');
    return { success: false, error: 'Firebase not configured' };
  }

  if (!fcmToken) {
    logger.warn('No FCM token provided - cannot send push notification');
    return { success: false, error: 'No FCM token' };
  }

  try {
    const payload = {
      to: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
        sound: 'default',
        badge: '1',
        // Android-specific
        android_channel_id: 'default',
        priority: 'high',
        // iOS-specific
        content_available: true,
      },
      // Custom data payload (accessible in app)
      data: notification.data || {},
      // Delivery priority
      priority: 'high',
      // TTL - notification expires after 24 hours if not delivered
      time_to_live: 86400,
    };

    const response = await axios.post(FCM_API_URL, payload, {
      headers: {
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    if (response.data.success === 1) {
      logger.info('Push notification sent successfully', {
        fcmToken: fcmToken.substring(0, 20) + '...',
        title: notification.title,
      });
      return { success: true, messageId: response.data.results[0].message_id };
    } else {
      const error = response.data.results[0].error || 'Unknown error';
      logger.error('Push notification failed', { error, fcmToken: fcmToken.substring(0, 20) + '...' });
      return { success: false, error };
    }

  } catch (error) {
    logger.error('Failed to send push notification', {
      error: error.message,
      fcmToken: fcmToken ? fcmToken.substring(0, 20) + '...' : 'none',
    });
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to multiple devices
 * @param {string[]} fcmTokens - Array of device FCM tokens
 * @param {Object} notification - Notification payload
 * @returns {Promise<Object>} Results
 */
async function sendNotificationToMultiple(fcmTokens, notification) {
  if (!isConfigured()) {
    logger.warn('Firebase not configured - skipping push notifications');
    return { success: false, error: 'Firebase not configured' };
  }

  if (!fcmTokens || fcmTokens.length === 0) {
    logger.warn('No FCM tokens provided - cannot send push notifications');
    return { success: false, error: 'No FCM tokens' };
  }

  try {
    const payload = {
      registration_ids: fcmTokens, // Send to multiple devices
      notification: {
        title: notification.title,
        body: notification.body,
        sound: 'default',
        badge: '1',
        android_channel_id: 'default',
        priority: 'high',
        content_available: true,
      },
      data: notification.data || {},
      priority: 'high',
      time_to_live: 86400,
    };

    const response = await axios.post(FCM_API_URL, payload, {
      headers: {
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const results = {
      success: response.data.success || 0,
      failure: response.data.failure || 0,
      results: response.data.results || [],
    };

    logger.info('Batch push notification sent', {
      success: results.success,
      failure: results.failure,
      total: fcmTokens.length,
    });

    return results;

  } catch (error) {
    logger.error('Failed to send batch push notifications', {
      error: error.message,
      tokenCount: fcmTokens.length,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Send "PDF Ready" notification
 * @param {string} fcmToken - Device FCM token
 * @param {string} reportUrl - URL to the PDF report
 * @param {string} userId - User UUID
 * @returns {Promise<Object>}
 */
async function sendPdfReadyNotification(fcmToken, reportUrl, userId) {
  return sendNotification(fcmToken, {
    title: '✅ Your Report is Ready!',
    body: 'We\'ve generated your incident report. Tap to view your PDF.',
    data: {
      type: 'pdf_ready',
      reportUrl,
      userId,
      action: 'open_report',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send "AI Analysis Complete" notification
 * @param {string} fcmToken - Device FCM token
 * @param {string} userId - User UUID
 * @returns {Promise<Object>}
 */
async function sendAiAnalysisCompleteNotification(fcmToken, userId) {
  return sendNotification(fcmToken, {
    title: '🤖 AI Analysis Complete',
    body: 'Your AI-powered incident analysis is ready to review.',
    data: {
      type: 'ai_complete',
      userId,
      action: 'open_analysis',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send "Processing Started" notification
 * @param {string} fcmToken - Device FCM token
 * @param {string} userId - User UUID
 * @returns {Promise<Object>}
 */
async function sendProcessingStartedNotification(fcmToken, userId) {
  return sendNotification(fcmToken, {
    title: '⏳ Processing Your Report',
    body: 'We\'re generating your PDF report. You\'ll be notified when it\'s ready (2-3 minutes).',
    data: {
      type: 'processing_started',
      userId,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send generic notification
 * @param {string} fcmToken - Device FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} [data] - Custom data
 * @returns {Promise<Object>}
 */
async function sendGenericNotification(fcmToken, title, body, data = {}) {
  return sendNotification(fcmToken, {
    title,
    body,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = {
  isConfigured,
  sendNotification,
  sendNotificationToMultiple,
  sendPdfReadyNotification,
  sendAiAnalysisCompleteNotification,
  sendProcessingStartedNotification,
  sendGenericNotification,
};
