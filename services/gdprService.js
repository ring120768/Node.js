/**
 * Simplified GDPR Service for Car Crash Lawyer AI System
 * Handles only essential GDPR requirements:
 * - Consent verification from Typeform
 * - Data export (Right to Access)
 * - Data deletion (Right to Erasure)
 * - Simple audit logging
 */

const { createClient } = require('@supabase/supabase-js');

class GDPRService {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Check if user has valid consent from Typeform submission
   */
  async hasValidConsent(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_signup')
        .select('consent_given, consent_date')
        .eq('create_user_id', userId)
        .single();

      if (error || !data) {
        console.error('Error checking consent:', error);
        return false;
      }

      return data.consent_given === true;
    } catch (error) {
      console.error('Error in hasValidConsent:', error);
      return false;
    }
  }

  /**
   * Record consent from Typeform webhook
   */
  async recordConsent(userId, email, consentGiven) {
    try {
      // Update or insert consent record
      const { error } = await this.supabase
        .from('user_signup')
        .upsert({
          user_id: userId,
          email: email,
          consent_given: consentGiven,
          consent_date: new Date().toISOString(),
          consent_source: 'typeform'
        });

      if (!error) {
        await this.logAction(userId, 'CONSENT_RECORDED', {
          consent: consentGiven,
          source: 'typeform'
        });
      }

      return !error;
    } catch (error) {
      console.error('Error recording consent:', error);
      return false;
    }
  }

  /**
   * Export all user data (GDPR Right to Access)
   */
  async exportUserData(userId) {
    try {
      const userData = {};

      // 1. Basic user information
      const { data: userInfo } = await this.supabase
        .from('user_signup')
        .select('*')
        .eq('create_user_id', userId)
        .single();

      if (userInfo) {
        userData.user_information = userInfo;
      }

      // 2. Incident reports
      const { data: incidents } = await this.supabase
        .from('incident_reports')
        .select('*')
        .eq('create_user_id', userId);

      if (incidents) {
        userData.incident_reports = incidents;
      }

      // 3. AI transcriptions
      const { data: transcriptions } = await this.supabase
        .from('ai_transcription')
        .select('*')
        .eq('create_user_id', userId);

      if (transcriptions) {
        userData.transcriptions = transcriptions;
      }

      // 4. AI summaries and legal narratives
      const { data: summaries } = await this.supabase
        .from('ai_summary')
        .select('*')
        .eq('create_user_id', userId);

      if (summaries) {
        userData.ai_summaries = summaries;
      }

      // 5. Additional vehicles
      const { data: vehicles } = await this.supabase
        .from('additional_vehicles')
        .select('*')
        .eq('create_user_id', userId);

      if (vehicles) {
        userData.additional_vehicles = vehicles;
      }

      // 6. Witness reports
      const { data: witnesses } = await this.supabase
        .from('witness_reports')
        .select('*')
        .eq('create_user_id', userId);

      if (witnesses) {
        userData.witness_reports = witnesses;
      }

      // 7. Images metadata
      const { data: images } = await this.supabase
        .from('incident_images')
        .select('*')
        .eq('create_user_id', userId);

      if (images) {
        userData.incident_images = images;
      }

      // Log the export action
      await this.logAction(userId, 'DATA_EXPORTED', {
        tables_exported: Object.keys(userData)
      });

      return {
        success: true,
        exported_at: new Date().toISOString(),
        user_id: userId,
        data: userData
      };

    } catch (error) {
      console.error('Error exporting user data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete all user data (GDPR Right to Erasure)
   */
  async deleteUserData(userId) {
    try {
      const deletedTables = [];

      // Define tables to delete from (order matters for foreign key constraints)
      const tablesToDelete = [
        'witness_reports',
        'additional_vehicles',
        'incident_images',
        'ai_summary',
        'ai_transcription',
        'transcription_queue',
        'dash_cam_footage',
        'incident_evidence',
        'completed_incident_forms',
        'incident_reports',
        'user_signup'  // Delete this last due to foreign key references
      ];

      // Delete from each table
      for (const table of tablesToDelete) {
        const { error, count } = await this.supabase
          .from(table)
          .delete()
          .eq('user_id', userId);

        if (!error) {
          deletedTables.push({ table, count });
        } else {
          console.warn(`Could not delete from ${table}:`, error.message);
        }
      }

      // Delete files from storage
      await this.deleteUserFiles(userId);

      // Log the deletion
      await this.logAction(userId, 'DATA_DELETED', {
        tables_cleared: deletedTables,
        deleted_at: new Date().toISOString()
      });

      return {
        success: true,
        deleted_at: new Date().toISOString(),
        tables_cleared: deletedTables
      };

    } catch (error) {
      console.error('Error deleting user data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete user files from Supabase storage
   */
  async deleteUserFiles(userId) {
    try {
      // List all buckets that might contain user files
      const buckets = ['incident-images', 'audio-recordings', 'dash-cam-footage'];

      for (const bucket of buckets) {
        // List files in user's folder
        const { data: files } = await this.supabase.storage
          .from(bucket)
          .list(userId);

        if (files && files.length > 0) {
          // Delete all user files
          const filePaths = files.map(file => `${userId}/${file.name}`);
          await this.supabase.storage
            .from(bucket)
            .remove(filePaths);
        }
      }
    } catch (error) {
      console.error('Error deleting user files:', error);
    }
  }

  /**
   * Simple audit logging for GDPR compliance
   */
  async logAction(userId, action, details = {}) {
    try {
      await this.supabase
        .from('gdpr_audit_log')
        .insert({
          user_id: userId,
          action: action,
          details: details,
          ip_address: details.ip_address || null,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging GDPR action:', error);
    }
  }

  /**
   * Get user's GDPR request history
   */
  async getUserGDPRHistory(userId) {
    try {
      const { data, error } = await this.supabase
        .from('gdpr_audit_log')
        .select('action, details, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      return error ? [] : data;
    } catch (error) {
      console.error('Error fetching GDPR history:', error);
      return [];
    }
  }
}

module.exports = GDPRService;