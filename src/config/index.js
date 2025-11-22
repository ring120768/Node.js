// src/config/index.js - CLEAN PRODUCTION VERSION

/**
 * Centralized Configuration for Car Crash Lawyer AI
 * Consolidates all environment variables and settings
 */

const constants = require('./constants');

module.exports = {
  // ==================== APPLICATION ====================

  app: {
    name: 'Car Crash Lawyer AI',
    port: parseInt(process.env.PORT, 10) || (process.env.NODE_ENV === 'development' ? 3000 : 5000),
    env: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:5000'
  },

  // ==================== SUPABASE ====================

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    enabled: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  },

  // ==================== EXTERNAL APIs ====================

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    whisperModel: 'whisper-1',
    enabled: !!process.env.OPENAI_API_KEY
  },

  // ==================== UPLOAD ====================

  upload: {
    allowedAudioTypes: [
      'audio/webm',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/m4a'
    ],
    maxFileSize: 10 * 1024 * 1024  // 10MB
  },

  what3words: {
    apiKey: process.env.WHAT3WORDS_API_KEY,
    enabled: !!process.env.WHAT3WORDS_API_KEY
  },

  dvla: {
    apiKey: process.env.DVLA_API_KEY,
    enabled: !!process.env.DVLA_API_KEY,
    baseUrl: 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1'
  },

  insurance: {
    apiKey: process.env.INSURANCE_API_KEY,
    enabled: !!process.env.INSURANCE_API_KEY,
    baseUrl: 'https://uk1.ukvehicledata.co.uk/api/datapackage'
  },

  // ==================== ADOBE PDF SERVICES ====================

  adobe: {
    clientId: process.env.PDF_SERVICES_CLIENT_ID,
    clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET,
    enabled: !!(process.env.PDF_SERVICES_CLIENT_ID && process.env.PDF_SERVICES_CLIENT_SECRET)
  },

  // ==================== WEBHOOKS ====================

  webhook: {
    apiKey: process.env.WEBHOOK_API_KEY || 
            process.env.TYPEFORM_X_API_KEY || 
            process.env.ZAPIER_SHARED_KEY,
    enabled: !!(process.env.WEBHOOK_API_KEY || 
                process.env.TYPEFORM_X_API_KEY || 
                process.env.ZAPIER_SHARED_KEY)
  },

  // ==================== CORS ====================

  cors: {
    origins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : '*'
  },

  // ==================== DATA RETENTION ====================

  dataRetention: {
    days: parseInt(process.env.DATA_RETENTION_DAYS) || constants.DATA_RETENTION.DEFAULT_DAYS
  },

  // ==================== QUEUE PROCESSING ====================

  queue: {
    intervalMinutes: parseInt(process.env.TRANSCRIPTION_QUEUE_INTERVAL) || 5
  },

  // ==================== CONSTANTS ====================

  constants: constants
};