/**
 * Signup webhook - Typeform completion
 * POST /api/webhooks/signup
 * 
 * This NOW CREATES the user_signup record with detailed profile data
 * Auth user already exists from signup-auth.html
 */
async function handleSignup(req, res) {
  // Use centralized admin client for privileged operations
  const { supabaseAdmin } = require('../../lib/supabaseAdmin');
  const { sendError, sendSuccess } = require('../utils/response');
  const logger = require('../utils/logger');

  try {
    logger.info('📥 Typeform signup webhook received');
    logger.info('🔍 Request headers:', {
      'x-api-key': req.get('X-Api-Key') ? '***PRESENT***' : 'MISSING',
      'authorization': req.get('Authorization') ? '***PRESENT***' : 'MISSING',
      'content-type': req.get('Content-Type'),
      'user-agent': req.get('User-Agent')
    });
    logger.info('📋 Request body keys:', Object.keys(req.body || {}));
    logger.info('📋 Full request body:', JSON.stringify(req.body, null, 2));

    const webhookData = req.body;

    // Validate that we have data
    if (!webhookData || Object.keys(webhookData).length === 0) {
      logger.error('❌ Empty webhook payload received');
      return sendError(res, 400, 'Empty webhook payload', 'EMPTY_PAYLOAD');
    }

    // Extract exact hidden fields from Typeform
    const { 
      auth_user_id,
      create_user_id,
      email,
      product_id,
      auth_code,
      first_name,
      last_name,
      phone,
      address,
      postcode,
      date_of_birth,
      emergency_contact_name,
      emergency_contact_number,
      vehicle_registration,
      vehicle_make,
      vehicle_model,
      vehicle_colour,
      insurance_company,
      insurance_policy_number,
      driving_license_picture,
      vehicle_picture_front,
      vehicle_picture_driver_side,
      vehicle_picture_passenger_side,
      vehicle_picture_back
    } = webhookData;

    logger.info('📋 Typeform data extracted', {
      auth_user_id,
      create_user_id,
      email,
      hasAuthCode: !!auth_code,
      product_id,
      hasName: !!(first_name || last_name),
      hasPhone: !!phone
    });

    // Validate required fields
    const missingFields = [];
    if (!auth_user_id) missingFields.push('auth_user_id');
    if (!email) missingFields.push('email');
    if (!auth_code) missingFields.push('auth_code');

    if (missingFields.length > 0) {
      logger.error('❌ Missing required fields:', missingFields);
      return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`, 'MISSING_REQUIRED_FIELDS');
    }

    // Check Supabase connection first
    if (!supabaseAdmin) {
      logger.error('❌ Supabase admin client not available');
      return sendError(res, 503, 'Database service unavailable', 'DB_UNAVAILABLE');
    }

    // Validate nonce (auth_code)
    try {
      logger.info('🔍 Looking up user:', auth_user_id);
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(auth_user_id);
      
      if (userError) {
        logger.error('❌ User lookup error:', {
          error: userError.message,
          code: userError.code,
          auth_user_id
        });
        return sendError(res, 404, `User lookup failed: ${userError.message}`, 'USER_LOOKUP_ERROR');
      }

      if (!user) {
        logger.error('❌ User not found in Auth:', auth_user_id);
        return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
      }

      logger.info('✅ User found:', {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      });

      const metadata = user.user_metadata || {};
      const storedNonce = metadata.temp_nonce;
      const nonceExpires = metadata.temp_nonce_expires;

      if (!storedNonce || storedNonce !== auth_code) {
        logger.warn('❌ Invalid auth code', { auth_user_id });
        return sendError(res, 401, 'Invalid auth code', 'INVALID_AUTH_CODE');
      }

      if (!nonceExpires || Date.now() > nonceExpires) {
        logger.warn('❌ Expired auth code', { auth_user_id });
        return sendError(res, 401, 'Expired auth code', 'EXPIRED_AUTH_CODE');
      }

      logger.success('✅ Auth code validated', { auth_user_id });

      // Clear the nonce after successful validation
      await supabaseAdmin.auth.admin.updateUserById(auth_user_id, {
        user_metadata: {
          ...metadata,
          temp_nonce: null,
          temp_nonce_expires: null
        }
      });

    } catch (nonceError) {
      logger.error('💥 Nonce validation error:', nonceError);
      return sendError(res, 500, 'Auth validation failed', 'NONCE_VALIDATION_ERROR');
    }

    // Log GDPR activity
    await gdprService.logActivity(auth_user_id, 'TYPEFORM_PROFILE_COMPLETION', {
      source: 'typeform_webhook',
      has_images: !!(driving_license_picture || vehicle_picture_front)
    }, req);

    // ========================================
    // CREATE user_signup record (not update!)
    // ========================================
    const userData = {
      uid: auth_user_id,
      create_user_id: create_user_id || auth_user_id, // Legacy binder for PDF only
      auth_user_id: auth_user_id, // ✅ Required for RLS policy
      email: email,
      first_name: first_name || null,
      last_name: last_name || null,
      phone: phone || null,
      address: address || null,
      postcode: postcode || null,
      date_of_birth: date_of_birth || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_number: emergency_contact_number || null,
      vehicle_registration: vehicle_registration || null,
      vehicle_make: vehicle_make || null,
      vehicle_model: vehicle_model || null,
      vehicle_colour: vehicle_colour || null,
      insurance_company: insurance_company || null,
      insurance_policy_number: insurance_policy_number || null,
      product_id: product_id || 'car_crash_lawyer_ai',
      typeform_completed: true,
      typeform_completion_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    logger.info('💾 Creating user_signup record', { auth_user_id });

    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from('user_signup')
      .insert(userData)
      .select()
      .single();

    if (insertError) {
      logger.error('❌ Failed to create user_signup record:', {
        error: insertError.message,
        code: insertError.code,
        auth_user_id
      });
      return sendError(res, 500, 'Failed to save profile data', 'DB_ERROR');
    }

    logger.success('✅ user_signup record created', { auth_user_id });

    // ========================================
    // UPDATE Auth metadata to mark Typeform as complete
    // ========================================
    try {
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, {
        user_metadata: {
          typeform_completed: true,
          typeform_completion_date: new Date().toISOString(),
          account_status: 'active',
          profile_complete: true
        }
      });

      if (metadataError) {
        logger.warn('⚠️ Failed to update Auth metadata (non-critical):', metadataError.message);
      } else {
        logger.success('✅ Auth metadata updated');
      }
    } catch (metaErr) {
      logger.warn('⚠️ Auth metadata update error (non-critical)');
    }

    // ========================================
    // PROCESS IMAGES (if imageProcessor available)
    // ========================================
    if (this.imageProcessor && (driving_license_picture || vehicle_picture_front)) {
      logger.info('🖼️ Processing uploaded images...');

      try {
        const imageProcessingData = {
          ...webhookData,
          create_user_id: auth_user_id
        };

        const result = await this.imageProcessor.processSignupImages(imageProcessingData);

        logger.success('✅ Images processed', {
          auth_user_id,
          processedCount: result?.processedImages?.length || 0
        });
      } catch (imageError) {
        logger.error('⚠️ Image processing failed (non-critical):', imageError.message);
      }
    }

    // ========================================
    // SUCCESS RESPONSE
    // ========================================
    logger.success('🎉 Typeform webhook completed successfully', {
      auth_user_id,
      profile_id: insertedUser.id,
      email
    });

    return sendSuccess(res, {
      message: 'Profile completed successfully',
      user_id: auth_user_id,
      profile_id: insertedUser.id,
      email: email
    });

  } catch (error) {
    logger.error('💥 Typeform webhook error:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      headers: {
        'x-api-key': req.get('X-Api-Key') ? 'PRESENT' : 'MISSING',
        'content-type': req.get('Content-Type')
      }
    });
    
    // Provide more specific error messages
    let errorMessage = 'Webhook processing failed';
    let errorCode = 'WEBHOOK_ERROR';

    if (error.message.includes('auth')) {
      errorMessage = 'Authentication validation failed';
      errorCode = 'AUTH_ERROR';
    } else if (error.message.includes('database') || error.message.includes('supabase')) {
      errorMessage = 'Database operation failed';
      errorCode = 'DB_ERROR';
    } else if (error.message.includes('validation')) {
      errorMessage = 'Data validation failed';
      errorCode = 'VALIDATION_ERROR';
    }

    return sendError(res, 500, errorMessage, errorCode);
  }
}

/**
 * Handle incident report webhook (placeholder)
 */
async function handleIncidentReport(req, res) {
  const logger = require('../utils/logger');
  const { sendError } = require('../utils/response');
  
  try {
    logger.info('📥 Incident report webhook received');
    
    // Placeholder implementation
    res.status(200).json({
      success: true,
      message: 'Incident report webhook received'
    });
    
  } catch (error) {
    logger.error('💥 Incident report webhook error:', error);
    sendError(res, 500, error.message, 'WEBHOOK_ERROR');
  }
}

/**
 * Handle PDF generation webhook (placeholder)
 */
async function handleGeneratePdf(req, res) {
  const logger = require('../utils/logger');
  const { sendError } = require('../utils/response');
  
  try {
    logger.info('📥 PDF generation webhook received');
    
    // Placeholder implementation
    res.status(200).json({
      success: true,
      message: 'PDF generation webhook received'
    });
    
  } catch (error) {
    logger.error('💥 PDF generation webhook error:', error);
    sendError(res, 500, error.message, 'WEBHOOK_ERROR');
  }
}

/**
 * Test webhook endpoint for debugging
 * POST /api/webhooks/test
 */
async function handleWebhookTest(req, res) {
  const logger = require('../utils/logger');
  const { sendSuccess } = require('../utils/response');
  
  try {
    logger.info('🧪 Webhook test endpoint called');
    logger.info('📋 Headers received:', req.headers);
    logger.info('📋 Body received:', req.body);
    
    return sendSuccess(res, {
      message: 'Webhook test successful',
      receivedHeaders: Object.keys(req.headers),
      receivedBody: req.body,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('💥 Webhook test error:', error);
    return sendError(res, 500, error.message, 'TEST_ERROR');
  }
}

module.exports = {
  handleSignup,
  handleIncidentReport,
  handleGeneratePdf,
  handleWebhookTest
};