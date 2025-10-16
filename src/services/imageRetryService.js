/**
 * Image Retry Service
 * Automatically retries failed image processing jobs
 *
 * Features:
 * - Finds failed documents needing retry
 * - Uses exponential backoff for retries
 * - Updates retry_count and next_retry_at
 * - Marks as permanently failed after max retries
 * - Can be run as a cron job or on-demand
 * - Comprehensive logging for monitoring
 */

const logger = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');
const ImageProcessorV2 = require('./imageProcessorV2');

class ImageRetryService {
  constructor(supabaseClient = null) {
    // Create Supabase client if not provided
    this.supabase = supabaseClient || createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    this.imageProcessor = new ImageProcessorV2(this.supabase);
    logger.info('✅ ImageRetryService initialized');
  }

  /**
   * Get documents that need retry
   * @param {number} limit - Maximum number of documents to retry
   * @returns {Promise<Array>} - Array of documents needing retry
   */
  async getDocumentsNeedingRetry(limit = 10) {
    try {
      logger.info('Fetching documents needing retry', { limit });

      const { data, error } = await this.supabase
        .from('user_documents')
        .select('*')
        .eq('status', 'failed')
        .lt('retry_count', this.supabase.raw('max_retries'))
        .or('next_retry_at.is.null,next_retry_at.lte.now()')
        .is('deleted_at', null)
        .order('next_retry_at', { ascending: true, nullsFirst: true })
        .limit(limit);

      if (error) {
        logger.error('Failed to fetch documents needing retry', {
          error: error.message
        });
        throw error;
      }

      logger.info('Found documents needing retry', {
        count: data.length
      });

      return data;
    } catch (error) {
      logger.error('Error fetching documents needing retry', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Retry a single failed document
   * @param {Object} document - Document record from user_documents
   * @returns {Promise<Object>} - Retry result
   */
  async retryDocument(document) {
    const { id, create_user_id, document_type, original_url, retry_count, max_retries } = document;

    try {
      logger.info('Retrying document', {
        documentId: id,
        userId: create_user_id,
        documentType: document_type,
        retryCount: retry_count,
        maxRetries: max_retries
      });

      // Check if we've exceeded max retries
      if (retry_count >= max_retries) {
        logger.warn('Document has exceeded max retries - marking as permanently failed', {
          documentId: id,
          retryCount: retry_count,
          maxRetries: max_retries
        });

        await this.supabase
          .from('user_documents')
          .update({
            status: 'failed',
            error_message: `Permanently failed after ${retry_count} retries`,
            error_code: 'MAX_RETRIES_EXCEEDED',
            next_retry_at: null, // Clear next retry time
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        return {
          documentId: id,
          status: 'permanently_failed',
          message: 'Max retries exceeded'
        };
      }

      // Update status to processing
      await this.supabase
        .from('user_documents')
        .update({
          status: 'processing',
          processing_started_at: new Date().toISOString(),
          retry_count: retry_count + 1,
          last_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      // Download image from original URL
      const { buffer, contentType, fileName, fileSize } = await this.imageProcessor.downloadFromUrl(
        original_url,
        id,
        1 // Only 1 attempt here since we're managing retries at the service level
      );

      // Update file metadata
      const ext = fileName.split('.').pop() || 'jpg';
      await this.supabase
        .from('user_documents')
        .update({
          original_filename: fileName,
          file_size: fileSize,
          mime_type: contentType,
          file_extension: `.${ext}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      // Generate storage path
      const timestamp = Date.now();
      const safeDocumentType = document_type.replace(/[^a-z0-9_-]/gi, '_');
      const storagePath = `${create_user_id}/${safeDocumentType}/${timestamp}_${safeDocumentType}.${ext}`;

      // Upload to Supabase Storage
      const fullStoragePath = await this.imageProcessor.uploadToSupabase(
        buffer,
        storagePath,
        contentType,
        id
      );

      // Generate signed URL
      const signedUrl = await this.imageProcessor.getSignedUrl(fullStoragePath, 86400); // 24 hours

      // Mark as completed
      const processingEndTime = new Date();
      const processingStartTime = new Date(document.processing_started_at || document.created_at);
      const processingDuration = processingEndTime - processingStartTime;

      await this.supabase
        .from('user_documents')
        .update({
          status: 'completed',
          public_url: signedUrl,
          processing_completed_at: processingEndTime.toISOString(),
          processing_duration_ms: processingDuration,
          error_message: null, // Clear previous error
          error_code: null,
          error_details: null,
          next_retry_at: null, // Clear next retry time
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      logger.info('✅ Document retry successful', {
        documentId: id,
        userId: create_user_id,
        documentType: document_type,
        storagePath: fullStoragePath,
        retryAttempt: retry_count + 1
      });

      return {
        documentId: id,
        status: 'completed',
        storagePath: fullStoragePath,
        retryAttempt: retry_count + 1
      };

    } catch (error) {
      logger.error('Document retry failed', {
        documentId: id,
        userId: create_user_id,
        documentType: document_type,
        retryCount: retry_count + 1,
        error: error.message
      });

      // Calculate next retry time with exponential backoff
      const baseDelay = 5 * 60 * 1000; // 5 minutes base delay
      const nextDelay = baseDelay * Math.pow(2, retry_count); // 5m, 10m, 20m, 40m...
      const nextRetryAt = new Date(Date.now() + nextDelay);

      // Update with error and schedule next retry
      await this.supabase
        .from('user_documents')
        .update({
          status: 'failed',
          error_message: error.message,
          error_code: this.imageProcessor.categorizeDownloadError(error),
          error_details: {
            retryAttempt: retry_count + 1,
            timestamp: new Date().toISOString()
          },
          retry_count: retry_count + 1,
          next_retry_at: nextRetryAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      return {
        documentId: id,
        status: 'failed',
        error: error.message,
        nextRetryAt: nextRetryAt.toISOString(),
        retryAttempt: retry_count + 1
      };
    }
  }

  /**
   * Process retry queue
   * @param {number} limit - Maximum number of documents to process
   * @returns {Promise<Object>} - Summary of retry results
   */
  async processRetryQueue(limit = 10) {
    const startTime = Date.now();

    try {
      logger.info('Starting retry queue processing', { limit });

      // Get documents needing retry
      const documents = await this.getDocumentsNeedingRetry(limit);

      if (documents.length === 0) {
        logger.info('No documents need retry');
        return {
          processed: 0,
          succeeded: 0,
          failed: 0,
          permanentlyFailed: 0,
          duration: Date.now() - startTime
        };
      }

      // Process each document
      const results = [];
      for (const document of documents) {
        const result = await this.retryDocument(document);
        results.push(result);

        // Small delay between retries to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate summary
      const succeeded = results.filter(r => r.status === 'completed').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const permanentlyFailed = results.filter(r => r.status === 'permanently_failed').length;
      const duration = Date.now() - startTime;

      logger.info('✅ Retry queue processing complete', {
        processed: results.length,
        succeeded,
        failed,
        permanentlyFailed,
        duration: `${duration}ms`
      });

      return {
        processed: results.length,
        succeeded,
        failed,
        permanentlyFailed,
        duration,
        results
      };

    } catch (error) {
      logger.error('Error processing retry queue', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get retry statistics
   * @returns {Promise<Object>} - Retry statistics
   */
  async getRetryStatistics() {
    try {
      logger.info('Fetching retry statistics');

      const { data, error } = await this.supabase
        .from('user_documents')
        .select('status, retry_count, error_code')
        .is('deleted_at', null);

      if (error) {
        logger.error('Failed to fetch retry statistics', {
          error: error.message
        });
        throw error;
      }

      // Calculate statistics
      const total = data.length;
      const failed = data.filter(d => d.status === 'failed').length;
      const needingRetry = data.filter(d =>
        d.status === 'failed' && d.retry_count < 3
      ).length;
      const permanentlyFailed = data.filter(d =>
        d.status === 'failed' && d.retry_count >= 3
      ).length;

      // Group by error code
      const errorCodes = data.reduce((acc, doc) => {
        if (doc.error_code) {
          acc[doc.error_code] = (acc[doc.error_code] || 0) + 1;
        }
        return acc;
      }, {});

      // Calculate average retry count for failed documents
      const failedDocs = data.filter(d => d.status === 'failed');
      const avgRetryCount = failedDocs.length > 0
        ? failedDocs.reduce((sum, d) => sum + (d.retry_count || 0), 0) / failedDocs.length
        : 0;

      const stats = {
        total,
        failed,
        needingRetry,
        permanentlyFailed,
        avgRetryCount: avgRetryCount.toFixed(2),
        errorCodes
      };

      logger.info('Retry statistics', stats);

      return stats;
    } catch (error) {
      logger.error('Error fetching retry statistics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Manually retry a specific document by ID
   * @param {string} documentId - Document UUID
   * @returns {Promise<Object>} - Retry result
   */
  async retryDocumentById(documentId) {
    try {
      logger.info('Manually retrying document', { documentId });

      const { data: document, error } = await this.supabase
        .from('user_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) {
        logger.error('Failed to fetch document for manual retry', {
          documentId,
          error: error.message
        });
        throw error;
      }

      if (!document) {
        throw new Error('Document not found');
      }

      if (document.status === 'completed') {
        logger.warn('Document is already completed', { documentId });
        return {
          documentId,
          status: 'already_completed',
          message: 'Document is already successfully processed'
        };
      }

      return await this.retryDocument(document);
    } catch (error) {
      logger.error('Error in manual retry', {
        documentId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ImageRetryService;
