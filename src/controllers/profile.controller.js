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

module.exports = {
  getUserProfile,
  updateUserProfile
};
