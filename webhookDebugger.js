/**
 * Webhook Debugger Module
 * Enhanced webhook debugging and analysis for multiple providers
 */

const { CONSTANTS, ConstantHelpers } = require('./constants');
const crypto = require('crypto');

class WebhookDebugger {
  constructor(supabase = null, logger = null) {
    this.supabase = supabase;
    this.logger = logger || console;
    this.webhookStore = new Map(); // In-memory store for recent webhooks
    this.maxStoredWebhooks = 100;
    this.providers = CONSTANTS.WEBHOOK_PROVIDERS;
  }

  /**
   * Analyze incoming webhook
   * @param {Object} req - Express request object
   * @param {Object} options - Analysis options
   * @returns {Object} - Detailed webhook analysis
   */
  analyzeWebhook(req, options = {}) {
    const analysis = {
      id: this.generateWebhookId(),
      timestamp: new Date().toISOString(),
      provider: ConstantHelpers.detectWebhookProvider(req),
      headers: this.analyzeHeaders(req.headers),
      payload: this.analyzePayload(req.body),
      authentication: this.analyzeAuthentication(req),
      structure: this.analyzeStructure(req.body),
      fields: this.extractFields(req.body),
      validation: this.validateWebhook(req),
      recommendations: []
    };

    // Provider-specific analysis
    analysis.providerSpecific = this.analyzeProviderSpecific(analysis.provider, req);

    // Add recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    // Store webhook for debugging (if enabled)
    if (options.store !== false) {
      this.storeWebhook(analysis);
    }

    // Log to database if available
    if (options.log !== false && this.supabase) {
      this.logWebhookToDatabase(analysis);
    }

    return analysis;
  }

  /**
   * Analyze headers
   */
  analyzeHeaders(headers) {
    const headerAnalysis = {
      contentType: headers['content-type'] || 'not specified',
      userAgent: headers['user-agent'] || 'not specified',
      signature: null,
      customHeaders: {},
      warnings: []
    };

    // Check for signatures
    const signatureHeaders = [
      'x-typeform-signature',
      'x-supabase-signature',
      'x-zapier-signature',
      'x-webhook-signature',
      'x-hub-signature',
      'x-dvla-api-key',
      'x-w3w-signature'
    ];

    for (const sigHeader of signatureHeaders) {
      if (headers[sigHeader]) {
        headerAnalysis.signature = {
          header: sigHeader,
          value: headers[sigHeader].substring(0, 20) + '...',
          verified: false // Would need secret to verify
        };
        break;
      }
    }

    // Extract custom headers
    for (const [key, value] of Object.entries(headers)) {
      if (key.startsWith('x-') && !signatureHeaders.includes(key)) {
        headerAnalysis.customHeaders[key] = value;
      }
    }

    // Warnings
    if (!headerAnalysis.contentType.includes('json')) {
      headerAnalysis.warnings.push('Content-Type is not JSON');
    }
    if (!headerAnalysis.signature) {
      headerAnalysis.warnings.push('No signature header found - webhook may not be authenticated');
    }

    return headerAnalysis;
  }

  /**
   * Analyze payload structure and content
   */
  analyzePayload(body) {
    const analysis = {
      size: JSON.stringify(body).length,
      topLevelKeys: Object.keys(body || {}),
      dataTypes: {},
      depth: this.getObjectDepth(body),
      arrays: [],
      objects: [],
      nullValues: [],
      emptyValues: []
    };

    if (!body || typeof body !== 'object') {
      analysis.error = 'Invalid or empty payload';
      return analysis;
    }

    // Analyze data types and structure
    for (const [key, value] of Object.entries(body)) {
      const type = Array.isArray(value) ? 'array' : typeof value;
      analysis.dataTypes[key] = type;

      if (value === null) {
        analysis.nullValues.push(key);
      } else if (value === '' || (Array.isArray(value) && value.length === 0)) {
        analysis.emptyValues.push(key);
      } else if (Array.isArray(value)) {
        analysis.arrays.push({
          key: key,
          length: value.length,
          itemTypes: [...new Set(value.map(item => typeof item))]
        });
      } else if (typeof value === 'object') {
        analysis.objects.push({
          key: key,
          keys: Object.keys(value),
          depth: this.getObjectDepth(value)
        });
      }
    }

    return analysis;
  }

  /**
   * Analyze authentication
   */
  analyzeAuthentication(req) {
    const auth = {
      method: null,
      valid: false,
      details: {}
    };

    // Check API key
    if (req.headers['x-api-key']) {
      auth.method = 'api-key';
      auth.details.header = 'x-api-key';
      auth.valid = this.validateApiKey(req.headers['x-api-key']);
    }
    // Check Bearer token
    else if (req.headers.authorization) {
      auth.method = 'bearer';
      auth.details.header = 'authorization';
      auth.valid = this.validateBearerToken(req.headers.authorization);
    }
    // Check signature
    else if (req.headers['x-typeform-signature'] || 
             req.headers['x-webhook-signature'] ||
             req.headers['x-zapier-signature']) {
      auth.method = 'signature';
      auth.details.header = Object.keys(req.headers).find(h => h.includes('signature'));
      auth.details.requiresValidation = true;
    }

    return auth;
  }

  /**
   * Analyze webhook structure
   */
  analyzeStructure(body) {
    const structure = {
      type: 'unknown',
      identified: false,
      details: {}
    };

    // Typeform structure
    if (body.form_response) {
      structure.type = 'typeform';
      structure.identified = true;
      structure.details = {
        formId: body.form_response.form_id,
        responseId: body.form_response.token,
        hasAnswers: !!(body.form_response.answers),
        answerCount: body.form_response.answers?.length || 0,
        hasHidden: !!(body.form_response.hidden),
        hasVariables: !!(body.form_response.variables),
        submittedAt: body.form_response.submitted_at
      };
    }
    // Supabase structure
    else if (body.type && body.table && body.record) {
      structure.type = 'supabase';
      structure.identified = true;
      structure.details = {
        eventType: body.type,
        table: body.table,
        schema: body.schema || 'public',
        hasOldRecord: !!(body.old_record),
        recordId: body.record?.id
      };
    }
    // Zapier structure
    else if (body.event && body.data) {
      structure.type = 'zapier';
      structure.identified = true;
      structure.details = {
        event: body.event,
        dataKeys: Object.keys(body.data || {}),
        hasMetadata: !!(body.metadata)
      };
    }
    // DVLA structure
    else if (body.registration && body.make) {
      structure.type = 'dvla';
      structure.identified = true;
      structure.details = {
        registration: body.registration,
        make: body.make,
        model: body.model,
        hasFullDetails: !!(body.colour && body.engineCapacity)
      };
    }
    // What3Words structure
    else if (body.words && (body.coordinates || body.lat)) {
      structure.type = 'what3words';
      structure.identified = true;
      structure.details = {
        words: body.words,
        hasCoordinates: !!(body.coordinates || (body.lat && body.lng)),
        hasCountry: !!(body.country),
        hasNearestPlace: !!(body.nearestPlace)
      };
    }

    return structure;
  }

  /**
   * Extract important fields from webhook
   */
  extractFields(body) {
    const fields = {
      userId: null,
      email: null,
      timestamp: null,
      consent: null,
      custom: {}
    };

    if (!body) return fields;

    // Extract user ID
    const userIdPaths = CONSTANTS.WEBHOOK_FIELD_MAPPINGS.TYPEFORM.USER_ID;
    fields.userId = ConstantHelpers.getFieldFromPaths(body, userIdPaths) || 
                    body.create_user_id || body.user_id || body.userId;

    // Extract email
    const emailPaths = CONSTANTS.WEBHOOK_FIELD_MAPPINGS.TYPEFORM.EMAIL;
    fields.email = ConstantHelpers.getFieldFromPaths(body, emailPaths) ||
                   body.email || body.user_email;

    // Extract timestamp
    const timestampPaths = CONSTANTS.WEBHOOK_FIELD_MAPPINGS.TYPEFORM.TIMESTAMP;
    fields.timestamp = ConstantHelpers.getFieldFromPaths(body, timestampPaths) ||
                      body.timestamp || body.created_at;

    // Extract consent fields (multiple possible)
    const consentPaths = CONSTANTS.WEBHOOK_FIELD_MAPPINGS.TYPEFORM.CONSENT;
    for (const path of consentPaths) {
      const value = ConstantHelpers.getFieldFromPaths(body, [path]);
      if (value !== undefined) {
        fields.consent = {
          field: path,
          value: value,
          parsed: ConstantHelpers.isConsent(value)
        };
        break;
      }
    }

    // Extract Typeform answers
    if (body.form_response && body.form_response.answers) {
      fields.custom.typeform_answers = {};
      for (const answer of body.form_response.answers) {
        const key = answer.field.ref || answer.field.id;
        let value = answer[answer.type] || answer.text || answer.boolean;
        fields.custom.typeform_answers[key] = {
          type: answer.type,
          value: value,
          title: answer.field.title
        };
      }
    }

    // Extract other potentially useful fields
    const interestingFields = ['incident_id', 'report_id', 'form_id', 'event_type', 'action'];
    for (const field of interestingFields) {
      if (body[field]) {
        fields.custom[field] = body[field];
      }
    }

    return fields;
  }

  /**
   * Validate webhook
   */
  validateWebhook(req) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    const body = req.body;

    // Check for required fields based on provider
    const provider = ConstantHelpers.detectWebhookProvider(req);

    if (provider === CONSTANTS.WEBHOOK_PROVIDERS.TYPEFORM) {
      if (!body.form_response) {
        validation.errors.push('Missing form_response for Typeform webhook');
        validation.valid = false;
      }
      if (!body.event_type) {
        validation.warnings.push('Missing event_type field');
      }
    }

    // Check for user identification
    if (!body.create_user_id && !body.user_id && !body.userId) {
      validation.warnings.push('No user identification field found');
    }

    // Check payload size
    const payloadSize = JSON.stringify(body).length;
    if (payloadSize > 1024 * 1024) { // 1MB
      validation.warnings.push(`Large payload size: ${(payloadSize / 1024).toFixed(2)}KB`);
    }

    // Check for duplicate webhook (simple check based on content hash)
    const contentHash = this.generateContentHash(body);
    if (this.isDuplicateWebhook(contentHash)) {
      validation.warnings.push('Possible duplicate webhook detected');
    }

    return validation;
  }

  /**
   * Provider-specific analysis
   */
  analyzeProviderSpecific(provider, req) {
    const analysis = {};

    switch (provider) {
      case CONSTANTS.WEBHOOK_PROVIDERS.TYPEFORM:
        analysis.typeform = this.analyzeTypeform(req.body);
        break;
      case CONSTANTS.WEBHOOK_PROVIDERS.SUPABASE:
        analysis.supabase = this.analyzeSupabase(req.body);
        break;
      case CONSTANTS.WEBHOOK_PROVIDERS.ZAPIER:
        analysis.zapier = this.analyzeZapier(req.body);
        break;
      case CONSTANTS.WEBHOOK_PROVIDERS.DVLA:
        analysis.dvla = this.analyzeDVLA(req.body);
        break;
      case CONSTANTS.WEBHOOK_PROVIDERS.WHAT3WORDS:
        analysis.what3words = this.analyzeWhat3Words(req.body);
        break;
    }

    return analysis;
  }

  /**
   * Analyze Typeform webhook
   */
  analyzeTypeform(body) {
    if (!body.form_response) return null;

    const analysis = {
      formId: body.form_response.form_id,
      responseId: body.form_response.token,
      eventType: body.event_type,
      submittedAt: body.form_response.submitted_at,
      score: body.form_response.score,
      answers: {},
      hidden: body.form_response.hidden || {},
      variables: body.form_response.variables || {},
      calculated: body.form_response.calculated || {}
    };

    // Analyze answers
    if (body.form_response.answers) {
      for (const answer of body.form_response.answers) {
        analysis.answers[answer.field.ref || answer.field.id] = {
          type: answer.type,
          title: answer.field.title,
          value: answer[answer.type] || answer.text || answer.boolean,
          field_id: answer.field.id
        };
      }
    }

    return analysis;
  }

  /**
   * Analyze Supabase webhook
   */
  analyzeSupabase(body) {
    return {
      eventType: body.type,
      table: body.table,
      schema: body.schema || 'public',
      record: body.record ? {
        id: body.record.id,
        keys: Object.keys(body.record)
      } : null,
      oldRecord: body.old_record ? {
        id: body.old_record.id,
        keys: Object.keys(body.old_record)
      } : null,
      changes: this.detectChanges(body.old_record, body.record)
    };
  }

  /**
   * Analyze Zapier webhook
   */
  analyzeZapier(body) {
    return {
      event: body.event || body.action,
      dataKeys: Object.keys(body.data || body || {}),
      hasAuth: !!(body.auth || body.authentication),
      metadata: body.metadata || {},
      zapId: body.zap_id || body.zapId
    };
  }

  /**
   * Analyze DVLA webhook
   */
  analyzeDVLA(body) {
    return {
      registration: body.registration || body.vrm,
      make: body.make,
      model: body.model,
      colour: body.colour || body.color,
      yearOfManufacture: body.yearOfManufacture,
      engineCapacity: body.engineCapacity,
      co2Emissions: body.co2Emissions,
      fuelType: body.fuelType,
      taxStatus: body.taxStatus,
      taxDueDate: body.taxDueDate,
      motStatus: body.motStatus,
      motExpiryDate: body.motExpiryDate
    };
  }

  /**
   * Analyze What3Words webhook
   */
  analyzeWhat3Words(body) {
    return {
      words: body.words,
      coordinates: {
        lat: body.lat || body.coordinates?.lat,
        lng: body.lng || body.coordinates?.lng
      },
      country: body.country,
      nearestPlace: body.nearestPlace,
      distanceToFocus: body.distanceToFocus,
      map: body.map
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Authentication recommendations
    if (!analysis.authentication.valid) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        message: 'Webhook authentication is invalid or missing',
        action: 'Verify API keys and authentication headers'
      });
    }

    // Validation recommendations
    if (analysis.validation.errors.length > 0) {
      recommendations.push({
        type: 'validation',
        priority: 'high',
        message: `Webhook has ${analysis.validation.errors.length} validation errors`,
        action: 'Review and fix validation errors',
        errors: analysis.validation.errors
      });
    }

    // Field recommendations
    if (!analysis.fields.userId) {
      recommendations.push({
        type: 'data',
        priority: 'medium',
        message: 'No user identification found in webhook',
        action: 'Ensure webhook includes user_id or create_user_id field'
      });
    }

    if (!analysis.fields.consent) {
      recommendations.push({
        type: 'compliance',
        priority: 'high',
        message: 'No consent field detected',
        action: 'Add GDPR consent field to form/webhook'
      });
    }

    // Structure recommendations
    if (!analysis.structure.identified) {
      recommendations.push({
        type: 'structure',
        priority: 'low',
        message: 'Webhook structure not recognized',
        action: 'Verify webhook format matches expected provider structure'
      });
    }

    return recommendations;
  }

  /**
   * Store webhook for debugging
   */
  storeWebhook(analysis) {
    // Add to in-memory store
    this.webhookStore.set(analysis.id, {
      ...analysis,
      storedAt: new Date().toISOString()
    });

    // Limit store size
    if (this.webhookStore.size > this.maxStoredWebhooks) {
      const firstKey = this.webhookStore.keys().next().value;
      this.webhookStore.delete(firstKey);
    }
  }

  /**
   * Log webhook to database
   */
  async logWebhookToDatabase(analysis) {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('webhook_debug_log')
        .insert({
          webhook_id: analysis.id,
          provider: analysis.provider,
          timestamp: analysis.timestamp,
          headers: analysis.headers,
          payload_summary: {
            size: analysis.payload.size,
            topLevelKeys: analysis.payload.topLevelKeys,
            depth: analysis.payload.depth
          },
          extracted_fields: analysis.fields,
          validation: analysis.validation,
          recommendations: analysis.recommendations,
          full_analysis: analysis
        });
    } catch (error) {
      this.logger.error('Failed to log webhook to database:', error);
    }
  }

  /**
   * Get recent webhooks from store
   */
  getRecentWebhooks(limit = 10) {
    const webhooks = Array.from(this.webhookStore.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return webhooks;
  }

  /**
   * Get webhook by ID
   */
  getWebhook(id) {
    return this.webhookStore.get(id) || null;
  }

  /**
   * Search webhooks
   */
  searchWebhooks(criteria) {
    const results = [];

    for (const webhook of this.webhookStore.values()) {
      let match = true;

      if (criteria.provider && webhook.provider !== criteria.provider) {
        match = false;
      }
      if (criteria.userId && webhook.fields.userId !== criteria.userId) {
        match = false;
      }
      if (criteria.hasErrors && webhook.validation.errors.length === 0) {
        match = false;
      }

      if (match) {
        results.push(webhook);
      }
    }

    return results;
  }

  // Helper methods

  generateWebhookId() {
    // Generate webhook ID with specific prefix to avoid confusion with user IDs
    const id = `wh_debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // CRITICAL: Ensure this never looks like a user ID
    if (id.includes('user_') || id.length === 36) {
      throw new Error('SECURITY: Webhook ID format could be confused with user ID');
    }
    
    return id;
  }

  generateContentHash(content) {
    return crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
  }

  isDuplicateWebhook(hash) {
    // Simple duplicate check - could be enhanced with time window
    for (const webhook of this.webhookStore.values()) {
      if (webhook.contentHash === hash) {
        return true;
      }
    }
    return false;
  }

  getObjectDepth(obj, currentDepth = 0, maxDepth = 10) {
    if (!obj || typeof obj !== 'object' || currentDepth >= maxDepth) {
      return currentDepth;
    }

    let maxChildDepth = currentDepth;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        const childDepth = this.getObjectDepth(value, currentDepth + 1, maxDepth);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
    }

    return maxChildDepth;
  }

  detectChanges(oldRecord, newRecord) {
    if (!oldRecord || !newRecord) return [];

    const changes = [];
    const allKeys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);

    for (const key of allKeys) {
      if (oldRecord[key] !== newRecord[key]) {
        changes.push({
          field: key,
          old: oldRecord[key],
          new: newRecord[key]
        });
      }
    }

    return changes;
  }

  validateApiKey(apiKey) {
    // Check against environment variable
    const validKey = process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY;
    return apiKey === validKey;
  }

  validateBearerToken(authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const validKey = process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY;
    return token === validKey;
  }
}

module.exports = WebhookDebugger;