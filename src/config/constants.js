
/**
 * Application Constants
 */

module.exports = {
  // Data Retention Configuration
  DATA_RETENTION: {
    DEFAULT_DAYS: 2555 // 7 years in days
  },

  // GDPR Configuration
  GDPR: {
    CURRENT_POLICY_VERSION: '2024-01-01',
    RETENTION_PERIOD_DAYS: 2555, // 7 years in days
    DATA_EXPORT_FORMAT: 'json'
  },

  // Storage Configuration
  STORAGE: {
    BUCKETS: {
      INCIDENT_IMAGES: 'incident-images',
      USER_DOCUMENTS: 'user-documents',
      AUDIO_RECORDINGS: 'audio-recordings'
    },
    // File path pattern: ${user_id}/${category}/${filename}
    PATH_PATTERN: '{user_id}/{category}/{filename}',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_EXTENSIONS: {
      IMAGES: ['.jpg', '.jpeg', '.png', '.heic', '.webp'],
      AUDIO: ['.mp3', '.wav', '.m4a', '.webm', '.ogg'],
      DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt']
    }
  },

  // Typeform Configuration
  TYPEFORM: {
    HIDDEN_FIELDS: {
      USER_ID: 'user_id',
      CREATE_USER_ID: 'create_user_id', // Legacy binder for PDF only
      EMAIL: 'email',
      PRODUCT_ID: 'product_id',
      AUTH_CODE: 'auth_code'
    },
    NONCE_EXPIRY_MINUTES: 10
  },

  // File Size Limits
  FILE_SIZE_LIMITS: {
    AUDIO: 10 * 1024 * 1024, // 10MB
    IMAGE: 5 * 1024 * 1024,  // 5MB
    DOCUMENT: 10 * 1024 * 1024 // 10MB
  },

  // Response codes
  RESPONSE_CODES: {
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR',
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    INVALID_AUTH_CODE: 'INVALID_AUTH_CODE',
    EXPIRED_AUTH_CODE: 'EXPIRED_AUTH_CODE'
  }
};
