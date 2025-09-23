/**
 * Consent Manager Module - Simplified Version
 * Handles consent extraction from webhooks and forms
 * Works with simplified GDPR module
 */

class ConsentManager {
  constructor(supabase = null, logger = null) {
    this.supabase = supabase;
    this.logger = logger || console;

    // Simple consent field patterns
    this.consentFieldPatterns = [
      /consent/i,
      /gdpr/i,
      /legal[_\-]?support/i,
      /agree/i,
      /accept/i,
      /opt[_\-]?in/i,
      /question[_\-]?14$/i,  // Your specific Typeform field
      /q14$/i
    ];

    // Positive consent values
    this.positiveValues = new Set([
      'yes', 'true', '1', 'on', 'agreed', 'accepted', 
      'i agree', 'i consent', 'i accept', 'si', 'oui', 'ja'
    ]);

    // Negative consent values  
    this.negativeValues = new Set([
      'no', 'false', '0', 'off', 'declined', 'rejected',
      'i disagree', 'i do not consent', 'non', 'nein'
    ]);
  }

  // ========================================
  // MAIN METHODS
  // ========================================

  /**
   * Extract consent from any webhook payload
   * Simplified to just find and return consent status
   */
  extractConsentFromWebhook(payload, provider = null) {
    const result = {
      hasConsent: false,
      consentSource: null,
      consentValue: null,
      provider: provider || this.detectProvider(payload),
      timestamp: new Date().toISOString(),
      fields: {}
    };

    // Handle Typeform structure
    if (this.isTypeformPayload(payload)) {
      return this.extractTypeformConsent(payload);
    }

    // Handle generic webhook structure
    const consentData = this.findConsentInObject(payload);
    if (consentData.found) {
      result.hasConsent = consentData.value;
      result.consentSource = consentData.source;
      result.consentValue = consentData.originalValue;
      result.fields = consentData.allFields;
    }

    return result;
  }

  /**
   * Process Typeform webhook specifically
   */
  extractTypeformConsent(payload) {
    const result = {
      hasConsent: false,
      consentSource: 'typeform',
      consentValue: null,
      provider: 'typeform',
      timestamp: new Date().toISOString(),
      fields: {},
      metadata: {}
    };

    // Store form metadata
    if (payload.form_response) {
      result.metadata = {
        formId: payload.form_response.form_id,
        responseId: payload.form_response.token,
        submittedAt: payload.form_response.submitted_at
      };

      // Check answers for consent fields
      const answers = payload.form_response.answers || [];
      for (const answer of answers) {
        const fieldId = answer.field?.id;
        const fieldRef = answer.field?.ref;
        const fieldTitle = answer.field?.title || '';

        // Check if this looks like a consent field
        if (this.isConsentField(fieldId) || 
            this.isConsentField(fieldRef) || 
            this.isConsentField(fieldTitle)) {

          // Extract the answer value
          let value = this.extractAnswerValue(answer);
          const consentValue = this.parseConsentValue(value);

          if (consentValue !== null) {
            result.hasConsent = consentValue;
            result.consentValue = value;
            result.fields[fieldRef || fieldId] = {
              value: value,
              parsed: consentValue,
              type: answer.type,
              title: fieldTitle
            };
            break; // Found consent, stop looking
          }
        }
      }

      // Also check hidden fields
      if (payload.form_response.hidden) {
        for (const [key, value] of Object.entries(payload.form_response.hidden)) {
          if (this.isConsentField(key)) {
            const consentValue = this.parseConsentValue(value);
            if (consentValue !== null) {
              result.hasConsent = consentValue;
              result.consentValue = value;
              result.fields[`hidden_${key}`] = {
                value: value,
                parsed: consentValue,
                type: 'hidden'
              };
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Save consent to database (user_signup table)
   */
  async saveConsent(userId, consentData) {
    if (!this.supabase) {
      this.logger.error('ConsentManager: Supabase not configured');
      return { success: false, error: 'Database not configured' };
    }

    try {
      // Prepare update data
      const updateData = {
        gdpr_consent: consentData.hasConsent,
        gdpr_consent_date: consentData.hasConsent ? new Date().toISOString() : null,
        legal_support: consentData.hasConsent ? 'Yes' : 'No',
        consent_source: consentData.consentSource || consentData.provider,
        consent_metadata: {
          provider: consentData.provider,
          timestamp: consentData.timestamp,
          value: consentData.consentValue,
          fields: consentData.fields,
          metadata: consentData.metadata
        }
      };

      // Update user record
      const { data, error } = await this.supabase
        .from('user_signup')
        .update(updateData)
        .eq('create_user_id', userId)
        .select()
        .single();

      if (error) {
        // If user doesn't exist, try to create
        if (error.code === 'PGRST116') {
          const { data: newUser, error: createError } = await this.supabase
            .from('user_signup')
            .insert({
              create_user_id: userId,
              ...updateData,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) throw createError;

          this.logger.info(`Created new user ${userId} with consent: ${consentData.hasConsent}`);
          return { success: true, created: true, data: newUser };
        }
        throw error;
      }

      this.logger.info(`Updated consent for user ${userId}: ${consentData.hasConsent}`);
      return { success: true, updated: true, data };

    } catch (error) {
      this.logger.error('ConsentManager: Error saving consent', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Quick consent update - simplified version
   */
  async updateConsent(userId, hasConsent, source = 'manual') {
    return this.saveConsent(userId, {
      hasConsent: hasConsent,
      consentSource: source,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current consent status for a user
   */
  async getConsentStatus(userId) {
    if (!this.supabase) {
      return { error: 'Database not configured' };
    }

    try {
      const { data, error } = await this.supabase
        .from('user_signup')
        .select('gdpr_consent, gdpr_consent_date, legal_support, consent_source, consent_metadata')
        .eq('create_user_id', userId)
        .single();

      if (error || !data) {
        return { 
          exists: false, 
          hasConsent: false,
          userId: userId 
        };
      }

      // Check multiple consent indicators
      const hasConsent = !!(
        data.gdpr_consent === true || 
        data.gdpr_consent === 'true' ||
        data.gdpr_consent === 1 ||
        data.legal_support === 'Yes'
      );

      return {
        exists: true,
        hasConsent: hasConsent,
        consentDate: data.gdpr_consent_date,
        legalSupport: data.legal_support === 'Yes',
        source: data.consent_source,
        metadata: data.consent_metadata,
        userId: userId
      };

    } catch (error) {
      this.logger.error('ConsentManager: Error getting consent status', error);
      return { error: error.message };
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Check if a field name looks like a consent field
   */
  isConsentField(fieldName) {
    if (!fieldName) return false;

    const field = String(fieldName).toLowerCase().trim();

    // Check against patterns
    for (const pattern of this.consentFieldPatterns) {
      if (pattern.test(field)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse a consent value to boolean
   */
  parseConsentValue(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Handle boolean directly
    if (typeof value === 'boolean') {
      return value;
    }

    // Convert to string and check
    const strValue = String(value).toLowerCase().trim();

    // Check positive values
    if (this.positiveValues.has(strValue)) {
      return true;
    }

    // Check negative values
    if (this.negativeValues.has(strValue)) {
      return false;
    }

    // Check if it contains positive keywords
    for (const positive of this.positiveValues) {
      if (strValue.includes(positive)) {
        return true;
      }
    }

    // Unknown value - return null
    return null;
  }

  /**
   * Extract value from Typeform answer object
   */
  extractAnswerValue(answer) {
    if (answer.boolean !== undefined) return answer.boolean;
    if (answer.text) return answer.text;
    if (answer.choice) return answer.choice.label;
    if (answer.choices) return answer.choices.map(c => c.label).join(', ');
    if (answer.number !== undefined) return answer.number;
    return null;
  }

  /**
   * Detect webhook provider from payload structure
   */
  detectProvider(payload) {
    if (payload.form_response?.form_id) return 'typeform';
    if (payload.webhook?.id) return 'stripe';
    if (payload.event_type) return 'webhook_generic';
    return 'unknown';
  }

  /**
   * Check if payload is from Typeform
   */
  isTypeformPayload(payload) {
    return !!(payload.form_response && payload.form_response.form_id);
  }

  /**
   * Recursively find consent in an object
   */
  findConsentInObject(obj, depth = 0) {
    const result = {
      found: false,
      value: false,
      source: null,
      originalValue: null,
      allFields: {}
    };

    if (depth > 5 || !obj || typeof obj !== 'object') {
      return result;
    }

    for (const [key, value] of Object.entries(obj)) {
      // Skip null/undefined values
      if (value === null || value === undefined) continue;

      // Check if this field is consent-related
      if (this.isConsentField(key)) {
        const consentValue = this.parseConsentValue(value);
        if (consentValue !== null) {
          result.found = true;
          result.value = consentValue;
          result.source = key;
          result.originalValue = value;
          result.allFields[key] = value;
          return result; // Return first found consent
        }
      }

      // Recursively check nested objects
      if (typeof value === 'object' && !Array.isArray(value)) {
        const nested = this.findConsentInObject(value, depth + 1);
        if (nested.found) {
          return nested;
        }
      }
    }

    return result;
  }

  // ========================================
  // WEBHOOK PROCESSING
  // ========================================

  /**
   * Process webhook and update user consent
   * This is the main method to call from webhook endpoints
   */
  async processWebhookConsent(userId, payload, provider = null) {
    try {
      // Extract consent from webhook
      const consentData = this.extractConsentFromWebhook(payload, provider);

      // Log what we found
      this.logger.info(`Webhook consent for ${userId}:`, {
        hasConsent: consentData.hasConsent,
        source: consentData.consentSource,
        provider: consentData.provider
      });

      // Only update if we found clear consent information
      if (consentData.consentValue !== null) {
        const saveResult = await this.saveConsent(userId, consentData);

        return {
          success: saveResult.success,
          hasConsent: consentData.hasConsent,
          source: consentData.consentSource,
          ...saveResult
        };
      }

      return {
        success: false,
        message: 'No clear consent found in webhook',
        consentData
      };

    } catch (error) {
      this.logger.error('Error processing webhook consent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========================================
  // EXPRESS MIDDLEWARE
  // ========================================

  /**
   * Middleware to extract consent from request body
   * Non-blocking - just adds consent info to request
   */
  middleware() {
    return async (req, res, next) => {
      // Skip if no body
      if (!req.body || Object.keys(req.body).length === 0) {
        return next();
      }

      // Try to extract consent from request
      try {
        const consentData = this.findConsentInObject(req.body);

        if (consentData.found) {
          req.consentFound = true;
          req.consentValue = consentData.value;
          req.consentSource = consentData.source;

          this.logger.debug(`Consent found in request: ${consentData.value} from ${consentData.source}`);
        }
      } catch (error) {
        this.logger.error('Error checking request for consent:', error);
      }

      next();
    };
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Batch check consent for multiple users
   */
  async checkMultipleUsers(userIds) {
    if (!this.supabase || !Array.isArray(userIds) || userIds.length === 0) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('user_signup')
        .select('create_user_id, gdpr_consent, legal_support')
        .in('create_user_id', userIds);

      if (error) throw error;

      const consentMap = {};
      for (const user of data || []) {
        consentMap[user.create_user_id] = !!(
          user.gdpr_consent === true || 
          user.gdpr_consent === 'true' ||
          user.legal_support === 'Yes'
        );
      }

      return userIds.map(id => ({
        userId: id,
        hasConsent: consentMap[id] || false
      }));

    } catch (error) {
      this.logger.error('Error checking multiple users:', error);
      return userIds.map(id => ({
        userId: id,
        hasConsent: false,
        error: true
      }));
    }
  }

  /**
   * Clear all consent data for a user (for testing)
   */
  async clearConsent(userId) {
    if (!this.supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const { error } = await this.supabase
        .from('user_signup')
        .update({
          gdpr_consent: null,
          gdpr_consent_date: null,
          legal_support: null,
          consent_source: null,
          consent_metadata: null
        })
        .eq('create_user_id', userId);

      if (error) throw error;

      this.logger.info(`Cleared consent for user ${userId}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Error clearing consent:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ConsentManager;