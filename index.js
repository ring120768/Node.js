/**
 * Centralized Configuration for Car Crash Lawyer AI
 * Environment-based configuration with validation
 */

const logger = require('../utils/logger');

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',  // ✅ Only need ANON key now
  'OPENAI_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error('❌ Missing required environment variables:', missingVars);
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

const config = {
  // Application settings
  app: {
    name: 'Car Crash Lawyer AI',
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:5000'
  },

  // Supabase configuration - ANON KEY ONLY
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    // ❌ REMOVED: serviceKey - no longer needed
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    whisperModel: 'whisper-1',
    gptModel: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
  },

  // What3Words API
  what3words: {
    apiKey: process.env.WHAT3WORDS_API_KEY
  },

  // Email configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    },
    from: process.env.EMAIL_FROM || 'noreply@carcrashlawyerai.com'
  },

  // Webhook authentication
  webhooks: {
    zapierSharedKey: process.env.ZAPIER_SHARED_KEY
  },

  // Typeform integration
  typeform: {
    secret: process.env.TYPEFORM_SECRET || 'car-crash-lawyer-ai-secret-2024'
  },

  // File upload limits
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/heic'],
    allowedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/mp3']
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  },

  // Session/Cookie settings
  session: {
    cookieName: 'access_token',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    rememberMeMaxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.NODE_ENV === 'development'
  }
};

// Log successful configuration (hide sensitive values)
logger.success('✅ Configuration loaded successfully');
logger.info('Environment:', config.app.env);
logger.info('Supabase URL:', config.supabase.url ? '✅ Set' : '❌ Missing');
logger.info('Supabase Anon Key:', config.supabase.anonKey ? '✅ Set' : '❌ Missing');
logger.info('OpenAI API Key:', config.openai.apiKey ? '✅ Set' : '❌ Missing');

module.exports = config;