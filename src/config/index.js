/**
 * @fileoverview Centralized configuration for Car Crash Lawyer AI
 * @description Consolidates all environment variables and configuration settings
 */

const constants = require('./constants');

/**
 * Application configuration object
 * Centralizes all environment variables and settings
 */
const config = {
  /**
   * Application settings
   */
  app: {
    name: 'Car Crash Lawyer AI',
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:5000'
  },

  /**
   * Server configuration
   */
  server: {
    port: process.env.PORT || 5000,
    host: '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  /**
   * OpenAI API configuration
   */
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    enabled: !!process.env.OPENAI_API_KEY
  },

  /**
   * what3words API configuration
   */
  what3words: {
    apiKey: process.env.WHAT3WORDS_API_KEY,
    enabled: !!process.env.WHAT3WORDS_API_KEY
  },

  /**
   * Supabase configuration
   */
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    apiKey: process.env.SUPABASE_API_KEY
  },

  /**
   * Webhook and external API configuration
   */
  webhook: {
    apiKey: process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY
  },

  /**
   * Data retention configuration
   */
  dataRetention: {
    days: parseInt(process.env.DATA_RETENTION_DAYS) || constants.DATA_RETENTION.DEFAULT_DAYS
  },

  /**
   * Queue processing configuration
   */
  queue: {
    intervalMinutes: parseInt(process.env.TRANSCRIPTION_QUEUE_INTERVAL) || 5
  },

  /**
   * CORS configuration
   */
  cors: {
    origins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*'
  },

  /**
   * DVLA API configuration
   */
  dvla: {
    apiKey: process.env.DVLA_API_KEY || process.env.DVLA_API_KEY_LIVE,
    enabled: !!(process.env.DVLA_API_KEY || process.env.DVLA_API_KEY_LIVE)
  },

  /**
   * Application constants
   */
  constants: constants
};

module.exports = config;