// src/app.js - CLEAN PRODUCTION VERSION

/**
 * Car Crash Lawyer AI - Express Application
 * 
 * Main application setup with:
 * - Supabase (Database, Auth, Storage, Realtime)
 * - WebSocket for real-time updates
 * - GDPR compliance services
 * - Typeform webhook endpoints
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

  // ==================== GITHUB WEBHOOK VERIFICATION ====================
  
  // Raw body capture for webhook verification - must come before JSON parsing
  app.use('/webhooks/github', express.raw({ type: 'application/json', limit: '1mb' }));
      
      

  // ==================== MIDDLEWARE SETUP ====================

  // Security middleware (must be first)
  app.use(helmet);
  app.use(cors);
  app.use(compression);
  app.use(requestId);
  app.use(requestTimeout(parseInt(process.env.REQUEST_TIMEOUT) || 30000));

  // HTTP request logging
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

  // Body parsing
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
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

  // ==================== ROUTES ====================

  /**
   * CRITICAL: Webhooks MUST be mounted BEFORE central router
   * 
   * Typeform webhooks:
   * - POST /webhooks/user_signup
   * - POST /webhooks/incident_reports
   * - POST /webhooks/demo
   */
  app.use('/webhooks', webhookRouter);

  // GitHub webhook verification middleware
  function verifyGitHubWebhook(req, res, next) {
    const signature = req.get('X-Hub-Signature-256');
    const deliveryId = req.get('X-GitHub-Delivery');
    
    if (!signature || !deliveryId) {
      return res.status(400).json({ error: 'Missing GitHub webhook headers' });
    }
    
    if (!process.env.GITHUB_WEBHOOK_SECRET) {
      logger.warn('GitHub webhook received but GITHUB_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    
    const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
    hmac.update(req.body);
    const computedSignature = `sha256=${hmac.digest('hex')}`;
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
      logger.warn('GitHub webhook signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Parse body and add delivery ID
    req.body = JSON.parse(req.body);
    req.githubDeliveryId = deliveryId;
    next();
  }

  // GitHub webhook routes (before other routes)
  app.post('/webhooks/github', verifyGitHubWebhook, (req, res) => {
    const event = req.get('X-GitHub-Event');
    const deliveryId = req.githubDeliveryId;
    
    // Fast 200 acknowledgment
    res.status(200).json({ 
      received: true, 
      delivery_id: deliveryId,
      event: event,
      timestamp: new Date().toISOString()
    });
    
    // Process webhook asynchronously
    setImmediate(() => {
      logger.info('GitHub webhook processed', { 
        event,
        delivery_id: deliveryId,
        repository: req.body?.repository?.full_name,
        action: req.body?.action
      });
    });
  });

  app.get('/webhooks/debug', (req, res) => {
    res.json({
      github_webhook_configured: !!process.env.GITHUB_WEBHOOK_SECRET,
      typeform_webhook_configured: !!process.env.WEBHOOK_API_KEY,
      endpoints: {
        github: '/webhooks/github',
        typeform: ['/webhooks/user_signup', '/webhooks/incident_reports', '/webhooks/demo']
      }
    });
  });

  // API routes
  app.use('/', centralRouter);

  // Health Check Routes
  app.get('/healthz', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  app.get('/readyz', (req, res) => {
    const checks = {
      supabase: supabaseEnabled,
      env_vars: !!(process.env.SUPABASE_URL && process.env.OPENAI_API_KEY)
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

    // General errors
    logger.error('❌ Unhandled error:', err);
    sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? err.message : undefined);
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

  // Graceful shutdown is now handled by index.js

  // Don't create server here - let index.js handle it
  return app;
}

// ==================== EXPORT ====================

module.exports = createApp();