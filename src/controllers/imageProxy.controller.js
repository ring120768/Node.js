/**
 * Image Proxy Controller
 * Serves images from Supabase storage through the backend
 * This bypasses CORS and authentication issues
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Proxy image from Supabase storage
 * GET /api/images/:documentId
 */
async function proxyImage(req, res) {
  try {
    const { documentId } = req.params;
    logger.info('Image proxy request:', { documentId });

    // Fetch document metadata from database
    const { data: document, error: dbError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (dbError || !document) {
      logger.error('Document not found:', { documentId, error: dbError });
      return res.status(404).json({ error: 'Image not found' });
    }

    // Get storage path
    let storagePath = document.storage_path;
    if (!storagePath) {
      logger.error('No storage path for document:', documentId);
      return res.status(404).json({ error: 'Image path not found' });
    }

    // Clean the path (remove bucket prefix if present)
    if (storagePath.startsWith('user-documents/')) {
      storagePath = storagePath.replace('user-documents/', '');
    }

    logger.info('Fetching from storage:', {
      bucket: 'user-documents',
      path: storagePath
    });

    // Download the image from Supabase storage
    const { data: imageData, error: storageError } = await supabase.storage
      .from('user-documents')
      .download(storagePath);

    if (storageError) {
      logger.error('Storage error:', storageError);
      return res.status(500).json({ error: 'Failed to fetch image' });
    }

    // Set appropriate headers
    const contentType = document.mime_type || 'image/jpeg';
    res.set({
      'Content-Type': contentType,
      'Content-Length': imageData.size,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Content-Disposition': `inline; filename="${document.original_filename || 'image.jpg'}"`,
    });

    // Convert blob to buffer and send
    const buffer = Buffer.from(await imageData.arrayBuffer());
    res.send(buffer);

    logger.success('Image served successfully:', {
      documentId,
      size: imageData.size
    });

  } catch (error) {
    logger.error('Image proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get image by user ID and document type
 * GET /api/images/user/:userId/type/:documentType
 */
async function proxyImageByType(req, res) {
  try {
    const { userId, documentType } = req.params;
    logger.info('Image proxy by type:', { userId, documentType });

    // Fetch document from database
    const { data: document, error: dbError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId)
      .eq('document_type', documentType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError || !document) {
      logger.error('Document not found:', { userId, documentType, error: dbError });
      return res.status(404).json({ error: 'Image not found' });
    }

    // Redirect to the main proxy endpoint
    req.params.documentId = document.id;
    return proxyImage(req, res);

  } catch (error) {
    logger.error('Image proxy by type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate thumbnail for an image
 * GET /api/images/:documentId/thumbnail
 */
async function proxyThumbnail(req, res) {
  try {
    const { documentId } = req.params;

    // For now, just proxy the full image
    // In production, you'd generate/cache actual thumbnails
    return proxyImage(req, res);

  } catch (error) {
    logger.error('Thumbnail proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  proxyImage,
  proxyImageByType,
  proxyThumbnail
};