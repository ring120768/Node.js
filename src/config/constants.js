// src/config/constants.js - CLEAN PRODUCTION VERSION

/**
 * Application Constants
 * Defines all constant values used throughout the application
 */

module.exports = {
  // ==================== DATA RETENTION ====================

  DATA_RETENTION: {
    DEFAULT_DAYS: 2555, // 7 years (legal requirement)
    AUDIT_LOG_DAYS: 2555,
    TEMP_FILES_DAYS: 7
  },

  // ==================== GDPR COMPLIANCE ====================

  GDPR: {
    CURRENT_POLICY_VERSION: '2024-01-01',
    RETENTION_PERIOD_DAYS: 2555, // 7 years
    DATA_EXPORT_FORMAT: 'json',
    CONSENT_TYPES: {
      MARKETING: 'marketing',
      ANALYTICS: 'analytics',
      NECESSARY: 'necessary'
    }
  },

  // ==================== STORAGE ====================

  STORAGE: {
    BUCKETS: {
      GDPR_AUDIT: 'gdpr-audit-logs',
      INCIDENT_IMAGES: 'incident-images',
      USER_DOCUMENTS: 'user-documents',
      AUDIO_RECORDINGS: 'audio-recordings'
    },
    PATH_PATTERN: '{user_id}/{category}/{filename}',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_MIME_TYPES: {
      IMAGES: ['image/jpeg', 'image/png', 'image/heic', 'image/webp'],
      AUDIO: ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/webm', 'audio/ogg'],
      DOCUMENTS: ['application/pdf', 'application/msword', 'text/plain']
    },
    ALLOWED_EXTENSIONS: {
      IMAGES: ['.jpg', '.jpeg', '.png', '.heic', '.webp'],
      AUDIO: ['.mp3', '.wav', '.m4a', '.webm', '.ogg'],
      DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt']
    },
    // Image download retry settings (critical for legal evidence)
    IMAGE_DOWNLOAD_RETRIES: 3,       // Number of retry attempts
    IMAGE_DOWNLOAD_RETRY_DELAY: 2000 // Initial delay in ms (exponential backoff: 2s, 4s, 8s)
  },

  // ==================== FILE SIZE LIMITS ====================

  FILE_SIZE_LIMITS: {
    AUDIO: 10 * 1024 * 1024,     // 10MB
    IMAGE: 5 * 1024 * 1024,      // 5MB
    DOCUMENT: 10 * 1024 * 1024,  // 10MB
    TOTAL_UPLOAD: 50 * 1024 * 1024 // 50MB per request
  },

  // ==================== TYPEFORM ====================

  TYPEFORM: {
    HIDDEN_FIELDS: {
      AUTH_USER_ID: 'auth_user_id',
      EMAIL: 'email',
      AUTH_CODE: 'auth_code',
      PRODUCT_ID: 'product_id'
    },
    NONCE_EXPIRY_MINUTES: 10,
    WEBHOOK_TIMEOUT_SECONDS: 30
  },

  // ==================== RESPONSE CODES ====================

  RESPONSE_CODES: {
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR',
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    INVALID_AUTH_CODE: 'INVALID_AUTH_CODE',
    EXPIRED_AUTH_CODE: 'EXPIRED_AUTH_CODE',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
  },

  // ==================== RATE LIMITING ====================

  RATE_LIMITS: {
    API: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 100
    },
    STRICT: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 10
    },
    WEBHOOK: {
      WINDOW_MS: 60 * 1000, // 1 minute
      MAX_REQUESTS: 20
    }
  },

  // ==================== HTTP STATUS CODES ====================

  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // ==================== WEBHOOK EVENTS ====================

  WEBHOOK_EVENTS: {
    FORM_RESPONSE: 'form_response',
    FORM_UPDATED: 'form_updated',
    FORM_DELETED: 'form_deleted'
  },

  // ==================== TRANSCRIPTION ====================

  TRANSCRIPTION: {
    QUEUE_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000, // 5 seconds
    SUPPORTED_FORMATS: ['mp3', 'wav', 'm4a', 'webm', 'ogg']
  },

  // ==================== PDF GENERATION ====================

  PDF: {
    DEFAULT_TEMPLATE: 'incident_report',
    MAX_IMAGES: 10,
    MAX_SIZE: 20 * 1024 * 1024, // 20MB
    COMPRESSION_QUALITY: 0.8
  }
};