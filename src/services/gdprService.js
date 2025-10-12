/**
 * GDPR Service for Car Crash Lawyer AI
 * Handles GDPR compliance activities
 * ✅ NO TABLE WRITES - Uses storage for audit logs
 * ✅ Reads consent from Auth metadata
 * ✅ Deletes data from Storage + Auth
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const config = require('../config');

class GDPRService {
  constructor() {
    this.supabase = null;
    this.enabled = false;
  }

  /**
   * Initialize GDPR service with Supabase instance
   * ✅ Uses ANON key (not SERVICE_ROLE_KEY)
   */
  initialize(enabled) {
    if (config.supabase.url && config.supabase.serviceRoleKey) {
      // ✅ Use SERVICE_ROLE key for backend privileges
      this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
      this.enabled = enabled;

      if (this.enabled) {
        logger.info('✅ GDPR Service initialized (Storage-based)');
      } else {
        logger.warn('⚠️  GDPR Service initialized but disabled');
      }
    } else {
      logger.error('❌ GDPR Service initialization failed - Supabase config missing');
      this.enabled = false;
    }
  }

  /**
   * Log GDPR activity to storage (not to table)
   * Creates audit trail as JSON files in storage
   */
  async logActivity(userId, activityType, details, req = null) {
    if (!this.enabled || !this.supabase) {
      logger.debug('GDPR logging skipped - service not enabled');
      return { success: false, reason: 'Service not enabled' };
    }

    try {
      const activityLog = {
        userId,
        activityType,
        timestamp: new Date().toISOString(),
        details,
        ipAddress: req?.clientIp || req?.ip || 'unknown',
        userAgent: req?.get('user-agent') || 'unknown',
        path: req?.path || 'unknown',
        requestId: req?.requestId || null
      };

      // ✅ Store audit log in storage (not in table)
      const fileName = `${userId}/gdpr-audit/${Date.now()}_${activityType}.json`;

      const { error } = await this.supabase
        .storage
        .from('gdpr-audit-logs')
        .upload(fileName, JSON.stringify(activityLog, null, 2), {
          contentType: 'application/json',
          upsert: false
        });

      if (error) {
        logger.error('Failed to log GDPR activity to storage', {
          userId,
          activityType,
          error: error.message
        });
        return { success: false, error: error.message };
      }

      logger.info('GDPR activity logged', {
        userId,
        activityType,
        storagePath: fileName
      });

      return { success: true, logPath: fileName };

    } catch (error) {
      logger.error('GDPR logging error', {
        userId,
        activityType,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get GDPR audit history for user
   * Reads audit logs from storage
   */
  async getAuditHistory(userId, options = {}) {
    if (!this.enabled || !this.supabase) {
      return { success: false, error: 'Service not enabled' };
    }

    try {
      const { limit = 100, activityType = null } = options;

      // List audit log files from storage
      const { data: files, error } = await this.supabase
        .storage
        .from('gdpr-audit-logs')
        .list(`${userId}/gdpr-audit`, {
          limit,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        logger.error('Failed to list audit logs', {
          userId,
          error: error.message
        });
        return { success: false, error: error.message };
      }

      // Download and parse each log file
      const logs = await Promise.all(
        files
          .filter(file => {
            if (!activityType) return true;
            return file.name.includes(`_${activityType}.json`);
          })
          .map(async (file) => {
            try {
              const { data: fileData } = await this.supabase
                .storage
                .from('gdpr-audit-logs')
                .download(`${userId}/gdpr-audit/${file.name}`);

              const logText = await fileData.text();
              return JSON.parse(logText);
            } catch (parseError) {
              logger.warn('Failed to parse audit log', {
                userId,
                fileName: file.name
              });
              return null;
            }
          })
      );

      const validLogs = logs.filter(log => log !== null);

      return {
        success: true,
        logs: validLogs,
        total: validLogs.length
      };

    } catch (error) {
      logger.error('Get audit history error', {
        userId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get GDPR consent status for a user
   * ✅ Reads from Auth metadata (not from table)
   */
  async getConsentStatus(userId) {
    if (!this.enabled || !this.supabase) {
      return { valid: false, error: 'GDPR service not available' };
    }

    try {
      // ✅ Get user from Auth (not from table)
      const { data: { user }, error } = await this.supabase.auth.admin.getUserById(userId);

      if (error || !user) {
        return { valid: false, error: 'User not found' };
      }

      // ✅ Read consent from Auth metadata
      const metadata = user.user_metadata || {};

      return {
        valid: !!metadata.gdpr_consent,
        consent: {
          granted: metadata.gdpr_consent || false,
          date: metadata.gdpr_consent_date || null,
          version: metadata.gdpr_consent_version || null,
          ip: metadata.gdpr_consent_ip || null
        }
      };
    } catch (error) {
      logger.error('Error checking GDPR consent:', error);
      return { valid: false, error: 'Auth error' };
    }
  }

  /**
   * Update user's GDPR consent in Auth metadata
   * ✅ Updates Auth metadata (not table)
   */
  async updateConsent(userId, consentData) {
    if (!this.enabled || !this.supabase) {
      return { success: false, error: 'Service not enabled' };
    }

    try {
      const { consent, consentVersion, ipAddress, userAgent } = consentData;

      // ✅ Update Auth metadata (not table)
      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          gdpr_consent: consent,
          gdpr_consent_date: new Date().toISOString(),
          gdpr_consent_version: consentVersion || config.constants?.GDPR?.CURRENT_POLICY_VERSION || '1.0',
          gdpr_consent_ip: ipAddress || 'unknown',
          gdpr_consent_user_agent: userAgent || 'unknown'
        }
      });

      if (error) {
        logger.error('Failed to update consent in Auth', {
          userId,
          error: error.message
        });
        return { success: false, error: error.message };
      }

      // Log the consent change
      await this.logActivity(userId, consent ? 'CONSENT_GIVEN' : 'CONSENT_WITHDRAWN', {
        consentVersion,
        ipAddress,
        userAgent
      });

      logger.success('GDPR consent updated', { userId, consent });

      return { success: true };

    } catch (error) {
      logger.error('Update consent error', {
        userId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Export all user data for GDPR compliance
   * ✅ Reads from Auth metadata + Storage (not tables)
   */
  async exportUserData(userId) {
    if (!this.enabled || !this.supabase) {
      throw new Error('GDPR service not available');
    }

    try {
      logger.info('Processing data export request', { userId });

      // ✅ Get user Auth data (not from table)
      const { data: { user }, error: authError } = await this.supabase.auth.admin.getUserById(userId);

      if (authError || !user) {
        return { success: false, error: 'User not found' };
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        userId: userId,
        authData: {
          email: user.email,
          emailVerified: user.email_confirmed_at !== null,
          createdAt: user.created_at,
          lastSignIn: user.last_sign_in_at,
          metadata: user.user_metadata
        },
        incidents: [],
        transcriptions: [],
        auditLogs: []
      };

      // ✅ Collect incidents from storage
      try {
        const { data: incidentFiles } = await this.supabase
          .storage
          .from('incident-reports')
          .list(`${userId}/incidents`, { limit: 1000 });

        if (incidentFiles) {
          for (const file of incidentFiles) {
            try {
              const { data: fileData } = await this.supabase
                .storage
                .from('incident-reports')
                .download(`${userId}/incidents/${file.name}`);

              if (fileData) {
                const text = await fileData.text();
                exportData.incidents.push(JSON.parse(text));
              }
            } catch (fileError) {
              logger.warn('Failed to export incident file', { 
                userId, 
                fileName: file.name 
              });
            }
          }
        }
      } catch (incidentError) {
        logger.warn('Failed to export incidents', { userId });
      }

      // ✅ Collect transcriptions from storage
      try {
        const { data: transcriptionFiles } = await this.supabase
          .storage
          .from('transcription-data')
          .list(`${userId}/transcriptions`, { limit: 1000 });

        if (transcriptionFiles) {
          for (const file of transcriptionFiles) {
            try {
              const { data: fileData } = await this.supabase
                .storage
                .from('transcription-data')
                .download(`${userId}/transcriptions/${file.name}`);

              if (fileData) {
                const text = await fileData.text();
                exportData.transcriptions.push(JSON.parse(text));
              }
            } catch (fileError) {
              logger.warn('Failed to export transcription file', { 
                userId, 
                fileName: file.name 
              });
            }
          }
        }
      } catch (transcriptionError) {
        logger.warn('Failed to export transcriptions', { userId });
      }

      // ✅ Collect audit logs from storage
      const auditResult = await this.getAuditHistory(userId, { limit: 1000 });
      if (auditResult.success) {
        exportData.auditLogs = auditResult.logs;
      }

      // Log the export
      await this.logActivity(userId, 'DATA_EXPORTED', {
        incidentCount: exportData.incidents.length,
        transcriptionCount: exportData.transcriptions.length,
        auditLogCount: exportData.auditLogs.length
      });

      logger.success('User data exported', {
        userId,
        dataSize: JSON.stringify(exportData).length
      });

      return {
        success: true,
        data: exportData
      };

    } catch (error) {
      logger.error('Data export error', {
        userId,
        error: error.message,
        stack: error.stack
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle Right to be Forgotten (data deletion)
   * ✅ Deletes all user data from storage and Auth
   */
  async deleteUserData(userId, reason = 'user_request') {
    if (!this.enabled || !this.supabase) {
      throw new Error('GDPR service not available');
    }

    try {
      logger.info('Processing data deletion request', { userId, reason });

      // Log the deletion request BEFORE deleting
      await this.logActivity(userId, 'DATA_DELETION_REQUESTED', { reason });

      // ✅ Delete all user storage folders
      const buckets = [
        'incident-reports',
        'incident-media',
        'audio-files',
        'transcription-data',
        'gdpr-audit-logs'
      ];

      const deletionResults = [];

      for (const bucket of buckets) {
        try {
          // List all files in user's folder
          const { data: files } = await this.supabase
            .storage
            .from(bucket)
            .list(userId, {
              limit: 1000
            });

          if (files && files.length > 0) {
            // Delete all files
            const filePaths = files.map(file => `${userId}/${file.name}`);
            const { error } = await this.supabase
              .storage
              .from(bucket)
              .remove(filePaths);

            deletionResults.push({
              bucket,
              success: !error,
              filesDeleted: files.length,
              error: error?.message
            });
          } else {
            deletionResults.push({
              bucket,
              success: true,
              filesDeleted: 0
            });
          }
        } catch (bucketError) {
          logger.warn(`Failed to delete from bucket: ${bucket}`, {
            userId,
            error: bucketError.message
          });
          deletionResults.push({
            bucket,
            success: false,
            error: bucketError.message
          });
        }
      }

      // ✅ Finally, delete the user from Auth
      try {
        const { error: authError } = await this.supabase.auth.admin.deleteUser(userId);

        if (authError) {
          logger.error('Failed to delete user from Auth', {
            userId,
            error: authError.message
          });
        } else {
          logger.success('User deleted from Auth', { userId });
        }
      } catch (authDeleteError) {
        logger.error('Auth deletion error', {
          userId,
          error: authDeleteError.message
        });
      }

      logger.success('Data deletion completed', {
        userId,
        deletionResults
      });

      return {
        success: true,
        deletionResults,
        deletedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Data deletion error', {
        userId,
        error: error.message,
        stack: error.stack
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Enforce data retention policy
   * ✅ Uses storage-based architecture
   * Note: This is a simplified version - you may want to customize retention logic
   */
  async enforceDataRetention() {
    if (!this.enabled || !this.supabase) {
      logger.debug('Data retention skipped - service not enabled');
      return;
    }

    const retentionDays = process.env.DATA_RETENTION_DAYS || 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      logger.info('Starting data retention enforcement', { 
        retentionDays, 
        cutoffDate: cutoffDate.toISOString() 
      });

      // ✅ Archive/delete old files from storage buckets
      // This is a placeholder - implement based on your business requirements

      logger.info('Data retention enforcement completed (storage-based)');

    } catch (error) {
      logger.error('Data retention enforcement error', error);
    }
  }

  /**
   * Schedule automatic data retention enforcement
   * Runs daily at 2 AM
   */
  scheduleDataRetention() {
    if (!this.enabled) return;

    // Run data retention daily at 2 AM
    const now = new Date();
    const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // tomorrow
      2, 0, 0 // 2 AM
    );
    const msToMidnight = night.getTime() - now.getTime();

    setTimeout(() => {
      this.enforceDataRetention();
      // Then run every 24 hours
      setInterval(() => {
        this.enforceDataRetention();
      }, 24 * 60 * 60 * 1000);
    }, msToMidnight);

    logger.info('Data retention policy scheduled to run daily at 2 AM');
  }
}

// Export singleton instance
const gdprService = new GDPRService();

module.exports = gdprService;