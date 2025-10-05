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

  // Basic Field Mappings for Typeform
  TYPEFORM_FIELDS: {
    USER_ID: 'create_user_id',
    EMAIL: 'email',
    FULL_NAME: 'full_name',
    PHONE: 'phone_number',
    CONSENT: 'legal_support'
  },

  // Simple Consent Values
  CONSENT_VALUES: {
    POSITIVE: ['yes', 'true', 'Yes'],
    NEGATIVE: ['no', 'false', 'No']
  },

  // Basic Error Codes
  ERROR_CODES: {
    WEBHOOK_INVALID_PAYLOAD: 'WH_001',
    PROC_TRANSCRIPTION_FAILED: 'PROC_001'
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
   * @returns {boolean} - true for consent, false for no consent
   */
  isConsent(value) {
    if (value === true || CONSTANTS.CONSENT_VALUES.POSITIVE.includes(String(value))) {
      return true;
    }
    return false;
  }
};

module.exports = {
  CONSTANTS,
  ConstantHelpers
};