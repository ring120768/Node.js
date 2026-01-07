/**
 * WhatsApp Business Cloud API Service
 *
 * Sends WhatsApp messages via Meta's Business Cloud API
 * FREE: 1000 messages/month, then ~£0.01-0.05 per message
 *
 * Setup: See WHATSAPP_SETUP_GUIDE.md for Meta Business Manager configuration
 *
 * @requires WHATSAPP_PHONE_NUMBER_ID - Your WhatsApp Business phone number ID
 * @requires WHATSAPP_ACCESS_TOKEN - Meta API access token
 * @requires WHATSAPP_BUSINESS_ACCOUNT_ID - Business account ID (optional, for monitoring)
 */

const axios = require('axios');
const logger = require('../../src/utils/logger');

// WhatsApp Business Cloud API endpoint
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// Environment variables
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

/**
 * Check if WhatsApp is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

/**
 * Format UK phone number for WhatsApp
 * Converts various formats to E.164 format (+44xxxxxxxxxx)
 *
 * @param {string} phoneNumber - UK phone number
 * @returns {string|null} - Formatted phone number or null if invalid
 *
 * @example
 * formatPhoneNumber('07700 900123')  // '+447700900123'
 * formatPhoneNumber('+44 7700 900123') // '+447700900123'
 * formatPhoneNumber('7700900123')    // '+447700900123'
 */
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;

  // Remove all non-digit characters
  let digits = phoneNumber.replace(/\D/g, '');

  // Handle different UK formats
  if (digits.startsWith('44')) {
    // Already has country code
    return '+' + digits;
  } else if (digits.startsWith('0')) {
    // Remove leading 0 and add +44
    return '+44' + digits.substring(1);
  } else if (digits.length === 10) {
    // 10 digits without leading 0
    return '+44' + digits;
  }

  logger.warn('Invalid UK phone number format:', phoneNumber);
  return null;
}

/**
 * Send WhatsApp template message
 *
 * Templates must be pre-approved in Meta Business Manager
 *
 * @param {string} phoneNumber - Recipient phone number (UK format)
 * @param {string} templateName - Approved template name
 * @param {Array<string>} parameters - Template parameter values
 * @returns {Promise<Object>} - { success: boolean, messageId?: string, error?: string }
 */
async function sendTemplateMessage(phoneNumber, templateName, parameters = []) {
  if (!isConfigured()) {
    logger.warn('WhatsApp not configured - skipping message');
    return { success: false, error: 'WhatsApp not configured' };
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);
  if (!formattedPhone) {
    return { success: false, error: 'Invalid phone number format' };
  }

  try {
    logger.info('📱 Sending WhatsApp message', {
      to: formattedPhone.substring(0, 7) + '***',
      template: templateName
    });

    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_GB'  // British English
        },
        components: parameters.length > 0 ? [
          {
            type: 'body',
            parameters: parameters.map(value => ({
              type: 'text',
              text: value
            }))
          }
        ] : []
      }
    };

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000  // 10 second timeout
      }
    );

    if (response.data.messages && response.data.messages[0]) {
      const messageId = response.data.messages[0].id;
      logger.info('✅ WhatsApp message sent successfully', { messageId });
      return { success: true, messageId };
    } else {
      logger.warn('⚠️ WhatsApp API returned unexpected response', response.data);
      return { success: false, error: 'Unexpected API response' };
    }

  } catch (error) {
    if (error.response) {
      // WhatsApp API error
      const errorData = error.response.data;
      logger.error('❌ WhatsApp API error:', {
        status: error.response.status,
        error: errorData.error?.message || errorData
      });
      return {
        success: false,
        error: errorData.error?.message || 'WhatsApp API error'
      };
    } else if (error.request) {
      // Network error
      logger.error('❌ WhatsApp network error:', error.message);
      return { success: false, error: 'Network error' };
    } else {
      // Other error
      logger.error('❌ WhatsApp send error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Send "PDF Ready" notification via WhatsApp
 * Uses approved template: 'pdf_ready_notification'
 *
 * Template format (must be pre-approved in Meta Business Manager):
 * "✅ Your Car Crash Lawyer AI report is ready! {{1}}"
 *
 * @param {string} phoneNumber - UK phone number
 * @param {string} userName - User's first name
 * @returns {Promise<Object>}
 */
async function sendPdfReadyNotification(phoneNumber, userName = 'there') {
  return sendTemplateMessage(
    phoneNumber,
    'pdf_ready_notification',  // Must match template name in Meta Business Manager
    [userName]  // Parameter {{1}} in template
  );
}

/**
 * Send "AI Analysis Complete" notification via WhatsApp
 * Uses approved template: 'ai_complete_notification'
 *
 * Template format (must be pre-approved):
 * "🤖 We've finished analyzing your incident. {{1}}"
 *
 * @param {string} phoneNumber - UK phone number
 * @param {string} userName - User's first name
 * @returns {Promise<Object>}
 */
async function sendAiAnalysisCompleteNotification(phoneNumber, userName = 'there') {
  return sendTemplateMessage(
    phoneNumber,
    'ai_complete_notification',
    [userName]
  );
}

/**
 * Send "Processing Started" notification via WhatsApp
 * Uses approved template: 'processing_started_notification'
 *
 * Template format (must be pre-approved):
 * "📋 We're processing your incident report. You'll receive your PDF shortly."
 *
 * @param {string} phoneNumber - UK phone number
 * @returns {Promise<Object>}
 */
async function sendProcessingStartedNotification(phoneNumber) {
  return sendTemplateMessage(
    phoneNumber,
    'processing_started_notification',
    []  // No parameters
  );
}

/**
 * Send generic notification via WhatsApp
 * Uses approved template: 'generic_notification'
 *
 * Template format (must be pre-approved):
 * "{{1}}"  // Simple message parameter
 *
 * @param {string} phoneNumber - UK phone number
 * @param {string} message - Message content
 * @returns {Promise<Object>}
 */
async function sendGenericNotification(phoneNumber, message) {
  return sendTemplateMessage(
    phoneNumber,
    'generic_notification',
    [message]
  );
}

/**
 * Get WhatsApp Business Account metrics
 * (Optional - for monitoring usage and staying within free tier)
 *
 * @returns {Promise<Object|null>}
 */
async function getAccountMetrics() {
  if (!isConfigured() || !BUSINESS_ACCOUNT_ID) {
    return null;
  }

  try {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${BUSINESS_ACCOUNT_ID}`,
      {
        params: {
          fields: 'message_template_namespace,on_behalf_of_business_info'
        },
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    return response.data;
  } catch (error) {
    logger.error('Failed to fetch WhatsApp metrics:', error.message);
    return null;
  }
}

module.exports = {
  sendTemplateMessage,
  sendPdfReadyNotification,
  sendAiAnalysisCompleteNotification,
  sendProcessingStartedNotification,
  sendGenericNotification,
  formatPhoneNumber,
  getAccountMetrics,
  isConfigured
};
