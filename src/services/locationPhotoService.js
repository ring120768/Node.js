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
   * Finalize location photos: Move from temp storage to permanent
   *
   * @param {string} userId - User UUID
   * @param {string} incidentReportId - Incident report UUID
   * @param {string} sessionId - Temp session ID from localStorage
   * @returns {Promise<{success: boolean, photos: Array, error?: string}>}
   */
  async finalizePhotos(userId, incidentReportId, sessionId) {
    try {
      logger.info('Finalizing location photos', {
        userId,
        incidentReportId,
        sessionId
      });

      // 1. Get temp uploads for this session (scene photos only)
      const { data: tempUploads, error: fetchError } = await this.supabase
        .from('temp_uploads')
        .select('*')
        .eq('session_id', sessionId)
        .eq('field_name', 'scene_photo')
        .eq('claimed', false)
        .order('uploaded_at', { ascending: true });

      if (fetchError) {
        logger.error('Error fetching temp uploads', { error: fetchError });
        throw new Error(`Failed to fetch temp uploads: ${fetchError.message}`);
      }

      if (!tempUploads || tempUploads.length === 0) {
        logger.warn('No temp uploads found for session', { sessionId });
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

          // Generate permanent path
          const permanentPath = `users/${userId}/incident-reports/${incidentReportId}/location-photos/scene_photo_${photoNumber}${ext}`;

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

          // Create user_documents record
          const document = await this.createDocumentRecord({
            userId,
            incidentReportId,
            storageePath: permanentPath,
            fileSize: upload.file_size,
            mimeType: upload.mime_type,
            photoNumber
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
            storageePath: permanentPath,
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

      logger.info('Location photos finalization complete', result);

      return result;

    } catch (error) {
      logger.error('Location photo finalization failed', {
        error: error.message,
        userId,
        incidentReportId,
        sessionId
      });

      return {
        success: false,
        error: error.message,
        photos: []
      };
    }
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
   * Create user_documents record for permanent photo
   *
   * @param {Object} params - Document parameters
   * @returns {Promise<Object|null>} Document record or null
   */
  async createDocumentRecord({
    userId,
    incidentReportId,
    storageePath,
    fileSize,
    mimeType,
    photoNumber
  }) {
    try {
      const { data, error } = await this.supabase
        .from('user_documents')
        .insert({
          create_user_id: userId,
          incident_report_id: incidentReportId,
          document_type: 'location_photo',
          storage_path: storageePath,
          file_size: fileSize,
          mime_type: mimeType,
          status: 'completed',
          metadata: {
            photo_number: photoNumber,
            source: 'page_4a_location_photos'
          }
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create document record', {
          error: error.message,
          userId,
          incidentReportId
        });
        return null;
      }

      logger.info('Document record created', { documentId: data.id });
      return data;

    } catch (error) {
      logger.error('Unexpected error creating document record', {
        error: error.message
      });
      return null;
    }
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
