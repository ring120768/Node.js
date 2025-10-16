/**
 * Image Processor Service
 * Handles image uploads, storage, and retrieval for Car Crash Lawyer AI
 *
 * Features:
 * - Download images from external URLs (e.g., Typeform)
 * - Upload to Supabase Storage with proper paths
 * - Generate signed URLs for secure access
 * - Track images in database with metadata
 * - GDPR-compliant with user isolation
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const config = require('../config');

class ImageProcessor {
  constructor(supabaseClient) {
    if (!supabaseClient) {
      throw new Error('Supabase client is required for ImageProcessor');
    }
    this.supabase = supabaseClient;
    this.initialized = true;
    logger.info('✅ ImageProcessor service initialized');
  }

  /**
   * Download image from URL with retry logic (e.g., Typeform file_url)
   * @param {string} url - Image URL to download
   * @param {number} maxRetries - Maximum retry attempts (default from config)
   * @param {number} retryDelay - Initial delay between retries in ms (default from config)
   * @returns {Promise<{buffer: Buffer, contentType: string, fileName: string}>}
   */
  async downloadFromUrl(
    url,
    maxRetries = config.constants.STORAGE.IMAGE_DOWNLOAD_RETRIES,
    retryDelay = config.constants.STORAGE.IMAGE_DOWNLOAD_RETRY_DELAY
  ) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info('Downloading image from URL', {
          url: url.substring(0, 50) + '...',
          attempt,
          maxRetries
        });

        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000, // 30 seconds
          maxContentLength: config.constants.STORAGE.MAX_FILE_SIZE,
          maxBodyLength: config.constants.STORAGE.MAX_FILE_SIZE
        });

        const buffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'image/jpeg';

        // Extract filename from URL or generate one
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1] || `image_${Date.now()}.jpg`;

        logger.info('Image downloaded successfully', {
          size: buffer.length,
          contentType,
          fileName,
          attempt
        });

        return {
          buffer,
          contentType,
          fileName
        };
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === maxRetries;

        logger.warn('Error downloading image from URL', {
          url: url.substring(0, 50) + '...',
          error: error.message,
          statusCode: error.response?.status,
          attempt,
          maxRetries,
          willRetry: !isLastAttempt
        });

        // Don't retry on certain errors
        if (error.response?.status === 403 || error.response?.status === 401) {
          logger.error('Authentication error - not retrying', {
            statusCode: error.response.status
          });
          break; // Exit retry loop for auth errors
        }

        // If not the last attempt, wait before retrying with exponential backoff
        if (!isLastAttempt) {
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff: 2s, 4s, 8s
          logger.info(`Retrying download after ${delay}ms`, {
            nextAttempt: attempt + 1,
            delay
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    logger.error('Failed to download image after all retries', {
      url: url.substring(0, 50) + '...',
      maxRetries,
      finalError: lastError?.message,
      statusCode: lastError?.response?.status
    });
    throw new Error(`Failed to download image after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Upload image buffer to Supabase Storage
   * @param {Buffer} buffer - Image buffer
   * @param {string} path - Storage path (e.g., "user123/driving-license/abc.jpg")
   * @param {string} contentType - MIME type
   * @returns {Promise<string>} - Storage path
   */
  async uploadToSupabase(buffer, path, contentType = 'image/jpeg') {
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
        contentType
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
          error: error.message
        });
        throw error;
      }

      logger.info('✅ Upload successful', {
        bucket,
        path: data.path
      });

      return `${bucket}/${data.path}`;
    } catch (error) {
      logger.error('Error uploading to Supabase', {
        path,
        error: error.message
      });
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }
  }

  /**
   * Get signed URL for secure image access
   * @param {string} storagePath - Full storage path (bucket/path)
   * @param {number} expirySeconds - URL expiry in seconds (default: 3600)
   * @returns {Promise<string>} - Signed URL
   */
  async getSignedUrl(storagePath, expirySeconds = 3600) {
    try {
      // Split into bucket and path
      const parts = storagePath.split('/');
      const bucket = parts[0];
      const path = parts.slice(1).join('/');

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
   * Create image record in database for tracking
   * @param {Object} data - Image metadata
   * @returns {Promise<Object>} - Database record
   */
  async createImageRecord(data) {
    try {
      const {
        create_user_id,
        incident_report_id = null,
        image_type,
        storage_path,
        original_url = null,
        metadata = {}
      } = data;

      if (!create_user_id || !image_type || !storage_path) {
        throw new Error('Missing required fields: create_user_id, image_type, storage_path');
      }

      const imageRecord = {
        create_user_id,
        incident_report_id,
        image_type,
        storage_path,
        original_url,
        metadata: {
          ...metadata,
          uploaded_at: new Date().toISOString(),
          processor_version: '1.0.0'
        },
        created_at: new Date().toISOString()
      };

      logger.info('Creating image record', {
        userId: create_user_id,
        imageType: image_type,
        storagePath: storage_path
      });

      const { data: record, error } = await this.supabase
        .from('images')
        .insert([imageRecord])
        .select()
        .single();

      if (error) {
        // Non-critical - log warning but don't fail
        logger.warn('Could not create image record (non-critical)', {
          error: error.message,
          code: error.code
        });
        return null;
      }

      logger.info('✅ Image record created', { id: record.id });
      return record;
    } catch (error) {
      logger.warn('Error creating image record (non-critical)', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Process Typeform image: download from URL and upload to Supabase
   * @param {string} typeformUrl - Typeform file_url
   * @param {string} userId - User ID for path isolation
   * @param {string} imageType - Type of image (e.g., 'driving_license', 'vehicle_front')
   * @returns {Promise<string>} - Supabase storage path
   */
  async processTypeformImage(typeformUrl, userId, imageType) {
    try {
      if (!typeformUrl || !typeformUrl.startsWith('http')) {
        throw new Error('Invalid Typeform URL');
      }

      logger.info('Processing Typeform image', {
        userId,
        imageType,
        urlPreview: typeformUrl.substring(0, 50) + '...'
      });

      // Download image from Typeform
      const { buffer, contentType, fileName } = await this.downloadFromUrl(typeformUrl);

      // Generate safe filename with timestamp
      const timestamp = Date.now();
      const ext = fileName.split('.').pop() || 'jpg';
      const safeImageType = imageType.replace(/[^a-z0-9_-]/gi, '_');
      const storagePath = `${userId}/${safeImageType}/${timestamp}_${safeImageType}.${ext}`;

      // Upload to Supabase Storage
      const fullStoragePath = await this.uploadToSupabase(buffer, storagePath, contentType);

      // Create image record (non-critical)
      await this.createImageRecord({
        create_user_id: userId,
        incident_report_id: null,
        image_type: safeImageType,
        storage_path: fullStoragePath,
        original_url: typeformUrl,
        metadata: {
          source: 'typeform',
          original_filename: fileName,
          content_type: contentType,
          size: buffer.length
        }
      });

      logger.info('✅ Typeform image processed successfully', {
        userId,
        imageType,
        storagePath: fullStoragePath
      });

      return fullStoragePath;
    } catch (error) {
      logger.error('Failed to process Typeform image', {
        userId,
        imageType,
        error: error.message
      });
      // Return original URL as fallback
      return typeformUrl;
    }
  }

  /**
   * Process multiple Typeform images in parallel
   * @param {Object} imageUrls - Object with imageType: url pairs
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Object with imageType: storagePath pairs
   */
  async processMultipleImages(imageUrls, userId) {
    const results = {};
    const promises = [];

    for (const [imageType, url] of Object.entries(imageUrls)) {
      if (url && url.startsWith('http')) {
        promises.push(
          this.processTypeformImage(url, userId, imageType)
            .then(storagePath => {
              results[imageType] = storagePath;
            })
            .catch(error => {
              logger.error(`Failed to process ${imageType}`, {
                userId,
                error: error.message
              });
              results[imageType] = url; // Fallback to original URL
            })
        );
      }
    }

    await Promise.all(promises);

    logger.info('Batch image processing complete', {
      userId,
      totalImages: Object.keys(imageUrls).length,
      processed: Object.keys(results).length
    });

    return results;
  }
}

module.exports = ImageProcessor;
