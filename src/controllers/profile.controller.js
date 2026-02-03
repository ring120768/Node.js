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

/**
 * Log profile field change to audit trail (GDPR compliance)
 * @param {string} userId - User ID
 * @param {string} fieldName - Field that was changed
 * @param {string} oldValue - Previous value
 * @param {string} newValue - New value
 * @param {object} req - Express request (for IP & user agent)
 */
async function logProfileChange(userId, fieldName, oldValue, newValue, req) {
  try {
    const { error } = await supabase
      .from('profile_edit_audit')
      .insert({
        user_id: userId,
        field_name: fieldName,
        old_value: oldValue || null,
        new_value: newValue || null,
        ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    if (error) {
      logger.error('Failed to log profile change:', error);
      // Don't throw - audit logging failure shouldn't block the update
    }
  } catch (error) {
    logger.error('Error in logProfileChange:', error);
  }
}

/**
 * Update contact details (Phase 1: Safe editable fields)
 * PATCH /api/profile/contact-details
 *
 * Editable fields:
 * - Address (all fields)
 * - Mobile number
 * - Emergency contact name & phone
 * - Recovery email
 */
async function updateContactDetails(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Extract updatable fields from request body (using form field names)
    const {
      street_address,
      street_address_optional,
      town,
      postcode,
      mobile_number,
      emergency_contact_name,
      emergency_contact_phone,
      recovery_email
    } = req.body;

    // Validation
    const updates = {};
    const errors = [];

    // Address validation (map form fields to DB columns)
    if (street_address !== undefined) {
      if (street_address.trim().length === 0) {
        errors.push('Address line 1 cannot be empty');
      } else if (street_address.length > 200) {
        errors.push('Address line 1 is too long');
      } else {
        updates.street_address = street_address.trim();
      }
    }

    if (street_address_optional !== undefined) {
      updates.street_address_optional = street_address_optional.trim() || null;
    }

    if (town !== undefined) {
      if (town.trim().length === 0) {
        errors.push('Town cannot be empty');
      } else if (town.length > 100) {
        errors.push('Town name is too long');
      } else {
        updates.town = town.trim();
      }
    }

    if (postcode !== undefined) {
      const postcodePattern = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
      if (!postcodePattern.test(postcode.trim())) {
        errors.push('Invalid UK postcode format');
      } else {
        updates.postcode = postcode.trim().toUpperCase();
      }
    }

    // Mobile number validation (UK format) - DB column is 'mobile'
    if (mobile_number !== undefined) {
      const mobilePattern = /^(\+44|0)?[1-9]\d{9,10}$/;
      const cleaned = mobile_number.replace(/\s/g, '');
      if (!mobilePattern.test(cleaned)) {
        errors.push('Invalid UK mobile number format');
      } else {
        // Normalize to +44 format
        let normalized = cleaned;
        if (normalized.startsWith('0')) {
          normalized = '+44' + normalized.substring(1);
        } else if (!normalized.startsWith('+44')) {
          normalized = '+44' + normalized;
        }
        updates.mobile = normalized; // DB column is 'mobile'
      }
    }

    // Recovery email validation - DB column is 'recovery_breakdown_email'
    if (recovery_email !== undefined) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (recovery_email.trim().length > 0 && !emailPattern.test(recovery_email)) {
        errors.push('Invalid recovery email format');
      } else {
        updates.recovery_breakdown_email = recovery_email.trim().toLowerCase() || null;
      }
    }

    // Emergency contact - stored as pipe-delimited string: "Name | Phone | Email | Company"
    // Need to fetch current value and update only if both fields provided
    if (emergency_contact_name !== undefined || emergency_contact_phone !== undefined) {
      // Fetch current emergency contact to preserve parts not being updated
      const { data: currentData } = await supabase
        .from('user_signup')
        .select('emergency_contact')
        .eq('create_user_id', userId)
        .maybeSingle();

      const currentParts = (currentData?.emergency_contact || '').split('|').map(s => s.trim());
      const [name, phone, email, company] = currentParts;

      // Validate and update name
      let newName = name;
      if (emergency_contact_name !== undefined) {
        if (emergency_contact_name.trim().length === 0) {
          errors.push('Emergency contact name cannot be empty');
        } else if (emergency_contact_name.length > 100) {
          errors.push('Emergency contact name is too long');
        } else {
          newName = emergency_contact_name.trim();
        }
      }

      // Validate and update phone
      let newPhone = phone;
      if (emergency_contact_phone !== undefined) {
        const phonePattern = /^(\+44|0)?[1-9]\d{9,10}$/;
        const cleaned = emergency_contact_phone.replace(/\s/g, '');
        if (!phonePattern.test(cleaned)) {
          errors.push('Invalid emergency contact phone format');
        } else {
          let normalized = cleaned;
          if (normalized.startsWith('0')) {
            normalized = '+44' + normalized.substring(1);
          } else if (!normalized.startsWith('+44')) {
            normalized = '+44' + normalized;
          }
          newPhone = normalized;
        }
      }

      // Only update if validations passed
      if (errors.length === 0) {
        updates.emergency_contact = `${newName} | ${newPhone} | ${email || ''} | ${company || ''}`;
      }
    }

    // Return validation errors
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Check if any updates provided
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Fetch current values for audit logging
    const { data: currentData, error: fetchError } = await supabase
      .from('user_signup')
      .select('street_address, street_address_optional, town, postcode, mobile, emergency_contact, recovery_breakdown_email')
      .eq('create_user_id', userId)
      .maybeSingle();

    if (fetchError) {
      logger.error('Error fetching current profile:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch current profile' });
    }

    // Update user_signup table
    const { error: updateError } = await supabase
      .from('user_signup')
      .update(updates)
      .eq('create_user_id', userId);

    if (updateError) {
      logger.error('Error updating profile:', updateError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    // Log all changes to audit trail
    const auditPromises = [];
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = currentData?.[field];
      if (oldValue !== newValue) {
        auditPromises.push(
          logProfileChange(userId, field, String(oldValue || ''), String(newValue || ''), req)
        );
      }
    }

    await Promise.all(auditPromises);

    logger.info('Profile contact details updated', {
      userId,
      fields: Object.keys(updates)
    });

    return res.status(200).json({
      success: true,
      message: 'Contact details updated successfully',
      updated_fields: Object.keys(updates)
    });

  } catch (error) {
    logger.error('Error in updateContactDetails:', error);
    return res.status(500).json({ error: 'Server error updating profile' });
  }
}

/**
 * Get current contact details (for displaying in edit forms)
 * GET /api/profile/contact-details
 */
async function getContactDetails(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data, error } = await supabase
      .from('user_signup')
      .select('street_address, street_address_optional, town, postcode, mobile, emergency_contact, recovery_breakdown_email')
      .eq('create_user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching contact details:', error);
      return res.status(500).json({ error: 'Failed to fetch contact details' });
    }

    // Parse emergency contact (pipe-delimited: "Name | Phone | Email | Company")
    const emergencyParts = (data?.emergency_contact || '').split('|').map(s => s.trim());

    // Return empty values if user hasn't filled out profile yet
    return res.status(200).json({
      success: true,
      data: {
        street_address: data?.street_address || '',
        street_address_optional: data?.street_address_optional || '',
        town: data?.town || '',
        postcode: data?.postcode || '',
        mobile_number: data?.mobile || '',
        emergency_contact_name: emergencyParts[0] || '',
        emergency_contact_phone: emergencyParts[1] || '',
        recovery_email: data?.recovery_breakdown_email || ''
      }
    });

  } catch (error) {
    logger.error('Error in getContactDetails:', error);
    return res.status(500).json({ error: 'Server error fetching profile' });
  }
}

/**
 * Get vehicle details (Phase 2: Vehicle editing)
 * GET /api/profile/vehicle-details
 */
async function getVehicleDetails(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Query user_signup for vehicle data (columns are prefixed with vehicle_)
    const { data, error } = await supabase
      .from('user_signup')
      .select('car_registration_number, vehicle_make, vehicle_model, vehicle_colour')
      .eq('create_user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching vehicle details:', error);
      return res.status(500).json({ error: 'Failed to fetch vehicle details' });
    }

    // Return with simple field names (to match form submission names)
    return res.status(200).json({
      success: true,
      data: {
        car_registration_number: data?.car_registration_number || '',
        make: data?.vehicle_make || '',
        model: data?.vehicle_model || '',
        colour: data?.vehicle_colour || '',
        year_of_manufacture: null, // Not stored in user_signup (in dvla_vehicle_info_new)
        fuel_type: '' // Not stored in user_signup (in dvla_vehicle_info_new)
      }
    });

  } catch (error) {
    logger.error('Error in getVehicleDetails:', error);
    return res.status(500).json({ error: 'Server error fetching vehicle details' });
  }
}

/**
 * Update vehicle details (Phase 2: Vehicle editing)
 * PATCH /api/profile/vehicle-details
 *
 * Editable fields:
 * - Car registration (with optional DVLA lookup)
 * - Make, model, colour, year, fuel type
 */
async function updateVehicleDetails(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      car_registration_number,
      make,
      model,
      colour,
      year_of_manufacture,
      fuel_type
    } = req.body;

    const updates = {};
    const errors = [];

    // Car registration validation (UK format)
    if (car_registration_number !== undefined) {
      const regPattern = /^[A-Z]{2}[0-9]{2}\s?[A-Z]{3}$|^[A-Z][0-9]{1,3}[A-Z]{3}$|^[A-Z]{3}[0-9]{1,3}[A-Z]$|^[0-9]{1,4}[A-Z]{1,2}$|^[0-9]{1,3}[A-Z]{1,3}$|^[A-Z]{1,2}[0-9]{1,4}$|^[A-Z]{1,3}[0-9]{1,3}$/i;
      if (car_registration_number.trim().length > 0 && !regPattern.test(car_registration_number.trim())) {
        errors.push('Invalid UK vehicle registration format');
      } else {
        updates.car_registration_number = car_registration_number.trim().toUpperCase();
      }
    }

    // Simple text fields (map form names to DB columns with vehicle_ prefix)
    if (make !== undefined) updates.vehicle_make = make.trim() || null;
    if (model !== undefined) updates.vehicle_model = model.trim() || null;
    if (colour !== undefined) updates.vehicle_colour = colour.trim() || null;

    // Note: year_of_manufacture and fuel_type are in dvla_vehicle_info_new table,
    // not in user_signup, so we ignore them for now

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Fetch current values for audit
    const { data: currentData, error: fetchError } = await supabase
      .from('user_signup')
      .select('car_registration_number, vehicle_make, vehicle_model, vehicle_colour')
      .eq('create_user_id', userId)
      .maybeSingle();

    if (fetchError) {
      logger.error('Error fetching current vehicle:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch current vehicle' });
    }

    // Update user_signup table
    const { error: updateError } = await supabase
      .from('user_signup')
      .update(updates)
      .eq('create_user_id', userId);

    if (updateError) {
      logger.error('Error updating vehicle:', updateError);
      return res.status(500).json({ error: 'Failed to update vehicle' });
    }

    // Log changes to audit trail
    const auditPromises = [];
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = currentData[field];
      if (oldValue !== newValue) {
        auditPromises.push(
          logProfileChange(userId, field, String(oldValue || ''), String(newValue || ''), req)
        );
      }
    }

    await Promise.all(auditPromises);

    logger.info('Vehicle details updated', { userId, fields: Object.keys(updates) });

    return res.status(200).json({
      success: true,
      message: 'Vehicle details updated successfully',
      updated_fields: Object.keys(updates)
    });

  } catch (error) {
    logger.error('Error in updateVehicleDetails:', error);
    return res.status(500).json({ error: 'Server error updating vehicle' });
  }
}

/**
 * Get insurance details (Phase 2: Insurance editing)
 * GET /api/profile/insurance-details
 */
async function getInsuranceDetails(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data, error } = await supabase
      .from('user_signup')
      .select('insurance_company, policy_number, policy_holder, cover_type')
      .eq('create_user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching insurance details:', error);
      return res.status(500).json({ error: 'Failed to fetch insurance details' });
    }

    // Return empty values if user hasn't filled out profile yet
    return res.status(200).json({
      success: true,
      data: {
        insurance_company: data?.insurance_company || '',
        policy_number: data?.policy_number || '',
        policy_holder: data?.policy_holder || '',
        cover_type: data?.cover_type || ''
      }
    });

  } catch (error) {
    logger.error('Error in getInsuranceDetails:', error);
    return res.status(500).json({ error: 'Server error fetching insurance' });
  }
}

/**
 * Update insurance details (Phase 2: Insurance editing)
 * PATCH /api/profile/insurance-details
 */
async function updateInsuranceDetails(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      insurance_company,
      policy_number,
      policy_holder,
      cover_type
    } = req.body;

    const updates = {};
    const errors = [];

    if (insurance_company !== undefined) {
      updates.insurance_company = insurance_company.trim() || null;
    }

    if (policy_number !== undefined) {
      updates.policy_number = policy_number.trim().toUpperCase() || null;
    }

    if (policy_holder !== undefined) {
      updates.policy_holder = policy_holder.trim() || null;
    }

    if (cover_type !== undefined) {
      const validTypes = ['comprehensive', 'third_party_fire_theft', 'third_party_only'];
      if (cover_type && !validTypes.includes(cover_type)) {
        errors.push('Invalid cover type');
      } else {
        updates.cover_type = cover_type || null;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Fetch current values
    const { data: currentData, error: fetchError } = await supabase
      .from('user_signup')
      .select('insurance_company, policy_number, policy_holder, cover_type')
      .eq('create_user_id', userId)
      .single();

    if (fetchError) {
      logger.error('Error fetching current insurance:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch current insurance' });
    }

    // Update
    const { error: updateError } = await supabase
      .from('user_signup')
      .update(updates)
      .eq('create_user_id', userId);

    if (updateError) {
      logger.error('Error updating insurance:', updateError);
      return res.status(500).json({ error: 'Failed to update insurance' });
    }

    // Audit log
    const auditPromises = [];
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = currentData[field];
      if (oldValue !== newValue) {
        auditPromises.push(
          logProfileChange(userId, field, String(oldValue || ''), String(newValue || ''), req)
        );
      }
    }

    await Promise.all(auditPromises);

    logger.info('Insurance details updated', { userId, fields: Object.keys(updates) });

    return res.status(200).json({
      success: true,
      message: 'Insurance details updated successfully',
      updated_fields: Object.keys(updates)
    });

  } catch (error) {
    logger.error('Error in updateInsuranceDetails:', error);
    return res.status(500).json({ error: 'Server error updating insurance' });
  }
}

/**
 * Get driving license details (Phase 2: License editing)
 * GET /api/profile/license-details
 */
async function getLicenseDetails(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data, error } = await supabase
      .from('user_signup')
      .select('driving_license_number')
      .eq('create_user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching license details:', error);
      return res.status(500).json({ error: 'Failed to fetch license details' });
    }

    // Return empty values if user hasn't filled out profile yet
    return res.status(200).json({
      success: true,
      data: {
        driving_license_number: data?.driving_license_number || ''
      }
    });

  } catch (error) {
    logger.error('Error in getLicenseDetails:', error);
    return res.status(500).json({ error: 'Server error fetching license' });
  }
}

/**
 * Update driving license details (Phase 2: License editing)
 * PATCH /api/profile/license-details
 */
async function updateLicenseDetails(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { driving_license_number } = req.body;

    const updates = {};
    const errors = [];

    if (driving_license_number !== undefined) {
      const cleaned = driving_license_number.trim().toUpperCase().replace(/\s+/g, '');
      if (cleaned.length > 0 && cleaned.length !== 16) {
        errors.push('UK driving license number must be 16 characters');
      } else {
        updates.driving_license_number = cleaned || null;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Fetch current value
    const { data: currentData, error: fetchError } = await supabase
      .from('user_signup')
      .select('driving_license_number')
      .eq('create_user_id', userId)
      .single();

    if (fetchError) {
      logger.error('Error fetching current license:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch current license' });
    }

    // Update
    const { error: updateError } = await supabase
      .from('user_signup')
      .update(updates)
      .eq('create_user_id', userId);

    if (updateError) {
      logger.error('Error updating license:', updateError);
      return res.status(500).json({ error: 'Failed to update license' });
    }

    // Audit log
    if (currentData.driving_license_number !== updates.driving_license_number) {
      await logProfileChange(
        userId,
        'driving_license_number',
        String(currentData.driving_license_number || ''),
        String(updates.driving_license_number || ''),
        req
      );
    }

    logger.info('License details updated', { userId });

    return res.status(200).json({
      success: true,
      message: 'License details updated successfully',
      updated_fields: Object.keys(updates)
    });

  } catch (error) {
    logger.error('Error in updateLicenseDetails:', error);
    return res.status(500).json({ error: 'Server error updating license' });
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  updateFcmToken,
  sendPdfEmail,
  sendImageLinks,
  getPdfStats,
  updateContactDetails,
  getContactDetails,
  getVehicleDetails,
  updateVehicleDetails,
  getInsuranceDetails,
  updateInsuranceDetails,
  getLicenseDetails,
  updateLicenseDetails
};
