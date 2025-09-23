/**
 * Enhanced Constants Module
 * Centralized configuration for all system constants
 */

const CONSTANTS = {
  // Transcription Status
  TRANSCRIPTION_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    TRANSCRIBED: 'transcribed',
    GENERATING_SUMMARY: 'generating_summary',
    COMPLETED: 'completed',
    FAILED: 'failed'
  },

  // Retry Limits
  RETRY_LIMITS: {
    TRANSCRIPTION: 5,
    API_TIMEOUT: 30000,
    WHISPER_TIMEOUT: 60000,
    WEBHOOK_TIMEOUT: 15000,
    MAX_WEBHOOK_RETRIES: 3
  },

  // Data Retention
  DATA_RETENTION: {
    DEFAULT_DAYS: 365,
    MINIMUM_DAYS: 30,
    MAXIMUM_DAYS: 2555
  },

  // WebSocket Message Types
  WS_MESSAGE_TYPES: {
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe',
    PING: 'ping',
    PONG: 'pong',
    ERROR: 'error',
    STATUS: 'status',
    REALTIME_UPDATE: 'realtime_update'
  },

  // File Size Limits
  FILE_SIZE_LIMITS: {
    AUDIO: 50 * 1024 * 1024, // 50MB
    IMAGE: 10 * 1024 * 1024, // 10MB
    DOCUMENT: 25 * 1024 * 1024, // 25MB
    VIDEO: 100 * 1024 * 1024 // 100MB
  },

  // Webhook Providers
  WEBHOOK_PROVIDERS: {
    TYPEFORM: 'typeform',
    SUPABASE: 'supabase',
    ZAPIER: 'zapier',
    DVLA: 'dvla',
    WHAT3WORDS: 'what3words',
    INTERNAL: 'internal'
  },

  // Webhook Events
  WEBHOOK_EVENTS: {
    SIGNUP: 'signup',
    INCIDENT_REPORT: 'incident_report',
    PDF_GENERATION: 'pdf_generation',
    DATA_UPDATE: 'data_update',
    CONSENT_UPDATE: 'consent_update',
    VERIFICATION: 'verification'
  },

  // Field Mappings for Different Providers
  WEBHOOK_FIELD_MAPPINGS: {
    TYPEFORM: {
      USER_ID: ['create_user_id', 'user_id', 'hidden.userid', 'hidden.create_user_id'],
      EMAIL: ['email', 'contact_email', 'user_email'],
      FULL_NAME: ['full_name', 'name', 'contact_name'],
      PHONE: ['phone_number', 'contact_phone', 'mobile'],
      CONSENT: ['legal_support', 'gdpr_consent', 'question_14', 'consent_given'],
      TIMESTAMP: ['submitted_at', 'landed_at', 'created_at']
    },
    ZAPIER: {
      USER_ID: ['userId', 'user_id', 'create_user_id', 'customerId'],
      EVENT_TYPE: ['event', 'eventType', 'action'],
      PAYLOAD: ['data', 'payload', 'body']
    },
    SUPABASE: {
      EVENT: ['type', 'eventType'],
      TABLE: ['table', 'source'],
      RECORD: ['record', 'new', 'data'],
      OLD_RECORD: ['old_record', 'old']
    },
    DVLA: {
      VEHICLE_REG: ['registration', 'vrm', 'vehicle_registration'],
      VEHICLE_MAKE: ['make', 'vehicle_make'],
      VEHICLE_MODEL: ['model', 'vehicle_model'],
      VEHICLE_COLOR: ['colour', 'color', 'vehicle_colour']
    },
    WHAT3WORDS: {
      WORDS: ['words', 'w3w', 'what3words'],
      LATITUDE: ['lat', 'latitude', 'coordinates.lat'],
      LONGITUDE: ['lng', 'longitude', 'coordinates.lng'],
      COUNTRY: ['country', 'country_code']
    }
  },

  // Consent Types
  CONSENT_TYPES: {
    DATA_PROCESSING: 'data_processing',
    MARKETING: 'marketing',
    LEGAL_SUPPORT: 'legal_support',
    EMERGENCY_CONTACT: 'emergency_contact',
    THIRD_PARTY_SHARING: 'third_party_sharing',
    COOKIES: 'cookies'
  },

  // Consent Values (for string-based consent fields)
  CONSENT_VALUES: {
    POSITIVE: ['yes', 'true', '1', 'agreed', 'accept', 'accepted', 'consent', 'consented', 'allow', 'allowed', 'grant', 'granted', 'approve', 'approved'],
    NEGATIVE: ['no', 'false', '0', 'declined', 'reject', 'rejected', 'deny', 'denied', 'refuse', 'refused', 'disallow', 'disapprove'],
    NEUTRAL: ['pending', 'undecided', 'not_set', 'unknown', null, undefined]
  },

  // GDPR Activity Types
  GDPR_ACTIVITIES: {
    CONSENT_GRANTED: 'CONSENT_GRANTED',
    CONSENT_WITHDRAWN: 'CONSENT_WITHDRAWN',
    CONSENT_UPDATED: 'CONSENT_UPDATED',
    DATA_ACCESS: 'DATA_ACCESS',
    DATA_EXPORT: 'DATA_EXPORT',
    DATA_DELETED: 'DATA_DELETED',
    DATA_ARCHIVED: 'DATA_ARCHIVED',
    DATA_PROCESSING: 'DATA_PROCESSING',
    WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
    WEBHOOK_PROCESSED: 'WEBHOOK_PROCESSED'
  },

  // Error Codes
  ERROR_CODES: {
    // Authentication Errors
    AUTH_MISSING_KEY: 'AUTH_001',
    AUTH_INVALID_KEY: 'AUTH_002',
    AUTH_EXPIRED: 'AUTH_003',

    // GDPR Errors
    GDPR_NO_CONSENT: 'GDPR_001',
    GDPR_CONSENT_WITHDRAWN: 'GDPR_002',
    GDPR_INVALID_USER: 'GDPR_003',
    GDPR_PROCESSING_RESTRICTED: 'GDPR_004',

    // Webhook Errors
    WEBHOOK_INVALID_PAYLOAD: 'WH_001',
    WEBHOOK_MISSING_FIELD: 'WH_002',
    WEBHOOK_DUPLICATE: 'WH_003',
    WEBHOOK_PROVIDER_UNKNOWN: 'WH_004',

    // Processing Errors
    PROC_TRANSCRIPTION_FAILED: 'PROC_001',
    PROC_AI_SUMMARY_FAILED: 'PROC_002',
    PROC_PDF_GENERATION_FAILED: 'PROC_003',
    PROC_EMAIL_SEND_FAILED: 'PROC_004'
  },

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // Rate Limiting
  RATE_LIMITS: {
    GENERAL: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100
    },
    STRICT: {
      windowMs: 15 * 60 * 1000,
      max: 10
    },
    WEBHOOK: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30
    }
  },

  // Environment Configurations
  ENVIRONMENTS: {
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production',
    TEST: 'test'
  },

  // Service Health Status
  HEALTH_STATUS: {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy',
    UNKNOWN: 'unknown'
  }
};

// Helper functions for constants
const ConstantHelpers = {
  /**
   * Check if a value represents consent
   * @param {*} value - The value to check
   * @returns {boolean|null} - true for consent, false for no consent, null for unknown
   */
  isConsent(value) {
    if (value === null || value === undefined) return null;

    const strValue = String(value).toLowerCase().trim();

    if (CONSTANTS.CONSENT_VALUES.POSITIVE.includes(strValue) || value === true) {
      return true;
    }

    if (CONSTANTS.CONSENT_VALUES.NEGATIVE.includes(strValue) || value === false) {
      return false;
    }

    return null;
  },

  /**
   * Get webhook provider from headers or payload
   * @param {Object} req - Express request object
   * @returns {string} - Provider identifier
   */
  detectWebhookProvider(req) {
    const userAgent = req.get('user-agent') || '';
    const headers = req.headers;
    const body = req.body || {};

    // Check headers for provider hints
    if (headers['x-typeform-signature']) return CONSTANTS.WEBHOOK_PROVIDERS.TYPEFORM;
    if (headers['x-supabase-signature']) return CONSTANTS.WEBHOOK_PROVIDERS.SUPABASE;
    if (headers['x-zapier-signature']) return CONSTANTS.WEBHOOK_PROVIDERS.ZAPIER;
    if (headers['x-dvla-api-key']) return CONSTANTS.WEBHOOK_PROVIDERS.DVLA;
    if (headers['x-w3w-signature']) return CONSTANTS.WEBHOOK_PROVIDERS.WHAT3WORDS;

    // Check user agent
    if (userAgent.toLowerCase().includes('typeform')) return CONSTANTS.WEBHOOK_PROVIDERS.TYPEFORM;
    if (userAgent.toLowerCase().includes('zapier')) return CONSTANTS.WEBHOOK_PROVIDERS.ZAPIER;
    if (userAgent.toLowerCase().includes('supabase')) return CONSTANTS.WEBHOOK_PROVIDERS.SUPABASE;

    // Check payload structure
    if (body.form_response && body.event_type) return CONSTANTS.WEBHOOK_PROVIDERS.TYPEFORM;
    if (body.type && body.table && body.record) return CONSTANTS.WEBHOOK_PROVIDERS.SUPABASE;
    if (body.words && (body.coordinates || body.lat)) return CONSTANTS.WEBHOOK_PROVIDERS.WHAT3WORDS;
    if (body.registration && body.make) return CONSTANTS.WEBHOOK_PROVIDERS.DVLA;

    return CONSTANTS.WEBHOOK_PROVIDERS.INTERNAL;
  },

  /**
   * Get field value from webhook payload using multiple possible paths
   * @param {Object} payload - The webhook payload
   * @param {Array} paths - Array of possible field paths
   * @returns {*} - The field value or undefined
   */
  getFieldFromPaths(payload, paths) {
    for (const path of paths) {
      const value = this.getNestedValue(payload, path);
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return undefined;
  },

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - The object to search
   * @param {string} path - The path (e.g., 'form_response.hidden.user_id')
   * @returns {*} - The value or undefined
   */
  getNestedValue(obj, path) {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }

    return result;
  }
};

module.exports = {
  CONSTANTS,
  ConstantHelpers
};