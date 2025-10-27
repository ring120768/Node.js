/**
 * Image Upload Controller
 * Handles post-signup image uploads from users who completed signup without photos
 */

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
 * Upload images for existing user
 * POST /api/images/upload
 */
async function uploadImages(req, res) {
  try {
    logger.info('📸 Received image upload request');

    const { auth_user_id } = req.body;
    const files = req.files;

    if (!auth_user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    logger.info('📋 Upload details:', {
      userId: auth_user_id,
      fileCount: Object.keys(files).length
    });

    // Initialize Supabase client
    const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    const imageProcessor = new ImageProcessorV2(supabase);

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', auth_user_id)
      .single();

    if (userError || !user) {
      logger.error('User not found:', auth_user_id);
      return res.status(404).json({ error: 'User not found' });
    }

    // Process each uploaded image
    const imageResults = [];

    for (const [fieldName, fileArray] of Object.entries(files)) {
      if (fileArray && fileArray.length > 0) {
        const file = fileArray[0];

        try {
          logger.info(`📤 Uploading ${fieldName}:`, {
            filename: file.originalname,
            size: `${(file.size / 1024).toFixed(2)} KB`
          });

          // Calculate checksum
          const checksum = imageProcessor.calculateChecksum(file.buffer);

          // Upload to Supabase Storage
          const fileName = `${auth_user_id}/${fieldName}_${Date.now()}.${file.originalname.split('.').pop()}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('user-documents')
            .upload(fileName, file.buffer, {
              contentType: file.mimetype,
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Failed to upload: ${uploadError.message}`);
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('user-documents')
            .getPublicUrl(fileName);

          // Create document record
          await imageProcessor.createDocumentRecord({
            create_user_id: auth_user_id,
            document_type: fieldName,
            document_category: 'user_signup',
            source_type: 'post_signup_upload',
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
              uploaded_from: 'upload_images_page',
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
          logger.error(`❌ Error uploading ${fieldName}:`, error);
          imageResults.push({
            field: fieldName,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    // Update user record - check if all images are now complete
    const allImageFields = [
      'driving_license_picture',
      'vehicle_front_image',
      'vehicle_driver_side_image',
      'vehicle_passenger_side_image',
      'vehicle_back_image'
    ];

    // Count total uploaded images (from this upload + previously uploaded)
    const { data: existingImages } = await supabase
      .from('user_documents')
      .select('document_type')
      .eq('create_user_id', auth_user_id)
      .in('document_type', allImageFields);

    const uploadedImageTypes = new Set(existingImages.map(img => img.document_type));
    const remainingImages = allImageFields.filter(field => !uploadedImageTypes.has(field));

    // Update user_signup record
    await supabase
      .from('user_signup')
      .update({
        images_status: remainingImages.length === 0 ? 'complete' : 'partial',
        missing_images: remainingImages.length > 0 ? remainingImages : null,
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', auth_user_id);

    logger.success('🎉 Image upload completed:', {
      userId: auth_user_id,
      uploadedCount: imageResults.filter(r => r.status === 'success').length,
      allComplete: remainingImages.length === 0
    });

    return res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      userId: auth_user_id,
      images: imageResults,
      allComplete: remainingImages.length === 0,
      remainingImages
    });

  } catch (error) {
    logger.error('❌ Image upload error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = {
  uploadImages,
  upload // Export multer middleware
};
