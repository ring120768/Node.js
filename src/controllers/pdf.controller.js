
/**
 * PDF Controller for Car Crash Lawyer AI
 * Handles PDF generation, status checking, and downloads
 */

const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const gdprService = require('../services/gdprService');
const { createClient } = require('@supabase/supabase-js');

// Import PDF generation modules with error handling
let fetchAllData, generatePDF, sendEmails;
try {
  fetchAllData = require('../../lib/data/dataFetcher').fetchAllData;
  generatePDF = require('../../lib/generators/pdfGenerator').generatePDF;
  sendEmails = require('../../lib/generators/emailService').sendEmails;
} catch (error) {
  logger.warn('PDF generation modules not found - PDF features will be disabled', error.message);
}

// Import Adobe PDF Form Filler Service
const adobePdfFormFillerService = require('../services/adobePdfFormFillerService');

// Initialize Supabase client
let supabase = null;
if (config.supabase.url && config.supabase.serviceKey) {
  supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Store completed form
 */
async function storeCompletedForm(createUserId, pdfBuffer, allData) {
  try {
    const pdfBase64 = pdfBuffer.toString('base64');
    const fileName = `completed_forms/${createUserId}/report_${Date.now()}.pdf`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('incident-images-secure')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    let pdfUrl = null;
    if (storageData && !storageError) {
      const { data: urlData } = await supabase.storage
        .from('incident-images-secure')
        .createSignedUrl(fileName, 31536000);

      if (urlData) {
        pdfUrl = urlData.signedUrl;
      }
    }

    const { data, error } = await supabase
      .from('completed_incident_forms')
      .insert({
        create_user_id: createUserId,
        form_data: allData,
        pdf_base64: pdfBase64.substring(0, 1000000),
        pdf_url: pdfUrl,
        generated_at: new Date().toISOString(),
        sent_to_user: false,
        sent_to_accounts: false,
        email_status: {}
      })
      .select()
      .single();

    if (error) {
      logger.error('Error storing completed form', error);
    }

    return data || { id: `temp-${Date.now()}` };
  } catch (error) {
    logger.error('Error in storeCompletedForm', error);
    return { id: `error-${Date.now()}` };
  }
}

/**
 * Generate user PDF (shared function)
 */
async function generateUserPDF(create_user_id, source = 'direct') {
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

  // Try to use Adobe PDF Form Filler first (better quality, preserves legal structure)
  let pdfBuffer;
  if (adobePdfFormFillerService.isReady()) {
    logger.info('📄 Using Adobe PDF Form Filler Service (high quality)');
    try {
      pdfBuffer = await adobePdfFormFillerService.fillPdfForm(allData);

      // Optionally compress the PDF to save storage space
      pdfBuffer = await adobePdfFormFillerService.compressPdf(pdfBuffer, 'MEDIUM');

      logger.success('✅ Adobe PDF form filled and compressed successfully');
    } catch (adobeError) {
      logger.error('Adobe PDF filling failed, falling back to legacy method:', adobeError);
      pdfBuffer = await generatePDF(allData);
    }
  } else {
    logger.info('📄 Using legacy PDF generation method');
    pdfBuffer = await generatePDF(allData);
  }

  const storedForm = await storeCompletedForm(create_user_id, pdfBuffer, allData);
  const emailResult = await sendEmails(allData.user.driver_email, pdfBuffer, create_user_id);

  if (storedForm.id && !storedForm.id.startsWith('temp-') && !storedForm.id.startsWith('error-')) {
    await supabase
      .from('completed_incident_forms')
      .update({
        sent_to_user: emailResult.success,
        sent_to_accounts: emailResult.success,
        email_status: emailResult
      })
      .eq('id', storedForm.id);
  }

  logger.success('PDF generation process completed');

  return {
    success: true,
    form_id: storedForm.id,
    create_user_id,
    email_sent: emailResult.success,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate PDF
 * POST /api/pdf/generate
 */
async function generatePdf(req, res) {
  const { create_user_id } = req.body;

  if (!create_user_id) {
    return sendError(res, 400, 'Missing create_user_id', 'MISSING_USER_ID');
  }

  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  if (!fetchAllData || !generatePDF || !sendEmails) {
    return sendError(res, 503, 'PDF generation modules not available', 'PDF_UNAVAILABLE');
  }

  try {
    const result = await generateUserPDF(create_user_id, 'direct');
    res.json(result);
  } catch (error) {
    logger.error('Error in PDF generation', error);
    sendError(res, 500, error.message, 'PDF_GENERATION_FAILED');
  }
}

/**
 * PDF status
 * GET /api/pdf/status/:userId
 */
async function getPdfStatus(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('completed_incident_forms')
      .select('id, generated_at, sent_to_user, email_status')
      .eq('create_user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.json({
        status: 'not_found',
        message: 'No PDF generation found for this user',
        requestId: req.requestId
      });
    }

    res.json({
      status: 'completed',
      generated_at: data.generated_at,
      sent: data.sent_to_user,
      email_status: data.email_status,
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error checking PDF status', error);
    sendError(res, 500, 'Failed to check status', 'STATUS_CHECK_FAILED');
  }
}

/**
 * Download PDF
 * GET /api/pdf/download/:userId
 */
async function downloadPdf(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('completed_incident_forms')
      .select('pdf_url, pdf_base64')
      .eq('create_user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return sendError(res, 404, 'PDF not found', 'PDF_NOT_FOUND');
    }

    await gdprService.logActivity(userId, 'PDF_DOWNLOADED', {}, req);

    if (data.pdf_url) {
      res.redirect(data.pdf_url);
    } else if (data.pdf_base64) {
      const buffer = Buffer.from(data.pdf_base64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report_${userId}.pdf"`);
      res.send(buffer);
    } else {
      sendError(res, 404, 'PDF data not available', 'PDF_DATA_MISSING');
    }
  } catch (error) {
    logger.error('Error downloading PDF', error);
    sendError(res, 500, 'Failed to download PDF', 'DOWNLOAD_FAILED');
  }
}

module.exports = {
  generatePdf,
  getPdfStatus,
  downloadPdf
};
