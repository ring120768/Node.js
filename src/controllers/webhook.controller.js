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

  try {
    logger.info('📥 Typeform signup webhook received');

    const webhookData = req.body;

    // Extract fields from Typeform
    const { 
      user_id,
      email,
      auth_code,
      product_id,
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
      user_id,
      email,
      hasAuthCode: !!auth_code,
      product_id
    });

    if (!user_id) {
      return sendError(res, 400, 'Missing user_id', 'MISSING_USER_ID');
    }

    if (!email || !auth_code) {
      return sendError(res, 400, 'Missing authentication data', 'MISSING_AUTH');
    }

    // TODO: VERIFY auth_code here (implement verification logic)
    logger.info('🔍 Auth code verification', { user_id });

    // Log GDPR activity
    await gdprService.logActivity(user_id, 'TYPEFORM_PROFILE_COMPLETION', {
      source: 'typeform_webhook',
      has_images: !!(driving_license_picture || vehicle_picture_front)
    }, req);

    // ========================================
    // CREATE user_signup record (not update!)
    // ========================================
    const userData = {
      uid: user_id,
      create_user_id: user_id,
      auth_user_id: user_id, // ✅ Required for RLS policy
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

    logger.info('💾 Creating user_signup record', { user_id });

    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from('user_signup')
      .insert(userData)
      .select()
      .single();

    if (insertError) {
      logger.error('❌ Failed to create user_signup record:', {
        error: insertError.message,
        code: insertError.code,
        user_id
      });
      return sendError(res, 500, 'Failed to save profile data', 'DB_ERROR');
    }

    logger.success('✅ user_signup record created', { user_id });

    // ========================================
    // UPDATE Auth metadata to mark Typeform as complete
    // ========================================
    try {
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
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
          create_user_id: user_id
        };

        const result = await this.imageProcessor.processSignupImages(imageProcessingData);

        logger.success('✅ Images processed', {
          user_id,
          processedCount: result?.processedImages?.length || 0
        });
      } catch (imageError) {
        logger.error('⚠️ Image processing failed (non-critical):', imageError.message);
      }
    }

    // ========================================
    // SUCCESS RESPONSE
    // ========================================
    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      user_id: user_id,
      profile_id: insertedUser.id
    });

  } catch (error) {
    logger.error('💥 Typeform webhook error:', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, error.message, 'WEBHOOK_ERROR');
  }
}