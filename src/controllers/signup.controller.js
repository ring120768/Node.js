/**
 * Signup Controller
 * Handles user signup form submission from custom HTML form
 * Processes form data, file uploads, and saves to Supabase
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const ImageProcessorV2 = require('../services/imageProcessorV2');
const gdprService = require('../services/gdprService');

// Note: Images are now uploaded immediately when selected (temp upload pattern)
// No multer needed - we receive JSON with temp paths instead of multipart/form-data

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD for PostgreSQL
 */
function convertDateFormat(ddmmyyyy) {
  if (!ddmmyyyy) return null;

  // Handle DD/MM/YYYY format
  if (ddmmyyyy.includes('/')) {
    const [day, month, year] = ddmmyyyy.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Already in correct format or invalid
  return ddmmyyyy;
}

/**
 * Submit user signup form
 * POST /api/signup/submit
 */
async function submitSignup(req, res) {
  try {
    logger.info('📝 Received signup form submission');

    // Parse form data (JSON body, not multipart)
    const formData = req.body;
    const sessionId = formData.temp_session_id;

    logger.info('📋 Form data:', {
      hasSessionId: !!sessionId,
      fields: Object.keys(formData).length,
      hasImages: !![
        formData.driving_license_picture,
        formData.vehicle_front_image,
        formData.vehicle_driver_side_image,
        formData.vehicle_passenger_side_image,
        formData.vehicle_back_image
      ].filter(Boolean).length
    });

    // Validate required fields
    // Note: password NOT required - user already authenticated on Page 1
    const requiredFields = [
      'auth_user_id', // From frontend - user authenticated before form submission
      'first_name',
      'last_name',
      'email',
      'mobile_number',
      'date_of_birth',
      'address_line_1',
      'city',
      'postcode',
      'car_registration_number',
      'driving_license_number',
      'insurance_company',
      'policy_number',
      'policy_holder',
      'cover_type',
      'emergency_contact_first_name',
      'emergency_contact_last_name',
      'emergency_contact_phone',
      'emergency_contact_email',
      'gdpr_consent'
    ];

    const missing = requiredFields.filter(field => !formData[field]);
    if (missing.length > 0) {
      logger.warn('Missing required fields:', missing);
      return res.status(400).json({
        error: 'Missing required fields',
        fields: missing
      });
    }

    // Validate GDPR consent
    if (formData.gdpr_consent !== 'true' && formData.gdpr_consent !== true) {
      return res.status(400).json({
        error: 'GDPR consent is required'
      });
    }

    // Check which images were uploaded to temp storage (images are OPTIONAL)
    const recommendedImages = [
      'driving_license_picture',
      'vehicle_front_image',
      'vehicle_driver_side_image',
      'vehicle_passenger_side_image',
      'vehicle_back_image'
    ];

    // Check for temp paths (not File objects)
    const missingImages = recommendedImages.filter(img => !formData[img]);
    const uploadedImages = recommendedImages.filter(img => formData[img] && typeof formData[img] === 'string');

    logger.info('📸 Image upload status:', {
      uploaded: uploadedImages.length,
      missing: missingImages.length,
      missingList: missingImages,
      tempPaths: uploadedImages.map(img => formData[img])
    });

    // Track if we need to send reminder email (no hard validation - images are optional)
    const needsImageReminder = missingImages.length > 0;

    // Get auth user ID from frontend (user already authenticated on Page 1)
    const userId = formData.auth_user_id;
    logger.info('✅ Using authenticated user ID:', userId);

    // Initialize Supabase client
    const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    // Initialize ImageProcessorV2
    const imageProcessor = new ImageProcessorV2(supabase);

    // ===== 1. Insert user_signup record =====
    logger.info('💾 Inserting user_signup record...');

    const userSignupData = {
      create_user_id: userId,
      name: formData.first_name, // Map form → DB
      surname: formData.last_name, // Map form → DB
      email: formData.email.toLowerCase(),
      mobile: formData.mobile_number, // Map form → DB
      date_of_birth: convertDateFormat(formData.date_of_birth), // Convert DD/MM/YYYY to YYYY-MM-DD
      street_address: formData.address_line_1, // Map form → DB
      street_address_optional: formData.address_line_2 || null, // Map form → DB
      town: formData.city, // Map form → DB
      country: formData.country || 'United Kingdom', // Default to UK
      postcode: formData.postcode.toUpperCase(),
      car_registration_number: formData.car_registration_number.toUpperCase(),
      driving_license_number: formData.driving_license_number.toUpperCase(),
      insurance_company: formData.insurance_company,
      policy_number: formData.policy_number.toUpperCase(),
      policy_holder: formData.policy_holder,
      cover_type: formData.cover_type, // "Fully Comprehensive", etc.
      recovery_company: formData.recovery_company || null,
      recovery_breakdown_number: formData.recovery_breakdown_number || null,
      recovery_breakdown_email: formData.recovery_breakdown_email ? formData.recovery_breakdown_email.toLowerCase() : null,
      // Combine emergency contact into pipe-delimited format: "FirstName LastName | Phone | Email | Company"
      emergency_contact: [
        `${formData.emergency_contact_first_name} ${formData.emergency_contact_last_name}`,
        formData.emergency_contact_phone,
        formData.emergency_contact_email.toLowerCase(),
        formData.emergency_contact_company || ''
      ].join(' | '),
      // DVLA vehicle info (populated from DVLA lookup on Page 5)
      vehicle_make: formData.dvla_make || null,
      vehicle_model: formData.dvla_model || null,
      vehicle_colour: formData.dvla_colour || null,
      vehicle_condition: formData.vehicle_condition || null, // User's declaration of vehicle condition
      gdpr_consent: true,
      images_status: uploadedImages.length === 5 ? 'complete' : 'partial', // Track image upload status
      missing_images: missingImages.length > 0 ? missingImages : null, // Store which images are missing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: userRecord, error: userError } = await supabase
      .from('user_signup')
      .insert([userSignupData])
      .select()
      .single();

    if (userError) {
      logger.error('❌ Failed to insert user_signup:', userError);
      throw new Error(`Failed to create user record: ${userError.message}`);
    }

    logger.success('✅ User record created:', userId);

    // ===== 1.5. Create GDPR audit log for account creation =====
    try {
      await gdprService.logActivity(
        userId,
        'ACCOUNT_CREATED',
        {
          method: 'custom_signup_form',
          email: formData.email,
          hasImages: uploadedImages.length > 0,
          imagesComplete: uploadedImages.length === 5,
          dvlaVerified: formData.dvla_verified === 'true'
        },
        req
      );
      logger.info('✅ GDPR audit log created for signup');
    } catch (gdprError) {
      // Non-fatal - don't block signup if audit log fails
      logger.warn('⚠️ Failed to create GDPR audit log (non-fatal):', gdprError.message);
    }

    // ===== 2. Insert dvla_vehicle_info_new record (if DVLA data present) =====
    if (formData.dvla_verified === 'true' && formData.make && formData.model) {
      logger.info('💾 Inserting DVLA vehicle info...');

      const dvlaData = {
        create_user_id: userId,
        registration: formData.car_registration_number.toUpperCase(),
        make: formData.make,
        model: formData.model,
        colour: formData.colour || null,
        year_of_manufacture: formData.year_of_manufacture ? parseInt(formData.year_of_manufacture) : null,
        fuel_type: formData.fuel_type || null,
        engine_size: formData.engine_size || null,
        verified: true,
        verification_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: dvlaError } = await supabase
        .from('dvla_vehicle_info_new')
        .insert([dvlaData]);

      if (dvlaError) {
        logger.error('⚠️ Failed to insert DVLA info:', dvlaError);
        // Non-fatal error - continue with signup
      } else {
        logger.success('✅ DVLA vehicle info saved');
      }
    }

    // ===== 3. Move temp uploads to permanent storage =====
    logger.info('📸 Processing temp uploads...', {
      sessionId,
      tempUploadsCount: uploadedImages.length
    });

    const imageResults = [];

    // Process uploaded images (if any)
    if (uploadedImages.length > 0) {
      for (const fieldName of uploadedImages) {
        const tempPath = formData[fieldName];
        const uploadId = formData[`${fieldName}_upload_id`];

        try {
          logger.info(`🔄 Moving ${fieldName} from temp to permanent storage...`, {
            tempPath,
            uploadId
          });

          // Get temp upload record
          const { data: tempUpload, error: tempError } = await supabase
            .from('temp_uploads')
            .select('*')
            .eq('id', uploadId)
            .single();

          if (tempError || !tempUpload) {
            throw new Error(`Temp upload not found: ${uploadId}`);
          }

          // Define permanent storage path (consistent with location photo structure)
          const permanentPath = tempPath.replace(`temp/${sessionId}/`, `users/${userId}/signup/`);

          logger.info(`📦 Moving: ${tempPath} → ${permanentPath}`);

          // Move file from temp to permanent location
          const { error: moveError } = await supabase.storage
            .from('user-documents')
            .move(tempPath, permanentPath);

          if (moveError) {
            logger.error(`❌ Failed to move ${fieldName}:`, moveError);
            throw new Error(`Failed to move file: ${moveError.message}`);
          }

          // Get public URL for permanent location
          const { data: { publicUrl } } = supabase.storage
            .from('user-documents')
            .getPublicUrl(permanentPath);

          logger.info('🔍 DEBUG: About to generate signed URL', {
            userId,
            fieldName,
            permanentPath,
            publicUrl
          });

          // Generate signed URL (12 months expiry to match subscription period)
          const signedUrlExpirySeconds = 31536000; // 365 days (12 months)
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('user-documents')
            .createSignedUrl(permanentPath, signedUrlExpirySeconds);

          if (signedUrlError) {
            logger.error('❌ DEBUG: Signed URL generation FAILED', {
              error: signedUrlError.message,
              path: permanentPath,
              userId,
              fieldName
            });
            throw new Error('Failed to generate signed URL for uploaded file');
          }

          const signedUrl = signedUrlData.signedUrl;
          const signedUrlExpiresAt = new Date(Date.now() + (signedUrlExpirySeconds * 1000));

          logger.info('✅ DEBUG: Signed URL generated successfully', {
            userId,
            fieldName,
            signedUrl: signedUrl.substring(0, 100) + '...',
            expiresAt: signedUrlExpiresAt.toISOString(),
            expirySeconds: signedUrlExpirySeconds
          });

          // Create document record in user_documents table
          logger.info('🔍 DEBUG: About to call createDocumentRecord with URL fields', {
            userId,
            fieldName,
            public_url: signedUrl ? 'PRESENT' : 'NULL',
            signed_url: signedUrl ? 'PRESENT' : 'NULL',
            signed_url_expires_at: signedUrlExpiresAt ? signedUrlExpiresAt.toISOString() : 'NULL',
            signedUrlLength: signedUrl?.length || 0
          });

          const documentRecord = await imageProcessor.createDocumentRecord({
            create_user_id: userId,
            document_type: fieldName,
            document_category: 'user_signup',
            source_type: 'temp_upload',
            source_field: fieldName,
            original_filename: tempUpload.storage_path.split('/').pop(),
            storage_bucket: 'user-documents',
            storage_path: permanentPath,
            file_size: tempUpload.file_size,
            mime_type: tempUpload.mime_type,
            file_extension: permanentPath.split('.').pop().toLowerCase(),
            status: 'completed',
            public_url: signedUrl, // Keep for backwards compatibility
            signed_url: signedUrl, // NEW: Store in signed_url field for PDF generation
            signed_url_expires_at: signedUrlExpiresAt.toISOString(), // NEW: Track expiry
            original_checksum_sha256: null, // Checksum from temp upload
            current_checksum_sha256: null,
            metadata: {
              uploaded_from: 'custom_signup_form_temp',
              upload_method: 'immediate_temp_upload',
              temp_upload_id: uploadId,
              temp_session_id: sessionId,
              moved_from_temp: true
            }
          });

          logger.info('✅ DEBUG: createDocumentRecord completed', {
            userId,
            fieldName,
            documentId: documentRecord?.id || 'NO_ID',
            recordCreated: !!documentRecord
          });

          // Mark temp upload as claimed
          await supabase
            .from('temp_uploads')
            .update({
              claimed: true,
              claimed_by_user_id: userId,
              claimed_at: new Date().toISOString()
            })
            .eq('id', uploadId);

          imageResults.push({
            field: fieldName,
            status: 'success',
            url: publicUrl,
            path: permanentPath
          });

          logger.success(`✅ ${fieldName} moved successfully: ${permanentPath}`);

        } catch (error) {
          logger.error(`❌ Error processing ${fieldName}:`, error);
          imageResults.push({
            field: fieldName,
            status: 'error',
            error: error.message
          });
        }
      }
    } else {
      logger.info('📸 No temp uploads to process - user will receive reminder email');
    }

    // Log any failed uploads (but don't block signup)
    const failedImages = imageResults.filter(r => r.status === 'error');
    if (failedImages.length > 0) {
      logger.warn('⚠️ Some images failed to upload (non-fatal):', failedImages);
      // Don't return error - signup succeeds even if some images failed
    }

    // ===== 4. Send reminder email if images are missing =====
    if (needsImageReminder) {
      try {
        logger.info('📧 Sending image upload reminder email to:', formData.email);

        // Import email service
        const emailService = require('../../lib/emailService');

        // Send reminder email with upload link
        await emailService.sendImageUploadReminder({
          email: formData.email,
          firstName: formData.first_name,
          userId: userId,
          missingImages: missingImages
        });

        logger.success('✅ Reminder email sent successfully');
      } catch (emailError) {
        // Non-fatal error - don't block signup
        logger.error('⚠️ Failed to send reminder email (non-fatal):', emailError);
      }
    }

    // ===== 5. Return success response =====
    // Note: Auth user already created on Page 1 - no auth creation needed here
    logger.success('🎉 User signup completed successfully:', userId);

    return res.status(201).json({
      success: true,
      message: 'Signup completed successfully',
      userId: userId,
      email: formData.email,
      images: imageResults,
      needsImageUpload: needsImageReminder, // Tell frontend if reminder was sent
      missingImages: missingImages
      // Note: User already authenticated - no auto-login needed
    });

  } catch (error) {
    logger.error('❌ Signup error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = {
  submitSignup
};
