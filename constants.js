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

  // Comprehensive Field Mappings for Typeform (Updated from CSV)
  TYPEFORM_FIELDS: {
    // Core user identification
    USER_ID: 'create_user_id',
    EMAIL: 'email',
    FULL_NAME: 'name',
    SURNAME: 'surname',
    PHONE: 'mobile',
    CONSENT: 'gdpr_consent',

    // Hidden fields from Typeform
    HIDDEN_USER_ID: 'user_id',
    PRODUCT_ID: 'product_id', 
    AUTH_CODE: 'auth_code',

    // Personal information
    STREET_ADDRESS: 'street_address',
    TOWN: 'town',
    POSTCODE: 'postcode',
    COUNTRY: 'country',
    DRIVING_LICENSE_NUMBER: 'driving_license_number',

    // Vehicle information
    CAR_REGISTRATION: 'car_registration_number',
    VEHICLE_MAKE: 'vehicle_make',
    VEHICLE_MODEL: 'vehicle_model',
    VEHICLE_COLOUR: 'vehicle_colour',
    VEHICLE_CONDITION: 'vehicle_condition',

    // Insurance and recovery
    INSURANCE_COMPANY: 'insurance_company',
    POLICY_NUMBER: 'policy_number',
    POLICY_HOLDER: 'policy_holder',
    RECOVERY_COMPANY: 'recovery_company',
    RECOVERY_NUMBER: 'recovery_breakdown_number',
    EMERGENCY_CONTACT: 'emergency_contact',

    // Incident details
    INCIDENT_DATE: 'when_did_the_accident_happen',
    INCIDENT_TIME: 'what_time_did_the_accident_happen',
    INCIDENT_LOCATION: 'where_exactly_did_this_happen',
    WEATHER_CONDITIONS: 'weather_conditions',
    ROAD_TYPE: 'road_type',
    SPEED_LIMIT: 'speed_limit',

    // Medical assessment
    MEDICAL_FEELING: 'medical_how_are_you_feeling',
    ARE_YOU_SAFE: 'are_you_safe',
    MEDICAL_ATTENTION: 'medical_attention',

    // Vehicle damage and details
    VEHICLE_DAMAGE: 'damage_to_your_vehicle',
    DAMAGE_DESCRIPTION: 'damage_caused_by_accident',
    AIRBAGS_DEPLOYED: 'airbags_deployed',
    WEARING_SEATBELTS: 'wearing_seatbelts',

    // Other driver information
    OTHER_DRIVER_NAME: 'other_drivers_name',
    OTHER_DRIVER_PHONE: 'other_drivers_number',
    OTHER_DRIVER_ADDRESS: 'other_drivers_address',
    OTHER_VEHICLE_MAKE: 'other_make_of_vehicle',
    OTHER_VEHICLE_MODEL: 'other_model_of_vehicle',
    OTHER_VEHICLE_LICENSE: 'vehicle_license_plate',
    OTHER_INSURANCE: 'other_insurance_company',
    OTHER_POLICY_NUMBER: 'other_policy_number',

    // Police and legal
    POLICE_ATTENDED: 'did_police_attend',
    POLICE_REFERENCE: 'accident_reference_number',
    POLICE_OFFICER_NAME: 'police_officers_name',
    POLICE_BADGE_NUMBER: 'police_officer_badge_number',

    // Evidence and witnesses
    WITNESSES: 'any_witness',
    WITNESS_INFO: 'witness_contact_information',
    ADDITIONAL_INFO: 'anything_else',

    // File uploads
    DOCUMENTS_URL: 'file_url_documents',
    SCENE_PHOTOS_URL: 'file_url_scene_overview',
    VEHICLE_DAMAGE_URL: 'file_url_vehicle_damage',
    OTHER_VEHICLE_URL: 'file_url_other_vehicle',
    WHAT3WORDS_URL: 'file_url_what3words',
    VOICE_RECORDING_URL: 'file_url_record_detailed_account_of_what_happened',

    // Legal and system
    LEGAL_SUPPORT: 'legal_support',
    VOICE_TRANSCRIPTION: 'voice_transcription',
    DECLARATION: 'declaration',
    FORM_ID: 'form_id',
    SUBMIT_DATE: 'submit_date'
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