// src/app.js - CLEAN PRODUCTION VERSION

/**
 * Car Crash Lawyer AI - Express Application
 * 
 * Main application setup with:
 * - Supabase (Database, Auth, Storage, Realtime)
 * - WebSocket for real-time updates
 * - GDPR compliance services
 * - Typeform webhook endpoints with signature verification
 * - External API integrations
 */

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const corsLib = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const morgan = require('morgan');
const crypto = require('crypto');
require('dotenv').config();

// ==================== IMPORTS ====================

const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const logger = require('./utils/logger');
const { sendError } = require('./utils/response');

// Middleware
const { apiLimiter, strictLimiter } = require('./middleware/rateLimit');
const { initGDPR } = require('./middleware/gdpr');
const requestLogger = require('./middleware/requestLogger');
const { helmet, cors, compression, requestId, requestTimeout } = require('./middleware/security');

// Services
const AuthService = require('../lib/services/authService');
const gdprService = require('./services/gdprService');
const websocketModule = require('./websocket');
const agentService = require('./services/agentService');

// Routes
const centralRouter = require('./routes/index');
const webhookRouter = require('./routes/webhook.routes');

// PDF Modules (optional)
let pdfModules = null;
try {
  pdfModules = {
    fetchAllData: require('../lib/data/dataFetcher').fetchAllData,
    generatePDF: require('../lib/generators/pdfGenerator').generatePDF,
    sendEmails: require('../lib/generators/emailService').sendEmails
  };
  logger.info('✅ PDF modules loaded');
} catch (error) {
  logger.warn('⚠️ PDF modules not available');
}

// ==================== CREATE APPLICATION ====================

function createApp() {
  const app = express();

  // Trust proxy (required for Replit, Heroku, etc.)
  app.set('trust proxy', true);

  // ==================== RAW BODY CAPTURE FOR WEBHOOKS ====================

  /**
   * CRITICAL: Raw body capture for webhook signature verification
   * Must happen BEFORE any JSON parsing middleware
   * 
   * The verify function stores raw buffer in req.rawBody while Express
   * automatically parses the JSON into req.body
   */
  app.use(express.json({
    limit: '50mb',
    verify: (req, res, buf, encoding) => {
      // Store raw body as both Buffer and string for signature verification
      req.rawBody = buf.toString('utf8');
    }
  }));

  app.use(express.urlencoded({
    extended: true,
    limit: '50mb',
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf.toString('utf8');
    }
  }));

  // ==================== MIDDLEWARE SETUP ====================

  // Security middleware
  app.use(helmet);
  app.use(cors);
  app.use(compression);
  app.use(requestId);
  app.use(requestTimeout(parseInt(process.env.REQUEST_TIMEOUT) || 30000));

  // HTTPS/WWW redirect middleware (bypasses webhook endpoints)
  const { httpsRedirect, wwwRedirect } = require('./middleware/security');
  app.use(httpsRedirect);
  app.use(wwwRedirect);

  // HTTP request logging (skip health checks)
  app.use(morgan('combined', {
    stream: {
      write: (message) => {
        logger.info('HTTP', { message: message.trim() });
      }
    },
    skip: (req) => req.path === '/healthz' || req.path === '/livez'
  }));

  // Request logging and tracking
  app.use(requestLogger);

  // Cookie parsing
  app.use(cookieParser());

  // Static files
  app.use(express.static(path.join(__dirname, '../public')));

  // Rate limiting
  app.use('/api/', apiLimiter);
  app.use('/api/whisper/', strictLimiter);
  app.use('/api/gdpr/', strictLimiter);

  // Cache control for HTML
  app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  });

  // ==================== MULTER (File Uploads) ====================

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.constants.FILE_SIZE_LIMITS.AUDIO,
      files: 5
    },
    fileFilter: (req, file, cb) => {
      const allowed = [
        'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg',
        'audio/mp4', 'audio/m4a', 'audio/aac',
        'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
      ];

      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type: ${file.mimetype}`));
      }
    }
  });

  // ==================== SUPABASE ====================

  let supabase = null;
  let supabaseEnabled = false;
  let realtimeChannels = {};

  function initSupabase() {
    if (!config.supabase.url || !config.supabase.serviceKey) {
      logger.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return false;
    }

    try {
      supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        realtime: {
          params: { eventsPerSecond: 10 }
        }
      });

      logger.success('✅ Supabase initialized');
      testSupabaseConnection();
      initializeRealtime();
      return true;

    } catch (error) {
      logger.error('❌ Supabase init failed:', error.message);
      return false;
    }
  }

  async function testSupabaseConnection() {
    try {
      const { error } = await supabase
        .from('user_signup')
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        logger.info('⚠️ user_signup table not found (create via migrations)');
        return true;
      }

      if (error) {
        logger.error('❌ Supabase connection failed:', error.message);
        return false;
      }

      logger.success('✅ Supabase connected');
      return true;

    } catch (err) {
      logger.error('❌ Connection test error:', err.message);
      return false;
    }
  }

  function initializeRealtime() {
    if (!supabaseEnabled) return;

    try {
      // Transcription updates
      const transcriptionChannel = supabase
        .channel('transcription-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transcription_queue'
        }, (payload) => {
          websocketModule.handleRealtimeTranscriptionUpdate(payload);
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'ai_transcription'
        }, (payload) => {
          websocketModule.handleRealtimeTranscriptionUpdate(payload);
        })
        .subscribe();

      // AI Summary updates
      const summaryChannel = supabase
        .channel('summary-updates')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_summary'
        }, (payload) => {
          websocketModule.handleRealtimeSummaryUpdate(payload);
        })
        .subscribe();

      realtimeChannels = { transcriptionChannel, summaryChannel };
      logger.success('✅ Realtime channels initialized');

    } catch (error) {
      logger.warn('⚠️ Realtime init failed (non-critical)');
    }
  }

  // ==================== INITIALIZE SERVICES ====================

  supabaseEnabled = initSupabase();

  // GDPR Service
  if (supabaseEnabled) {
    initGDPR(supabase, supabaseEnabled);
    gdprService.initialize(true);
    logger.success('✅ GDPR service initialized');
  }

  // Auth Service
  let authService = null;
  if (config.supabase.anonKey && supabaseEnabled) {
    authService = new AuthService(
      config.supabase.url,
      config.supabase.anonKey,
      config.supabase.serviceRoleKey
    );
    logger.success('✅ Auth service initialized');
  }

  // WebSocket will be initialized in index.js after server creation

  // Agent Service (background processing)
  if (!global.__AGENT_RUNNING__) {
    global.__AGENT_RUNNING__ = true;
    agentService.start();
    logger.success('✅ Agent service initialized');
  }

  // Test external services
  if (supabaseEnabled) {
    testExternalServices();
  }

  // ==================== EXTERNAL SERVICE TESTS ====================

  async function testExternalServices() {
    const axios = require('axios');
    const tests = [];

    // OpenAI
    if (config.openai.apiKey) {
      tests.push(
        axios.get('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${config.openai.apiKey}` },
          timeout: 5000
        })
        .then(() => logger.success('✅ OpenAI connected'))
        .catch(() => logger.warn('⚠️ OpenAI failed'))
      );
    }

    // what3words
    if (config.what3words.apiKey) {
      tests.push(
        axios.get(
          `https://api.what3words.com/v3/convert-to-coordinates?words=filled.count.soap&key=${config.what3words.apiKey}`,
          { timeout: 5000 }
        )
        .then(() => logger.success('✅ what3words connected'))
        .catch(() => logger.warn('⚠️ what3words failed'))
      );
    }

    // DVLA
    if (config.dvla.apiKey) {
      tests.push(
        axios.post(
          'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
          { registrationNumber: 'TEST123' },
          {
            headers: {
              'x-api-key': config.dvla.apiKey,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        )
        .then(() => logger.success('✅ DVLA connected'))
        .catch((err) => {
          if (err.response?.status === 400) {
            logger.success('✅ DVLA connected');
          } else {
            logger.warn('⚠️ DVLA failed');
          }
        })
      );
    }

    await Promise.allSettled(tests);
  }

  // ==================== AUTH MIDDLEWARE ====================

  function checkSharedKey(req, res, next) {
    const headerKey = req.get('X-Api-Key');
    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const provided = headerKey || bearer || '';

    if (!config.webhook.apiKey) {
      return sendError(res, 503, 'Server misconfigured', 'MISSING_API_KEY');
    }

    if (provided !== config.webhook.apiKey) {
      logger.warn('⚠️ Invalid API key:', req.ip);
      return sendError(res, 401, 'Unauthorized', 'INVALID_API_KEY');
    }

    next();
  }

  // ==================== STORE DEPENDENCIES ====================

  app.locals.supabase = supabase;
  app.locals.supabaseEnabled = supabaseEnabled;
  app.locals.authService = authService;
  app.locals.websocketModule = websocketModule;
  app.locals.pdfModules = pdfModules;
  app.locals.realtimeChannels = realtimeChannels;
  app.locals.upload = upload;
  app.locals.checkSharedKey = checkSharedKey;
  app.locals.agentService = agentService;

  // ==================== WEBHOOK ROUTES ====================

  /**
   * CRITICAL: Webhooks MUST be mounted FIRST (before other routes)
   * Raw body is captured globally via verify functions above
   * 
   * Webhook endpoints:
   * - POST /webhooks/typeform - Typeform form submissions
   * - POST /webhooks/github - GitHub repository events
   * - GET  /webhooks/test - Test webhook endpoint
   */
  app.use('/webhooks', webhookRouter);

  // Webhook debug endpoint
  app.get('/webhooks/debug', (req, res) => {
    res.json({
      status: 'ok',
      github_webhook_configured: !!process.env.GITHUB_WEBHOOK_SECRET,
      typeform_webhook_configured: !!process.env.TYPEFORM_WEBHOOK_SECRET,
      endpoints: {
        typeform: '/webhooks/typeform',
        github: '/webhooks/github',
        test: '/webhooks/test'
      },
      raw_body_capture: 'enabled',
      timestamp: new Date().toISOString()
    });
  });

  // ==================== API ROUTES ====================

  app.use('/', centralRouter);

  // ==================== HEALTH CHECK ROUTES ====================

  app.get('/healthz', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.get('/livez', (req, res) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/readyz', (req, res) => {
    const checks = {
      supabase: supabaseEnabled,
      env_vars: !!(process.env.SUPABASE_URL && process.env.OPENAI_API_KEY),
      webhooks: !!(process.env.TYPEFORM_WEBHOOK_SECRET)
    };

    const ready = Object.values(checks).every(Boolean);

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not ready',
      checks,
      timestamp: new Date().toISOString()
    });
  });

  // ==================== ERROR HANDLERS ====================

  // Multer errors
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const maxMB = config.constants.FILE_SIZE_LIMITS.AUDIO / 1024 / 1024;
        return sendError(res, 400, 'File too large', 'FILE_TOO_LARGE',
          `Maximum size: ${maxMB}MB`);
      }
      return sendError(res, 400, err.message, 'UPLOAD_ERROR');
    }

    // Don't expose internal errors in production
    if (err) {
      logger.error('❌ Unhandled error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method
      });

      return sendError(
        res, 
        500, 
        'Internal server error', 
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? err.message : undefined
      );
    }

    next();
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not found',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  });

  // Graceful shutdown is handled by index.js

  return app;
}

// ==================== EXPORT ====================

module.exports = createApp();