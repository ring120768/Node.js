
/**
 * GDPR Service
 * Handles all GDPR-related functionality including activity logging and data retention
 */

const logger = require('../utils/logger');

class GDPRService {
  constructor() {
    this.supabase = null;
    this.enabled = false;
  }

  /**
   * Initialize GDPR service with Supabase instance
   */
  initialize(supabaseInstance, enabled) {
    this.supabase = supabaseInstance;
    this.enabled = enabled;
    
    if (this.enabled) {
      this.scheduleDataRetention();
      logger.info('GDPR Service initialized successfully');
    } else {
      logger.warn('GDPR Service initialized but disabled (Supabase not available)');
    }
  }

  /**
   * Log GDPR activity for audit trail
   */
  async logActivity(userId, activityType, details, req = null) {
    if (!this.enabled || !this.supabase) {
      logger.debug('GDPR logging skipped - service not enabled');
      return;
    }

    try {
      await this.supabase
        .from('gdpr_audit_log')
        .insert({
          user_id: userId,
          activity_type: activityType,
          details: details,
          ip_address: req?.clientIp || 'unknown',
          user_agent: req?.get('user-agent') || 'unknown',
          request_id: req?.requestId || null,
          timestamp: new Date().toISOString()
        });

      logger.debug('GDPR activity logged', { 
        userId, 
        activityType, 
        requestId: req?.requestId 
      });
    } catch (error) {
      logger.error('GDPR audit log error', error);
    }
  }

  /**
   * Enforce data retention policy
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

      // Archive old incident reports
      const { data: oldReports, error: reportsError } = await this.supabase
        .from('incident_reports')
        .select('id, create_user_id')
        .lt('created_at', cutoffDate.toISOString())
        .eq('archived', false);

      if (reportsError) {
        logger.error('Error fetching old reports:', reportsError);
      } else if (oldReports && oldReports.length > 0) {
        for (const report of oldReports) {
          await this.supabase
            .from('incident_reports')
            .update({
              archived: true,
              archived_at: new Date().toISOString()
            })
            .eq('id', report.id);

          await this.logActivity(report.create_user_id, 'DATA_ARCHIVED', {
            report_id: report.id,
            reason: 'Data retention policy',
            retention_days: retentionDays
          });
        }

        logger.info(`Archived ${oldReports.length} old reports per retention policy`);
      }

      // Clean up old transcription queue items
      const { data: deletedQueue, error: queueError } = await this.supabase
        .from('transcription_queue')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .eq('status', 'completed')
        .select();

      if (queueError) {
        logger.error('Error cleaning transcription queue:', queueError);
      } else if (deletedQueue && deletedQueue.length > 0) {
        logger.info(`Cleaned up ${deletedQueue.length} old transcription queue items`);
      }

      // Archive old AI transcriptions (don't delete, just mark as archived)
      const { data: oldTranscriptions, error: transcriptionError } = await this.supabase
        .from('ai_transcription')
        .select('id, create_user_id')
        .lt('created_at', cutoffDate.toISOString())
        .is('archived_at', null);

      if (transcriptionError) {
        logger.error('Error fetching old transcriptions:', transcriptionError);
      } else if (oldTranscriptions && oldTranscriptions.length > 0) {
        for (const transcription of oldTranscriptions) {
          await this.supabase
            .from('ai_transcription')
            .update({
              archived_at: new Date().toISOString()
            })
            .eq('id', transcription.id);

          await this.logActivity(transcription.create_user_id, 'TRANSCRIPTION_ARCHIVED', {
            transcription_id: transcription.id,
            reason: 'Data retention policy',
            retention_days: retentionDays
          });
        }

        logger.info(`Archived ${oldTranscriptions.length} old transcriptions per retention policy`);
      }

      // Clean up old GDPR audit logs (keep for 2 years minimum)
      const auditRetentionDays = Math.max(retentionDays * 2, 730); // 2 years minimum
      const auditCutoffDate = new Date();
      auditCutoffDate.setDate(auditCutoffDate.getDate() - auditRetentionDays);

      const { data: deletedAuditLogs, error: auditError } = await this.supabase
        .from('gdpr_audit_log')
        .delete()
        .lt('timestamp', auditCutoffDate.toISOString())
        .select();

      if (auditError) {
        logger.error('Error cleaning audit logs:', auditError);
      } else if (deletedAuditLogs && deletedAuditLogs.length > 0) {
        logger.info(`Cleaned up ${deletedAuditLogs.length} old GDPR audit log entries`);
      }

      logger.success('Data retention enforcement completed successfully');

    } catch (error) {
      logger.error('Data retention enforcement error', error);
    }
  }

  /**
   * Schedule automatic data retention enforcement
   */
  scheduleDataRetention() {
    if (!this.enabled) return;

    // Run data retention daily at 2 AM
    setInterval(() => {
      this.enforceDataRetention();
    }, 24 * 60 * 60 * 1000);

    logger.info('Data retention policy scheduled to run daily');
  }

  /**
   * Get GDPR consent status for a user
   */
  async getConsentStatus(userId) {
    if (!this.enabled || !this.supabase) {
      return { valid: false, error: 'GDPR service not available' };
    }

    try {
      const { data: user, error } = await this.supabase
        .from('user_signup')
        .select('gdpr_consent, gdpr_consent_date, gdpr_consent_version')
        .eq('create_user_id', userId)
        .single();

      if (error || !user) {
        return { valid: false, error: 'User not found' };
      }

      return {
        valid: !!user.gdpr_consent,
        consent: {
          granted: user.gdpr_consent || false,
          date: user.gdpr_consent_date || null,
          version: user.gdpr_consent_version || null
        }
      };
    } catch (error) {
      logger.error('Error checking GDPR consent:', error);
      return { valid: false, error: 'Database error' };
    }
  }

  /**
   * Export all user data for GDPR compliance
   */
  async exportUserData(userId) {
    if (!this.enabled || !this.supabase) {
      throw new Error('GDPR service not available');
    }

    try {
      // Fetch all user-related data
      const [
        { data: user, error: userError },
        { data: incidents, error: incidentError },
        { data: transcriptions, error: transcriptionError },
        { data: summaries, error: summaryError },
        { data: images, error: imageError },
        { data: auditLogs, error: auditError }
      ] = await Promise.all([
        this.supabase.from('user_signup').select('*').eq('create_user_id', userId).single(),
        this.supabase.from('incident_reports').select('*').eq('create_user_id', userId),
        this.supabase.from('ai_transcription').select('*').eq('create_user_id', userId),
        this.supabase.from('ai_summary').select('*').eq('create_user_id', userId),
        this.supabase.from('incident_images').select('*').eq('create_user_id', userId),
        this.supabase.from('gdpr_audit_log').select('*').eq('user_id', userId).order('timestamp', { ascending: false })
      ]);

      if (userError) throw userError;
      if (!user) throw new Error('User not found');

      const exportData = {
        export_metadata: {
          user_id: userId,
          export_date: new Date().toISOString(),
          export_type: 'gdpr_data_export',
          data_retention_policy: '365 days'
        },
        user_profile: user,
        incident_reports: incidents || [],
        transcriptions: transcriptions || [],
        ai_summaries: summaries || [],
        images: (images || []).map(img => ({
          ...img,
          // Don't export actual file data, just metadata
          file_data: '[File data available upon request]'
        })),
        audit_trail: auditLogs || []
      };

      // Log the export
      await this.logActivity(userId, 'DATA_EXPORT', {
        items_exported: {
          incidents: incidents?.length || 0,
          transcriptions: transcriptions?.length || 0,
          summaries: summaries?.length || 0,
          images: images?.length || 0,
          audit_logs: auditLogs?.length || 0
        }
      });

      return exportData;

    } catch (error) {
      logger.error('GDPR data export error:', error);
      throw error;
    }
  }

  /**
   * Delete all user data (Right to be Forgotten)
   */
  async deleteUserData(userId, reason = 'user_request') {
    if (!this.enabled || !this.supabase) {
      throw new Error('GDPR service not available');
    }

    try {
      logger.info('Starting GDPR data deletion', { userId, reason });

      const deletionResults = {
        incidents: 0,
        transcriptions: 0,
        summaries: 0,
        images: 0,
        user_profile: false
      };

      // Mark incident reports as deleted (don't actually delete for legal reasons)
      const { data: incidents } = await this.supabase
        .from('incident_reports')
        .update({
          gdpr_deleted: true,
          gdpr_deletion_date: new Date().toISOString(),
          gdpr_deletion_reason: reason
        })
        .eq('create_user_id', userId)
        .select();

      deletionResults.incidents = incidents?.length || 0;

      // Delete transcriptions
      const { data: deletedTranscriptions } = await this.supabase
        .from('ai_transcription')
        .delete()
        .eq('create_user_id', userId)
        .select();

      deletionResults.transcriptions = deletedTranscriptions?.length || 0;

      // Delete AI summaries
      const { data: deletedSummaries } = await this.supabase
        .from('ai_summary')
        .delete()
        .eq('create_user_id', userId)
        .select();

      deletionResults.summaries = deletedSummaries?.length || 0;

      // Mark images as deleted
      const { data: images } = await this.supabase
        .from('incident_images')
        .update({
          gdpr_deleted: true,
          gdpr_deletion_date: new Date().toISOString()
        })
        .eq('create_user_id', userId)
        .select();

      deletionResults.images = images?.length || 0;

      // Mark user profile as deleted
      const { error: userUpdateError } = await this.supabase
        .from('user_signup')
        .update({
          gdpr_deleted: true,
          gdpr_deletion_date: new Date().toISOString(),
          gdpr_deletion_reason: reason,
          // Anonymize personal data
          email: '[DELETED]',
          first_name: '[DELETED]',
          last_name: '[DELETED]',
          phone: '[DELETED]',
          emergency_contact_number: '[DELETED]'
        })
        .eq('create_user_id', userId);

      deletionResults.user_profile = !userUpdateError;

      // Log the deletion
      await this.logActivity(userId, 'DATA_DELETED', {
        reason: reason,
        deletion_results: deletionResults,
        deletion_date: new Date().toISOString()
      });

      logger.success('GDPR data deletion completed', { userId, deletionResults });

      return deletionResults;

    } catch (error) {
      logger.error('GDPR data deletion error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const gdprService = new GDPRService();

module.exports = gdprService;
