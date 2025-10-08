/**
 * Webhook Controller for Car Crash Lawyer AI
 * Handles Typeform webhooks and automated processing
 */

const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const gdprService = require('../services/gdprService');

// Import PDF generation modules
let fetchAllData, generatePDF, sendEmails;
try {
  fetchAllData = require('../../lib/data/dataFetcher').fetchAllData;
  generatePDF = require('../../lib/generators/pdfGenerator').generatePDF;
  sendEmails = require('../../lib/generators/emailService').sendEmails;
} catch (error) {
  logger.warn('PDF generation modules not found - PDF features will be disabled', error.message);
}

/**
 * Initialize controller with dependencies
 */
function initializeController(imageProcessor) {
  this.imageProcessor = imageProcessor;
}

/**
 * Generate user PDF (shared function from PDF controller)
 */
async function generateUserPDF(create_user_id, source = 'webhook') {
  const { createClient } = require('@supabase/supabase-js');

  const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  logger.info(`Starting PDF generation (${source})`, { userId: create_user_id });

  const validation = validateUserId(create_user_id);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  await gdprService.logActivity(create_user_id, 'PDF_GENERATION', {
    type: 'complete_report',
    source: source
  });

  const allData = await fetchAllData(create_user_id);

  if (!allData.user || !allData.user.driver_email) {
    throw new Error('User not found or missing email');
  }

  const [
    { data: aiTranscription },
    { data: aiSummary }
  ] = await Promise.all([
    supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', create_user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('ai_summary')
      .select('*')
      .eq('create_user_id', create_user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
  ]);

  if (aiTranscription) allData.aiTranscription = aiTranscription;
  if (aiSummary) allData.aiSummary = aiSummary;

  const pdfBuffer = await generatePDF(allData);

  // Store completed form logic would go here
  const emailResult = await sendEmails(allData.user.driver_email, pdfBuffer, create_user_id);

  logger.success('PDF generation process completed');

  return {
    success: true,
    create_user_id,
    email_sent: emailResult.success,
    timestamp: new Date().toISOString()
  };
}

/**
 * Signup webhook
 * POST /api/webhooks/signup
 */
async function handleSignup(req, res) {
  try {
    logger.info('Signup webhook received');

    if (!this.imageProcessor) {
      return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
    }

    const webhookData = req.body;

    if (!webhookData.create_user_id) {
      return sendError(res, 400, 'Missing create_user_id', 'MISSING_USER_ID');
    }

    await gdprService.logActivity(webhookData.create_user_id, 'SIGNUP_PROCESSING', {
      source: 'webhook',
      has_images: true
    }, req);

    this.imageProcessor.processSignupImages(webhookData)
      .then(result => {
        logger.success('Signup processing complete', result);
      })
      .catch(error => {
        logger.error('Signup processing failed', error);
      });

    res.status(200).json({
      success: true,
      message: 'Signup processing started',
      create_user_id: webhookData.create_user_id,
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Webhook error', error);
    sendError(res, 500, error.message, 'WEBHOOK_ERROR');
  }
}

/**
 * Incident report webhook
 * POST /api/webhooks/incident-report
 */
async function handleIncidentReport(req, res) {
  try {
    logger.info('Incident report webhook received');

    if (!this.imageProcessor) {
      return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
    }

    const webhookData = req.body;

    if (!webhookData.id && !webhookData.incident_report_id) {
      return sendError(res, 400, 'Missing incident report ID', 'MISSING_INCIDENT_ID');
    }

    if (!webhookData.create_user_id) {
      return sendError(res, 400, 'Missing user ID - GDPR compliance required', 'MISSING_USER_ID');
    }

    const incidentId = webhookData.id || webhookData.incident_report_id;

    await gdprService.logActivity(webhookData.create_user_id, 'INCIDENT_REPORT', {
      incident_id: incidentId,
      source: 'webhook'
    }, req);

    const result = await this.imageProcessor.processIncidentReportFiles(webhookData);

    logger.success('Incident processing complete:', result);

    if (req.query.redirect === 'true') {
      const userId = webhookData.create_user_id || '';
      res.redirect(`/report-complete.html?incident_id=${incidentId}&user_id=${userId}`);
    } else {
      res.status(200).json({
        ...result,
        requestId: req.requestId
      });
    }
  } catch (error) {
    logger.error('Webhook error', error);
    sendError(res, 500, error.message, 'WEBHOOK_ERROR');
  }
}

/**
 * PDF generation webhook
 * POST /api/webhooks/generate-pdf
 */
async function handleGeneratePdf(req, res) {
  const { create_user_id } = req.body;

  if (!create_user_id) {
    return sendError(res, 400, 'Missing create_user_id', 'MISSING_USER_ID');
  }

  if (!fetchAllData || !generatePDF || !sendEmails) {
    return sendError(res, 503, 'PDF generation modules not available', 'PDF_UNAVAILABLE');
  }

  try {
    const result = await generateUserPDF(create_user_id, 'webhook');
    res.json(result);
  } catch (error) {
    logger.error('Error in webhook PDF generation', error);
    sendError(res, 500, error.message, 'PDF_GENERATION_FAILED');
  }
}

/**
 * Typeform webhook handler
 * POST /api/webhooks/typeform
 */
async function handleTypeformWebhook(req, res) {
  try {
    const webhookData = req.body;
    logger.info('Typeform webhook received:', { 
      event_id: webhookData.event_id,
      form_id: webhookData.form_id 
    });

    // Extract hidden fields from the webhook data
    const hiddenFields = extractHiddenFields(webhookData);
    logger.info('Extracted hidden fields:', hiddenFields);

    // Validate auth code if present
    if (hiddenFields.auth_code && hiddenFields.user_id) {
      const isValidAuth = validateAuthCode(hiddenFields.auth_code, hiddenFields.user_id);
      if (!isValidAuth) {
        logger.warn('Invalid auth code in Typeform webhook', { 
          user_id: hiddenFields.user_id,
          auth_code: hiddenFields.auth_code 
        });
        return sendError(res, 401, 'Invalid authentication', 'INVALID_AUTH');
      }
    }

    // Process the webhook data with hidden fields context
    const result = await processTypeformData(webhookData, hiddenFields);

    logger.success('Typeform webhook processed successfully', { result, hiddenFields });
    res.json({ success: true, message: 'Webhook processed', user_id: hiddenFields.user_id });
  } catch (error) {
    logger.error('Typeform webhook error:', error);
    sendError(res, 500, 'Webhook processing failed', 'WEBHOOK_ERROR');
  }
}

/**
 * Generic webhook handler (example, can be extended)
 * POST /api/webhooks/generic
 */
async function handleGenericWebhook(req, res) {
  try {
    logger.info('Generic webhook received');
    const webhookData = req.body;

    // Basic processing for generic webhooks
    logger.info('Generic webhook data:', webhookData);

    res.status(200).json({
      success: true,
      message: 'Generic webhook received',
      data: webhookData,
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Generic webhook error', error);
    sendError(res, 500, error.message, 'WEBHOOK_ERROR');
  }
}

/**
 * Extract hidden fields from Typeform webhook data
 */
function extractHiddenFields(webhookData) {
  const hiddenFields = {};

  try {
    if (webhookData.form_response && webhookData.form_response.hidden) {
      const hidden = webhookData.form_response.hidden;

      // Extract the hidden fields you're interested in
      if (hidden.user_id) hiddenFields.user_id = hidden.user_id;
      if (hidden['product-id']) hiddenFields.product_id = hidden['product-id'];
      if (hidden.auth_code) hiddenFields.auth_code = hidden.auth_code;
      if (hidden.user_email) hiddenFields.user_email = hidden.user_email;
      if (hidden.signup_timestamp) hiddenFields.signup_timestamp = hidden.signup_timestamp;
    }
  } catch (error) {
    logger.error('Error extracting hidden fields:', error);
  }

  return hiddenFields;
}

/**
 * Validate auth code (simple validation - enhance as needed)
 */
function validateAuthCode(authCode, userId) {
  try {
    // Decode the auth code
    const decoded = atob(authCode);
    const [codeUserId] = decoded.split('_');

    // Check if the user ID matches
    return codeUserId === userId;
  } catch (error) {
    logger.error('Auth code validation error:', error);
    return false;
  }
}

/**
 * Process Typeform data with hidden fields context
 */
async function processTypeformData(webhookData, hiddenFields = {}) {
  try {
    // Your existing processing logic here
    // Now you have access to hiddenFields.user_id, hiddenFields.product_id, etc.

    logger.info('Processing Typeform data for user:', {
      user_id: hiddenFields.user_id,
      product_id: hiddenFields.product_id,
      form_id: webhookData.form_id
    });

    // Example: Update user record with Typeform completion
    if (hiddenFields.user_id && config.supabase.url) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

      const { error } = await supabase
        .from('user_signup')
        .update({ 
          typeform_completed: true,
          typeform_completion_date: new Date().toISOString(),
          typeform_response_id: webhookData.form_response?.token
        })
        .eq('uid', hiddenFields.user_id);

      if (error) {
        logger.error('Error updating user Typeform completion:', error);
      } else {
        logger.success('User Typeform completion recorded', { user_id: hiddenFields.user_id });
      }
    }

    return {
      processed: true,
      user_id: hiddenFields.user_id,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error processing Typeform data:', error);
    throw error;
  }
}

module.exports = {
  initializeController,
  handleSignup,
  handleIncidentReport,
  handleGeneratePdf,
  handleTypeformWebhook,
  handleGenericWebhook,
  extractHiddenFields,
  validateAuthCode
};