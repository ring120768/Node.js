/**
 * Location Photo Service - Permanent Storage for Page 4a Images
 *
 * Handles the transition from temporary uploads to permanent storage:
 * - Moves photos from temp/{session}/ to users/{user}/incident-reports/{report}/
 * - Links photos to incident reports via incident_report_id
 * - Generates permanent API URLs for downloading
 * - Marks temp uploads as claimed
 *
 * Addresses requirement: "needs both downloadable url and image stored in bucket"
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const path = require('path');

class LocationPhotoService {
  constructor() {
    // Use service role key for storage operations (bypasses RLS)
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    this.BUCKET_NAME = 'user-documents';
    this.PHOTO_TYPES = ['scene_photo', 'damage_photo', 'injury_photo'];
  }

  /**
   * Generic photo finalization - works for any photo type
   *
   * @param {string} userId - User UUID
   * @param {string} incidentReportId - Incident report UUID
   * @param {string} sessionId - Temp session ID from localStorage
   * @param {string} fieldName - Field name from temp_uploads (e.g., 'scene_photo', 'vehicle_damage_photo')
   * @param {string} category - Storage category (e.g., 'location-photos', 'vehicle-damage')
   * @param {string} documentType - Document type for user_documents table (e.g., 'location_photo', 'vehicle_damage_photo')
   * @returns {Promise<{success: boolean, photos: Array, error?: string}>}
   */
  async finalizePhotosByType(userId, incidentReportId, sessionId, fieldName, category, documentType) {
    try {
      logger.info('Finalizing photos by type', {
        userId,
        incidentReportId,
        sessionId,
        fieldName,
        category,
        documentType
      });

      // 1. Get temp uploads for this session and field type
      const { data: tempUploads, error: fetchError } = await this.supabase
        .from('temp_uploads')
        .select('*')
        .eq('session_id', sessionId)
        .eq('field_name', fieldName)
        .eq('claimed', false)
        .order('uploaded_at', { ascending: true });

      if (fetchError) {
        logger.error('Error fetching temp uploads', { error: fetchError });
        throw new Error(`Failed to fetch temp uploads: ${fetchError.message}`);
      }

      if (!tempUploads || tempUploads.length === 0) {
        logger.warn('No temp uploads found for session', { sessionId, fieldName });
        return {
          success: true,
          photos: [],
          message: 'No photos to finalize'
        };
      }

      logger.info(`Found ${tempUploads.length} temp uploads to finalize`);

      // 2. Process each upload
      const finalizedPhotos = [];
      const errors = [];

      for (let [index, upload] of tempUploads.entries()) {
        try {
          // Get file extension
          const ext = path.extname(upload.storage_path);
          const photoNumber = index + 1;

          // Generate permanent path using provided category
          const permanentPath = `users/${userId}/incident-reports/${incidentReportId}/${category}/${fieldName}_${photoNumber}${ext}`;

          // Move file in storage
          const moveResult = await this.movePhoto(
            upload.storage_path,
            permanentPath
          );

          if (!moveResult.success) {
            errors.push({
              uploadId: upload.id,
              error: moveResult.error
            });
            continue;
          }

          // Generate signed URL (12 months expiry to match subscription period)
          logger.info('🔍 DEBUG: About to generate signed URL for incident photo', {
            userId,
            incidentReportId,
            fieldName,
            permanentPath,
            photoNumber
          });

          const signedUrlExpirySeconds = 31536000; // 365 days (12 months)
          const { data: signedUrlData, error: signedUrlError } = await this.supabase.storage
            .from(this.BUCKET_NAME)
            .createSignedUrl(permanentPath, signedUrlExpirySeconds);

          if (signedUrlError) {
            logger.error('❌ DEBUG: Signed URL generation FAILED for incident photo', {
              error: signedUrlError.message,
              path: permanentPath,
              userId,
              incidentReportId,
              fieldName,
              photoNumber
            });
            errors.push({
              uploadId: upload.id,
              error: `Failed to generate signed URL: ${signedUrlError.message}`
            });
            continue;
          }

          const signedUrl = signedUrlData.signedUrl;
          const signedUrlExpiresAt = new Date(Date.now() + (signedUrlExpirySeconds * 1000));

          logger.info('✅ DEBUG: Signed URL generated successfully for incident photo', {
            userId,
            incidentReportId,
            fieldName,
            photoNumber,
            signedUrl: signedUrl.substring(0, 100) + '...',
            expiresAt: signedUrlExpiresAt.toISOString(),
            expirySeconds: signedUrlExpirySeconds
          });

          // Create user_documents record with provided document type AND signed URLs
          logger.info('🔍 DEBUG: About to call createDocumentRecordGeneric with URL fields', {
            userId,
            incidentReportId,
            fieldName,
            photoNumber,
            has_public_url: !!signedUrl,
            has_signed_url: !!signedUrl,
            has_signed_url_expires_at: !!signedUrlExpiresAt,
            signedUrlLength: signedUrl.length
          });

          const document = await this.createDocumentRecordGeneric({
            userId,
            incidentReportId,
            storagePath: permanentPath,
            fileSize: upload.file_size,
            mimeType: upload.mime_type,
            documentType,
            photoNumber,
            source: `page_${fieldName}_photos`,
            public_url: signedUrl,                    // Keep for backwards compatibility
            signed_url: signedUrl,                    // NEW: Store in signed_url field for PDF generation
            signed_url_expires_at: signedUrlExpiresAt.toISOString(), // NEW: Track expiry
            document_category: 'incident_report'      // NEW: Categorize as incident report photo
          });

          if (!document) {
            errors.push({
              uploadId: upload.id,
              error: 'Failed to create document record'
            });
            continue;
          }

          // Generate permanent download URL
          const downloadUrl = `/api/user-documents/${document.id}/download`;

          // Update document with download URL
          await this.supabase
            .from('user_documents')
            .update({ download_url: downloadUrl })
            .eq('id', document.id);

          // Mark temp upload as claimed
          await this.claimTempUpload(upload.id, userId);

          finalizedPhotos.push({
            id: document.id,
            storagePath: permanentPath,
            downloadUrl: downloadUrl,
            photoNumber: photoNumber,
            fileSize: upload.file_size,
            mimeType: upload.mime_type
          });

          logger.info('Successfully finalized photo', {
            photoNumber,
            documentId: document.id,
            permanentPath
          });

        } catch (photoError) {
          logger.error('Error finalizing individual photo', {
            uploadId: upload.id,
            error: photoError.message
          });
          errors.push({
            uploadId: upload.id,
            error: photoError.message
          });
        }
      }

      // 3. Return results
      const result = {
        success: finalizedPhotos.length > 0,
        photos: finalizedPhotos,
        totalProcessed: tempUploads.length,
        successCount: finalizedPhotos.length,
        errorCount: errors.length
      };

      if (errors.length > 0) {
        result.errors = errors;
        logger.warn('Some photos failed to finalize', { errors });
      }

      logger.info('Photo finalization complete', result);

      return result;

    } catch (error) {
      logger.error('Photo finalization failed', {
        error: error.message,
        userId,
        incidentReportId,
        sessionId,
        fieldName
      });

      return {
        success: false,
        error: error.message,
        photos: []
      };
    }
  }

  /**
   * Finalize location photos: Move from temp storage to permanent
   * (Specialized implementation for Page 4a scene photos)
   *
   * Scene photos from Page 4a are GENERAL SCENE VIEWS.
   * The location_map_screenshot comes from Page 4 (what3words map), NOT from Page 4a.
   *
   * PDF Field Mapping (Page 11):
   *   scene_images_path_1 ← Page 4 what3words map ('location_map_screenshot')
   *   scene_images_path_2 ← Page 4a scene photo #1 ('scene_overview')
   *   scene_images_path_3 ← Page 4a scene photo #2 ('scene_overview_2')
   *
   * @param {string} userId - User UUID
   * @param {string} incidentReportId - Incident report UUID
   * @param {string} sessionId - Temp session ID from localStorage
   * @returns {Promise<{success: boolean, photos: Array, error?: string}>}
   */
  async finalizePhotos(userId, incidentReportId, sessionId) {
    try {
      logger.info('Finalizing scene photos with numbered document types', {
        userId,
        incidentReportId,
        sessionId
      });

      // 1. Get temp uploads for scene_photo field
      const { data: tempUploads, error: fetchError } = await this.supabase
        .from('temp_uploads')
        .select('*')
        .eq('session_id', sessionId)
        .eq('field_name', 'scene_photo')
        .eq('claimed', false)
        .order('uploaded_at', { ascending: true });

      if (fetchError) {
        logger.error('Error fetching scene photo temp uploads', { error: fetchError });
        throw new Error(`Failed to fetch temp uploads: ${fetchError.message}`);
      }

      if (!tempUploads || tempUploads.length === 0) {
        logger.warn('No scene photo temp uploads found', { sessionId });
        return {
          success: true,
          photos: [],
          message: 'No scene photos to finalize'
        };
      }

      logger.info(`Found ${tempUploads.length} scene photos to finalize`);

      // 2. Map photo numbers to correct document types for PDF generation
      // NOTE: location_map_screenshot comes from Page 4 (what3words map), NOT from Page 4a scene photos
      const documentTypeMapping = {
        1: 'scene_overview',            // First scene photo = general scene view
        2: 'scene_overview_2'           // Second scene photo = additional scene view
      };

      // 3. Process each upload with correct document type
      const finalizedPhotos = [];
      const errors = [];

      for (let [index, upload] of tempUploads.entries()) {
        try {
          const photoNumber = index + 1;
          const documentType = documentTypeMapping[photoNumber] || `scene_overview_${photoNumber}`;

          const ext = path.extname(upload.storage_path);
          const permanentPath = `users/${userId}/incident-reports/${incidentReportId}/location-photos/scene_photo_${photoNumber}${ext}`;

          // Move file in storage
          const moveResult = await this.movePhoto(
            upload.storage_path,
            permanentPath
          );

          if (!moveResult.success) {
            errors.push({
              uploadId: upload.id,
              photoNumber,
              error: moveResult.error
            });
            continue;
          }

          // Generate signed URL (12 months expiry)
          logger.info('Generating signed URL for scene photo', {
            userId,
            incidentReportId,
            photoNumber,
            documentType,
            permanentPath
          });

          const signedUrlExpirySeconds = 31536000; // 365 days
          const { data: signedUrlData, error: signedUrlError } = await this.supabase.storage
            .from(this.BUCKET_NAME)
            .createSignedUrl(permanentPath, signedUrlExpirySeconds);

          if (signedUrlError) {
            logger.error('Signed URL generation failed for scene photo', {
              error: signedUrlError.message,
              path: permanentPath,
              photoNumber,
              documentType
            });
            errors.push({
              uploadId: upload.id,
              photoNumber,
              error: `Failed to generate signed URL: ${signedUrlError.message}`
            });
            continue;
          }

          const signedUrl = signedUrlData.signedUrl;
          const signedUrlExpiresAt = new Date(Date.now() + (signedUrlExpirySeconds * 1000));

          logger.info('Signed URL generated for scene photo', {
            userId,
            incidentReportId,
            photoNumber,
            documentType,
            expiresAt: signedUrlExpiresAt.toISOString()
          });

          // Create user_documents record with photo-specific document type
          const document = await this.createDocumentRecordGeneric({
            userId,
            incidentReportId,
            storagePath: permanentPath,
            fileSize: upload.file_size,
            mimeType: upload.mime_type,
            documentType,                                  // Use mapped document type
            photoNumber,
            source: 'page_scene_photo_photos',
            public_url: signedUrl,
            signed_url: signedUrl,
            signed_url_expires_at: signedUrlExpiresAt.toISOString(),
            document_category: 'incident_report'
          });

          if (!document) {
            errors.push({
              uploadId: upload.id,
              photoNumber,
              documentType,
              error: 'Failed to create document record'
            });
            continue;
          }

          // Generate permanent download URL
          const downloadUrl = `/api/user-documents/${document.id}/download`;

          // Update document with download URL
          await this.supabase
            .from('user_documents')
            .update({ download_url: downloadUrl })
            .eq('id', document.id);

          // Mark temp upload as claimed
          await this.claimTempUpload(upload.id, userId);

          finalizedPhotos.push({
            id: document.id,
            photoNumber,
            documentType,
            storagePath: permanentPath,
            downloadUrl,
            signedUrl,
            signedUrlExpiresAt: signedUrlExpiresAt.toISOString()
          });

          logger.info('Scene photo finalized successfully', {
            documentId: document.id,
            photoNumber,
            documentType,
            downloadUrl
          });

        } catch (photoError) {
          logger.error('Error finalizing individual scene photo', {
            index,
            error: photoError.message
          });
          errors.push({
            uploadId: upload.id,
            photoNumber: index + 1,
            error: photoError.message
          });
        }
      }

      // 4. Return results
      const result = {
        success: errors.length === 0,
        photos: finalizedPhotos,
        successCount: finalizedPhotos.length,
        errorCount: errors.length
      };

      if (errors.length > 0) {
        result.errors = errors;
      }

      logger.info('Scene photo finalization complete', result);
      return result;

    } catch (error) {
      logger.error('Scene photo finalization failed', { error: error.message });
      return {
        success: false,
        photos: [],
        successCount: 0,
        errorCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Finalize vehicle damage photos: Move from temp storage to permanent
   * (For Page 6 - Your Vehicle Damage Photos)
   *
   * @param {string} userId - User UUID
   * @param {string} incidentReportId - Incident report UUID
   * @param {string} sessionId - Temp session ID from localStorage
   * @returns {Promise<{success: boolean, photos: Array, error?: string}>}
   */
  async finalizeVehicleDamagePhotos(userId, incidentReportId, sessionId) {
    // Call generic method with vehicle_damage_photo parameters
    return this.finalizePhotosByType(
      userId,
      incidentReportId,
      sessionId,
      'vehicle_damage_photo',
      'vehicle-damage',
      'vehicle_damage_photo'
    );
  }


  /**
   * Move photo from temp storage to permanent location
   *
   * @param {string} oldPath - Current temp path
   * @param {string} newPath - Target permanent path
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async movePhoto(oldPath, newPath) {
    try {
      // Supabase Storage move operation
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .move(oldPath, newPath);

      if (error) {
        logger.error('Storage move failed', {
          oldPath,
          newPath,
          error: error.message
        });
        return { success: false, error: error.message };
      }

      logger.info('Photo moved successfully', { oldPath, newPath });
      return { success: true, data };

    } catch (error) {
      logger.error('Unexpected error moving photo', {
        error: error.message,
        oldPath,
        newPath
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Create user_documents record (generic version for any photo type)
   *
   * @param {Object} params - Document parameters
   * @returns {Promise<Object|null>} Document record or null
   */
  async createDocumentRecordGeneric({
    userId,
    incidentReportId,
    storagePath,
    fileSize,
    mimeType,
    documentType,
    photoNumber,
    source,
    public_url,
    signed_url,
    signed_url_expires_at,
    document_category
  }) {
    try {
      // Debug logging: Verify parameters received
      logger.info('🔍 DEBUG: createDocumentRecord called with URL parameters', {
        userId,
        documentType,
        status: 'completed',
        public_url: public_url ? 'PRESENT' : 'NULL',
        signed_url: signed_url ? 'PRESENT' : 'NULL',
        signed_url_expires_at: signed_url_expires_at ? 'PRESENT' : 'NULL',
        document_category: document_category || 'NULL',
        signed_url_length: signed_url ? signed_url.length : 0
      });

      // Prepare document record object
      const documentRecord = {
        create_user_id: userId,
        incident_report_id: incidentReportId,
        document_type: documentType,
        storage_path: storagePath,
        file_size: fileSize,
        mime_type: mimeType,
        status: 'completed',
        metadata: {
          photo_number: photoNumber,
          source: source
        }
      };

      // Add URL fields if provided
      if (public_url) documentRecord.public_url = public_url;
      if (signed_url) documentRecord.signed_url = signed_url;
      if (signed_url_expires_at) documentRecord.signed_url_expires_at = signed_url_expires_at;
      if (document_category) documentRecord.document_category = document_category;

      // Debug logging: Document record prepared
      logger.info('🔍 DEBUG: Document record object prepared for database insert', {
        userId,
        documentType,
        hasPublicUrl: !!public_url,
        hasSignedUrl: !!signed_url,
        hasSignedUrlExpiry: !!signed_url_expires_at,
        hasDocumentCategory: !!document_category
      });

      const { data, error } = await this.supabase
        .from('user_documents')
        .insert(documentRecord)
        .select()
        .single();

      if (error) {
        logger.error('Failed to create document record', {
          error: error.message,
          userId,
          incidentReportId,
          documentType
        });
        return null;
      }

      // Debug logging: Database insert successful
      logger.info('✅ DEBUG: Document record created in database', {
        id: data.id,
        documentType: documentType,
        status: data.status,
        public_url_in_db: data.public_url ? 'PRESENT' : 'NULL',
        signed_url_in_db: data.signed_url ? 'PRESENT' : 'NULL',
        signed_url_expires_at_in_db: data.signed_url_expires_at ? 'PRESENT' : 'NULL',
        document_category_in_db: data.document_category || 'NULL'
      });

      logger.info('Document record created', { documentId: data.id, documentType });
      return data;

    } catch (error) {
      logger.error('Unexpected error creating document record', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Create user_documents record for permanent photo
   * (Backward compatibility wrapper)
   *
   * @param {Object} params - Document parameters
   * @returns {Promise<Object|null>} Document record or null
   */
  async createDocumentRecord({
    userId,
    incidentReportId,
    storagePath,
    fileSize,
    mimeType,
    photoNumber
  }) {
    return this.createDocumentRecordGeneric({
      userId,
      incidentReportId,
      storagePath,
      fileSize,
      mimeType,
      documentType: 'location_photo',
      photoNumber,
      source: 'page_4a_location_photos'
    });
  }

  /**
   * Mark temp upload as claimed
   *
   * @param {string} uploadId - Temp upload UUID
   * @param {string} userId - User UUID
   * @returns {Promise<boolean>}
   */
  async claimTempUpload(uploadId, userId) {
    try {
      const { error } = await this.supabase
        .from('temp_uploads')
        .update({
          claimed: true,
          claimed_by_user_id: userId,
          claimed_at: new Date().toISOString()
        })
        .eq('id', uploadId);

      if (error) {
        logger.error('Failed to claim temp upload', {
          uploadId,
          error: error.message
        });
        return false;
      }

      logger.info('Temp upload claimed', { uploadId });
      return true;

    } catch (error) {
      logger.error('Unexpected error claiming temp upload', {
        uploadId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get all location photos for an incident report
   *
   * @param {string} incidentReportId - Incident report UUID
   * @returns {Promise<Array>} Array of photo documents
   */
  async getIncidentPhotos(incidentReportId) {
    try {
      const { data, error } = await this.supabase
        .from('user_documents')
        .select('*')
        .eq('incident_report_id', incidentReportId)
        .eq('document_type', 'location_photo')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to fetch incident photos', {
          incidentReportId,
          error: error.message
        });
        return [];
      }

      return data || [];

    } catch (error) {
      logger.error('Unexpected error fetching incident photos', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Delete a location photo (soft delete)
   *
   * @param {string} documentId - Document UUID
   * @param {string} userId - User UUID (for authorization)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deletePhoto(documentId, userId) {
    try {
      // Verify ownership
      const { data: document, error: fetchError } = await this.supabase
        .from('user_documents')
        .select('*')
        .eq('id', documentId)
        .eq('create_user_id', userId)
        .single();

      if (fetchError || !document) {
        return {
          success: false,
          error: 'Photo not found or unauthorized'
        };
      }

      // Soft delete
      const { error: deleteError } = await this.supabase
        .from('user_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', documentId);

      if (deleteError) {
        logger.error('Failed to delete photo', {
          documentId,
          error: deleteError.message
        });
        return { success: false, error: deleteError.message };
      }

      logger.info('Photo soft deleted', { documentId });
      return { success: true };

    } catch (error) {
      logger.error('Unexpected error deleting photo', {
        documentId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new LocationPhotoService();
