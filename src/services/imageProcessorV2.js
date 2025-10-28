/**
 * Image Processor Service V2
 * Enhanced version with user_documents table integration
 *
 * Features:
 * - Comprehensive status tracking (pending, processing, completed, failed)
 * - Enhanced error handling with categorization
 * - Retry mechanism with exponential backoff
 * - Better logging and monitoring
 * - Integration with user_documents table
 * - Backwards compatible with existing imageProcessor
 * - GDPR-compliant with user isolation
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const config = require('../config');

class ImageProcessorV2 {
  constructor(supabaseClient) {
    if (!supabaseClient) {
      throw new Error('Supabase client is required for ImageProcessorV2');
    }
    this.supabase = supabaseClient;
    this.initialized = true;
    logger.info('✅ ImageProcessorV2 service initialized with user_documents support');
  }

  /**
   * Calculate SHA-256 checksum of a buffer
   * @param {Buffer} buffer - File buffer
   * @returns {string} - SHA-256 hash in hex format
   */
  calculateChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Create a document record in user_documents table
   * @param {Object} data - Document metadata
   * @returns {Promise<Object>} - Database record
   */
  async createDocumentRecord(data) {
    try {
      const {
        create_user_id,
        document_type,
        document_category = 'user_signup',
        source_type = 'typeform',
        source_id = null,
        source_field = null,
        original_filename = null,
        original_url = null,
        storage_bucket = null,
        storage_path = null,
        file_size = null,
        mime_type = null,
        file_extension = null,
        status = 'pending',
        metadata = {},
        // NEW: Dual retention model fields
        associated_with = null,
        associated_id = null,
        original_checksum_sha256 = null,
        current_checksum_sha256 = null
      } = data;

      // Validate required fields
      if (!create_user_id || !document_type) {
        throw new Error('Missing required fields: create_user_id, document_type');
      }

      const documentRecord = {
        create_user_id,
        document_type,
        document_category,
        source_type,
        source_id,
        source_field,
        original_filename,
        original_url,
        storage_bucket,
        storage_path,
        file_size,
        mime_type,
        file_extension,
        status,
        retry_count: 0,
        max_retries: config.constants.STORAGE.IMAGE_DOWNLOAD_RETRIES,
        // NEW: Dual retention model fields
        associated_with,
        associated_id,
        original_checksum_sha256,
        current_checksum_sha256,
        checksum_algorithm: original_checksum_sha256 ? 'sha256' : null,
        metadata: {
          ...metadata,
          processor_version: '2.1.0', // Updated for dual retention support
          created_by: 'imageProcessorV2',
          has_checksum: !!original_checksum_sha256
        }
      };

      logger.info('Creating document record', {
        userId: create_user_id,
        documentType: document_type,
        status
      });

      const { data: record, error } = await this.supabase
        .from('user_documents')
        .insert([documentRecord])
        .select()
        .single();

      if (error) {
        logger.error('Failed to create document record', {
          error: error.message,
          code: error.code,
          details: error.details
        });
        throw error;
      }

      logger.info('✅ Document record created', {
        id: record.id,
        documentType: record.document_type,
        status: record.status
      });

      return record;
    } catch (error) {
      logger.error('Error creating document record', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update document record status
   * @param {string} documentId - Document ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated record
   */
  async updateDocumentRecord(documentId, updates) {
    try {
      logger.info('Updating document record', {
        documentId,
        updates: Object.keys(updates)
      });

      // Auto-set updated_at
      updates.updated_at = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('user_documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update document record', {
          documentId,
          error: error.message
        });
        throw error;
      }

      logger.info('✅ Document record updated', {
        documentId,
        status: data.status
      });

      return data;
    } catch (error) {
      logger.error('Error updating document record', {
        documentId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Download image from URL with retry logic (e.g., Typeform file_url)
   * Enhanced with better error categorization
   * @param {string} url - Image URL to download
   * @param {string} documentId - Document ID for status tracking
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} retryDelay - Initial delay between retries in ms
   * @returns {Promise<{buffer: Buffer, contentType: string, fileName: string, fileSize: number}>}
   */
  async downloadFromUrl(
    url,
    documentId = null,
    maxRetries = config.constants.STORAGE.IMAGE_DOWNLOAD_RETRIES,
    retryDelay = config.constants.STORAGE.IMAGE_DOWNLOAD_RETRY_DELAY
  ) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info('Downloading image from URL', {
          url: url.substring(0, 50) + '...',
          attempt,
          maxRetries,
          documentId
        });

        // Update status to processing on first attempt
        if (documentId && attempt === 1) {
          await this.updateDocumentRecord(documentId, {
            status: 'processing',
            processing_started_at: new Date().toISOString(),
            retry_count: attempt - 1
          });
        } else if (documentId && attempt > 1) {
          // Update retry count on subsequent attempts
          await this.updateDocumentRecord(documentId, {
            retry_count: attempt - 1,
            last_retry_at: new Date().toISOString()
          });
        }

        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000, // 30 seconds
          maxContentLength: config.constants.STORAGE.MAX_FILE_SIZE,
          maxBodyLength: config.constants.STORAGE.MAX_FILE_SIZE
        });

        const buffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const fileSize = buffer.length;

        // Extract filename from URL or generate one
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1] || `image_${Date.now()}.jpg`;

        logger.info('Image downloaded successfully', {
          size: fileSize,
          contentType,
          fileName,
          attempt,
          documentId
        });

        return {
          buffer,
          contentType,
          fileName,
          fileSize
        };
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === maxRetries;

        // Categorize error
        const errorCategory = this.categorizeDownloadError(error);

        logger.warn('Error downloading image from URL', {
          url: url.substring(0, 50) + '...',
          error: error.message,
          errorCategory,
          statusCode: error.response?.status,
          attempt,
          maxRetries,
          willRetry: !isLastAttempt,
          documentId
        });

        // Update document record with error on last attempt
        if (documentId && isLastAttempt) {
          await this.updateDocumentRecord(documentId, {
            status: 'failed',
            error_message: error.message,
            error_code: errorCategory,
            error_details: {
              statusCode: error.response?.status,
              attempt,
              url: url.substring(0, 100)
            },
            retry_count: attempt
          });
        }

        // Don't retry on certain errors
        if (errorCategory === 'AUTH_ERROR' || errorCategory === 'NOT_FOUND') {
          logger.error('Non-retryable error - stopping attempts', {
            errorCategory,
            statusCode: error.response?.status,
            documentId
          });
          break; // Exit retry loop
        }

        // If not the last attempt, wait before retrying with exponential backoff
        if (!isLastAttempt) {
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff: 2s, 4s, 8s
          logger.info(`Retrying download after ${delay}ms`, {
            nextAttempt: attempt + 1,
            delay,
            documentId
          });

          // Set next retry time in database
          if (documentId) {
            const nextRetryAt = new Date(Date.now() + delay);
            await this.updateDocumentRecord(documentId, {
              next_retry_at: nextRetryAt.toISOString()
            });
          }

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    logger.error('Failed to download image after all retries', {
      url: url.substring(0, 50) + '...',
      maxRetries,
      finalError: lastError?.message,
      statusCode: lastError?.response?.status,
      documentId
    });
    throw new Error(`Failed to download image after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Categorize download errors for better handling
   * @param {Error} error - Axios error
   * @returns {string} - Error category
   */
  categorizeDownloadError(error) {
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) return 'AUTH_ERROR';
      if (status === 404) return 'NOT_FOUND';
      if (status === 408 || status === 504) return 'TIMEOUT';
      if (status === 429) return 'RATE_LIMIT';
      if (status >= 500) return 'SERVER_ERROR';
      return 'HTTP_ERROR';
    }
    if (error.code === 'ECONNABORTED') return 'TIMEOUT';
    if (error.code === 'ENOTFOUND') return 'DNS_ERROR';
    if (error.code === 'ECONNREFUSED') return 'CONNECTION_REFUSED';
    if (error.message?.includes('maxContentLength')) return 'FILE_TOO_LARGE';
    return 'UNKNOWN_ERROR';
  }

  /**
   * Upload image buffer to Supabase Storage
   * Enhanced with better error handling
   * @param {Buffer} buffer - Image buffer
   * @param {string} path - Storage path (e.g., "user123/driving-license/abc.jpg")
   * @param {string} contentType - MIME type
   * @param {string} documentId - Document ID for status tracking
   * @returns {Promise<string>} - Storage path
   */
  async uploadToSupabase(buffer, path, contentType = 'image/jpeg', documentId = null) {
    try {
      // Determine bucket based on path
      let bucket = config.constants.STORAGE.BUCKETS.USER_DOCUMENTS;

      if (path.includes('/incident/') || path.includes('/vehicle/') || path.includes('/what3words/')) {
        bucket = config.constants.STORAGE.BUCKETS.INCIDENT_IMAGES;
      }

      logger.info('Uploading to Supabase Storage', {
        bucket,
        path,
        size: buffer.length,
        contentType,
        documentId
      });

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType,
          upsert: true, // Overwrite if exists
          cacheControl: '3600' // Cache for 1 hour
        });

      if (error) {
        logger.error('Supabase Storage upload failed', {
          bucket,
          path,
          error: error.message,
          documentId
        });

        // Update document record with error
        if (documentId) {
          await this.updateDocumentRecord(documentId, {
            status: 'failed',
            error_message: `Storage upload failed: ${error.message}`,
            error_code: 'STORAGE_UPLOAD_ERROR',
            error_details: {
              bucket,
              path,
              error: error.message
            }
          });
        }

        throw error;
      }

      logger.info('✅ Upload successful', {
        bucket,
        path: data.path,
        documentId
      });

      const fullStoragePath = `${bucket}/${data.path}`;

      // Update document record with storage info
      if (documentId) {
        await this.updateDocumentRecord(documentId, {
          storage_bucket: bucket,
          storage_path: fullStoragePath
        });
      }

      return fullStoragePath;
    } catch (error) {
      logger.error('Error uploading to Supabase', {
        path,
        error: error.message,
        documentId
      });
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }
  }

  /**
   * Get signed URL for secure image access
   * @param {string} storagePath - Full storage path (bucket/path or just path)
   * @param {number} expirySeconds - URL expiry in seconds (default: 3600)
   * @returns {Promise<string>} - Signed URL
   */
  async getSignedUrl(storagePath, expirySeconds = 3600) {
    try {
      // The bucket is always 'user-documents'
      const bucket = 'user-documents';

      // The storage path in the database already includes the full path
      // e.g., "199d9251-b2e0-40a5-80bf-fc1529d9bf6c/driving_license_picture/1760653683931_driving_license_picture.jpeg"
      // Remove 'user-documents/' prefix if present
      let path = storagePath;
      if (path.startsWith('user-documents/')) {
        path = path.replace('user-documents/', '');
      }

      logger.info('Generating signed URL', {
        bucket,
        path,
        expirySeconds
      });

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expirySeconds);

      if (error) {
        logger.error('Failed to create signed URL', {
          bucket,
          path,
          error: error.message
        });
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      logger.error('Error creating signed URL', {
        storagePath,
        error: error.message
      });
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }
  }

  /**
   * Process Typeform image: download from URL and upload to Supabase
   * Enhanced version with user_documents table integration + checksums
   * @param {string} typeformUrl - Typeform file_url
   * @param {string} userId - User ID for path isolation
   * @param {string} imageType - Type of image (e.g., 'driving_license', 'vehicle_front')
   * @param {Object} options - Additional options
   * @returns {Promise<{storagePath: string, documentId: string, status: string, checksum: string}>}
   */
  async processTypeformImage(typeformUrl, userId, imageType, options = {}) {
    const {
      documentCategory = 'user_signup',
      sourceId = null,
      sourceField = null,
      // NEW: Dual retention model fields
      associatedWith = null,
      associatedId = null
    } = options;

    let documentId = null;

    try {
      if (!typeformUrl || !typeformUrl.startsWith('http')) {
        throw new Error('Invalid Typeform URL');
      }

      logger.info('Processing Typeform image', {
        userId,
        imageType,
        urlPreview: typeformUrl.substring(0, 50) + '...',
        documentCategory,
        associatedWith,
        associatedId
      });

      // Step 1: Create document record in pending state
      const documentRecord = await this.createDocumentRecord({
        create_user_id: userId,
        document_type: imageType,
        document_category: documentCategory,
        source_type: 'typeform',
        source_id: sourceId,
        source_field: sourceField,
        original_url: typeformUrl,
        status: 'pending',
        // NEW: Association tracking for dual retention
        associated_with: associatedWith,
        associated_id: associatedId,
        metadata: {
          source: 'typeform',
          url_preview: typeformUrl.substring(0, 100)
        }
      });

      documentId = documentRecord.id;

      logger.info('Document record created in pending state', {
        documentId,
        userId,
        imageType,
        associatedWith
      });

      // Step 2: Download image from Typeform
      const { buffer, contentType, fileName, fileSize } = await this.downloadFromUrl(
        typeformUrl,
        documentId
      );

      // Step 2.5: Calculate SHA-256 checksum (NEW for data integrity)
      const checksum = this.calculateChecksum(buffer);
      logger.info('Checksum calculated', {
        documentId,
        checksum: checksum.substring(0, 16) + '...',
        fileSize
      });

      // Update document record with file metadata + checksum
      const ext = fileName.split('.').pop() || 'jpg';
      await this.updateDocumentRecord(documentId, {
        original_filename: fileName,
        file_size: fileSize,
        mime_type: contentType,
        file_extension: `.${ext}`,
        // NEW: Store checksum for integrity verification
        original_checksum_sha256: checksum,
        current_checksum_sha256: checksum,
        checksum_verified_at: new Date().toISOString()
      });

      // Step 3: Generate storage path
      const timestamp = Date.now();
      const safeImageType = imageType.replace(/[^a-z0-9_-]/gi, '_');
      const storagePath = `${userId}/${safeImageType}/${timestamp}_${safeImageType}.${ext}`;

      // Step 4: Upload to Supabase Storage
      const fullStoragePath = await this.uploadToSupabase(
        buffer,
        storagePath,
        contentType,
        documentId
      );

      // Step 5: Generate signed URL (12 months expiry to match subscription period)
      const signedUrlExpirySeconds = 31536000; // 365 days (12 months)
      const signedUrl = await this.getSignedUrl(fullStoragePath, signedUrlExpirySeconds);
      const signedUrlExpiresAt = new Date(Date.now() + (signedUrlExpirySeconds * 1000));

      // Step 6: Mark as completed
      const processingEndTime = Date.now();
      const processingStartTime = new Date(documentRecord.created_at).getTime();
      const processingDuration = processingEndTime - processingStartTime;

      await this.updateDocumentRecord(documentId, {
        status: 'completed',
        public_url: signedUrl, // Keep for backwards compatibility
        signed_url: signedUrl, // NEW: Store in signed_url field for PDF generation
        signed_url_expires_at: signedUrlExpiresAt.toISOString(), // NEW: Track expiry
        processing_completed_at: new Date().toISOString(),
        processing_duration_ms: processingDuration
      });

      logger.info('✅ Typeform image processed successfully', {
        documentId,
        userId,
        imageType,
        storagePath: fullStoragePath,
        processingDuration: `${processingDuration}ms`,
        checksum: checksum.substring(0, 16) + '...'
      });

      return {
        storagePath: fullStoragePath,
        documentId,
        status: 'completed',
        publicUrl: signedUrl,
        checksum  // NEW: Return checksum for verification
      };

    } catch (error) {
      logger.error('Failed to process Typeform image', {
        documentId,
        userId,
        imageType,
        error: error.message,
        stack: error.stack
      });

      // Mark as failed if we have a document ID
      if (documentId) {
        try {
          await this.updateDocumentRecord(documentId, {
            status: 'failed',
            error_message: error.message,
            error_code: 'PROCESSING_ERROR'
          });
        } catch (updateError) {
          logger.error('Failed to update document status to failed', {
            documentId,
            error: updateError.message
          });
        }
      }

      // Return original URL as fallback
      return {
        storagePath: typeformUrl,
        documentId,
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Process multiple Typeform images in parallel
   * Enhanced with better tracking and error handling
   * @param {Object} imageUrls - Object with imageType: url pairs
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Object with imageType: {storagePath, documentId, status} pairs
   */
  async processMultipleImages(imageUrls, userId, options = {}) {
    const results = {};
    const promises = [];

    logger.info('Starting batch image processing', {
      userId,
      totalImages: Object.keys(imageUrls).length,
      imageTypes: Object.keys(imageUrls)
    });

    for (const [imageType, url] of Object.entries(imageUrls)) {
      if (url && url.startsWith('http')) {
        promises.push(
          this.processTypeformImage(url, userId, imageType, options)
            .then(result => {
              results[imageType] = result;
              logger.info(`✅ Processed ${imageType}`, {
                userId,
                status: result.status,
                documentId: result.documentId
              });
            })
            .catch(error => {
              logger.error(`❌ Failed to process ${imageType}`, {
                userId,
                error: error.message
              });
              results[imageType] = {
                storagePath: url, // Fallback to original URL
                documentId: null,
                status: 'failed',
                error: error.message
              };
            })
        );
      }
    }

    await Promise.all(promises);

    const completedCount = Object.values(results).filter(r => r.status === 'completed').length;
    const failedCount = Object.values(results).filter(r => r.status === 'failed').length;

    logger.info('Batch image processing complete', {
      userId,
      totalImages: Object.keys(imageUrls).length,
      processed: Object.keys(results).length,
      completed: completedCount,
      failed: failedCount
    });

    // Log failed images for visibility
    if (failedCount > 0) {
      const failedImages = Object.entries(results)
        .filter(([_, result]) => result.status === 'failed')
        .map(([type, result]) => ({ type, error: result.error }));

      logger.warn('Some images failed to process', {
        userId,
        failedCount,
        failedImages
      });
    }

    return results;
  }

  /**
   * Get all documents for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters (status, document_type, etc.)
   * @returns {Promise<Array>} - Array of documents
   */
  async getUserDocuments(userId, filters = {}) {
    try {
      let query = this.supabase
        .from('user_documents')
        .select('*')
        .eq('create_user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.document_type) {
        query = query.eq('document_type', filters.document_type);
      }
      if (filters.document_category) {
        query = query.eq('document_category', filters.document_category);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get user documents', {
          userId,
          error: error.message
        });
        throw error;
      }

      logger.info('Retrieved user documents', {
        userId,
        count: data.length,
        filters
      });

      return data;
    } catch (error) {
      logger.error('Error getting user documents', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ImageProcessorV2;
