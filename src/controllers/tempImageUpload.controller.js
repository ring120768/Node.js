/**
 * Temporary Image Upload Controller
 * Handles immediate image uploads during form completion
 *
 * Flow:
 * 1. User selects/captures image on any form page
 * 2. Image immediately uploads to temp/ storage location
 * 3. Record created in temp_uploads table
 * 4. Client stores temp path (not File object) in formData
 * 5. On form submission, temp files moved to permanent location
 *
 * Benefits:
 * - Prevents ERR_UPLOAD_FILE_CHANGED errors on mobile
 * - Works for camera captures and library selections
 * - Survives app backgrounding/network issues
 * - Scales to multi-page forms with images anywhere
 */

const logger = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const multer = require('multer');
const crypto = require('crypto');

// Configure multer for single file upload
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
}).single('file');

/**
 * Calculate checksum for file verification
 */
function calculateChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Upload image to temporary storage
 * POST /api/images/temp-upload
 *
 * Body (multipart/form-data):
 * - file: Image file
 * - field_name: Form field name (e.g., 'driving_license_picture')
 * - temp_session_id: Unique session ID from client
 *
 * Returns:
 * {
 *   success: true,
 *   tempPath: "temp/session123/license_1234567890.jpg",
 *   uploadId: "uuid",
 *   previewUrl: "https://...",
 *   fileSize: 123456,
 *   checksum: "abc123..."
 * }
 */
async function tempUpload(req, res) {
  try {
    logger.info('📸 Received temp image upload request');

    const { field_name, temp_session_id } = req.body;
    const file = req.file;

    // Validation
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!field_name) {
      return res.status(400).json({ error: 'field_name is required' });
    }

    if (!temp_session_id) {
      return res.status(400).json({ error: 'temp_session_id is required' });
    }

    logger.info('📋 Temp upload details:', {
      sessionId: temp_session_id,
      fieldName: field_name,
      filename: file.originalname,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      mimeType: file.mimetype
    });

    // Initialize Supabase client
    const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

    // Calculate checksum for integrity verification
    const checksum = calculateChecksum(file.buffer);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    const sanitizedFieldName = field_name.replace(/[^a-z0-9_]/gi, '_');
    const fileName = `temp/${temp_session_id}/${sanitizedFieldName}_${timestamp}.${fileExtension}`;

    logger.info(`📤 Uploading to temp storage: ${fileName}`);

    // Upload to Supabase Storage (temp location)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false // Don't overwrite if exists
      });

    if (uploadError) {
      logger.error('❌ Storage upload failed:', uploadError);
      throw new Error(`Failed to upload: ${uploadError.message}`);
    }

    // Get public URL for preview (optional)
    const { data: { publicUrl } } = supabase.storage
      .from('user-documents')
      .getPublicUrl(fileName);

    // Create tracking record in temp_uploads table
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const { data: uploadRecord, error: dbError } = await supabase
      .from('temp_uploads')
      .insert({
        session_id: temp_session_id,
        field_name: field_name,
        storage_path: fileName,
        file_size: file.size,
        mime_type: file.mimetype,
        uploaded_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        claimed: false
      })
      .select()
      .single();

    if (dbError) {
      logger.error('❌ Database insert failed:', dbError);
      // Cleanup uploaded file
      await supabase.storage.from('user-documents').remove([fileName]);
      throw new Error(`Failed to track upload: ${dbError.message}`);
    }

    logger.success(`✅ Temp upload successful:`, {
      uploadId: uploadRecord.id,
      path: fileName,
      expiresAt: expiresAt.toISOString()
    });

    return res.status(200).json({
      success: true,
      tempPath: fileName,
      uploadId: uploadRecord.id,
      previewUrl: publicUrl,
      fileSize: file.size,
      checksum: checksum,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    logger.error('❌ Temp upload error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Get temp uploads for a session
 * GET /api/images/temp-uploads/:sessionId
 *
 * Returns array of temp uploads for the session
 */
async function getTempUploads(req, res) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

    const { data: uploads, error } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('session_id', sessionId)
      .eq('claimed', false)
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      sessionId,
      uploads: uploads || []
    });

  } catch (error) {
    logger.error('❌ Error fetching temp uploads:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Delete a temp upload
 * DELETE /api/images/temp-upload/:uploadId
 *
 * Used when user removes an uploaded image before submission
 */
async function deleteTempUpload(req, res) {
  try {
    const { uploadId } = req.params;

    if (!uploadId) {
      return res.status(400).json({ error: 'Upload ID is required' });
    }

    const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

    // Get upload record
    const { data: upload, error: fetchError } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (fetchError || !upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('user-documents')
      .remove([upload.storage_path]);

    if (storageError) {
      logger.warn('⚠️ Failed to delete file from storage:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('temp_uploads')
      .delete()
      .eq('id', uploadId);

    if (dbError) {
      throw dbError;
    }

    logger.info(`🗑️ Temp upload deleted: ${uploadId}`);

    return res.status(200).json({
      success: true,
      message: 'Upload deleted successfully'
    });

  } catch (error) {
    logger.error('❌ Error deleting temp upload:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

module.exports = {
  tempUpload,
  getTempUploads,
  deleteTempUpload,
  upload // Export multer middleware
};
