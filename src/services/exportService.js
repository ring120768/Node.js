/**
 * Export Service
 * Generates complete export packages for incidents and user accounts
 *
 * Features:
 * - ZIP file generation with all associated files
 * - PDF report generation
 * - JSON data export
 * - SHA-256 checksums for data integrity
 * - Export logging for audit trail (legal protection)
 *
 * @version 1.0.0
 * @date 2025-10-17
 */

const archiver = require('archiver');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const config = require('../config');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class ExportService {
  constructor() {
    logger.info('✅ ExportService initialized');
  }

  /**
   * Generate complete export package for an incident report
   * @param {string} incidentId - Incident report ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} ipAddress - User's IP address
   * @param {string} userAgent - User's browser/client
   * @returns {Promise<{archive: Archiver, exportLog: Object}>}
   */
  async generateIncidentExport(incidentId, userId, ipAddress = null, userAgent = null) {
    try {
      logger.info('Starting incident export', {
        incidentId,
        userId
      });

      // Step 1: Verify incident exists and user owns it
      const { data: incident, error: incidentError } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('id', incidentId)
        .eq('create_user_id', userId)
        .is('deleted_at', null)
        .single();

      if (incidentError || !incident) {
        logger.error('Incident not found or access denied', {
          incidentId,
          userId,
          error: incidentError?.message
        });
        throw new Error('Incident not found or you do not have access to it');
      }

      logger.info('Incident found', {
        incidentId,
        createdAt: incident.created_at,
        retentionUntil: incident.retention_until
      });

      // Step 2: Fetch associated documents
      const { data: documents, error: docsError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('associated_with', 'incident_report')
        .eq('associated_id', incidentId)
        .eq('create_user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (docsError) {
        logger.error('Error fetching documents', {
          incidentId,
          error: docsError.message
        });
        // Continue without documents (non-fatal)
      }

      const documentCount = documents?.length || 0;
      logger.info(`Found ${documentCount} associated documents`);

      // Step 3: Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Handle errors
      archive.on('error', (err) => {
        logger.error('Archive error', {
          incidentId,
          error: err.message
        });
        throw err;
      });

      // Step 4: Add README.txt
      const readme = this.generateReadme(incident, documents);
      archive.append(readme, { name: 'README.txt' });

      // Step 5: Add JSON data
      const jsonData = this.prepareIncidentJson(incident, documents);
      archive.append(JSON.stringify(jsonData, null, 2), { name: 'incident_data.json' });

      // Step 6: Download and add images with checksums
      const checksums = [];
      let totalImageSize = 0;

      if (documents && documents.length > 0) {
        for (const doc of documents) {
          try {
            logger.info('Processing document', {
              documentId: doc.id,
              documentType: doc.document_type
            });

            // Download image from Supabase Storage
            const imageBuffer = await this.downloadFromStorage(doc.storage_path);

            if (imageBuffer) {
              const fileName = `images/${doc.document_type}.${doc.file_extension || 'jpg'}`;
              archive.append(imageBuffer, { name: fileName });

              // Calculate checksum if not already stored
              const checksum = doc.original_checksum_sha256 || this.calculateChecksum(imageBuffer);
              checksums.push(`${checksum}  ${fileName}`);

              totalImageSize += imageBuffer.length;

              logger.info('Image added to archive', {
                documentId: doc.id,
                fileName,
                size: imageBuffer.length,
                checksum: checksum.substring(0, 16) + '...'
              });
            }
          } catch (error) {
            logger.error('Error processing document', {
              documentId: doc.id,
              error: error.message
            });
            // Continue with other documents
          }
        }
      }

      // Step 7: Add checksums.txt
      if (checksums.length > 0) {
        const checksumsContent = `SHA-256 Checksums for Incident Report ${incidentId}\n` +
                                `Generated: ${new Date().toISOString()}\n\n` +
                                checksums.join('\n') + '\n';
        archive.append(checksumsContent, { name: 'checksums.txt' });
      }

      // Step 8: Generate PDF report (if PDF service is available)
      try {
        const pdfBuffer = await this.generateIncidentPDF(incident, documents);
        if (pdfBuffer) {
          archive.append(pdfBuffer, { name: 'incident_report.pdf' });
          logger.info('PDF report added to archive');
        }
      } catch (error) {
        logger.warn('Could not generate PDF (non-fatal)', {
          error: error.message
        });
        // Continue without PDF
      }

      // Step 9: Finalize archive
      archive.finalize();

      // Step 10: Calculate archive checksum (will be logged after streaming completes)
      const archiveChecksum = crypto.createHash('sha256');
      archive.on('data', (chunk) => {
        archiveChecksum.update(chunk);
      });

      let finalChecksum = null;
      archive.on('end', () => {
        finalChecksum = archiveChecksum.digest('hex');
        logger.info('Archive finalized', {
          incidentId,
          checksum: finalChecksum.substring(0, 16) + '...',
          totalImages: documentCount
        });
      });

      // Step 11: Prepare export log entry (to be saved after streaming)
      const exportLog = {
        user_id: userId,
        incident_id: incidentId,
        exported_at: new Date().toISOString(),
        export_format: 'zip',
        download_ip: ipAddress,
        user_agent: userAgent,
        metadata: {
          document_count: documentCount,
          total_image_size: totalImageSize
        }
      };

      logger.info('✅ Export package generated successfully', {
        incidentId,
        userId,
        documentCount,
        totalImageSize
      });

      return {
        archive,
        exportLog,
        incident,
        metadata: {
          incidentId,
          documentCount,
          totalImageSize,
          createdAt: incident.created_at,
          retentionUntil: incident.retention_until
        }
      };

    } catch (error) {
      logger.error('Error generating incident export', {
        incidentId,
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Download image from Supabase Storage
   * @param {string} storagePath - Full storage path (bucket/path)
   * @returns {Promise<Buffer>}
   */
  async downloadFromStorage(storagePath) {
    try {
      if (!storagePath) {
        throw new Error('Storage path is required');
      }

      // Split into bucket and path
      const parts = storagePath.split('/');
      const bucket = parts[0];
      const path = parts.slice(1).join('/');

      logger.info('Downloading from storage', {
        bucket,
        path: path.substring(0, 50) + '...'
      });

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) {
        logger.error('Storage download error', {
          bucket,
          path,
          error: error.message
        });
        throw error;
      }

      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      logger.info('Download successful', {
        bucket,
        size: buffer.length
      });

      return buffer;

    } catch (error) {
      logger.error('Error downloading from storage', {
        storagePath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate SHA-256 checksum
   * @param {Buffer} buffer - File buffer
   * @returns {string} - Hex checksum
   */
  calculateChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate README.txt for export package
   * @param {Object} incident - Incident data
   * @param {Array} documents - Document list
   * @returns {string}
   */
  generateReadme(incident, documents) {
    const docCount = documents?.length || 0;
    const exportDate = new Date().toISOString();
    const retentionDate = incident.retention_until || 'N/A';

    return `
================================================================================
INCIDENT REPORT EXPORT PACKAGE
================================================================================

Export Date: ${exportDate}
Incident ID: ${incident.id}
Created Date: ${incident.created_at || 'N/A'}
Data Retention Until: ${retentionDate}

================================================================================
CONTENTS
================================================================================

This package contains a complete export of your incident report including:

1. README.txt (this file)
   - Overview of package contents

2. incident_data.json
   - Complete incident report data in JSON format
   - Includes all form fields and metadata

3. incident_report.pdf (if available)
   - Human-readable PDF report
   - Formatted for printing and submission to insurance/legal entities

4. images/ directory
   - ${docCount} original images associated with this incident
   - Full resolution, no compression applied
   - Original file formats preserved

5. checksums.txt
   - SHA-256 checksums for all images
   - Use these to verify file integrity
   - Format: <checksum>  <filename>

================================================================================
DATA INTEGRITY VERIFICATION
================================================================================

To verify that your files have not been corrupted or tampered with:

1. Open checksums.txt
2. Use a checksum tool (sha256sum on Linux/Mac, certutil on Windows)
3. Compare calculated checksums with those in checksums.txt

Example (Linux/Mac):
  $ sha256sum images/*
  $ compare with checksums.txt

Example (Windows):
  > certutil -hashfile images\\<filename> SHA256
  > compare with checksums.txt

================================================================================
IMPORTANT LEGAL NOTICE
================================================================================

⚠️ DATA RETENTION POLICY:
Your incident data on our platform will be AUTOMATICALLY DELETED on:
${retentionDate}

This export package is YOUR PERMANENT COPY. After the deletion date:
- All data will be removed from our servers
- No recovery will be possible
- This export is your only copy

RECOMMENDATIONS:
1. Store this package in a secure location
2. Keep multiple backups (cloud storage, external drive, etc.)
3. Do NOT rely on our platform for long-term storage
4. Provide this package to your insurance company/legal representative

================================================================================
SUPPORT
================================================================================

If you have questions about this export package:
- Check your account dashboard for help resources
- Contact support via your account portal

For data protection inquiries:
- Review our GDPR policy in your account settings
- Submit data access requests through your account

================================================================================
EXPORT METADATA
================================================================================

Incident ID: ${incident.id}
User ID: ${incident.create_user_id || 'N/A'}
Export Format: ZIP Archive
Document Count: ${docCount}
Export Generated: ${exportDate}
Platform: Car Crash Lawyer AI - Evidence Collection System

This export was generated automatically by our system.
All data is provided "as-is" based on information you submitted.

© ${new Date().getFullYear()} Car Crash Lawyer AI. All rights reserved.

================================================================================
`;
  }

  /**
   * Prepare incident JSON data for export
   * @param {Object} incident - Incident data
   * @param {Array} documents - Document list
   * @returns {Object}
   */
  prepareIncidentJson(incident, documents) {
    return {
      export_metadata: {
        export_version: '1.0',
        export_date: new Date().toISOString(),
        platform: 'Car Crash Lawyer AI',
        export_format: 'JSON'
      },
      incident: {
        id: incident.id,
        created_at: incident.created_at,
        retention_until: incident.retention_until,
        ...incident
      },
      documents: (documents || []).map(doc => ({
        id: doc.id,
        type: doc.document_type,
        category: doc.document_category,
        file_name: `images/${doc.document_type}.${doc.file_extension || 'jpg'}`,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        checksum_sha256: doc.original_checksum_sha256,
        created_at: doc.created_at,
        metadata: doc.metadata
      }))
    };
  }

  /**
   * Generate PDF report for incident (stub - integrate with existing PDF service)
   * @param {Object} incident - Incident data
   * @param {Array} documents - Document list
   * @returns {Promise<Buffer|null>}
   */
  async generateIncidentPDF(incident, documents) {
    try {
      // TODO: Integrate with existing PDF generation service
      // For now, return null (PDF will be skipped in export)

      logger.warn('PDF generation not yet implemented - skipping PDF in export');
      return null;

      // Future implementation:
      // const pdfService = require('./pdfService');
      // return await pdfService.generateIncidentReport(incident, documents);

    } catch (error) {
      logger.error('Error generating PDF', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Log export to database for audit trail
   * @param {Object} exportLog - Export log data
   * @param {number} fileSize - Final file size in bytes
   * @param {string} checksum - SHA-256 checksum of ZIP file
   * @returns {Promise<Object>}
   */
  async logExport(exportLog, fileSize = null, checksum = null) {
    try {
      const logEntry = {
        ...exportLog,
        file_size: fileSize,
        checksum
      };

      logger.info('Logging export to database', {
        userId: exportLog.user_id,
        incidentId: exportLog.incident_id
      });

      const { data, error } = await supabase
        .from('export_log')
        .insert([logEntry])
        .select()
        .single();

      if (error) {
        logger.error('Error logging export', {
          error: error.message
        });
        // Non-fatal - export still succeeded
        return null;
      }

      logger.info('✅ Export logged successfully', {
        logId: data.id,
        incidentId: exportLog.incident_id
      });

      return data;

    } catch (error) {
      logger.error('Exception logging export', {
        error: error.message
      });
      return null;
    }
  }
}

module.exports = new ExportService();
