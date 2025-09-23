/**
 * Consent Manager Module
 * Unified consent field detection and management
 */

const { CONSTANTS, ConstantHelpers } = require('./constants');

class ConsentManager {
  constructor(supabase = null, logger = null) {
    this.supabase = supabase;
    this.logger = logger || console;

    // Consent field patterns (case-insensitive)
    this.consentFieldPatterns = [
      // Direct consent fields
      /^gdpr[_\-]?consent/i,
      /^legal[_\-]?support/i,
      /^consent[_\-]?given/i,
      /^data[_\-]?consent/i,
      /^privacy[_\-]?consent/i,
      /^agree[_\-]?to[_\-]?(share|process|use)/i,
      /^accept[_\-]?terms/i,
      /^opt[_\-]?in/i,

      // Question-based fields (Typeform)
      /^question[_\-]?14$/i, // Your specific field
      /^q14$/i,

      // Checkbox or selection fields
      /consent.*checkbox/i,
      /agree.*checkbox/i,
      /terms.*accepted/i,

      // Field containing consent keywords
      /share.*data.*legal/i,
      /process.*personal.*data/i,
      /use.*information/i
    ];

    // Consent text patterns
    this.consentTextPatterns = [
      /i\s+(agree|consent|authorize|allow|permit)/i,
      /share.*data.*legal\s+support/i,
      /process.*personal\s+(data|information)/i,
      /gdpr.*consent/i,
      /data\s+protection.*agree/i,
      /privacy.*accept/i
    ];

    // Multi-language consent values
    this.consentValues = {
      positive: [
        ...CONSTANTS.CONSENT_VALUES.POSITIVE,
        'oui', 'si', 'ja', 'sim', 'да', // Multi-language yes
        'i agree', 'i consent', 'i accept'
      ],
      negative: [
        ...CONSTANTS.CONSENT_VALUES.NEGATIVE,
        'non', 'nein', 'não', 'нет', // Multi-language no
        'i disagree', 'i do not consent', 'i decline'
      ]
    };
  }

  /**
   * Extract all consent-related fields from a webhook payload
   * @param {Object} payload - The webhook payload
   * @param {string} provider - The webhook provider (optional)
   * @returns {Object} - Extracted consent information
   */
  extractConsentFromWebhook(payload, provider = null) {
    const result = {
      hasConsent: false,
      consentFields: {},
      consentTypes: [],
      timestamp: new Date().toISOString(),
      provider: provider || ConstantHelpers.detectWebhookProvider({ body: payload }),
      metadata: {}
    };

    // Handle Typeform structure
    if (payload.form_response && payload.form_response.answers) {
      this.extractTypeformConsent(payload, result);
    }

    // Handle flat structure
    this.extractFlatConsent(payload, result);

    // Handle nested structures
    this.extractNestedConsent(payload, result);

    // Determine overall consent status
    result.hasConsent = this.determineOverallConsent(result.consentFields);

    // Add consent types based on detected fields
    result.consentTypes = this.determineConsentTypes(result.consentFields);

    return result;
  }

  /**
   * Extract consent from Typeform-specific structure
   */
  extractTypeformConsent(payload, result) {
    const answers = payload.form_response.answers;

    for (const answer of answers) {
      const fieldId = answer.field.id;
      const fieldRef = answer.field.ref;
      const fieldText = answer.field.title || '';

      // Check if this is a consent field
      if (this.isConsentField(fieldId) || 
          this.isConsentField(fieldRef) || 
          this.isConsentText(fieldText)) {

        let value = null;
        if (answer.boolean !== undefined) value = answer.boolean;
        else if (answer.text) value = answer.text;
        else if (answer.choice) value = answer.choice.label;
        else if (answer.choices) value = answer.choices.map(c => c.label).join(', ');

        const consentValue = this.parseConsentValue(value);

        result.consentFields[fieldRef || fieldId] = {
          value: value,
          parsed: consentValue,
          fieldType: answer.type,
          fieldText: fieldText,
          source: 'typeform_answer'
        };

        // Store metadata
        result.metadata.formId = payload.form_response.form_id;
        result.metadata.responseId = payload.form_response.token;
        result.metadata.submittedAt = payload.form_response.submitted_at;
      }
    }

    // Also check hidden fields
    if (payload.form_response.hidden) {
      for (const [key, value] of Object.entries(payload.form_response.hidden)) {
        if (this.isConsentField(key)) {
          const consentValue = this.parseConsentValue(value);
          result.consentFields[`hidden_${key}`] = {
            value: value,
            parsed: consentValue,
            source: 'typeform_hidden'
          };
        }
      }
    }
  }

  /**
   * Extract consent from flat payload structure
   */
  extractFlatConsent(payload, result) {
    for (const [key, value] of Object.entries(payload)) {
      // Skip complex objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        continue;
      }

      if (this.isConsentField(key)) {
        const consentValue = this.parseConsentValue(value);

        // Don't overwrite if already found from more specific source
        if (!result.consentFields[key]) {
          result.consentFields[key] = {
            value: value,
            parsed: consentValue,
            source: 'flat_field'
          };
        }
      }
    }
  }

  /**
   * Extract consent from nested structures
   */
  extractNestedConsent(payload, result, prefix = '', depth = 0) {
    // Prevent infinite recursion
    if (depth > 5) return;

    for (const [key, value] of Object.entries(payload)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      // Skip already processed typeform structure
      if (key === 'form_response' && depth === 0) continue;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.extractNestedConsent(value, result, fullKey, depth + 1);
      } else if (this.isConsentField(key) || this.isConsentField(fullKey)) {
        const consentValue = this.parseConsentValue(value);

        if (!result.consentFields[fullKey]) {
          result.consentFields[fullKey] = {
            value: value,
            parsed: consentValue,
            source: 'nested_field'
          };
        }
      }
    }
  }

  /**
   * Check if a field name is consent-related
   */
  isConsentField(fieldName) {
    if (!fieldName) return false;

    const field = String(fieldName).trim();

    // Check against patterns
    for (const pattern of this.consentFieldPatterns) {
      if (pattern.test(field)) {
        return true;
      }
    }

    // Check for exact matches
    const lowerField = field.toLowerCase();
    const consentKeywords = [
      'consent', 'gdpr', 'legal_support', 'agree', 'accept',
      'authorize', 'permission', 'opt_in', 'optin', 'terms'
    ];

    return consentKeywords.some(keyword => lowerField.includes(keyword));
  }

  /**
   * Check if text contains consent language
   */
  isConsentText(text) {
    if (!text) return false;

    for (const pattern of this.consentTextPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse a consent value to boolean
   */
  parseConsentValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;

    const strValue = String(value).toLowerCase().trim();

    // Check positive values
    if (this.consentValues.positive.some(pos => strValue.includes(pos))) {
      return true;
    }

    // Check negative values
    if (this.consentValues.negative.some(neg => strValue.includes(neg))) {
      return false;
    }

    // Check for numeric values
    if (strValue === '1' || strValue === 'true') return true;
    if (strValue === '0' || strValue === 'false') return false;

    // Uncertain
    return null;
  }

  /**
   * Determine overall consent status from multiple fields
   */
  determineOverallConsent(consentFields) {
    const parsedValues = Object.values(consentFields)
      .map(field => field.parsed)
      .filter(value => value !== null);

    if (parsedValues.length === 0) return false;

    // If any explicit denial, overall is false
    if (parsedValues.includes(false)) return false;

    // If all are true, overall is true
    if (parsedValues.every(v => v === true)) return true;

    // Mixed or uncertain
    return false;
  }

  /**
   * Determine types of consent given
   */
  determineConsentTypes(consentFields) {
    const types = new Set();

    for (const [fieldName, fieldData] of Object.entries(consentFields)) {
      if (fieldData.parsed !== true) continue;

      const lowerField = fieldName.toLowerCase();

      if (lowerField.includes('legal') || lowerField.includes('support')) {
        types.add(CONSTANTS.CONSENT_TYPES.LEGAL_SUPPORT);
      }
      if (lowerField.includes('gdpr') || lowerField.includes('data')) {
        types.add(CONSTANTS.CONSENT_TYPES.DATA_PROCESSING);
      }
      if (lowerField.includes('market')) {
        types.add(CONSTANTS.CONSENT_TYPES.MARKETING);
      }
      if (lowerField.includes('emergency')) {
        types.add(CONSTANTS.CONSENT_TYPES.EMERGENCY_CONTACT);
      }
      if (lowerField.includes('third') || lowerField.includes('share')) {
        types.add(CONSTANTS.CONSENT_TYPES.THIRD_PARTY_SHARING);
      }
      if (lowerField.includes('cookie')) {
        types.add(CONSTANTS.CONSENT_TYPES.COOKIES);
      }
    }

    // Default to data processing if consent given but type unclear
    if (types.size === 0 && this.determineOverallConsent(consentFields)) {
      types.add(CONSTANTS.CONSENT_TYPES.DATA_PROCESSING);
    }

    return Array.from(types);
  }

  /**
   * Validate and update consent in database
   */
  async validateAndUpdateConsent(userId, consentData, req = null) {
    if (!this.supabase) {
      this.logger.warn('ConsentManager: Supabase not configured');
      return { success: false, error: 'Database not configured' };
    }

    try {
      // Check existing consent
      const { data: existing } = await this.supabase
        .from('user_signup')
        .select('gdpr_consent, gdpr_consent_date, legal_support')
        .eq('create_user_id', userId)
        .single();

      const hasNewConsent = consentData.hasConsent;
      const consentChanged = existing && (existing.gdpr_consent !== hasNewConsent);

      // Update user record
      const updateData = {
        gdpr_consent: hasNewConsent,
        gdpr_consent_date: hasNewConsent ? new Date().toISOString() : null,
        legal_support: hasNewConsent ? 'Yes' : 'No',
        consent_metadata: {
          types: consentData.consentTypes,
          fields: Object.keys(consentData.consentFields),
          provider: consentData.provider,
          timestamp: consentData.timestamp
        }
      };

      const { error: updateError } = await this.supabase
        .from('user_signup')
        .update(updateData)
        .eq('create_user_id', userId);

      if (updateError) throw updateError;

      // Log consent change
      if (consentChanged) {
        await this.logConsentChange(userId, existing.gdpr_consent, hasNewConsent, consentData, req);
      }

      return {
        success: true,
        consent: hasNewConsent,
        changed: consentChanged,
        types: consentData.consentTypes
      };

    } catch (error) {
      this.logger.error('ConsentManager: Error updating consent', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log consent changes for audit trail
   */
  async logConsentChange(userId, oldConsent, newConsent, consentData, req) {
    if (!this.supabase) return;

    const activityType = newConsent 
      ? CONSTANTS.GDPR_ACTIVITIES.CONSENT_GRANTED 
      : CONSTANTS.GDPR_ACTIVITIES.CONSENT_WITHDRAWN;

    try {
      await this.supabase
        .from('gdpr_audit_log')
        .insert({
          user_id: userId,
          activity_type: activityType,
          details: {
            old_consent: oldConsent,
            new_consent: newConsent,
            consent_types: consentData.consentTypes,
            consent_fields: consentData.consentFields,
            provider: consentData.provider
          },
          ip_address: req?.clientIp || 'unknown',
          user_agent: req?.get('user-agent') || 'unknown',
          request_id: req?.requestId || null,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      this.logger.error('ConsentManager: Error logging consent change', error);
    }
  }

  /**
   * Get consent summary for a user
   */
  async getConsentSummary(userId) {
    if (!this.supabase) {
      return { error: 'Database not configured' };
    }

    try {
      const { data: user } = await this.supabase
        .from('user_signup')
        .select('gdpr_consent, gdpr_consent_date, legal_support, consent_metadata')
        .eq('create_user_id', userId)
        .single();

      if (!user) {
        return { exists: false, hasConsent: false };
      }

      const { data: auditLogs } = await this.supabase
        .from('gdpr_audit_log')
        .select('activity_type, timestamp')
        .eq('user_id', userId)
        .in('activity_type', [
          CONSTANTS.GDPR_ACTIVITIES.CONSENT_GRANTED,
          CONSTANTS.GDPR_ACTIVITIES.CONSENT_WITHDRAWN,
          CONSTANTS.GDPR_ACTIVITIES.CONSENT_UPDATED
        ])
        .order('timestamp', { ascending: false })
        .limit(10);

      return {
        exists: true,
        hasConsent: user.gdpr_consent,
        consentDate: user.gdpr_consent_date,
        legalSupport: user.legal_support === 'Yes',
        consentTypes: user.consent_metadata?.types || [],
        history: auditLogs || []
      };

    } catch (error) {
      this.logger.error('ConsentManager: Error getting consent summary', error);
      return { error: error.message };
    }
  }
}

module.exports = ConsentManager;