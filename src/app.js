/**
 * Express Application Configuration
 * Sets up middleware, database, WebSocket, and routes
 */

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const http = require('http');
require('dotenv').config();

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Import configuration and constants
const config = require('./config');
const CONSTANTS = config.constants;

// Import utilities
const logger = require('./utils/logger');
const { validateUserId } = require('./utils/validators');
const { sendError, redactUrl } = require('./utils/response');

// Import middleware
const { apiLimiter, strictLimiter } = require('./middleware/rateLimit');
const { initGDPR, checkGDPRConsent } = require('./middleware/gdpr');
const requestLogger = require('./middleware/requestLogger');

// Import services
const AuthService = require('../lib/services/authService');
const gdprService = require('./services/gdprService');
const websocketModule = require('./websocket');

// Import PDF generation modules - with error handling
let pdfModules = null;
try {
  pdfModules = {
    fetchAllData: require('../lib/data/dataFetcher').fetchAllData,
    generatePDF: require('../lib/generators/pdfGenerator').generatePDF,
    sendEmails: require('../lib/generators/emailService').sendEmails
  };
} catch (error) {
  logger.warn('PDF generation modules not found - PDF features will be disabled', error.message);
}

// Import central router
const centralRouter = require('./routes/index');

/**
 * Initialize Express application
 */
function createApp() {
  const app = express();
  const server = http.createServer(app);

  // Set trust proxy to resolve the X-Forwarded-For warning
  app.set('trust proxy', true);

  // ========================================
  // MULTER CONFIGURATION
  // ========================================
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: CONSTANTS.FILE_SIZE_LIMITS.AUDIO,
      files: 5
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg',
        'audio/mp4', 'audio/m4a', 'audio/aac',
        'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
      ];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`));
      }
    }
  });

  // ========================================
  // BASIC MIDDLEWARE SETUP
  // ========================================
  app.use(cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'X-User-Id']
  }));

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, '../public')));

  // Apply rate limiting
  app.use('/api/', apiLimiter);
  app.use('/api/whisper/', strictLimiter);
  app.use('/api/gdpr/', strictLimiter);

  // Cache control headers
  app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // Request logging middleware
  app.use(requestLogger);

  // ========================================
  // SUPABASE INITIALIZATION
  // ========================================
  let supabase = null;
  let supabaseEnabled = false;
  let realtimeChannels = {};

  const initSupabase = () => {
    if (!config.supabase.url || !config.supabase.serviceKey) {
      logger.error('SUPABASE_URL or SUPABASE_SERVICE_KEY not found');
      return false;
    }

    try {
      supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-client-info': 'car-crash-lawyer-ai',
            'x-refresh-schema': 'true'
          }
        }
      });

      logger.success('Supabase initialized successfully');
      initializeGDPRTables();
      initializeSupabaseRealtime();
      return true;
    } catch (error) {
      logger.error('Error initializing Supabase', error);
      return false;
    }
  };

  // Initialize Supabase Realtime
  function initializeSupabaseRealtime() {
    if (!supabaseEnabled) return;

    try {
      // Subscribe to transcription_queue changes
      const transcriptionChannel = supabase
        .channel('transcription-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transcription_queue'
          },
          (payload) => {
            logger.info('Realtime transcription update:', payload.eventType);
            websocketModule.handleRealtimeTranscriptionUpdate(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ai_transcription'
          },
          (payload) => {
            logger.info('Realtime AI transcription update:', payload.eventType);
            websocketModule.handleRealtimeTranscriptionUpdate(payload);
          }
        )
        .subscribe((status) => {
          logger.info('Transcription realtime subscription status:', status);
        });

      // Subscribe to ai_summary changes
      const summaryChannel = supabase
        .channel('summary-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ai_summary'
          },
          (payload) => {
            logger.info('AI Summary created:', payload.new?.id);
            websocketModule.handleRealtimeSummaryUpdate(payload);
          }
        )
        .subscribe((status) => {
          logger.info('Summary realtime subscription status:', status);
        });

      realtimeChannels = { transcriptionChannel, summaryChannel };
      logger.info('Supabase Realtime channels initialized');
    } catch (error) {
      logger.error('Failed to initialize Supabase Realtime (non-critical)', error);
    }
  }

  // Initialize GDPR tables
  async function initializeGDPRTables() {
    try {
      // Check and create GDPR consent table
      const { error: consentError } = await supabase
        .from('gdpr_consent')
        .select('*')
        .limit(1);

      if (consentError && consentError.code === '42P01') {
        logger.info('GDPR consent table needs creation (handle via migrations)');
      }

      // Check and create GDPR audit log table
      const { error: auditError } = await supabase
        .from('gdpr_audit_log')
        .select('*')
        .limit(1);

      if (auditError && auditError.code === '42P01') {
        logger.info('GDPR audit log table needs creation (handle via migrations)');
      }
    } catch (error) {
      logger.error('Error checking GDPR tables', error);
    }
  }

  supabaseEnabled = initSupabase();

  // ========================================
  // INITIALIZE SERVICES
  // ========================================

  // Initialize GDPR middleware and service
  initGDPR(supabase, supabaseEnabled);
  if (supabaseEnabled) {
    gdprService.initialize(supabase, true);
    logger.info('GDPR service initialized and data retention scheduled');
  }

  // Initialize Auth Service
  let authService = null;
  if (config.supabase.anonKey && supabaseEnabled) {
    authService = new AuthService(
      config.supabase.url,
      config.supabase.anonKey
    );
    logger.success('✅ Supabase Auth service initialized');
  } else {
    logger.warn('⚠️ Auth service not initialized - missing SUPABASE_ANON_KEY');
  }

  // ========================================
  // WEBSOCKET INITIALIZATION
  // ========================================
  const wss = websocketModule.initializeWebSocket(server);

  // ========================================
  // AUTHENTICATION MIDDLEWARE
  // ========================================
  function checkSharedKey(req, res, next) {
    const headerKey = req.get('X-Api-Key');
    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const provided = headerKey || bearer || '';

    if (!config.webhook.apiKey) {
      logger.warn('No ZAPIER_SHARED_KEY/WEBHOOK_API_KEY set');
      return sendError(res, 503, 'Server missing shared key', 'MISSING_API_KEY');
    }

    if (provided !== config.webhook.apiKey) {
      logger.warn('Authentication failed', { ip: req.clientIp });
      return sendError(res, 401, 'Unauthorized', 'INVALID_API_KEY');
    }

    return next();
  }

  // ========================================
  // STORE DEPENDENCIES IN APP LOCALS
  // ========================================
  app.locals.supabase = supabase;
  app.locals.supabaseEnabled = supabaseEnabled;
  app.locals.authService = authService;
  app.locals.websocketModule = websocketModule;
  app.locals.pdfModules = pdfModules;
  app.locals.realtimeChannels = realtimeChannels;
  app.locals.upload = upload;
  app.locals.checkSharedKey = checkSharedKey;

  // ========================================
  // MOUNT CENTRAL ROUTER
  // ========================================
  app.use('/', centralRouter);

  // ========================================
  // ERROR HANDLING
  // ========================================

  // Error handler middleware
  app.use((err, req, res, next) => {
    logger.error('Unhandled error', err);

    // Handle multer errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 400, 'File too large', 'FILE_TOO_LARGE',
          `Maximum file size is ${CONSTANTS.FILE_SIZE_LIMITS.AUDIO / 1024 / 1024}MB`);
      }
      return sendError(res, 400, err.message, 'UPLOAD_ERROR');
    }

    sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? err.message : undefined);
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
      message: 'The requested resource was not found',
      requestId: req.requestId
    });
  });

  // ========================================
  // GRACEFUL SHUTDOWN SETUP
  // ========================================
  function gracefulShutdown(signal) {
    logger.info(`${signal} received, closing server gracefully...`);

    // Close realtime channels
    if (realtimeChannels.transcriptionChannel) {
      realtimeChannels.transcriptionChannel.unsubscribe();
    }
    if (realtimeChannels.summaryChannel) {
      realtimeChannels.summaryChannel.unsubscribe();
    }

    // Close WebSocket server
    websocketModule.closeWebSocket();

    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed gracefully');
      process.exit(0);
    });

    // Force close after timeout
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit on unhandled rejection, just log it
  });

  // Store server reference for external access
  app.server = server;

  return app;
}

module.exports = createApp();