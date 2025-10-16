/**
 * User Documents Controller
 * Handles user-facing API endpoints for accessing their documents
 *
 * Features:
 * - List user's documents with filtering
 * - Get specific document details
 * - Generate fresh signed URLs
 * - Get document statistics
 * - Download documents
 * - Soft delete documents (GDPR)
 */

const logger = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');
const ImageProcessorV2 = require('../services/imageProcessorV2');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const imageProcessor = new ImageProcessorV2(supabase);

/**
 * GET /api/user-documents
 * List all documents for the authenticated user
 */
async function listUserDocuments(req, res) {
  const requestId = req.id || crypto.randomBytes(8).toString('hex');

  try {
    // Get user ID from auth or query params (for testing)
    const userId = req.user?.id || req.query.user_id;

    if (!userId) {
      logger.warn(`[${requestId}] Missing user ID`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Get filters from query params
    const {
      status,
      document_type,
      document_category,
      limit = 100,
      offset = 0
    } = req.query;

    logger.info(`[${requestId}] Listing user documents`, {
      userId,
      filters: { status, document_type, document_category },
      limit,
      offset
    });

    // Build query
    let query = supabase
      .from('user_documents')
      .select('*', { count: 'exact' })
      .eq('create_user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Apply filters
    if (status) query = query.eq('status', status);
    if (document_type) query = query.eq('document_type', document_type);
    if (document_category) query = query.eq('document_category', document_category);

    const { data: documents, error, count } = await query;

    if (error) {
      logger.error(`[${requestId}] Failed to fetch documents`, {
        error: error.message,
        userId
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch documents',
        code: 'DATABASE_ERROR'
      });
    }

    // Generate fresh signed URLs for completed documents
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        if (doc.status === 'completed' && doc.storage_path) {
          try {
            const signedUrl = await imageProcessor.getSignedUrl(doc.storage_path, 3600);
            return { ...doc, signed_url: signedUrl };
          } catch (error) {
            logger.warn(`[${requestId}] Failed to generate signed URL`, {
              documentId: doc.id,
              error: error.message
            });
            return doc;
          }
        }
        return doc;
      })
    );

    logger.info(`[${requestId}] Documents retrieved successfully`, {
      userId,
      count,
      returned: documents.length
    });

    return res.status(200).json({
      success: true,
      data: {
        documents: documentsWithUrls,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: count > (parseInt(offset) + documents.length)
        }
      }
    });

  } catch (error) {
    logger.error(`[${requestId}] Error in listUserDocuments`, {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/user-documents/:id
 * Get specific document details
 */
async function getDocument(req, res) {
  const requestId = req.id || crypto.randomBytes(8).toString('hex');

  try {
    const userId = req.user?.id || req.query.user_id;
    const documentId = req.params.id;

    if (!userId) {
      logger.warn(`[${requestId}] Missing user ID`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    logger.info(`[${requestId}] Getting document`, {
      userId,
      documentId
    });

    const { data: document, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .eq('create_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !document) {
      logger.warn(`[${requestId}] Document not found`, {
        documentId,
        userId,
        error: error?.message
      });
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        code: 'NOT_FOUND'
      });
    }

    // Generate fresh signed URL
    if (document.status === 'completed' && document.storage_path) {
      try {
        const signedUrl = await imageProcessor.getSignedUrl(document.storage_path, 3600);
        document.signed_url = signedUrl;
      } catch (error) {
        logger.warn(`[${requestId}] Failed to generate signed URL`, {
          documentId,
          error: error.message
        });
      }
    }

    logger.info(`[${requestId}] Document retrieved successfully`, {
      documentId,
      userId
    });

    return res.status(200).json({
      success: true,
      data: document
    });

  } catch (error) {
    logger.error(`[${requestId}] Error in getDocument`, {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/user-documents/stats
 * Get document statistics for user
 */
async function getDocumentStats(req, res) {
  const requestId = req.id || crypto.randomBytes(8).toString('hex');

  try {
    const userId = req.user?.id || req.query.user_id;

    if (!userId) {
      logger.warn(`[${requestId}] Missing user ID`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    logger.info(`[${requestId}] Getting document stats`, { userId });

    // Use the helper function from the schema
    const { data: stats, error } = await supabase
      .rpc('get_user_document_stats', { user_id: userId });

    if (error) {
      logger.error(`[${requestId}] Failed to get stats`, {
        error: error.message,
        userId
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
        code: 'DATABASE_ERROR'
      });
    }

    logger.info(`[${requestId}] Stats retrieved successfully`, {
      userId,
      total: stats[0]?.total_documents
    });

    return res.status(200).json({
      success: true,
      data: stats[0] || {
        total_documents: 0,
        pending_documents: 0,
        processing_documents: 0,
        completed_documents: 0,
        failed_documents: 0,
        total_size_bytes: 0,
        document_types: {}
      }
    });

  } catch (error) {
    logger.error(`[${requestId}] Error in getDocumentStats`, {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * POST /api/user-documents/:id/refresh-url
 * Generate a fresh signed URL for a document
 */
async function refreshSignedUrl(req, res) {
  const requestId = req.id || crypto.randomBytes(8).toString('hex');

  try {
    const userId = req.user?.id || req.query.user_id;
    const documentId = req.params.id;
    const expirySeconds = req.body?.expiry_seconds || 3600; // Default 1 hour

    if (!userId) {
      logger.warn(`[${requestId}] Missing user ID`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    logger.info(`[${requestId}] Refreshing signed URL`, {
      userId,
      documentId,
      expirySeconds
    });

    // Get document
    const { data: document, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .eq('create_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !document) {
      logger.warn(`[${requestId}] Document not found`, {
        documentId,
        userId
      });
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        code: 'NOT_FOUND'
      });
    }

    if (document.status !== 'completed' || !document.storage_path) {
      logger.warn(`[${requestId}] Document not ready for URL generation`, {
        documentId,
        status: document.status
      });
      return res.status(400).json({
        success: false,
        error: 'Document not ready',
        code: 'DOCUMENT_NOT_READY',
        status: document.status
      });
    }

    // Generate fresh signed URL
    const signedUrl = await imageProcessor.getSignedUrl(document.storage_path, expirySeconds);

    // Update public_url in database
    await supabase
      .from('user_documents')
      .update({
        public_url: signedUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    logger.info(`[${requestId}] Signed URL refreshed`, {
      documentId,
      expirySeconds
    });

    return res.status(200).json({
      success: true,
      data: {
        signed_url: signedUrl,
        expires_in: expirySeconds,
        document_id: documentId
      }
    });

  } catch (error) {
    logger.error(`[${requestId}] Error in refreshSignedUrl`, {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * DELETE /api/user-documents/:id
 * Soft delete a document (GDPR compliance)
 */
async function deleteDocument(req, res) {
  const requestId = req.id || crypto.randomBytes(8).toString('hex');

  try {
    const userId = req.user?.id || req.query.user_id;
    const documentId = req.params.id;

    if (!userId) {
      logger.warn(`[${requestId}] Missing user ID`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    logger.info(`[${requestId}] Deleting document`, {
      userId,
      documentId
    });

    // Soft delete (set deleted_at timestamp)
    const { error } = await supabase
      .from('user_documents')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('create_user_id', userId);

    if (error) {
      logger.error(`[${requestId}] Failed to delete document`, {
        documentId,
        userId,
        error: error.message
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to delete document',
        code: 'DATABASE_ERROR'
      });
    }

    logger.info(`[${requestId}] Document deleted successfully`, {
      documentId,
      userId
    });

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
      document_id: documentId
    });

  } catch (error) {
    logger.error(`[${requestId}] Error in deleteDocument`, {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * GET /api/user-documents/:id/download
 * Download document (redirects to signed URL)
 */
async function downloadDocument(req, res) {
  const requestId = req.id || crypto.randomBytes(8).toString('hex');

  try {
    const userId = req.user?.id || req.query.user_id;
    const documentId = req.params.id;

    if (!userId) {
      logger.warn(`[${requestId}] Missing user ID`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    logger.info(`[${requestId}] Downloading document`, {
      userId,
      documentId
    });

    // Get document
    const { data: document, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .eq('create_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !document) {
      logger.warn(`[${requestId}] Document not found`, {
        documentId,
        userId
      });
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        code: 'NOT_FOUND'
      });
    }

    if (document.status !== 'completed' || !document.storage_path) {
      logger.warn(`[${requestId}] Document not ready for download`, {
        documentId,
        status: document.status
      });
      return res.status(400).json({
        success: false,
        error: 'Document not ready for download',
        code: 'DOCUMENT_NOT_READY',
        status: document.status
      });
    }

    // Generate short-lived signed URL for download
    const signedUrl = await imageProcessor.getSignedUrl(document.storage_path, 300); // 5 minutes

    logger.info(`[${requestId}] Redirecting to download URL`, {
      documentId
    });

    // Redirect to signed URL
    return res.redirect(signedUrl);

  } catch (error) {
    logger.error(`[${requestId}] Error in downloadDocument`, {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

module.exports = {
  listUserDocuments,
  getDocument,
  getDocumentStats,
  refreshSignedUrl,
  deleteDocument,
  downloadDocument
};
