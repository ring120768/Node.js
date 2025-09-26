// PDF Service - Core business logic for PDF report handling
// Add this file to your services/ directory

const { generatePossibleFilenames } = require('../utils/pdf-validation');

class PDFReportService {
  constructor(supabase, logger, gdprModule = null) {
    this.supabase = supabase;
    this.logger = logger;
    this.gdprModule = gdprModule;
    this.bucketName = 'incident-reports-pdf';
  }

  /**
   * Checks if a user exists and has proper consent
   * @param {string} userId - User ID to check
   * @param {string} clientIP - Client IP for audit logging
   * @returns {Object} - User verification result
   */
  async verifyUserAndConsent(userId, clientIP) {
    try {
      // Check if user exists
      const { data: userData, error: userError } = await this.supabase
        .from('user_signup')
        .select('create_user_id, consent_given, gdpr_consent, created_at')
        .eq('create_user_id', userId)
        .single();

      if (userError || !userData) {
        await this.logAuditEvent(userId, 'report_access_denied', {
          reason: 'user_not_found',
          ip: clientIP
        });

        return {
          success: false,
          error: 'No reports found for this User ID',
          code: 'USER_NOT_FOUND'
        };
      }

      // Check GDPR consent - use enhanced module if available
      let hasConsent = userData.consent_given || userData.gdpr_consent;

      if (this.gdprModule) {
        const consentStatus = await this.gdprModule.checkConsentStatus(userId);
        hasConsent = consentStatus.has_consent;
      }

      if (!hasConsent) {
        await this.logAuditEvent(userId, 'report_access_denied', {
          reason: 'no_consent',
          ip: clientIP
        });

        return {
          success: false,
          error: 'Access denied - consent required',
          code: 'NO_CONSENT'
        };
      }

      return {
        success: true,
        userData: userData,
        hasConsent: true
      };

    } catch (error) {
      this.logger.error('Error verifying user and consent:', error);
      throw error;
    }
  }

  /**
   * Checks if incident report exists for user
   * @param {string} userId - User ID
   * @returns {Object} - Incident verification result
   */
  async verifyIncidentReport(userId) {
    try {
      const { data: incidentData, error: incidentError } = await this.supabase
        .from('incident_reports')
        .select('create_user_id, created_at, id')
        .eq('create_user_id', userId)
        .single();

      if (incidentError || !incidentData) {
        return {
          success: false,
          error: 'No incident report found for this User ID',
          code: 'NO_INCIDENT_REPORT'
        };
      }

      return {
        success: true,
        incidentData: incidentData
      };

    } catch (error) {
      this.logger.error('Error verifying incident report:', error);
      throw error;
    }
  }

  /**
   * Searches for PDF file in storage bucket
   * @param {string} userId - User ID
   * @param {string} incidentId - Optional incident ID
   * @returns {Object} - File search result
   */
  async findPDFFile(userId, incidentId = null) {
    try {
      const possibleFilenames = generatePossibleFilenames(userId, incidentId);
      let foundFilename = null;

      // Check each possible filename
      for (const filename of possibleFilenames) {
        const { data, error } = await this.supabase.storage
          .from(this.bucketName)
          .list('', { search: filename });

        if (!error && data && data.length > 0) {
          foundFilename = filename;
          break;
        }
      }

      // If no direct match, search through all files
      if (!foundFilename) {
        const { data: allFiles, error: listError } = await this.supabase.storage
          .from(this.bucketName)
          .list('');

        if (!listError && allFiles) {
          const userFile = allFiles.find(file => 
            file.name.toLowerCase().includes(userId.toLowerCase()) && 
            file.name.endsWith('.pdf')
          );

          if (userFile) {
            foundFilename = userFile.name;
          }
        }
      }

      if (!foundFilename) {
        return {
          success: false,
          error: 'PDF report not found',
          code: 'PDF_NOT_FOUND'
        };
      }

      return {
        success: true,
        filename: foundFilename
      };

    } catch (error) {
      this.logger.error('Error finding PDF file:', error);
      throw error;
    }
  }

  /**
   * Retrieves PDF file content
   * @param {string} filename - PDF filename
   * @param {string} userId - User ID for audit logging
   * @param {string} clientIP - Client IP for audit logging
   * @returns {Object} - PDF retrieval result
   */
  async retrievePDFContent(filename, userId, clientIP) {
    try {
      // Get signed URL for the PDF file
      const { data: signedUrlData, error: urlError } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filename, 300); // 5 minute expiry

      if (urlError) {
        this.logger.error('Error creating signed URL:', urlError);
        return {
          success: false,
          error: 'Unable to access report file',
          code: 'URL_GENERATION_FAILED'
        };
      }

      // Fetch the PDF file
      const response = await fetch(signedUrlData.signedUrl);

      if (!response.ok) {
        return {
          success: false,
          error: 'Unable to retrieve report file',
          code: 'FILE_RETRIEVAL_FAILED'
        };
      }

      const pdfBuffer = await response.buffer();

      // Log successful access
      await this.logAuditEvent(userId, 'report_downloaded', {
        filename: filename,
        ip: clientIP,
        file_size: pdfBuffer.length
      });

      return {
        success: true,
        buffer: pdfBuffer,
        filename: filename,
        size: pdfBuffer.length
      };

    } catch (error) {
      this.logger.error('Error retrieving PDF content:', error);
      throw error;
    }
  }

  /**
   * Checks if PDF exists for a user (lightweight check)
   * @param {string} userId - User ID
   * @returns {Object} - Existence check result
   */
  async checkPDFExists(userId) {
    try {
      const { data: files, error: listError } = await this.supabase.storage
        .from(this.bucketName)
        .list('');

      let pdfExists = false;
      if (!listError && files) {
        pdfExists = files.some(file => 
          file.name.toLowerCase().includes(userId.toLowerCase()) && 
          file.name.endsWith('.pdf')
        );
      }

      return {
        success: true,
        exists: pdfExists
      };

    } catch (error) {
      this.logger.error('Error checking PDF existence:', error);
      return {
        success: false,
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Logs audit events for GDPR compliance
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {Object} details - Additional details
   */
  async logAuditEvent(userId, action, details) {
    try {
      // Use GDPR module if available
      if (this.gdprModule) {
        await this.gdprModule.auditLog(userId, action, details);
        return;
      }

      // Fallback to direct database insert
      await this.supabase
        .from('gdpr_audit_log')
        .insert({
          user_id: userId,
          action: action,
          details: details,
          timestamp: new Date().toISOString()
        });

    } catch (error) {
      this.logger.error('Error logging audit event:', error);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }
}

module.exports = PDFReportService;
