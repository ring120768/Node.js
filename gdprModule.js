// ========================================
// SIMPLIFIED GDPR COMPLIANCE MODULE
// Version: 3.0 - Streamlined and Fixed
// ========================================

const crypto = require('crypto');

class GDPRComplianceModule {
  constructor(supabase, logger) {
    this.supabase = supabase;
    this.logger = logger || console;

    // Cache consent status to avoid repeated DB calls
    this.consentCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // ========================================
  // CORE CONSENT MANAGEMENT
  // ========================================

  /**
   * Check consent status - PRIMARY METHOD
   * Checks user_signup table (source of truth) with caching
   */
  async checkConsentStatus(userId) {
    if (!userId) {
      return { has_consent: false, reason: 'No user ID provided' };
    }

    // Check cache first
    const cached = this.consentCache.get(userId);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    try {
      // Check user_signup table (primary source of truth)
      const { data: user, error } = await this.supabase
        .from('user_signup')
        .select('gdpr_consent, gdpr_consent_date, legal_support')
        .eq('create_user_id', userId)
        .single();

      if (error || !user) {
        this.logger.debug(`No user found for ${userId}`);
        return { 
          has_consent: false, 
          exists: false,
          reason: 'User not found' 
        };
      }

      // Check multiple consent indicators
      const hasConsent = !!(
        user.gdpr_consent === true || 
        user.gdpr_consent === 'true' || 
        user.gdpr_consent === 1 ||
        user.legal_support === 'Yes' ||
        user.legal_support === true
      );

      const result = {
        has_consent: hasConsent,
        exists: true,
        consent_date: user.gdpr_consent_date,
        legal_support: user.legal_support,
        source: 'user_signup'
      };

      // Cache the result
      this.consentCache.set(userId, {
        data: result,
        expires: Date.now() + this.cacheTimeout
      });

      return result;

    } catch (error) {
      this.logger.error('Error checking consent status:', error);
      // Don't block on errors - default to true for existing users
      return { 
        has_consent: true, 
        error: true,
        reason: 'Error checking consent, defaulting to allow' 
      };
    }
  }

  /**
   * Record consent - saves to user_signup table
   */
  async recordConsent(userId, consentData = {}) {
    try {
      // Clear cache for this user
      this.consentCache.delete(userId);

      // Update user_signup table
      const { data: updated, error: updateError } = await this.supabase
        .from('user_signup')
        .update({
          gdpr_consent: true,
          gdpr_consent_date: new Date().toISOString(),
          legal_support: 'Yes',
          consent_metadata: {
            ip_address: consentData.ip_address,
            user_agent: consentData.user_agent,
            source: consentData.source || 'web_form',
            timestamp: new Date().toISOString()
          }
        })
        .eq('create_user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Log the consent for audit trail
      await this.auditLog(userId, 'CONSENT_GRANTED', {
        source: consentData.source || 'web_form',
        ip_address: this.hashIP(consentData.ip_address)
      });

      // Also save to gdpr_consent_records for compliance if table exists
      try {
        await this.supabase
          .from('gdpr_consent_records')
          .insert({
            user_id: userId,
            consent_given: true,
            consent_type: 'all_processing',
            consent_date: new Date().toISOString(),
            ip_address: this.hashIP(consentData.ip_address),
            user_agent: consentData.user_agent,
            metadata: consentData
          });
      } catch (e) {
        // Table might not exist, that's ok
        this.logger.debug('gdpr_consent_records table not available');
      }

      return { 
        success: true, 
        has_consent: true,
        user_id: userId 
      };

    } catch (error) {
      this.logger.error('Error recording consent:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(userId, reason = 'User request') {
    try {
      // Clear cache
      this.consentCache.delete(userId);

      // Update user_signup table
      const { error: updateError } = await this.supabase
        .from('user_signup')
        .update({
          gdpr_consent: false,
          gdpr_consent_date: null,
          legal_support: 'No',
          consent_withdrawn_date: new Date().toISOString(),
          consent_withdrawal_reason: reason
        })
        .eq('create_user_id', userId);

      if (updateError) {
        throw updateError;
      }

      // Log the withdrawal
      await this.auditLog(userId, 'CONSENT_WITHDRAWN', { reason });

      return { 
        success: true, 
        message: 'Consent withdrawn successfully' 
      };

    } catch (error) {
      this.logger.error('Error withdrawing consent:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ========================================
  // DATA SUBJECT RIGHTS (Simplified)
  // ========================================

  /**
   * Handle data export request (Right to Access)
   */
  async exportUserData(userId) {
    try {
      const userData = {};

      // List of tables to export from
      const tables = [
        'user_signup',
        'incident_reports',
        'ai_transcription',
        'ai_summary',
        'incident_images'
      ];

      for (const table of tables) {
        try {
          const { data } = await this.supabase
            .from(table)
            .select('*')
            .or(`create_user_id.eq.${userId},user_id.eq.${userId}`);

          if (data && data.length > 0) {
            userData[table] = data;
          }
        } catch (error) {
          this.logger.debug(`Table ${table} not accessible:`, error.message);
        }
      }

      await this.auditLog(userId, 'DATA_EXPORTED', {
        tables: Object.keys(userData)
      });

      return {
        success: true,
        export_date: new Date().toISOString(),
        user_id: userId,
        data: userData
      };

    } catch (error) {
      this.logger.error('Error exporting user data:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Handle data deletion request (Right to Erasure)
   * Anonymizes data instead of hard delete for legal compliance
   */
  async deleteUserData(userId) {
    try {
      const anonymizedId = `ANON_${this.generateHash(userId)}`;
      const results = {
        anonymized: [],
        deleted: [],
        errors: []
      };

      // Tables to anonymize (keep for legal records)
      const anonymizeTables = [
        'incident_reports',
        'ai_transcription',
        'ai_summary'
      ];

      // Tables to delete from
      const deleteTables = [
        'incident_images',
        'transcription_queue'
      ];

      // Anonymize data
      for (const table of anonymizeTables) {
        try {
          const { data } = await this.supabase
            .from(table)
            .update({
              create_user_id: anonymizedId,
              anonymized: true,
              anonymized_date: new Date().toISOString()
            })
            .or(`create_user_id.eq.${userId},user_id.eq.${userId}`)
            .select();

          if (data) {
            results.anonymized.push({ table, count: data.length });
          }
        } catch (error) {
          results.errors.push({ table, error: error.message });
        }
      }

      // Delete data
      for (const table of deleteTables) {
        try {
          const { data } = await this.supabase
            .from(table)
            .delete()
            .or(`create_user_id.eq.${userId},user_id.eq.${userId}`)
            .select();

          if (data) {
            results.deleted.push({ table, count: data.length });
          }
        } catch (error) {
          results.errors.push({ table, error: error.message });
        }
      }

      await this.auditLog(userId, 'DATA_DELETED', results);

      return {
        success: results.errors.length === 0,
        results
      };

    } catch (error) {
      this.logger.error('Error deleting user data:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ========================================
  // SIMPLIFIED MIDDLEWARE
  // ========================================

  /**
   * Express middleware - Non-blocking version
   */
  middleware() {
    return async (req, res, next) => {
      // Skip consent check for public/auth endpoints
      const skipPaths = [
        '/api/signup',
        '/api/login',
        '/api/gdpr',
        '/api/webhook',
        '/health',
        '/public'
      ];

      if (skipPaths.some(path => req.path.includes(path))) {
        return next();
      }

      // Extract user ID from various sources
      const userId = this.extractUserId(req);

      if (!userId) {
        // No user ID = can't check consent, allow through
        req.hasConsent = true;
        req.gdprStatus = 'no_user_id';
        return next();
      }

      // Check consent status
      try {
        const consentStatus = await this.checkConsentStatus(userId);
        req.hasConsent = consentStatus.has_consent;
        req.consentDetails = consentStatus;
        req.userId = userId;

        // Log if consent is missing but DON'T BLOCK
        if (!consentStatus.has_consent) {
          this.logger.info(`User ${userId} lacks consent for ${req.path}`);
          req.needsConsent = true;
        }

      } catch (error) {
        // On error, allow through
        this.logger.error('Consent check error:', error);
        req.hasConsent = true;
        req.gdprStatus = 'check_failed';
      }

      // ALWAYS continue to next middleware
      next();
    };
  }

  /**
   * Helper to extract user ID from request
   */
  extractUserId(req) {
    return req.body?.userId || 
           req.body?.create_user_id || 
           req.params?.userId ||
           req.query?.userId ||
           req.headers?.['x-user-id'] ||
           req.session?.userId ||
           req.user?.id;
  }

  // ========================================
  // AUDIT & COMPLIANCE
  // ========================================

  /**
   * Audit logging for compliance
   */
  async auditLog(userId, action, details = {}) {
    try {
      // Try to log to audit table
      await this.supabase
        .from('gdpr_audit_log')
        .insert({
          user_id: userId,
          action: action,
          details: details,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      // If audit table doesn't exist, log to console
      this.logger.info(`GDPR Audit: ${action} for user ${userId}`, details);
    }
  }

  /**
   * Check if data processing is allowed for user
   */
  async canProcess(userId, processingType = 'general') {
    const consent = await this.checkConsentStatus(userId);

    // Special cases where processing is always allowed
    const vitalProcessing = ['emergency', 'legal_obligation', 'vital_interests'];
    if (vitalProcessing.includes(processingType)) {
      return true;
    }

    return consent.has_consent;
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  /**
   * Hash sensitive data for privacy
   */
  hashIP(ip) {
    if (!ip) return null;
    const salt = process.env.IP_SALT || 'default-salt-change-this';
    return crypto
      .createHash('sha256')
      .update(ip + salt)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate anonymous hash
   */
  generateHash(data) {
    return crypto
      .createHash('sha256')
      .update(String(data))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Clear consent cache for a user
   */
  clearCache(userId = null) {
    if (userId) {
      this.consentCache.delete(userId);
    } else {
      this.consentCache.clear();
    }
  }

  // ========================================
  // API ENDPOINTS
  // ========================================

  /**
   * Get Express router with GDPR endpoints
   */
  getRoutes() {
    const router = require('express').Router();

    // Check consent status
    router.get('/api/gdpr/status/:userId', async (req, res) => {
      try {
        const status = await this.checkConsentStatus(req.params.userId);
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Grant consent
    router.post('/api/gdpr/consent', async (req, res) => {
      try {
        const result = await this.recordConsent(
          req.body.userId || req.body.create_user_id,
          req.body
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Withdraw consent
    router.post('/api/gdpr/withdraw', async (req, res) => {
      try {
        const result = await this.withdrawConsent(
          req.body.userId || req.body.create_user_id,
          req.body.reason
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Export user data
    router.get('/api/gdpr/export/:userId', async (req, res) => {
      try {
        const data = await this.exportUserData(req.params.userId);
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Delete user data
    router.delete('/api/gdpr/delete/:userId', async (req, res) => {
      try {
        const result = await this.deleteUserData(req.params.userId);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Simple consent check endpoint (for frontend)
    router.post('/api/gdpr/check', async (req, res) => {
      try {
        const userId = req.body.userId || req.body.create_user_id;
        const status = await this.checkConsentStatus(userId);
        res.json({
          userId,
          hasConsent: status.has_consent,
          needsConsent: !status.has_consent && status.exists
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }
}

module.exports = GDPRComplianceModule;