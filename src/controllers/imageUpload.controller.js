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

/**
 * Dashboard image upload/replace
 * POST /api/images/dashboard-upload
 *
 * Allows users to upload or replace images from the dashboard
 * Supports all document types (signup, scene, damage, other vehicle, location)
 */
async function dashboardUpload(req, res) {
  try {
    logger.info('📸 Dashboard image upload request received');

    const file = req.file;
    const { document_type, replacing_id } = req.body;
    const userId = req.user?.id; // From requireAuth middleware

    // Validate inputs
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!document_type) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    logger.info('📋 Dashboard upload details:', {
      userId,
      documentType: document_type,
      filename: file.originalname,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      replacingId: replacing_id || 'none'
    });

    // Initialize Supabase client
    const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    const imageProcessor = new ImageProcessorV2(supabase);

    // Get user's incident report ID (if exists)
    const { data: incident } = await supabase
      .from('incident_reports')
      .select('id')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const incidentId = incident?.id;

    // Determine document category and storage path
    let documentCategory = 'user_signup';
    let storagePath = `users/${userId}/`;

    if (['scene_photo', 'vehicle_damage_photo', 'other_vehicle_photo'].includes(document_type)) {
      documentCategory = 'incident_report';
      if (incidentId) {
        storagePath = `users/${userId}/incident-reports/${incidentId}/`;
        if (document_type === 'scene_photo') {
          storagePath += 'scene-photos/';
        } else if (document_type === 'vehicle_damage_photo') {
          storagePath += 'damage-photos/';
        } else if (document_type === 'other_vehicle_photo') {
          storagePath += 'other-vehicle-photos/';
        }
      }
    } else if (document_type === 'location_map_screenshot') {
      documentCategory = 'incident_report';
      if (incidentId) {
        storagePath = `users/${userId}/incident-reports/${incidentId}/location/`;
      }
    }

    // If replacing, delete old document and storage file
    if (replacing_id) {
      logger.info('🔄 Replacing existing document:', replacing_id);

      // Get old document
      const { data: oldDoc } = await supabase
        .from('user_documents')
        .select('storage_path')
        .eq('id', replacing_id)
        .eq('create_user_id', userId) // Security: verify ownership
        .single();

      if (oldDoc?.storage_path) {
        // Delete from storage
        await supabase.storage
          .from('user-documents')
          .remove([oldDoc.storage_path]);

        // Soft delete document record
        await supabase
          .from('user_documents')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', replacing_id);

        logger.success('✅ Old document deleted');
      }
    }

    // Calculate checksum
    const checksum = imageProcessor.calculateChecksum(file.buffer);

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.originalname.split('.').pop();
    const filename = `${document_type}_${timestamp}.${extension}`;
    const fullPath = `${storagePath}${filename}`;

    // Upload to Supabase Storage
    logger.info('📤 Uploading to storage:', fullPath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(fullPath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Generate signed URL (12 months)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(fullPath, 31536000); // 12 months in seconds

    if (signedUrlError) {
      throw new Error(`Signed URL generation failed: ${signedUrlError.message}`);
    }

    // Create document record
    const { data: docRecord, error: docError } = await supabase
      .from('user_documents')
      .insert({
        create_user_id: userId,
        incident_report_id: incidentId,
        document_type,
        document_category: documentCategory,
        source_type: 'dashboard_upload',
        source_field: document_type,
        original_filename: file.originalname,
        storage_bucket: 'user-documents',
        storage_path: fullPath,
        signed_url: signedUrlData.signedUrl,
        file_size: file.size,
        mime_type: file.mimetype,
        file_extension: extension.toLowerCase(),
        status: 'completed',
        original_checksum_sha256: checksum,
        current_checksum_sha256: checksum,
        metadata: {
          uploaded_from: 'dashboard',
          upload_method: 'dashboard_upload',
          original_size: file.size,
          replaced_document_id: replacing_id || null
        }
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Database insert failed: ${docError.message}`);
    }

    logger.success('🎉 Dashboard upload completed:', {
      documentId: docRecord.id,
      documentType: document_type,
      filename: file.originalname
    });

    return res.status(200).json({
      success: true,
      message: replacing_id ? 'Image replaced successfully' : 'Image uploaded successfully',
      document: {
        id: docRecord.id,
        document_type,
        original_filename: file.originalname,
        signed_url: signedUrlData.signedUrl,
        storage_path: fullPath,
        file_size: file.size,
        created_at: docRecord.created_at
      }
    });

  } catch (error) {
    logger.error('❌ Dashboard upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
}

// Multer middleware for dashboard upload (single file)
const dashboardUploadMiddleware = multer({
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
}).single('file');

module.exports = {
  uploadImages,
  upload, // Export multer middleware
  dashboardUpload,
  dashboardUploadMiddleware
};
