/**
 * Profile Controller - User Profile Management
 * Handles user profile updates with validation
 */

const { createClient } = require('@supabase/supabase-js');
const { isEmail, isMobilePhone, isPostalCode } = require('validator');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const { normalizeEmail } = require('../utils/emailNormalizer');
const { sendEmails, sendImageDownloadLinks } = require('../../lib/emailService');

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

/**
 * Get User Profile
 * GET /api/profile/:userId
 */
async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;

    logger.info('📋 Fetching user profile', { userId });

    const { data, error } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    if (error) {
      logger.error('❌ Failed to fetch profile:', error);
      return sendError(res, 404, 'User profile not found', 'PROFILE_NOT_FOUND');
    }

    // Return only editable fields
    const profile = {
      // Personal
      name: data.name || '',
      email: data.email || '',
      mobile_number: data.mobile_number || '',
      date_of_birth: data.date_of_birth || '',

      // Address
      street_address: data.street_address || '',
      town: data.town || '',
      postcode: data.postcode || '',
      country: data.country || 'United Kingdom',

      // Vehicle
      car_registration_number: data.car_registration_number || '',
      car_make: data.car_make || '',
      car_model: data.car_model || '',
      car_color: data.car_color || '',

      // Insurance
      insurance_company_name: data.insurance_company_name || '',
      insurance_policy_number: data.insurance_policy_number || '',

      // License
      driving_license_number: data.driving_license_number || '',
      driving_license_issue_date: data.driving_license_issue_date || '',
      driving_license_expiry_date: data.driving_license_expiry_date || ''
    };

    logger.success('✅ Profile fetched successfully');

    res.json({
      success: true,
      profile
    });

  } catch (error) {
    logger.error('💥 Profile fetch error:', error);
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR');
  }
}

/**
 * Update User Profile
 * PUT /api/profile/:userId
 */
async function updateUserProfile(req, res) {
  try {
    const { userId } = req.params;
    const updates = req.body;

    logger.info('📝 Updating user profile', { userId });

    // ========================================
    // SECURITY: VERIFY OWNERSHIP
    // ========================================
    // GDPR: Users can only update their own profile
    if (!req.user?.id) {
      logger.warn('Profile update without authentication');
      return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');
    }

    if (req.user.id !== userId) {
      logger.warn('IDOR attempt blocked in profile update', {
        authenticated: req.user.id,
        target: userId,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      return sendError(res, 403, 'Access denied: Cannot update another user\'s profile', 'FORBIDDEN');
    }

    // ========================================
    // VALIDATION
    // ========================================
    const errors = {};

    // Validate email (if provided)
    if (updates.email) {
      const normalizedEmail = normalizeEmail(updates.email);
      if (!isEmail(normalizedEmail)) {
        errors.email = 'Invalid email format';
      } else {
        updates.email = normalizedEmail; // Normalize email
      }
    }

    // Validate mobile number (if provided)
    if (updates.mobile_number && updates.mobile_number.trim() !== '') {
      if (!isMobilePhone(updates.mobile_number, 'en-GB')) {
        errors.mobile_number = 'Invalid UK mobile number';
      }
    }

    // Validate postcode (if provided)
    if (updates.postcode && updates.postcode.trim() !== '') {
      if (!isPostalCode(updates.postcode, 'GB')) {
        errors.postcode = 'Invalid UK postcode';
      }
    }

    // Validate car registration (if provided)
    if (updates.car_registration_number && updates.car_registration_number.trim() !== '') {
      // UK reg format: AA00 AAA or A0 AAA
      const ukRegex = /^[A-Z]{1,2}[0-9]{1,4}\s?[A-Z]{3}$/i;
      if (!ukRegex.test(updates.car_registration_number.replace(/\s/g, ''))) {
        errors.car_registration_number = 'Invalid UK registration format';
      } else {
        // Normalize: uppercase and format with space
        const reg = updates.car_registration_number.replace(/\s/g, '').toUpperCase();
        const match = reg.match(/^([A-Z]{1,2})([0-9]{1,4})([A-Z]{3})$/);
        if (match) {
          updates.car_registration_number = `${match[1]}${match[2]} ${match[3]}`;
        }
      }
    }

    // If validation errors, return them
    if (Object.keys(errors).length > 0) {
      logger.warn('⚠️ Validation errors:', errors);
      return res.status(400).json({
        success: false,
        errors
      });
    }

    // ========================================
    // UPDATE DATABASE
    // ========================================
    const { data, error } = await supabase
      .from('user_signup')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('❌ Failed to update profile:', error);
      return sendError(res, 500, 'Failed to update profile', 'UPDATE_FAILED');
    }

    logger.success('✅ Profile updated successfully', { userId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: data
    });

  } catch (error) {
    logger.error('💥 Profile update error:', error);
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR');
  }
}

/**
 * Update FCM Token
 * POST /api/profile/update-fcm-token
 * Saves device FCM token for push notifications
 */
async function updateFcmToken(req, res) {
  try {
    const { fcmToken } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 401, 'User not authenticated', 'UNAUTHORIZED');
    }

    if (!fcmToken || typeof fcmToken !== 'string') {
      return sendError(res, 400, 'Valid FCM token required', 'INVALID_TOKEN');
    }

    logger.info('📱 Updating FCM token', { userId, tokenPreview: fcmToken.substring(0, 20) + '...' });

    const { error } = await supabase
      .from('user_signup')
      .update({ fcm_token: fcmToken })
      .eq('create_user_id', userId);

    if (error) {
      logger.error('❌ Failed to update FCM token:', error);
      return sendError(res, 500, 'Failed to update notification token', 'UPDATE_FAILED');
    }

    logger.info('✅ FCM token updated successfully', { userId });

    return res.status(200).json({
      success: true,
      message: 'Notification token updated successfully'
    });

  } catch (error) {
    logger.error('❌ Error updating FCM token:', error);
    return sendError(res, 500, 'Failed to update notification token', 'INTERNAL_ERROR');
  }
}

/**
 * Send PDF Report via Email
 * POST /api/profile/send-pdf-email/:userId
 * Fetches user's completed PDF and resends via email
 */
async function sendPdfEmail(req, res) {
  try {
    const { userId } = req.params;

    logger.info('📧 User requesting PDF email resend', { userId });

    // ========================================
    // SECURITY: VERIFY OWNERSHIP
    // ========================================
    if (!req.user?.id) {
      logger.warn('PDF email request without authentication');
      return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');
    }

    if (req.user.id !== userId) {
      logger.warn('IDOR attempt blocked in PDF email', {
        authenticated: req.user.id,
        target: userId,
        ip: req.ip
      });
      return sendError(res, 403, 'Access denied: Cannot access another user\'s PDF', 'FORBIDDEN');
    }

    // ========================================
    // FETCH USER EMAIL AND PDF RECORD
    // ========================================
    const [userResult, pdfResult] = await Promise.all([
      supabase
        .from('user_signup')
        .select('email, name')
        .eq('create_user_id', userId)
        .single(),
      supabase
        .from('completed_incident_forms')
        .select('pdf_storage_path, pdf_base64')
        .eq('create_user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()
    ]);

    if (userResult.error || !userResult.data) {
      logger.error('❌ User not found', { userId });
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    if (pdfResult.error || !pdfResult.data) {
      logger.error('❌ PDF not found for user', { userId });
      return sendError(res, 404, 'No completed PDF report found', 'PDF_NOT_FOUND');
    }

    const userEmail = userResult.data.email;
    const pdfRecord = pdfResult.data;

    // ========================================
    // DOWNLOAD PDF FROM STORAGE
    // ========================================
    let pdfBuffer;

    if (pdfRecord.pdf_storage_path) {
      logger.info('📥 Downloading PDF from storage', { path: pdfRecord.pdf_storage_path });

      const { data: pdfData, error: downloadError } = await supabase.storage
        .from('generated_reports')
        .download(pdfRecord.pdf_storage_path);

      if (downloadError || !pdfData) {
        logger.error('❌ Failed to download PDF from storage', { error: downloadError });
        // Fallback to base64 if available
        if (pdfRecord.pdf_base64) {
          logger.info('📄 Using base64 fallback');
          pdfBuffer = Buffer.from(pdfRecord.pdf_base64, 'base64');
        } else {
          return sendError(res, 500, 'Failed to retrieve PDF', 'PDF_DOWNLOAD_FAILED');
        }
      } else {
        pdfBuffer = Buffer.from(await pdfData.arrayBuffer());
      }
    } else if (pdfRecord.pdf_base64) {
      logger.info('📄 Using base64 PDF');
      pdfBuffer = Buffer.from(pdfRecord.pdf_base64, 'base64');
    } else {
      logger.error('❌ No PDF data available');
      return sendError(res, 404, 'PDF data not available', 'PDF_DATA_MISSING');
    }

    // ========================================
    // SEND EMAIL
    // ========================================
    logger.info('📨 Sending PDF via email', { email: userEmail });

    const emailResult = await sendEmails(userEmail, pdfBuffer, userId);

    if (!emailResult.success) {
      logger.error('❌ Failed to send PDF email', { error: emailResult.error });
      return sendError(res, 500, 'Failed to send email: ' + emailResult.error, 'EMAIL_SEND_FAILED');
    }

    logger.success('✅ PDF email sent successfully', {
      userId,
      userEmailId: emailResult.userEmailId
    });

    return res.json({
      success: true,
      message: 'PDF report has been sent to your email',
      emailIds: {
        user: emailResult.userEmailId,
        accounts: emailResult.accountsEmailId
      }
    });

  } catch (error) {
    logger.error('💥 Error sending PDF email:', error);
    return sendError(res, 500, 'Failed to send PDF email', 'INTERNAL_ERROR');
  }
}

/**
 * Send Image Download Links via Email
 * POST /api/profile/send-image-links/:userId
 * Sends email with download links for all user's incident images
 *
 * Body: { incidentId?: string } - Optional incident ID to filter images
 */
async function sendImageLinks(req, res) {
  try {
    const { userId } = req.params;
    const { incidentId } = req.body; // Optional incident filter

    logger.info('📧 User requesting image links email', {
      userId,
      incidentId: incidentId || 'all images'
    });

    // ========================================
    // SECURITY: VERIFY OWNERSHIP
    // ========================================
    if (!req.user?.id) {
      logger.warn('Image links request without authentication');
      return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');
    }

    if (req.user.id !== userId) {
      logger.warn('IDOR attempt blocked in image links', {
        authenticated: req.user.id,
        target: userId,
        ip: req.ip
      });
      return sendError(res, 403, 'Access denied: Cannot access another user\'s images', 'FORBIDDEN');
    }

    // ========================================
    // FETCH USER DATA
    // ========================================
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('email, name')
      .eq('create_user_id', userId)
      .single();

    if (userError || !userData) {
      logger.error('❌ User not found', { userId });
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    const userEmail = userData.email;
    const userName = userData.name || 'User';

    // ========================================
    // SEND IMAGE LINKS EMAIL (with optional incident filter)
    // ========================================
    logger.info('📨 Sending image links email', {
      email: userEmail,
      scope: incidentId ? `incident ${incidentId} + signup docs` : 'all images'
    });

    const result = await sendImageDownloadLinks(supabase, userId, userEmail, userName, incidentId);

    if (!result.success) {
      logger.error('❌ Failed to send image links email', { error: result.error });
      return sendError(res, 500, 'Failed to send email: ' + result.error, 'EMAIL_SEND_FAILED');
    }

    logger.success('✅ Image links email sent successfully', {
      userId,
      imageCount: result.imageCount
    });

    return res.json({
      success: true,
      message: `Email sent with ${result.imageCount} image download link(s)`,
      imageCount: result.imageCount
    });

  } catch (error) {
    logger.error('💥 Error sending image links email:', error);
    return sendError(res, 500, 'Failed to send image links email', 'INTERNAL_ERROR');
  }
}

/**
 * Get PDF Statistics
 * GET /api/profile/pdf-stats/:userId
 * Returns count of completed PDFs for the user
 */
async function getPdfStats(req, res) {
  try {
    const { userId } = req.params;

    logger.info('📊 Fetching PDF stats', { userId });

    // ========================================
    // SECURITY: VERIFY OWNERSHIP
    // ========================================
    if (!req.user?.id) {
      logger.warn('PDF stats request without authentication');
      return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');
    }

    if (req.user.id !== userId) {
      logger.warn('IDOR attempt blocked in PDF stats', {
        authenticated: req.user.id,
        target: userId,
        ip: req.ip
      });
      return sendError(res, 403, 'Access denied: Cannot access another user\'s stats', 'FORBIDDEN');
    }

    // ========================================
    // COUNT COMPLETED PDFs
    // ========================================
    const { count, error } = await supabase
      .from('completed_incident_forms')
      .select('*', { count: 'exact', head: true })
      .eq('create_user_id', userId);

    if (error) {
      logger.error('❌ Failed to count PDFs:', error);
      return sendError(res, 500, 'Failed to fetch PDF stats', 'STATS_FETCH_FAILED');
    }

    logger.success('✅ PDF stats retrieved', { userId, count });

    return res.json({
      success: true,
      stats: {
        completed_pdfs: count || 0
      }
    });

  } catch (error) {
    logger.error('💥 Error fetching PDF stats:', error);
    return sendError(res, 500, 'Failed to fetch PDF stats', 'INTERNAL_ERROR');
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  updateFcmToken,
  sendPdfEmail,
  sendImageLinks,
  getPdfStats
};
