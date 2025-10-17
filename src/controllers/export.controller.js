/**
 * Export Controller
 * Handles export requests for incidents and user accounts
 *
 * Features:
 * - Download incident exports as ZIP packages
 * - Authentication and authorization
 * - Export logging for audit trail
 * - Streaming for large files
 *
 * @version 1.0.0
 * @date 2025-10-17
 */

const exportService = require('../services/exportService');
const logger = require('../utils/logger');

/**
 * Export incident as ZIP package
 * GET /api/incidents/:id/export
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function exportIncident(req, res) {
  const incidentId = req.params.id;
  const userId = req.user?.id || req.user?.userId || req.user?.sub; // Support various auth formats
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');

  try {
    logger.info('Export incident request', {
      incidentId,
      userId,
      ipAddress
    });

    // Validate incident ID
    if (!incidentId) {
      return res.status(400).json({
        success: false,
        error: 'Incident ID is required'
      });
    }

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Generate export package
    const { archive, exportLog, incident, metadata } = await exportService.generateIncidentExport(
      incidentId,
      userId,
      ipAddress,
      userAgent
    );

    // Calculate retention days remaining
    let daysRemaining = null;
    if (incident.retention_until) {
      const retentionDate = new Date(incident.retention_until);
      const now = new Date();
      daysRemaining = Math.ceil((retentionDate - now) / (1000 * 60 * 60 * 24));
    }

    // Set response headers
    const fileName = `incident_report_${incidentId}_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('X-Incident-ID', incidentId);
    res.setHeader('X-Document-Count', metadata.documentCount.toString());
    res.setHeader('X-Days-Until-Deletion', daysRemaining !== null ? daysRemaining.toString() : 'unknown');

    logger.info('Streaming export to client', {
      incidentId,
      fileName,
      documentCount: metadata.documentCount,
      daysRemaining
    });

    // Track file size for logging
    let totalBytes = 0;
    archive.on('data', (chunk) => {
      totalBytes += chunk.length;
    });

    // Pipe archive to response
    archive.pipe(res);

    // When archive is done, log the export
    archive.on('end', async () => {
      logger.info('Export stream completed', {
        incidentId,
        userId,
        totalBytes
      });

      // Log export to database (async, don't wait)
      try {
        await exportService.logExport(exportLog, totalBytes, null);
      } catch (logError) {
        logger.error('Failed to log export (non-critical)', {
          incidentId,
          error: logError.message
        });
      }
    });

    // Handle errors during streaming
    archive.on('error', (error) => {
      logger.error('Archive stream error', {
        incidentId,
        error: error.message
      });

      // If headers not sent, send error response
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error generating export package'
        });
      }
    });

  } catch (error) {
    logger.error('Error in exportIncident controller', {
      incidentId,
      userId,
      error: error.message,
      stack: error.stack
    });

    // Send appropriate error response
    if (!res.headersSent) {
      if (error.message.includes('not found') || error.message.includes('access')) {
        return res.status(404).json({
          success: false,
          error: error.message || 'Incident not found or you do not have access to it'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate export package'
        });
      }
    }
  }
}

/**
 * Get export history for a user
 * GET /api/exports/history
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getExportHistory(req, res) {
  const userId = req.user?.id || req.user?.userId || req.user?.sub;

  try {
    logger.info('Get export history request', {
      userId
    });

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Query export logs for this user
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('export_log')
      .select('*')
      .eq('user_id', userId)
      .order('exported_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Error fetching export history', {
        userId,
        error: error.message
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch export history'
      });
    }

    logger.info('Export history retrieved', {
      userId,
      count: data.length
    });

    return res.status(200).json({
      success: true,
      exports: data,
      count: data.length
    });

  } catch (error) {
    logger.error('Error in getExportHistory controller', {
      userId,
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch export history'
    });
  }
}

/**
 * Get export details for a specific incident
 * GET /api/incidents/:id/export/info
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getExportInfo(req, res) {
  const incidentId = req.params.id;
  const userId = req.user?.id || req.user?.userId || req.user?.sub;

  try {
    logger.info('Get export info request', {
      incidentId,
      userId
    });

    // Validate parameters
    if (!incidentId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Incident ID and authentication required'
      });
    }

    // Query incident and associated documents
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: incident, error: incidentError } = await supabase
      .from('incident_reports')
      .select('id, created_at, retention_until, create_user_id')
      .eq('id', incidentId)
      .eq('create_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (incidentError || !incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found or access denied'
      });
    }

    const { data: documents } = await supabase
      .from('user_documents')
      .select('id, document_type, file_size, original_checksum_sha256')
      .eq('associated_with', 'incident_report')
      .eq('associated_id', incidentId)
      .is('deleted_at', null);

    // Calculate days until deletion
    let daysRemaining = null;
    if (incident.retention_until) {
      const retentionDate = new Date(incident.retention_until);
      const now = new Date();
      daysRemaining = Math.ceil((retentionDate - now) / (1000 * 60 * 60 * 24));
    }

    // Get export history for this incident
    const { data: exportHistory } = await supabase
      .from('export_log')
      .select('exported_at, file_size')
      .eq('incident_id', incidentId)
      .eq('user_id', userId)
      .order('exported_at', { ascending: false });

    const totalSize = (documents || []).reduce((sum, doc) => sum + (doc.file_size || 0), 0);

    logger.info('Export info retrieved', {
      incidentId,
      documentCount: documents?.length || 0,
      daysRemaining
    });

    return res.status(200).json({
      success: true,
      incident: {
        id: incident.id,
        created_at: incident.created_at,
        retention_until: incident.retention_until,
        days_remaining: daysRemaining
      },
      export_package: {
        document_count: documents?.length || 0,
        estimated_size_bytes: totalSize,
        estimated_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
        includes: [
          'README.txt',
          'incident_data.json',
          'incident_report.pdf (if available)',
          'images/ directory with all original images',
          'checksums.txt with SHA-256 hashes'
        ]
      },
      export_history: {
        count: exportHistory?.length || 0,
        last_exported: exportHistory?.[0]?.exported_at || null,
        exports: exportHistory || []
      }
    });

  } catch (error) {
    logger.error('Error in getExportInfo controller', {
      incidentId,
      userId,
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch export information'
    });
  }
}

module.exports = {
  exportIncident,
  getExportHistory,
  getExportInfo
};
