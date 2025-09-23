// ========================================
// COMPREHENSIVE GDPR & US PRIVACY COMPLIANCE MODULE
// Covers: UK GDPR, CCPA/CPRA, VCDPA, CPA, CTDPA, UCPA
// Version: 2.0
// ========================================

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

class GDPRComplianceModule {
  constructor(supabase, logger) {
    this.supabase = supabase;
    this.logger = logger || console;

    // Privacy law configurations
    this.privacyLaws = {
      UK_GDPR: {
        name: 'UK General Data Protection Regulation',
        rights: ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'],
        consentAge: 13,
        responseTime: 30, // days
        dataRetention: 365, // days
        requiresExplicitConsent: true
      },
      CCPA_CPRA: {
        name: 'California Consumer Privacy Act/Rights Act',
        rights: ['access', 'deletion', 'opt-out', 'portability', 'correction', 'limit-use'],
        consentAge: 13,
        responseTime: 45, // days
        dataRetention: null, // No specific requirement
        requiresExplicitConsent: false // Opt-out model
      },
      VCDPA: {
        name: 'Virginia Consumer Data Protection Act',
        rights: ['access', 'deletion', 'portability', 'correction', 'opt-out'],
        consentAge: 13,
        responseTime: 45,
        dataRetention: null,
        requiresExplicitConsent: false
      },
      CPA: {
        name: 'Colorado Privacy Act',
        rights: ['access', 'deletion', 'portability', 'correction', 'opt-out'],
        consentAge: 13,
        responseTime: 45,
        dataRetention: null,
        requiresExplicitConsent: false
      },
      CTDPA: {
        name: 'Connecticut Data Privacy Act',
        rights: ['access', 'deletion', 'portability', 'correction', 'opt-out'],
        consentAge: 13,
        responseTime: 45,
        dataRetention: null,
        requiresExplicitConsent: false
      },
      UCPA: {
        name: 'Utah Consumer Privacy Act',
        rights: ['access', 'deletion', 'portability', 'opt-out'],
        consentAge: 13,
        responseTime: 45,
        dataRetention: null,
        requiresExplicitConsent: false
      }
    };

    // Initialize database tables
    this.initializeTables();
  }

  // ========================================
  // DATABASE INITIALIZATION
  // ========================================

  async initializeTables() {
    try {
      // Check and create enhanced GDPR tables
      const tables = [
        'gdpr_consent_records',
        'gdpr_audit_trail',
        'data_subject_requests',
        'privacy_policies',
        'data_processing_activities',
        'cross_border_transfers',
        'data_breaches',
        'consent_versions'
      ];

      for (const table of tables) {
        await this.checkAndLogTable(table);
      }

      this.logger.info('GDPR tables initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing GDPR tables:', error);
    }
  }

  async checkAndLogTable(tableName) {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error && error.code === '42P01') {
        this.logger.info(`Table ${tableName} needs creation (handle via migrations)`);
      }
    } catch (error) {
      this.logger.error(`Error checking table ${tableName}:`, error);
    }
  }

  // ========================================
  // CONSENT MANAGEMENT
  // ========================================

  async recordConsent(userId, consentData) {
    try {
      const jurisdiction = await this.detectJurisdiction(consentData.ip_address);
      const applicableLaw = this.getApplicableLaw(jurisdiction);

      const consentRecord = {
        user_id: userId,
        consent_given: true,
        consent_type: consentData.type || 'all_processing',
        consent_method: consentData.method || 'explicit_action',
        consent_text: consentData.text || 'Standard consent for data processing',
        consent_version: consentData.version || '1.0',
        jurisdiction: jurisdiction,
        applicable_law: applicableLaw,
        ip_address: this.hashIP(consentData.ip_address),
        user_agent: consentData.user_agent,
        consent_date: new Date().toISOString(),
        expiry_date: this.calculateConsentExpiry(applicableLaw),
        withdrawal_date: null,
        metadata: {
          source: consentData.source || 'signup',
          form_id: consentData.form_id,
          session_id: consentData.session_id
        }
      };

      const { data, error } = await this.supabase
        .from('gdpr_consent_records')
        .insert([consentRecord])
        .select()
        .single();

      if (error) throw error;

      // Log the consent in audit trail
      await this.auditLog(userId, 'CONSENT_GRANTED', {
        consent_id: data.id,
        jurisdiction: jurisdiction,
        law: applicableLaw
      });

      return { success: true, consent_id: data.id, jurisdiction, applicable_law: applicableLaw };
    } catch (error) {
      this.logger.error('Error recording consent:', error);
      throw error;
    }
  }

  async withdrawConsent(userId, withdrawalData) {
    try {
      // Update consent record
      const { data: consents, error: fetchError } = await this.supabase
        .from('gdpr_consent_records')
        .select('*')
        .eq('user_id', userId)
        .eq('consent_given', true)
        .is('withdrawal_date', null);

      if (fetchError) throw fetchError;

      for (const consent of consents) {
        await this.supabase
          .from('gdpr_consent_records')
          .update({
            consent_given: false,
            withdrawal_date: new Date().toISOString(),
            withdrawal_reason: withdrawalData.reason,
            withdrawal_method: withdrawalData.method || 'user_request'
          })
          .eq('id', consent.id);
      }

      // Log the withdrawal
      await this.auditLog(userId, 'CONSENT_WITHDRAWN', {
        reason: withdrawalData.reason,
        affected_consents: consents.length
      });

      // Trigger data processing restrictions
      await this.restrictDataProcessing(userId);

      return { success: true, message: 'Consent withdrawn successfully' };
    } catch (error) {
      this.logger.error('Error withdrawing consent:', error);
      throw error;
    }
  }

  async checkConsentStatus(userId) {
    try {
      const { data, error } = await this.supabase
        .from('gdpr_consent_records')
        .select('*')
        .eq('user_id', userId)
        .order('consent_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return { has_consent: false, reason: 'No consent record found' };
      }

      const isValid = data.consent_given && 
                     !data.withdrawal_date && 
                     (!data.expiry_date || new Date(data.expiry_date) > new Date());

      return {
        has_consent: isValid,
        consent_id: data.id,
        consent_date: data.consent_date,
        jurisdiction: data.jurisdiction,
        applicable_law: data.applicable_law,
        expiry_date: data.expiry_date
      };
    } catch (error) {
      this.logger.error('Error checking consent status:', error);
      return { has_consent: false, error: error.message };
    }
  }

  // ========================================
  // DATA SUBJECT RIGHTS
  // ========================================

  async handleDataSubjectRequest(userId, requestType, requestData) {
    try {
      const jurisdiction = await this.detectJurisdiction(requestData.ip_address);
      const applicableLaw = this.getApplicableLaw(jurisdiction);
      const responseDeadline = this.calculateResponseDeadline(applicableLaw);

      const request = {
        user_id: userId,
        request_type: requestType,
        request_status: 'pending',
        jurisdiction: jurisdiction,
        applicable_law: applicableLaw,
        request_date: new Date().toISOString(),
        response_deadline: responseDeadline,
        request_data: requestData,
        verification_status: 'pending',
        ip_address: this.hashIP(requestData.ip_address),
        metadata: {
          source: requestData.source || 'web_form',
          user_agent: requestData.user_agent
        }
      };

      const { data, error } = await this.supabase
        .from('data_subject_requests')
        .insert([request])
        .select()
        .single();

      if (error) throw error;

      // Process the request based on type
      await this.processDataSubjectRequest(data.id, userId, requestType);

      // Log the request
      await this.auditLog(userId, `DSR_${requestType.toUpperCase()}`, {
        request_id: data.id,
        jurisdiction: jurisdiction
      });

      return { success: true, request_id: data.id, response_deadline: responseDeadline };
    } catch (error) {
      this.logger.error('Error handling data subject request:', error);
      throw error;
    }
  }

  async processDataSubjectRequest(requestId, userId, requestType) {
    try {
      switch (requestType) {
        case 'access':
          return await this.handleAccessRequest(requestId, userId);
        case 'erasure':
        case 'deletion':
          return await this.handleErasureRequest(requestId, userId);
        case 'portability':
          return await this.handlePortabilityRequest(requestId, userId);
        case 'rectification':
        case 'correction':
          return await this.handleRectificationRequest(requestId, userId);
        case 'restriction':
          return await this.handleRestrictionRequest(requestId, userId);
        case 'opt-out':
          return await this.handleOptOutRequest(requestId, userId);
        default:
          throw new Error(`Unknown request type: ${requestType}`);
      }
    } catch (error) {
      this.logger.error('Error processing data subject request:', error);

      // Update request status to failed
      await this.supabase
        .from('data_subject_requests')
        .update({
          request_status: 'failed',
          error_message: error.message,
          processed_date: new Date().toISOString()
        })
        .eq('id', requestId);

      throw error;
    }
  }

  async handleAccessRequest(requestId, userId) {
    try {
      // Collect all user data
      const userData = await this.collectAllUserData(userId);

      // Generate data export
      const exportData = {
        export_date: new Date().toISOString(),
        user_id: userId,
        data: userData,
        format: 'json',
        gdpr_info: {
          right_exercised: 'access',
          data_categories: Object.keys(userData),
          processing_purposes: await this.getProcessingPurposes(),
          data_recipients: await this.getDataRecipients(),
          retention_periods: await this.getRetentionPeriods(),
          data_sources: await this.getDataSources()
        }
      };

      // Store the export
      await this.supabase
        .from('data_exports')
        .insert({
          user_id: userId,
          request_id: requestId,
          export_data: exportData,
          created_at: new Date().toISOString()
        });

      // Update request status
      await this.supabase
        .from('data_subject_requests')
        .update({
          request_status: 'completed',
          processed_date: new Date().toISOString(),
          response_data: { export_ready: true }
        })
        .eq('id', requestId);

      return exportData;
    } catch (error) {
      this.logger.error('Error handling access request:', error);
      throw error;
    }
  }

  async handleErasureRequest(requestId, userId) {
    try {
      // Check for legal obligations to retain data
      const retentionCheck = await this.checkRetentionObligations(userId);

      if (retentionCheck.must_retain) {
        await this.supabase
          .from('data_subject_requests')
          .update({
            request_status: 'rejected',
            rejection_reason: retentionCheck.reason,
            processed_date: new Date().toISOString()
          })
          .eq('id', requestId);

        return { success: false, reason: retentionCheck.reason };
      }

      // Anonymize or delete data
      const deletionResult = await this.deleteUserData(userId);

      // Update request status
      await this.supabase
        .from('data_subject_requests')
        .update({
          request_status: 'completed',
          processed_date: new Date().toISOString(),
          response_data: deletionResult
        })
        .eq('id', requestId);

      return deletionResult;
    } catch (error) {
      this.logger.error('Error handling erasure request:', error);
      throw error;
    }
  }

  async handlePortabilityRequest(requestId, userId) {
    try {
      // Collect portable data (provided by the user and observed data)
      const portableData = await this.collectPortableData(userId);

      // Generate machine-readable format
      const exportFormats = {
        json: JSON.stringify(portableData, null, 2),
        csv: await this.convertToCSV(portableData)
      };

      // Store the export
      await this.supabase
        .from('data_exports')
        .insert({
          user_id: userId,
          request_id: requestId,
          export_data: portableData,
          export_formats: exportFormats,
          created_at: new Date().toISOString()
        });

      // Update request status
      await this.supabase
        .from('data_subject_requests')
        .update({
          request_status: 'completed',
          processed_date: new Date().toISOString(),
          response_data: { formats_available: Object.keys(exportFormats) }
        })
        .eq('id', requestId);

      return { success: true, data: portableData };
    } catch (error) {
      this.logger.error('Error handling portability request:', error);
      throw error;
    }
  }

  async handleRectificationRequest(requestId, userId) {
    try {
      // This would typically involve a manual review process
      // For now, we'll mark it for review

      await this.supabase
        .from('data_subject_requests')
        .update({
          request_status: 'under_review',
          review_required: true,
          review_notes: 'Rectification request requires manual review',
          processed_date: new Date().toISOString()
        })
        .eq('id', requestId);

      // Send notification to admin
      await this.notifyAdmin('rectification_request', { requestId, userId });

      return { success: true, status: 'under_review' };
    } catch (error) {
      this.logger.error('Error handling rectification request:', error);
      throw error;
    }
  }

  async handleRestrictionRequest(requestId, userId) {
    try {
      // Implement data processing restriction
      await this.restrictDataProcessing(userId);

      // Update request status
      await this.supabase
        .from('data_subject_requests')
        .update({
          request_status: 'completed',
          processed_date: new Date().toISOString(),
          response_data: { restriction_applied: true }
        })
        .eq('id', requestId);

      return { success: true, restriction_applied: true };
    } catch (error) {
      this.logger.error('Error handling restriction request:', error);
      throw error;
    }
  }

  async handleOptOutRequest(requestId, userId) {
    try {
      // Implement opt-out for specific processing activities
      await this.supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          marketing_opt_out: true,
          analytics_opt_out: true,
          third_party_sharing_opt_out: true,
          updated_at: new Date().toISOString()
        });

      // Update request status
      await this.supabase
        .from('data_subject_requests')
        .update({
          request_status: 'completed',
          processed_date: new Date().toISOString(),
          response_data: { opt_out_applied: true }
        })
        .eq('id', requestId);

      return { success: true, opt_out_applied: true };
    } catch (error) {
      this.logger.error('Error handling opt-out request:', error);
      throw error;
    }
  }

  // ========================================
  // DATA COLLECTION & DELETION
  // ========================================

  async collectAllUserData(userId) {
    try {
      const userData = {};

      // Collect from all relevant tables
      const tables = [
        'user_signup',
        'incident_reports',
        'ai_transcription',
        'ai_summary',
        'incident_images',
        'emergency_call_logs',
        'transcription_queue',
        'completed_incident_forms',
        'gdpr_consent_records',
        'gdpr_audit_trail'
      ];

      for (const table of tables) {
        try {
          const { data, error } = await this.supabase
            .from(table)
            .select('*')
            .eq('create_user_id', userId);

          if (!error && data) {
            userData[table] = data;
          }
        } catch (tableError) {
          this.logger.warn(`Could not collect data from ${table}:`, tableError.message);
        }
      }

      return userData;
    } catch (error) {
      this.logger.error('Error collecting user data:', error);
      throw error;
    }
  }

  async collectPortableData(userId) {
    // Collect only data provided by user and observed data (not derived/inferred)
    const portableData = {};

    const portableTables = [
      'user_signup',
      'incident_reports',
      'ai_transcription',
      'incident_images'
    ];

    for (const table of portableTables) {
      try {
        const { data } = await this.supabase
          .from(table)
          .select('*')
          .eq('create_user_id', userId);

        if (data) {
          // Remove system fields
          portableData[table] = data.map(record => {
            const cleaned = { ...record };
            delete cleaned.id;
            delete cleaned.created_at;
            delete cleaned.updated_at;
            return cleaned;
          });
        }
      } catch (error) {
        this.logger.warn(`Could not collect portable data from ${table}`);
      }
    }

    return portableData;
  }

  async deleteUserData(userId) {
    try {
      const deletionLog = {
        tables_processed: [],
        records_deleted: 0,
        records_anonymized: 0,
        errors: []
      };

      // Tables to delete from
      const deleteTables = [
        'incident_images',
        'ai_transcription',
        'ai_summary',
        'transcription_queue',
        'emergency_call_logs'
      ];

      // Tables to anonymize (keep for legal/statistical purposes)
      const anonymizeTables = [
        'incident_reports',
        'completed_incident_forms'
      ];

      // Delete data
      for (const table of deleteTables) {
        try {
          const { data, error } = await this.supabase
            .from(table)
            .delete()
            .eq('create_user_id', userId)
            .select();

          if (!error) {
            deletionLog.tables_processed.push(table);
            deletionLog.records_deleted += data?.length || 0;
          } else {
            deletionLog.errors.push({ table, error: error.message });
          }
        } catch (error) {
          deletionLog.errors.push({ table, error: error.message });
        }
      }

      // Anonymize data
      for (const table of anonymizeTables) {
        try {
          const anonymizedData = {
            create_user_id: `ANONYMIZED_${this.generateHash(userId)}`,
            anonymized: true,
            anonymized_date: new Date().toISOString()
          };

          const { data, error } = await this.supabase
            .from(table)
            .update(anonymizedData)
            .eq('create_user_id', userId)
            .select();

          if (!error) {
            deletionLog.tables_processed.push(table);
            deletionLog.records_anonymized += data?.length || 0;
          } else {
            deletionLog.errors.push({ table, error: error.message });
          }
        } catch (error) {
          deletionLog.errors.push({ table, error: error.message });
        }
      }

      // Log the deletion
      await this.auditLog(userId, 'DATA_DELETED', deletionLog);

      return deletionLog;
    } catch (error) {
      this.logger.error('Error deleting user data:', error);
      throw error;
    }
  }

  // ========================================
  // COMPLIANCE UTILITIES
  // ========================================

  async detectJurisdiction(ipAddress) {
    // In production, use a GeoIP service
    // For now, we'll use a simple detection based on IP patterns

    if (!ipAddress) return 'UNKNOWN';

    // This is a simplified example - in production, use MaxMind or similar
    // UK IP ranges (example)
    if (ipAddress.startsWith('2.') || ipAddress.startsWith('5.')) {
      return 'UK';
    }

    // US IP ranges (example)
    if (ipAddress.startsWith('3.') || ipAddress.startsWith('4.')) {
      // Further detection for US states would go here
      return 'US-CA'; // Default to California for strongest protection
    }

    return 'EU'; // Default to EU for strongest protection
  }

  getApplicableLaw(jurisdiction) {
    const lawMap = {
      'UK': 'UK_GDPR',
      'US-CA': 'CCPA_CPRA',
      'US-VA': 'VCDPA',
      'US-CO': 'CPA',
      'US-CT': 'CTDPA',
      'US-UT': 'UCPA',
      'EU': 'UK_GDPR', // Apply UK GDPR for EU as well
      'UNKNOWN': 'UK_GDPR' // Default to strongest protection
    };

    return lawMap[jurisdiction] || 'UK_GDPR';
  }

  calculateResponseDeadline(applicableLaw) {
    const law = this.privacyLaws[applicableLaw];
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + (law?.responseTime || 30));
    return deadline.toISOString();
  }

  calculateConsentExpiry(applicableLaw) {
    // UK GDPR suggests reviewing consent regularly
    // US laws don't have specific expiry requirements
    if (applicableLaw === 'UK_GDPR') {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1); // Annual review
      return expiry.toISOString();
    }
    return null;
  }

  async checkRetentionObligations(userId) {
    // Check if there are legal obligations to retain data
    try {
      // Check for ongoing legal cases
      const { data: incidents } = await this.supabase
        .from('incident_reports')
        .select('id, legal_case_active')
        .eq('create_user_id', userId)
        .eq('legal_case_active', true);

      if (incidents && incidents.length > 0) {
        return {
          must_retain: true,
          reason: 'Data must be retained due to ongoing legal proceedings'
        };
      }

      // Check for recent incidents (within legal retention period)
      const retentionPeriod = new Date();
      retentionPeriod.setFullYear(retentionPeriod.getFullYear() - 6); // 6 years for legal claims

      const { data: recentIncidents } = await this.supabase
        .from('incident_reports')
        .select('id')
        .eq('create_user_id', userId)
        .gte('created_at', retentionPeriod.toISOString());

      if (recentIncidents && recentIncidents.length > 0) {
        return {
          must_retain: true,
          reason: 'Data must be retained for legal compliance (6-year retention period)'
        };
      }

      return { must_retain: false };
    } catch (error) {
      this.logger.error('Error checking retention obligations:', error);
      // Err on the side of caution
      return {
        must_retain: true,
        reason: 'Unable to verify retention status - data retained for safety'
      };
    }
  }

  async restrictDataProcessing(userId) {
    try {
      // Add user to restricted processing list
      await this.supabase
        .from('restricted_users')
        .upsert({
          user_id: userId,
          restriction_date: new Date().toISOString(),
          restriction_reason: 'User request',
          processing_allowed: ['legal_obligation', 'vital_interests']
        });

      // Update user status
      await this.supabase
        .from('user_signup')
        .update({
          processing_restricted: true,
          restriction_date: new Date().toISOString()
        })
        .eq('create_user_id', userId);

      return { success: true };
    } catch (error) {
      this.logger.error('Error restricting data processing:', error);
      throw error;
    }
  }

  async getProcessingPurposes() {
    return [
      'Accident report documentation',
      'Legal case management',
      'Insurance claim support',
      'Emergency contact management',
      'AI-powered transcription and analysis',
      'Service improvement and analytics'
    ];
  }

  async getDataRecipients() {
    return [
      'Legal representatives (with consent)',
      'Insurance companies (with consent)',
      'Emergency services (when necessary)',
      'Cloud service providers (for storage)',
      'AI service providers (for processing)'
    ];
  }

  async getRetentionPeriods() {
    return {
      incident_reports: '6 years (legal requirement)',
      user_profile: 'Until account deletion',
      transcriptions: '1 year',
      images: '6 years',
      audit_logs: '3 years',
      consent_records: '6 years after withdrawal'
    };
  }

  async getDataSources() {
    return [
      'Direct user input (forms)',
      'Audio recordings',
      'Image uploads',
      'Automated transcription',
      'AI analysis',
      'System logs'
    ];
  }

  // ========================================
  // AUDIT & COMPLIANCE REPORTING
  // ========================================

  async auditLog(userId, action, details, req = null) {
    try {
      const auditEntry = {
        user_id: userId,
        action: action,
        details: details,
        ip_address: req ? this.hashIP(req.ip || req.clientIp) : null,
        user_agent: req ? req.get('user-agent') : null,
        request_id: req ? req.requestId : null,
        timestamp: new Date().toISOString(),
        compliance_relevant: this.isComplianceRelevant(action)
      };

      await this.supabase
        .from('gdpr_audit_trail')
        .insert([auditEntry]);

    } catch (error) {
      this.logger.error('Error creating audit log:', error);
    }
  }

  isComplianceRelevant(action) {
    const relevantActions = [
      'CONSENT_GRANTED',
      'CONSENT_WITHDRAWN',
      'DATA_DELETED',
      'DATA_EXPORTED',
      'DATA_ACCESS',
      'DSR_ACCESS',
      'DSR_ERASURE',
      'DSR_PORTABILITY',
      'DSR_RECTIFICATION',
      'DSR_RESTRICTION',
      'DSR_OPT_OUT',
      'DATA_BREACH'
    ];

    return relevantActions.includes(action);
  }

  async generateComplianceReport(startDate, endDate) {
    try {
      const report = {
        period: { start: startDate, end: endDate },
        generated_at: new Date().toISOString(),
        statistics: {},
        data_subject_requests: {},
        consent_metrics: {},
        breaches: [],
        cross_border_transfers: []
      };

      // Data Subject Requests
      const { data: dsrData } = await this.supabase
        .from('data_subject_requests')
        .select('*')
        .gte('request_date', startDate)
        .lte('request_date', endDate);

      report.data_subject_requests = {
        total: dsrData?.length || 0,
        by_type: this.groupBy(dsrData, 'request_type'),
        by_status: this.groupBy(dsrData, 'request_status'),
        by_jurisdiction: this.groupBy(dsrData, 'jurisdiction'),
        average_response_time: this.calculateAverageResponseTime(dsrData)
      };

      // Consent Metrics
      const { data: consentData } = await this.supabase
        .from('gdpr_consent_records')
        .select('*')
        .gte('consent_date', startDate)
        .lte('consent_date', endDate);

      report.consent_metrics = {
        new_consents: consentData?.filter(c => c.consent_given).length || 0,
        withdrawals: consentData?.filter(c => c.withdrawal_date).length || 0,
        by_jurisdiction: this.groupBy(consentData, 'jurisdiction')
      };

      // Data Breaches
      const { data: breachData } = await this.supabase
        .from('data_breaches')
        .select('*')
        .gte('breach_date', startDate)
        .lte('breach_date', endDate);

      report.breaches = breachData || [];

      // Cross-border transfers
      const { data: transferData } = await this.supabase
        .from('cross_border_transfers')
        .select('*')
        .gte('transfer_date', startDate)
        .lte('transfer_date', endDate);

      report.cross_border_transfers = transferData || [];

      return report;
    } catch (error) {
      this.logger.error('Error generating compliance report:', error);
      throw error;
    }
  }

  // ========================================
  // DATA BREACH MANAGEMENT
  // ========================================

  async reportDataBreach(breachData) {
    try {
      const breach = {
        breach_date: breachData.date || new Date().toISOString(),
        discovery_date: new Date().toISOString(),
        breach_type: breachData.type,
        affected_users: breachData.affected_users || [],
        affected_data_categories: breachData.data_categories,
        severity: this.assessBreachSeverity(breachData),
        notification_required: this.isNotificationRequired(breachData),
        notification_deadline: this.calculateNotificationDeadline(),
        description: breachData.description,
        measures_taken: breachData.measures || [],
        reported_to_authority: false,
        users_notified: false
      };

      const { data, error } = await this.supabase
        .from('data_breaches')
        .insert([breach])
        .select()
        .single();

      if (error) throw error;

      // Trigger notification process if required
      if (breach.notification_required) {
        await this.initiateBreachNotifications(data.id, breach);
      }

      return { success: true, breach_id: data.id, notification_required: breach.notification_required };
    } catch (error) {
      this.logger.error('Error reporting data breach:', error);
      throw error;
    }
  }

  assessBreachSeverity(breachData) {
    // Assess based on UK GDPR criteria
    let severity = 'low';

    if (breachData.data_categories?.includes('health') ||
        breachData.data_categories?.includes('financial') ||
        breachData.data_categories?.includes('special_category')) {
      severity = 'high';
    } else if (breachData.affected_users?.length > 100) {
      severity = 'medium';
    }

    return severity;
  }

  isNotificationRequired(breachData) {
    // UK GDPR: Notification required if high risk to individuals
    return this.assessBreachSeverity(breachData) === 'high';
  }

  calculateNotificationDeadline() {
    // UK GDPR: 72 hours to supervisory authority
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 72);
    return deadline.toISOString();
  }

  async initiateBreachNotifications(breachId, breachData) {
    // This would trigger actual notification processes
    this.logger.info(`Breach notification initiated for breach ${breachId}`);

    // Log the notification requirement
    await this.auditLog('SYSTEM', 'BREACH_NOTIFICATION_INITIATED', {
      breach_id: breachId,
      affected_users: breachData.affected_users.length,
      deadline: breachData.notification_deadline
    });
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  hashIP(ip) {
    if (!ip) return null;
    // Hash IP for privacy while maintaining auditability
    return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'default-salt').digest('hex').substring(0, 16);
  }

  generateHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  groupBy(array, key) {
    if (!array) return {};
    return array.reduce((result, item) => {
      const group = item[key];
      if (!result[group]) result[group] = 0;
      result[group]++;
      return result;
    }, {});
  }

  calculateAverageResponseTime(requests) {
    if (!requests || requests.length === 0) return 0;

    const completed = requests.filter(r => r.request_status === 'completed' && r.processed_date);
    if (completed.length === 0) return 0;

    const totalTime = completed.reduce((sum, request) => {
      const requestDate = new Date(request.request_date);
      const processedDate = new Date(request.processed_date);
      const days = (processedDate - requestDate) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    return Math.round(totalTime / completed.length);
  }

  async convertToCSV(data) {
    // Simple CSV conversion - in production, use a proper CSV library
    const csv = [];

    for (const [table, records] of Object.entries(data)) {
      if (Array.isArray(records) && records.length > 0) {
        const headers = Object.keys(records[0]);
        csv.push(`Table: ${table}`);
        csv.push(headers.join(','));

        records.forEach(record => {
          const values = headers.map(header => {
            const value = record[header];
            return typeof value === 'object' ? JSON.stringify(value) : value;
          });
          csv.push(values.join(','));
        });

        csv.push(''); // Empty line between tables
      }
    }

    return csv.join('\n');
  }

  async notifyAdmin(type, data) {
    // Implement admin notification (email, webhook, etc.)
    this.logger.info(`Admin notification: ${type}`, data);
  }

  // ========================================
  // CROSS-BORDER TRANSFER TRACKING
  // ========================================

  async recordCrossBorderTransfer(transferData) {
    try {
      const transfer = {
        user_id: transferData.userId,
        data_categories: transferData.dataCategories,
        destination_country: transferData.destinationCountry,
        transfer_purpose: transferData.transferPurpose,
        legal_basis: transferData.legalBasis,
        safeguards: transferData.safeguards,
        data_recipient: transferData.dataRecipient,
        transfer_date: new Date().toISOString(),
        consent_status: transferData.consentStatus || 'required',
        adequacy_decision: transferData.adequacyDecision || false,
        volume_estimate: transferData.volumeEstimate,
        retention_period: transferData.retentionPeriod
      };

      const { data, error } = await this.supabase
        .from('cross_border_transfers')
        .insert([transfer])
        .select()
        .single();

      if (error) throw error;

      // Log the transfer for audit purposes
      await this.auditLog(transferData.userId, 'CROSS_BORDER_TRANSFER', {
        transfer_id: data.id,
        destination: transferData.destinationCountry,
        purpose: transferData.transferPurpose,
        legal_basis: transferData.legalBasis
      });

      return { success: true, transfer_id: data.id };
    } catch (error) {
      this.logger.error('Error recording cross-border transfer:', error);
      throw error;
    }
  }

  async getCrossBorderTransfers(userId, dateRange = null) {
    try {
      let query = this.supabase
        .from('cross_border_transfers')
        .select('*')
        .eq('user_id', userId)
        .order('transfer_date', { ascending: false });

      if (dateRange?.start) {
        query = query.gte('transfer_date', dateRange.start);
      }
      if (dateRange?.end) {
        query = query.lte('transfer_date', dateRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      this.logger.error('Error getting cross-border transfers:', error);
      throw error;
    }
  }

  // ========================================
  // COOKIE CONSENT MANAGEMENT
  // ========================================

  generateCookiePolicy() {
    return {
      version: '1.0',
      last_updated: new Date().toISOString(),
      cookie_categories: {
        necessary: {
          description: 'Essential for website operation',
          cookies: ['session_id', 'csrf_token', 'consent_status'],
          opt_out_available: false
        },
        analytics: {
          description: 'Help us understand usage patterns',
          cookies: ['_ga', '_gid', 'user_behavior'],
          opt_out_available: true
        },
        marketing: {
          description: 'Used for targeted advertising',
          cookies: [],
          opt_out_available: true
        }
      }
    };
  }

  // ========================================
  // EXPRESS MIDDLEWARE
  // ========================================

  middleware() {
    return async (req, res, next) => {
      // Add GDPR helpers to request
      req.gdpr = {
        checkConsent: async (userId) => await this.checkConsentStatus(userId),
        logActivity: async (userId, action, details) => await this.auditLog(userId, action, details, req),
        detectJurisdiction: async () => await this.detectJurisdiction(req.ip || req.clientIp)
      };

      // Check if user has valid consent for data processing
      const userId = req.body?.userId || req.body?.create_user_id || req.params?.userId;

      if (userId && req.path !== '/api/gdpr/consent' && !req.path.includes('/public')) {
        const consentStatus = await this.checkConsentStatus(userId);
        req.hasConsent = consentStatus.has_consent;
        req.consentDetails = consentStatus;
      }

      next();
    };
  }

  // ========================================
  // API ROUTE HANDLERS
  // ========================================

  getRoutes() {
    const router = require('express').Router();

    // Consent endpoints
    router.post('/api/gdpr/consent', async (req, res) => {
      try {
        const result = await this.recordConsent(req.body.userId, req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/api/gdpr/withdraw-consent', async (req, res) => {
      try {
        const result = await this.withdrawConsent(req.body.userId, req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.get('/api/gdpr/consent-status/:userId', async (req, res) => {
      try {
        const result = await this.checkConsentStatus(req.params.userId);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Data subject rights endpoints
    router.post('/api/gdpr/dsr', async (req, res) => {
      try {
        const result = await this.handleDataSubjectRequest(
          req.body.userId,
          req.body.requestType,
          req.body
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.get('/api/gdpr/dsr/:requestId', async (req, res) => {
      try {
        const { data, error } = await this.supabase
          .from('data_subject_requests')
          .select('*')
          .eq('id', req.params.requestId)
          .single();

        if (error) throw error;
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Data export endpoint
    router.get('/api/gdpr/export/:userId', async (req, res) => {
      try {
        const data = await this.collectAllUserData(req.params.userId);
        res.json({
          export_date: new Date().toISOString(),
          user_id: req.params.userId,
          data: data
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Data deletion endpoint
    router.delete('/api/gdpr/user/:userId', async (req, res) => {
      try {
        const result = await this.deleteUserData(req.params.userId);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Compliance reporting
    router.get('/api/gdpr/compliance-report', async (req, res) => {
      try {
        const { start, end } = req.query;
        const report = await this.generateComplianceReport(start, end);
        res.json(report);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Data breach reporting
    router.post('/api/gdpr/breach', async (req, res) => {
      try {
        const result = await this.reportDataBreach(req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Cookie policy
    router.get('/api/gdpr/cookie-policy', (req, res) => {
      res.json(this.generateCookiePolicy());
    });

    // Cross-border transfers tracking - user-specific endpoint
    router.get('/api/gdpr/cross-border-transfers/:userId', async (req, res) => {
      try {
        const { data, error } = await this.supabase
          .from('cross_border_transfers')
          .select('*')
          .eq('user_id', req.params.userId)
          .order('transfer_date', { ascending: false });

        if (error) throw error;
        
        res.json({
          success: true,
          transfers: data || [],
          count: data?.length || 0
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Cross-border transfers tracking - admin overview
    router.get('/api/gdpr/cross-border-transfers', async (req, res) => {
      try {
        const { start, end } = req.query;
        const { data, error } = await this.supabase
          .from('cross_border_transfers')
          .select('*')
          .gte('transfer_date', start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .lte('transfer_date', end || new Date().toISOString())
          .order('transfer_date', { ascending: false });

        if (error) throw error;

        const transfersByCountry = this.groupBy(data, 'destination_country');
        const transfersByPurpose = this.groupBy(data, 'transfer_purpose');

        res.json({
          transfers: data || [],
          statistics: {
            total_transfers: data?.length || 0,
            by_country: transfersByCountry,
            by_purpose: transfersByPurpose,
            period: { start: start || 'last 30 days', end: end || 'now' }
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Record cross-border transfer
    router.post('/api/gdpr/cross-border-transfers', async (req, res) => {
      try {
        const { userId, destination, dataCategories, safeguards, purpose } = req.body;
        
        const transfer = {
          user_id: userId,
          destination_country: destination,
          data_categories: dataCategories,
          transfer_mechanism: safeguards,
          purpose: purpose,
          transfer_date: new Date().toISOString(),
          legal_basis: req.body.legalBasis || 'consent'
        };

        const { data, error } = await this.supabase
          .from('cross_border_transfers')
          .insert([transfer])
          .select()
          .single();

        if (error) throw error;
        
        await this.auditLog(userId, 'CROSS_BORDER_TRANSFER', {
          destination: destination,
          transfer_id: data.id
        }, req);

        res.json({ success: true, transfer_id: data.id });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // User rights information
    router.get('/api/gdpr/user-rights/:userId', async (req, res) => {
      try {
        const userId = req.params.userId;
        const consentStatus = await this.checkConsentStatus(userId);
        const jurisdiction = consentStatus.jurisdiction || await this.detectJurisdiction(req.ip);
        const applicableLaw = this.getApplicableLaw(jurisdiction);
        const rights = this.privacyLaws[applicableLaw];

        res.json({
          user_id: userId,
          jurisdiction: jurisdiction,
          applicable_law: applicableLaw,
          consent_status: consentStatus,
          rights_available: rights.rights,
          response_time: `${rights.responseTime} days`,
          endpoints: {
            withdraw_consent: '/api/gdpr/withdraw-consent',
            request_data: '/api/gdpr/dsr',
            export_data: `/api/gdpr/export/${userId}`,
            delete_data: `/api/gdpr/user/${userId}`
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Admin dashboard for compliance monitoring
    router.get('/api/gdpr/admin/dashboard', async (req, res) => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentConsents } = await this.supabase
          .from('gdpr_consent_records')
          .select('*')
          .gte('consent_date', thirtyDaysAgo.toISOString());

        const { data: pendingDSRs } = await this.supabase
          .from('data_subject_requests')
          .select('*')
          .eq('request_status', 'pending');

        const { data: recentBreaches } = await this.supabase
          .from('data_breaches')
          .select('*')
          .gte('discovery_date', thirtyDaysAgo.toISOString());

        const { data: overdueDSRs } = await this.supabase
          .from('data_subject_requests')
          .select('*')
          .lt('response_deadline', new Date().toISOString())
          .eq('request_status', 'pending');

        res.json({
          dashboard_date: new Date().toISOString(),
          consent_metrics: {
            new_consents: recentConsents?.filter(c => c.consent_given).length || 0,
            withdrawals: recentConsents?.filter(c => c.withdrawal_date).length || 0,
            by_jurisdiction: this.groupBy(recentConsents, 'jurisdiction')
          },
          data_subject_requests: {
            pending: pendingDSRs?.length || 0,
            overdue: overdueDSRs?.length || 0,
            by_type: this.groupBy(pendingDSRs, 'request_type')
          },
          compliance_alerts: {
            overdue_requests: overdueDSRs?.length || 0,
            recent_breaches: recentBreaches?.length || 0,
            breach_notifications_due: recentBreaches?.filter(b => b.notification_required && !b.reported_to_authority).length || 0
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }
}

module.exports = GDPRComplianceModule;