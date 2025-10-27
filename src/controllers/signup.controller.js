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
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
}).fields([
  { name: 'driving_license_picture', maxCount: 1 },
  { name: 'vehicle_front_image', maxCount: 1 },
  { name: 'vehicle_driver_side_image', maxCount: 1 },
  { name: 'vehicle_passenger_side_image', maxCount: 1 },
  { name: 'vehicle_back_image', maxCount: 1 }
]);

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

    // Parse form data and files
    const formData = req.body;
    const files = req.files;

    logger.info('📋 Form data:', {
      hasFiles: !!files,
      fileCount: files ? Object.keys(files).length : 0,
      fields: Object.keys(formData)
    });

    // Validate required fields
    const requiredFields = [
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

    // Validate image uploads
    const requiredImages = [
      'driving_license_picture',
      'vehicle_front_image',
      'vehicle_driver_side_image',
      'vehicle_passenger_side_image',
      'vehicle_back_image'
    ];

    const missingImages = requiredImages.filter(img => !files || !files[img] || files[img].length === 0);
    if (missingImages.length > 0) {
      logger.warn('Missing required images:', missingImages);
      return res.status(400).json({
        error: 'Missing required images',
        images: missingImages
      });
    }

    // Generate UUID for user
    const userId = uuidv4();
    logger.info('✅ Generated user ID:', userId);

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
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email.toLowerCase(),
      mobile_number: formData.mobile_number,
      date_of_birth: convertDateFormat(formData.date_of_birth), // Convert DD/MM/YYYY to YYYY-MM-DD
      address_line_1: formData.address_line_1,
      address_line_2: formData.address_line_2 || null,
      city: formData.city,
      county: formData.county || null,
      postcode: formData.postcode.toUpperCase(),
      car_registration_number: formData.car_registration_number.toUpperCase(),
      driving_license_number: formData.driving_license_number.toUpperCase(),
      insurance_company: formData.insurance_company,
      policy_number: formData.policy_number.toUpperCase(),
      policy_holder: formData.policy_holder,
      policy_cover: formData.cover_type, // "Fully Comprehensive", etc.
      recovery_company: formData.recovery_company || null,
      recovery_breakdown_number: formData.recovery_breakdown_number || null,
      recovery_breakdown_email: formData.recovery_breakdown_email || null,
      emergency_contact_first_name: formData.emergency_contact_first_name,
      emergency_contact_last_name: formData.emergency_contact_last_name,
      emergency_contact_phone: formData.emergency_contact_phone,
      emergency_contact_email: formData.emergency_contact_email.toLowerCase(),
      emergency_contact_company: formData.emergency_contact_company || null,
      gdpr_consent: true,
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

    // ===== 3. Process and upload image files =====
    logger.info('📸 Processing image uploads...');

    const imageResults = [];

    for (const [fieldName, fileArray] of Object.entries(files)) {
      if (fileArray && fileArray.length > 0) {
        const file = fileArray[0];

        try {
          logger.info(`📤 Uploading ${fieldName}:`, {
            filename: file.originalname,
            size: `${(file.size / 1024).toFixed(2)} KB`,
            mimetype: file.mimetype
          });

          // Calculate checksum
          const checksum = imageProcessor.calculateChecksum(file.buffer);

          // Upload to Supabase Storage
          const fileName = `${userId}/${fieldName}_${Date.now()}.${file.originalname.split('.').pop()}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('user-documents')
            .upload(fileName, file.buffer, {
              contentType: file.mimetype,
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            logger.error(`❌ Failed to upload ${fieldName}:`, uploadError);
            throw new Error(`Failed to upload ${fieldName}: ${uploadError.message}`);
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('user-documents')
            .getPublicUrl(fileName);

          // Create document record in user_documents table
          await imageProcessor.createDocumentRecord({
            create_user_id: userId,
            document_type: fieldName,
            document_category: 'user_signup',
            source_type: 'direct_upload',
            source_field: fieldName,
            original_filename: file.originalname,
            storage_bucket: 'user-documents',
            storage_path: fileName,
            file_size: file.size,
            mime_type: file.mimetype,
            file_extension: file.originalname.split('.').pop().toLowerCase(),
            status: 'completed',
            original_checksum_sha256: checksum,
            current_checksum_sha256: checksum,
            metadata: {
              uploaded_from: 'custom_signup_form',
              upload_method: 'multer',
              original_size: file.size
            }
          });

          imageResults.push({
            field: fieldName,
            status: 'success',
            url: publicUrl
          });

          logger.success(`✅ ${fieldName} uploaded successfully`);

        } catch (error) {
          logger.error(`❌ Error processing ${fieldName}:`, error);
          imageResults.push({
            field: fieldName,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    // Check if all images uploaded successfully
    const failedImages = imageResults.filter(r => r.status === 'error');
    if (failedImages.length > 0) {
      logger.warn('⚠️ Some images failed to upload:', failedImages);
      return res.status(500).json({
        error: 'Some images failed to upload',
        userId: userId,
        failedImages: failedImages
      });
    }

    // ===== 4. Return success response =====
    logger.success('🎉 User signup completed successfully:', userId);

    return res.status(201).json({
      success: true,
      message: 'Signup completed successfully',
      userId: userId,
      email: formData.email,
      images: imageResults
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
  submitSignup,
  upload // Export multer middleware
};
