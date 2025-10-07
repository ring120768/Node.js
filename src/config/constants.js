
/**
 * @fileoverview Application constants and configuration values
 * @description Contains all application-wide constants including transcription statuses,
 * retry limits, data retention policies, WebSocket message types, and file size limits.
 */

/**
 * Application constants object containing all configuration values
 * @namespace CONSTANTS
 */
const CONSTANTS = {
  /**
   * Transcription processing status values
   * @namespace TRANSCRIPTION_STATUS
   * @memberof CONSTANTS
   */
  TRANSCRIPTION_STATUS: {
    /** Initial state when transcription is queued */
    PENDING: 'pending',
    /** Audio is being processed by Whisper API */
    PROCESSING: 'processing',
    /** Audio has been transcribed successfully */
    TRANSCRIBED: 'transcribed',
    /** AI summary is being generated */
    GENERATING_SUMMARY: 'generating_summary',
    /** Transcription and summary are complete */
    COMPLETED: 'completed',
    /** Processing failed with error */
    FAILED: 'failed'
  },

  /**
   * Retry limits and timeout values
   * @namespace RETRY_LIMITS
   * @memberof CONSTANTS
   */
  RETRY_LIMITS: {
    /** Maximum retry attempts for failed transcriptions */
    TRANSCRIPTION: 5,
    /** General API timeout in milliseconds (30 seconds) */
    API_TIMEOUT: 30000,
    /** Whisper API specific timeout in milliseconds (60 seconds) */
    WHISPER_TIMEOUT: 60000
  },

  /**
   * Data retention policy configuration
   * @namespace DATA_RETENTION
   * @memberof CONSTANTS
   */
  DATA_RETENTION: {
    /** Default data retention period in days */
    DEFAULT_DAYS: 365
  },

  /**
   * WebSocket message type constants
   * @namespace WS_MESSAGE_TYPES
   * @memberof CONSTANTS
   */
  WS_MESSAGE_TYPES: {
    /** Subscribe to updates */
    SUBSCRIBE: 'subscribe',
    /** Unsubscribe from updates */
    UNSUBSCRIBE: 'unsubscribe',
    /** Heartbeat ping message */
    PING: 'ping',
    /** Heartbeat pong response */
    PONG: 'pong',
    /** Error message */
    ERROR: 'error',
    /** Status update message */
    STATUS: 'status',
    /** Real-time data update */
    REALTIME_UPDATE: 'realtime_update'
  },

  /**
   * File size limits for uploads
   * @namespace FILE_SIZE_LIMITS
   * @memberof CONSTANTS
   */
  FILE_SIZE_LIMITS: {
    /** Maximum audio file size in bytes (50MB) */
    AUDIO: 50 * 1024 * 1024,
    /** Maximum image file size in bytes (10MB) */
    IMAGE: 10 * 1024 * 1024
  },

  /**
   * GDPR compliance configuration
   * @namespace GDPR
   * @memberof CONSTANTS
   */
  GDPR: {
    /** Current privacy policy version */
    CURRENT_POLICY_VERSION: 'v1.0',
    
    /**
     * Types of GDPR consent
     * @namespace CONSENT_TYPES
     * @memberof CONSTANTS.GDPR
     */
    CONSENT_TYPES: {
      /** Consent given during signup */
      SIGNUP: 'signup',
      /** Consent for data processing */
      DATA_PROCESSING: 'data_processing',
      /** Consent for marketing communications */
      MARKETING: 'marketing'
    }
  }
};

module.exports = CONSTANTS;
