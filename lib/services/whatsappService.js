/**
 * WhatsApp Business Platform Service
 * Handles sending messages via Meta WhatsApp Cloud API
 * 
 * @requires WHATSAPP_PHONE_NUMBER_ID - From WhatsApp Manager
 * @requires WHATSAPP_ACCESS_TOKEN - From Facebook Business Manager
 */

const axios = require('axios');
const logger = require('../../src/utils/logger');

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

// Base API URL
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

/**
 * Check if WhatsApp is configured
 */
function isWhatsAppEnabled() {
  return !!(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN);
}

/**
 * Format phone number to international format (E.164)
 * @param {string} phone - Phone number (e.g., "07496834683" or "+447496834683")
 * @returns {string} - Formatted phone number (e.g., "447496834683")
 */
function formatPhoneNumber(phone) {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with UK country code (44)
  if (cleaned.startsWith('0')) {
    cleaned = '44' + cleaned.slice(1);
  }
  
  // If already has country code, ensure no leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  
  return cleaned;
}

/**
 * Send template message via WhatsApp
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (UK format: 07496834683 or +447496834683)
 * @param {string} params.template - Template name (e.g., 'photo_upload_confirmation')
 * @param {string} params.languageCode - Language code (default: 'en_GB')
 * @param {Array<string>} params.variables - Template variables (e.g., ['John', '5', '08/01/2026'])
 * @returns {Promise<Object>} - WhatsApp API response
 */
async function sendTemplateMessage({ to, template, languageCode = 'en_GB', variables = [] }) {
  if (!isWhatsAppEnabled()) {
    logger.warn('WhatsApp not configured - skipping message');
    return { success: false, error: 'WhatsApp not configured' };
  }

  try {
    const formattedPhone = formatPhoneNumber(to);
    
    // Build template components with variables
    const components = variables.length > 0 ? [{
      type: 'body',
      parameters: variables.map(value => ({
        type: 'text',
        text: String(value)
      }))
    }] : [];

    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: template,
        language: {
          code: languageCode
        },
        components
      }
    };

    logger.info('Sending WhatsApp template message', {
      to: formattedPhone,
      template,
      variableCount: variables.length
    });

    const response = await axios.post(WHATSAPP_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    logger.info('WhatsApp message sent successfully', {
      messageId: response.data.messages?.[0]?.id,
      to: formattedPhone
    });

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      data: response.data
    };

  } catch (error) {
    logger.error('WhatsApp message failed', {
      error: error.message,
      response: error.response?.data,
      to,
      template
    });

    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Send photo upload confirmation
 * @param {Object} params
 * @param {string} params.to - Phone number
 * @param {string} params.firstName - User's first name
 * @param {number} params.photoCount - Number of photos uploaded
 * @param {string} params.uploadDate - Upload date (DD/MM/YYYY)
 */
async function sendPhotoUploadConfirmation({ to, firstName, photoCount, uploadDate }) {
  return sendTemplateMessage({
    to,
    template: 'photo_upload_confirmation',
    variables: [firstName, String(photoCount), uploadDate]
  });
}

/**
 * Send PDF ready notification
 * @param {Object} params
 * @param {string} params.to - Phone number
 * @param {string} params.firstName - User's first name
 * @param {string} params.pdfUrl - PDF download link
 * @param {string} params.email - User's email address
 */
async function sendPdfReady({ to, firstName, pdfUrl, email }) {
  return sendTemplateMessage({
    to,
    template: 'pdf_report_ready',
    variables: [firstName, pdfUrl, email]
  });
}

/**
 * Send GDPR retention notice
 * @param {Object} params
 * @param {string} params.to - Phone number
 * @param {string} params.firstName - User's first name
 * @param {string} params.reportDate - Report creation date (DD/MM/YYYY)
 * @param {string} params.pdfUrl - PDF download link
 */
async function sendGdprNotice({ to, firstName, reportDate, pdfUrl }) {
  return sendTemplateMessage({
    to,
    template: 'gdpr_retention_notice',
    variables: [firstName, reportDate, pdfUrl]
  });
}

/**
 * Send processing status update
 * @param {Object} params
 * @param {string} params.to - Phone number
 * @param {string} params.firstName - User's first name
 * @param {number} params.progress - Progress percentage (0-100)
 * @param {number} params.estimatedMinutes - Estimated minutes remaining
 */
async function sendProcessingStatus({ to, firstName, progress, estimatedMinutes }) {
  return sendTemplateMessage({
    to,
    template: 'processing_status',
    variables: [firstName, String(progress), String(estimatedMinutes)]
  });
}

/**
 * Send welcome message (for ads/marketing)
 * @param {Object} params
 * @param {string} params.to - Phone number
 */
async function sendWelcomeMessage({ to }) {
  return sendTemplateMessage({
    to,
    template: 'welcome_message',
    variables: [] // No variables in welcome template
  });
}

module.exports = {
  isWhatsAppEnabled,
  formatPhoneNumber,
  sendTemplateMessage,
  sendPhotoUploadConfirmation,
  sendPdfReady,
  sendGdprNotice,
  sendProcessingStatus,
  sendWelcomeMessage
};
