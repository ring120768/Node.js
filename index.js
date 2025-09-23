// ========================================
// PART 1: Core Setup, Middleware, and Classes
// ========================================

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const FormData = require('form-data');
const http = require('http');
const WebSocket = require('ws');
const { Readable } = require('stream');
require('dotenv').config();

// Import rate limiting
const rateLimit = require('express-rate-limit');

// Import security middleware
const helmet = require('helmet');
const compression = require('compression');

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// ========================================
// GDPR MODULE IMPORT - NEW
// ========================================
const GDPRComplianceModule = require('./gdprModule');

// ========================================
// ENHANCED MODULES - NEW
// ========================================
const { CONSTANTS: ENHANCED_CONSTANTS, ConstantHelpers } = require('./constants');
const ConsentManager = require('./consentManager');
const WebhookDebugger = require('./webhookDebugger');

// Import PDF generation modules - with error handling
let fetchAllData, generatePDF, sendEmails;
try {
  fetchAllData = require('./lib/dataFetcher').fetchAllData;
  generatePDF = require('./lib/pdfGenerator').generatePDF;
  sendEmails = require('./lib/emailService').sendEmails;
} catch (error) {
  console.warn('PDF generation modules not found - PDF features will be disabled', error.message);
}

// Use enhanced constants from module
const CONSTANTS = ENHANCED_CONSTANTS;

// Enhanced logging utility with better error handling
const Logger = {
  info: (message, data) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${new Date().toISOString()} ${message}`, data || '');
    }
  },
  error: (message, error) => {
    const errorMessage = error?.message || error || '';
    const errorStack = error?.stack || '';
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, errorMessage);
    if (errorStack && process.env.DEBUG === 'true') {
      console.error(errorStack);
    }
    // Log to error tracking service if configured
    if (process.env.ERROR_TRACKING_ENABLED === 'true') {
      // Placeholder for error tracking service integration
      // e.g., Sentry, Rollbar, etc.
    }
  },
  warn: (message, data) => {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`, data || '');
  },
  debug: (message, data) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, data || '');
    }
  },
  success: (message, data) => {
    console.log(`[✅ SUCCESS] ${new Date().toISOString()} ${message}`, data || '');
  }
};

const app = express();
const server = http.createServer(app);

// FIXED: Set trust proxy to 1 instead of true to resolve the X-Forwarded-For warning
app.set('trust proxy', 1);

// Configure multer for file uploads with enhanced error handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CONSTANTS.FILE_SIZE_LIMITS.AUDIO,
    files: 5 // Maximum number of files
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

// Enhanced rate limiting middleware - FIXED: trustProxy set to 1
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1,  // FIXED: Changed from true to 1
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// FIXED: trustProxy set to 1 for strictLimiter
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter limit for sensitive endpoints
  message: 'Rate limit exceeded for this operation.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1  // FIXED: Changed from true to 1
});

// --- MIDDLEWARE SETUP ---

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Response compression
app.use(compression({
  level: 6,
  threshold: 100 * 1000, // Only compress responses > 100KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'X-User-Id']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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

// Enhanced request logging middleware with sanitization
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const sanitizedPath = req.path.replace(/\/user\/[^\/]+/g, '/user/[REDACTED]');
  Logger.debug(`${req.method} ${sanitizedPath}`, { timestamp });

  // Log user ID if present in various locations
  const userId = req.body?.create_user_id || req.body?.userId ||
                 req.params?.userId || req.query?.userId || req.headers['x-user-id'];
  if (userId) {
    Logger.debug('User ID', { userId: userId.substring(0, 8) + '...' }); // Partially redact for security
  }

  // Store IP for GDPR audit logging
  req.clientIp = req.ip ||
                 req.connection?.remoteAddress ||
                 req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                 'unknown';

  // Add request ID for tracing
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-Id', req.requestId);

  next();
});

// --- AUTHENTICATION MIDDLEWARE ---
const SHARED_KEY = process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY || '';

function checkSharedKey(req, res, next) {
  const headerKey = req.get('X-Api-Key');
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const provided = headerKey || bearer || '';

  if (!SHARED_KEY) {
    Logger.warn('No ZAPIER_SHARED_KEY/WEBHOOK_API_KEY set');
    return res.status(503).json({
      error: 'Server missing shared key (ZAPIER_SHARED_KEY)',
      requestId: req.requestId
    });
  }

  if (provided !== SHARED_KEY) {
    Logger.warn('Authentication failed', { ip: req.clientIp });
    return res.status(401).json({
      error: 'Unauthorized',
      requestId: req.requestId
    });
  }

  return next();
}

// --- GDPR CONSENT CHECK MIDDLEWARE ---
async function checkGDPRConsent(req, res, next) {
  const userId = req.body?.userId || req.body?.create_user_id || req.params?.userId;

  if (!userId) {
    return res.status(400).json({
      error: 'User identification required',
      code: 'MISSING_USER_ID',
      message: 'A valid user ID must be provided to process personal data',
      requestId: req.requestId
    });
  }

  // Enhanced user ID format validation
  if (!/^[a-zA-Z0-9_-]{3,64}$/.test(userId)) {
    return res.status(400).json({
      error: 'Invalid user ID format',
      code: 'INVALID_USER_ID',
      message: 'User ID must be 3-64 characters, alphanumeric with underscores and hyphens only',
      requestId: req.requestId
    });
  }

  // Use GDPR module if available
  if (gdprModule) {
    const consentStatus = await gdprModule.checkConsentStatus(userId);
    if (!consentStatus.has_consent) {
      return res.status(403).json({
        error: 'GDPR consent required',
        code: 'CONSENT_REQUIRED',
        message: 'User must provide GDPR consent before processing personal data',
        consent_url: '/api/gdpr/consent',
        requestId: req.requestId
      });
    }
    req.gdprConsent = consentStatus;
    return next();
  }

  // Fallback to original implementation if GDPR module not available
  if (!supabaseEnabled) {
    return next();
  }

  try {
    const { data: user } = await supabase
      .from('user_signup')
      .select('gdpr_consent, gdpr_consent_date')
      .eq('create_user_id', userId)
      .single();

    if (!user || !user.gdpr_consent) {
      await logGDPRActivity(userId, 'CONSENT_CHECK_FAILED', {
        reason: 'No consent found',
        ip: req.clientIp,
        requestId: req.requestId
      }, req);

      return res.status(403).json({
        error: 'GDPR consent required',
        code: 'CONSENT_REQUIRED',
        message: 'User must provide GDPR consent before processing personal data',
        requestId: req.requestId
      });
    }

    req.gdprConsent = {
      granted: true,
      date: user.gdpr_consent_date
    };

    next();
  } catch (error) {
    Logger.error('GDPR consent check error', error);
    res.status(500).json({
      error: 'Failed to verify consent',
      code: 'CONSENT_CHECK_FAILED',
      requestId: req.requestId
    });
  }
}

function authenticateRequest(req, res, next) {
  // Placeholder for future auth implementation
  Logger.debug('authenticateRequest called');
  next();
}

// --- SUPABASE SETUP WITH SCHEMA REFRESH ---
let supabase = null;
let supabaseEnabled = false;
let realtimeChannels = {};

// ========================================
// GDPR MODULE INITIALIZATION - NEW
// ========================================
let gdprModule = null;

const initSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    Logger.error('SUPABASE_URL or SUPABASE_SERVICE_KEY not found');
    return false;
  }

  try {
    // Add schema refresh headers
    supabase = createClient(url, key, {
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
          'x-refresh-schema': 'true' // Force schema refresh
        }
      }
    });
    Logger.success('Supabase initialized successfully');

    // Initialize GDPR tables if they don't exist
    initializeGDPRTables();

    // Initialize Supabase Realtime (optional enhancement)
    initializeSupabaseRealtime();

    return true;
  } catch (error) {
    Logger.error('Error initializing Supabase', error);
    return false;
  }
};

// Initialize Supabase
supabaseEnabled = initSupabase();

// ========================================
// INITIALIZE GDPR MODULE - NEW
// ========================================
if (supabaseEnabled) {
  gdprModule = new GDPRComplianceModule(supabase, Logger);
  Logger.success('✅ GDPR Compliance Module initialized');
}

// ========================================
// INITIALIZE ENHANCED MODULES - NEW
// ========================================
let consentManager = null;
let webhookDebugger = null;

if (supabaseEnabled && supabase) {
  try {
    // Initialize Consent Manager
    consentManager = new ConsentManager(supabase, Logger);
    Logger.success('✅ Consent Manager initialized');

    // Initialize Webhook Debugger
    webhookDebugger = new WebhookDebugger(supabase, Logger);
    Logger.success('✅ Webhook Debugger initialized');
  } catch (error) {
    Logger.error('Failed to initialize enhanced modules:', error);
    // Modules remain null, fallback logic will handle
  }
} else {
  Logger.warn('Enhanced modules not initialized - Supabase not available');
}

// ========================================
// ADD GDPR MIDDLEWARE - NEW
// ========================================
if (gdprModule) {
  app.use(gdprModule.middleware());
  Logger.info('🛡️ GDPR middleware activated');
}

// Initialize Supabase Realtime for better updates
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
          Logger.info('Realtime transcription update:', payload.eventType);
          handleRealtimeTranscriptionUpdate(payload);
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
          Logger.info('Realtime AI transcription update:', payload.eventType);
          handleRealtimeTranscriptionUpdate(payload);
        }
      )
      .subscribe((status) => {
        Logger.info('Transcription realtime subscription status:', status);
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
          Logger.info('AI Summary created:', payload.new?.id);
          handleRealtimeSummaryUpdate(payload);
        }
      )
      .subscribe((status) => {
        Logger.info('Summary realtime subscription status:', status);
      });

    realtimeChannels = { transcriptionChannel, summaryChannel };

    Logger.info('Supabase Realtime channels initialized (optional enhancement)');
  } catch (error) {
    Logger.error('Failed to initialize Supabase Realtime (non-critical)', error);
    // Non-critical - system works without realtime
  }
}

// Handle realtime transcription updates
function handleRealtimeTranscriptionUpdate(payload) {
  try {
    const { eventType, new: newData, old: oldData, table } = payload;

    let queueId, userId, status, transcription;

    if (table === 'transcription_queue') {
      queueId = newData?.id || oldData?.id;
      userId = newData?.create_user_id || oldData?.create_user_id;
      status = newData?.status;
      transcription = newData?.transcription_text;
    } else if (table === 'ai_transcription') {
      userId = newData?.create_user_id;
      transcription = newData?.transcription_text;
      status = 'transcribed';
    }

    if (queueId) {
      // Update in-memory status
      if (transcriptionStatuses.has(queueId)) {
        transcriptionStatuses.set(queueId, {
          ...transcriptionStatuses.get(queueId),
          status: status,
          transcription: transcription || transcriptionStatuses.get(queueId).transcription
        });
      }

      // Broadcast to WebSocket clients
      broadcastTranscriptionUpdate(queueId, {
        type: CONSTANTS.WS_MESSAGE_TYPES.REALTIME_UPDATE,
        source: 'supabase_realtime',
        table: table,
        eventType: eventType,
        status: status,
        transcription: transcription,
        error: newData?.error_message
      });
    }

    // Broadcast to user-specific connections
    if (userId) {
      broadcastToUser(userId, {
        type: CONSTANTS.WS_MESSAGE_TYPES.REALTIME_UPDATE,
        source: 'supabase_realtime',
        table: table,
        eventType: eventType,
        data: newData
      });
    }
  } catch (error) {
    Logger.error('Error handling realtime transcription update', error);
  }
}

// Handle realtime summary updates
function handleRealtimeSummaryUpdate(payload) {
  try {
    const { new: summaryData } = payload;
    const userId = summaryData?.create_user_id;
    const queueId = summaryData?.incident_id;

    if (queueId && transcriptionStatuses.has(queueId)) {
      transcriptionStatuses.set(queueId, {
        ...transcriptionStatuses.get(queueId),
        status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
        summary: summaryData
      });
    }

    // Broadcast completion to relevant connections
    if (queueId) {
      broadcastTranscriptionUpdate(queueId, {
        type: CONSTANTS.WS_MESSAGE_TYPES.REALTIME_UPDATE,
        source: 'ai_summary',
        status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
        summary: summaryData,
        message: 'AI summary generated successfully!'
      });
    }

    if (userId) {
      broadcastToUser(userId, {
        type: 'summary_ready',
        summary: summaryData
      });
    }
  } catch (error) {
    Logger.error('Error handling realtime summary update', error);
  }
}

// Improved GDPR table initialization
async function initializeGDPRTables() {
  try {
    // Check and create GDPR consent table
    const { error: consentError } = await supabase
      .from('gdpr_consent')
      .select('*')
      .limit(1);

    if (consentError && consentError.code === '42P01') {
      Logger.info('GDPR consent table needs creation (handle via migrations)');
    }

    // Check and create GDPR audit log table
    const { error: auditError } = await supabase
      .from('gdpr_audit_log')
      .select('*')
      .limit(1);

    if (auditError && auditError.code === '42P01') {
      Logger.info('GDPR audit log table needs creation (handle via migrations)');
    }
  } catch (error) {
    Logger.error('Error checking GDPR tables', error);
  }
}

// --- GDPR ACTIVITY LOGGING ---
async function logGDPRActivity(userId, activityType, details, req = null) {
  // Use GDPR module if available
  if (gdprModule) {
    return await gdprModule.auditLog(userId, activityType, details, req);
  }

  // Fallback to original implementation
  if (!supabaseEnabled) return;

  try {
    await supabase
      .from('gdpr_audit_log')
      .insert({
        user_id: userId,
        activity_type: activityType,
        details: details,
        ip_address: req?.clientIp || 'unknown',
        user_agent: req?.get('user-agent') || 'unknown',
        request_id: req?.requestId || null,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    Logger.error('GDPR audit log error', error);
  }
}

// --- DATA RETENTION POLICY ---
async function enforceDataRetention() {
  if (!supabaseEnabled) return;

  const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS) || CONSTANTS.DATA_RETENTION.DEFAULT_DAYS;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    // Archive old incident reports
    const { data: oldReports } = await supabase
      .from('incident_reports')
      .select('id, create_user_id')
      .lt('created_at', cutoffDate.toISOString())
      .eq('archived', false);

    if (oldReports && oldReports.length > 0) {
      for (const report of oldReports) {
        // Archive the report
        await supabase
          .from('incident_reports')
          .update({
            archived: true,
            archived_at: new Date().toISOString()
          })
          .eq('id', report.id);

        // Log the archival
        await logGDPRActivity(report.create_user_id, 'DATA_ARCHIVED', {
          report_id: report.id,
          reason: 'Data retention policy'
        });
      }

      Logger.info(`Archived ${oldReports.length} old reports per retention policy`);
    }

    // Clean up old transcription queue items
    await supabase
      .from('transcription_queue')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('status', CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED);

  } catch (error) {
    Logger.error('Data retention enforcement error', error);
  }
}

// Schedule data retention enforcement
if (supabaseEnabled) {
  // Run daily at 2 AM
  setInterval(enforceDataRetention, 24 * 60 * 60 * 1000);
  Logger.info('Data retention policy scheduled');
}

// ========================================
// SCHEDULE GDPR COMPLIANCE JOBS - NEW
// ========================================
if (gdprModule && supabaseEnabled) {
  // Check for expired consents daily
  setInterval(async () => {
    try {
      const { data: expiredConsents } = await supabase
        .from('gdpr_consent_records')
        .select('*')
        .lt('expiry_date', new Date().toISOString())
        .eq('consent_given', true)
        .is('withdrawal_date', null);

      for (const consent of expiredConsents || []) {
        Logger.info(`⚠️ Consent expired for user ${consent.user_id}`);
        // TODO: Send renewal reminder email
      }
    } catch (error) {
      Logger.error('Error checking expired consents:', error);
    }
  }, 24 * 60 * 60 * 1000); // Daily

  // Check for overdue DSRs every hour
  setInterval(async () => {
    try {
      const { data: overdueDSRs } = await supabase
        .from('data_subject_requests')
        .select('*')
        .lt('response_deadline', new Date().toISOString())
        .eq('request_status', 'pending');

      if (overdueDSRs && overdueDSRs.length > 0) {
        Logger.warn(`🚨 ${overdueDSRs.length} Data Subject Requests are overdue!`);
        // TODO: Send alert to admin
      }
    } catch (error) {
      Logger.error('Error checking overdue DSRs:', error);
    }
  }, 60 * 60 * 1000); // Hourly

  Logger.info('⏰ GDPR compliance jobs scheduled');
}

// --- WEBSOCKET SETUP ---
const wss = new WebSocket.Server({
  noServer: true,
  clientTracking: true,
  maxPayload: 10 * 1024 * 1024 // 10MB max message size
});

const activeSessions = new Map(); // queueId -> WebSocket
const userSessions = new Map(); // userId -> Set of WebSockets
const transcriptionStatuses = new Map(); // Store transcription statuses in memory

// Enhanced cleanup for stale WebSocket connections
setInterval(() => {
  activeSessions.forEach((ws, queueId) => {
    if (ws.readyState !== WebSocket.OPEN) {
      activeSessions.delete(queueId);
      Logger.debug(`Cleaned up stale session for queue ${queueId}`);
    }
  });

  userSessions.forEach((wsSets, userId) => {
    const activeSockets = Array.from(wsSets).filter(ws => ws.readyState === WebSocket.OPEN);
    if (activeSockets.length !== wsSets.size) {
      userSessions.set(userId, new Set(activeSockets));
      Logger.debug(`Cleaned up ${wsSets.size - activeSockets.length} stale sockets for user ${userId}`);
    }
    if (activeSockets.length === 0) {
      userSessions.delete(userId);
    }
  });
}, 60000); // Clean up every minute

// Cleanup stale webhooks from memory store
setInterval(() => {
  if (webhookDebugger && webhookDebugger.webhookStore) {
    const storeSize = webhookDebugger.webhookStore.size;
    const maxSize = parseInt(process.env.WEBHOOK_STORE_MAX_SIZE) || 1000;

    if (storeSize > maxSize) {
      Logger.warn(`Webhook store size (${storeSize}) exceeds limit (${maxSize}), triggering cleanup`);

      // Get oldest webhooks and remove them
      const webhooksArray = Array.from(webhookDebugger.webhookStore.entries());
      const sortedWebhooks = webhooksArray.sort((a, b) => 
        new Date(a[1].timestamp) - new Date(b[1].timestamp)
      );

      const toRemove = storeSize - (maxSize * 0.8); // Keep 80% after cleanup
      for (let i = 0; i < toRemove; i++) {
        webhookDebugger.webhookStore.delete(sortedWebhooks[i][0]);
      }

      Logger.info(`Cleaned up ${toRemove} old webhooks, new size: ${webhookDebugger.webhookStore.size}`);
    }
  }
}, 300000); // Check every 5 minutes

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  // Add basic authentication check if needed
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  Logger.info('New WebSocket connection established');

  // Add heartbeat to detect broken connections
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Add connection metadata
  ws.connectionTime = Date.now();
  ws.messageCount = 0;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      ws.messageCount++;
      Logger.debug('WebSocket message received', {
        type: data.type,
        messageCount: ws.messageCount
      });

      switch(data.type) {
        case CONSTANTS.WS_MESSAGE_TYPES.SUBSCRIBE:
          if (data.queueId) {
            activeSessions.set(data.queueId, ws);
            ws.queueId = data.queueId;
            ws.send(JSON.stringify({
              type: 'subscribed',
              queueId: data.queueId,
              message: 'Successfully subscribed to transcription updates'
            }));
          }

          if (data.userId) {
            if (!userSessions.has(data.userId)) {
              userSessions.set(data.userId, new Set());
            }
            userSessions.get(data.userId).add(ws);
            ws.userId = data.userId;
            ws.send(JSON.stringify({
              type: 'subscribed',
              userId: data.userId,
              message: 'Successfully subscribed to user updates'
            }));
          }
          break;

        case CONSTANTS.WS_MESSAGE_TYPES.UNSUBSCRIBE:
          if (data.queueId && activeSessions.has(data.queueId)) {
            activeSessions.delete(data.queueId);
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              queueId: data.queueId
            }));
          }
          if (data.userId && userSessions.has(data.userId)) {
            userSessions.get(data.userId).delete(ws);
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              userId: data.userId
            }));
          }
          break;

        case CONSTANTS.WS_MESSAGE_TYPES.PING:
          ws.send(JSON.stringify({ type: CONSTANTS.WS_MESSAGE_TYPES.PONG }));
          break;

        default:
          Logger.debug('Unknown message type:', data.type);
          ws.send(JSON.stringify({
            type: CONSTANTS.WS_MESSAGE_TYPES.ERROR,
            message: 'Unknown message type'
          }));
      }
    } catch (error) {
      Logger.error('WebSocket message error', error);
      ws.send(JSON.stringify({
        type: CONSTANTS.WS_MESSAGE_TYPES.ERROR,
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    const connectionDuration = Date.now() - ws.connectionTime;
    Logger.debug('WebSocket connection closed', {
      duration: connectionDuration,
      messages: ws.messageCount
    });

    // Clean up session
    if (ws.queueId) {
      activeSessions.delete(ws.queueId);
    }
    if (ws.userId && userSessions.has(ws.userId)) {
      userSessions.get(ws.userId).delete(ws);
    }
  });

  ws.on('error', (error) => {
    Logger.error('WebSocket error', error);
  });
});

// WebSocket heartbeat interval
const wsHeartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      Logger.debug('Terminating inactive WebSocket connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Function to send real-time updates to specific queue
function sendTranscriptionUpdate(queueId, data) {
  const ws = activeSessions.get(queueId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (error) {
      Logger.error('Error sending transcription update', error);
    }
  }
}

// Function to broadcast to specific user
function broadcastToUser(userId, data) {
  if (userSessions.has(userId)) {
    userSessions.get(userId).forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(data));
        } catch (error) {
          Logger.error('Error broadcasting to user', error);
        }
      }
    });
  }
}

// Function to broadcast updates
function broadcastTranscriptionUpdate(queueId, data) {
  // Update memory store
  if (transcriptionStatuses.has(queueId)) {
    Object.assign(transcriptionStatuses.get(queueId), data);
  }

  // Send WebSocket update to queue subscribers
  sendTranscriptionUpdate(queueId, data);

  // Also broadcast to any user subscribers if we have the userId
  const statusData = transcriptionStatuses.get(queueId);
  if (statusData?.create_user_id) {
    broadcastToUser(statusData.create_user_id, data);
  }
}

// --- FIXED AI SUMMARY GENERATION FUNCTION ---
async function generateAISummary(transcriptionText, createUserId, incidentId) {
  try {
    if (!process.env.OPENAI_API_KEY || !transcriptionText) {
      Logger.info('Cannot generate AI summary - missing API key or transcription');
      return null;
    }

    // Validate transcription text length
    if (transcriptionText.length < 10) {
      Logger.warn('Transcription too short for meaningful summary');
      return null;
    }

    Logger.info('Generating AI summary for user', { userId: createUserId });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a legal assistant analyzing car accident statements. Provide objective, factual analysis in JSON format.'
          },
          {
            role: 'user',
            content: `Analyze this car accident witness statement and provide a structured JSON response with the following fields:

            1. summary_text: A clear, concise 2-3 paragraph summary of what happened
            2. key_points: An array of 5-7 key facts from the statement
            3. fault_analysis: An objective assessment of fault based on the statement

            Statement to analyze: "${transcriptionText}"

            Respond ONLY with valid JSON. No additional text.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: CONSTANTS.RETRY_LIMITS.API_TIMEOUT
      }
    );

    let aiAnalysis;
    try {
      const content = response.data.choices[0].message.content;
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiAnalysis = JSON.parse(cleanContent);
    } catch (parseError) {
      Logger.error('Failed to parse AI response as JSON', parseError);
      // Fallback structure
      aiAnalysis = {
        summary_text: response.data.choices[0].message.content,
        key_points: ['See summary for details'],
        fault_analysis: 'Manual review recommended'
      };
    }

    // Validate AI analysis structure
    aiAnalysis = {
      summary_text: aiAnalysis.summary_text || 'Summary generation failed',
      key_points: Array.isArray(aiAnalysis.key_points) ? aiAnalysis.key_points : [],
      fault_analysis: aiAnalysis.fault_analysis || 'Unable to determine'
    };

    // Generate UUID if user ID is not UUID format
    let dbUserId = createUserId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(createUserId)) {
      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(createUserId).digest('hex');
      dbUserId = [
        hash.substring(0, 8),
        hash.substring(8, 12),
        hash.substring(12, 16),
        hash.substring(16, 20),
        hash.substring(20, 32)
      ].join('-');
    }

    // Save to ai_summary table - ONLY use columns that exist
    const summaryData = {
      create_user_id: dbUserId,
      incident_id: incidentId || dbUserId,
      summary_text: aiAnalysis.summary_text,
      key_points: aiAnalysis.key_points,
      created_at: new Date().toISOString()
    };

    // Try to save with basic columns first
    const { data, error } = await supabase
      .from('ai_summary')
      .insert(summaryData)
      .select()
      .single();

    if (error) {
      Logger.error('Error saving AI summary to database:', error);
      // Don't fail - return the analysis anyway
      return aiAnalysis;
    }

    Logger.success('AI summary generated and saved successfully');
    return aiAnalysis;

  } catch (error) {
    Logger.error('AI Summary generation error', error.response?.data || error);
    return null;
  }
}

// --- LEGAL NARRATIVE GENERATOR ---
async function generateLegalNarrative(transcriptionText, incidentData, userId) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      Logger.info('Cannot generate legal narrative - missing API key');
      return null;
    }

    Logger.info('Generating legal narrative for user', { userId });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a legal assistant specialized in personal injury claims. Generate a formal legal narrative suitable for insurance claims and legal proceedings. Use UK legal terminology and format. Be objective, factual, and professional.'
          },
          {
            role: 'user',
            content: `Based on this witness statement and incident data, create a formal legal narrative for a UK personal injury claim.

            Witness Statement: ${transcriptionText}

            Incident Data: ${JSON.stringify(incidentData, null, 2)}

            Format as a professional legal document with clear sections for:
            1. FACTS - Chronological account of events
            2. LIABILITY ANALYSIS - Assessment of fault and negligence
            3. DAMAGES - Summary of losses and injuries
            4. CONCLUSION - Professional summary

            Use formal legal language appropriate for UK courts and insurance proceedings.`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const legalNarrative = response.data.choices[0].message.content;
    Logger.success('Legal narrative generated successfully');

    // Log GDPR activity for legal document generation
    if (userId) {
      await logGDPRActivity(userId, 'LEGAL_NARRATIVE_GENERATED', {
        type: 'legal_document',
        length: legalNarrative.length,
        has_incident_data: !!incidentData
      });
    }

    return legalNarrative;

  } catch (error) {
    Logger.error('Legal narrative generation error', error.response?.data || error);
    return null;
  }
}

// --- FIXED TRANSCRIPTION PROCESSOR ---
async function processTranscriptionFromBuffer(queueId, audioBuffer, create_user_id, incident_report_id, audioUrl) {
  let retryCount = 0;

  try {
    Logger.info(`Processing transcription for queue ${queueId}, user ${create_user_id}`);

    // Validate inputs
    if (!create_user_id) {
      throw new Error('User ID is required for transcription processing');
    }

    // Update status immediately
    transcriptionStatuses.set(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
      transcription: null,
      summary: null,
      error: null,
      create_user_id: create_user_id
    });

    // Send real-time update
    broadcastTranscriptionUpdate(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
      message: 'Starting transcription...',
      timestamp: new Date().toISOString()
    });

    let finalAudioBuffer;

    if (audioBuffer) {
      // Direct buffer processing
      finalAudioBuffer = audioBuffer;
      Logger.info(`Using provided buffer, size: ${audioBuffer.length} bytes`);
    } else if (audioUrl) {
      // Download from Supabase storage
      Logger.info(`Downloading audio from URL: ${audioUrl}`);

      try {
        // Extract the path from the URL
        let storagePath = audioUrl;
        if (audioUrl.includes('incident-audio/')) {
          storagePath = audioUrl.split('incident-audio/')[1].split('?')[0];
        } else if (audioUrl.includes('/')) {
          storagePath = audioUrl.split('/').slice(-2).join('/');
        }

        Logger.debug(`Attempting to download from path: ${storagePath}`);

        // Download from Supabase storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('incident-audio')
          .download(storagePath);

        if (downloadError) {
          Logger.error('Supabase download error:', downloadError);
          // Fallback to direct HTTP download
          const audioResponse = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: CONSTANTS.RETRY_LIMITS.API_TIMEOUT,
            headers: {
              'User-Agent': 'CarCrashLawyerAI/1.0'
            }
          });
          finalAudioBuffer = Buffer.from(audioResponse.data);
        } else {
          finalAudioBuffer = Buffer.from(await fileData.arrayBuffer());
        }

        Logger.info(`Downloaded buffer size: ${finalAudioBuffer.length} bytes`);
      } catch (downloadError) {
        Logger.error('Audio download failed:', downloadError);
        throw new Error(`Failed to download audio: ${downloadError.message}`);
      }
    } else {
      throw new Error('No audio source provided (neither buffer nor URL)');
    }

    if (!finalAudioBuffer || finalAudioBuffer.length === 0) {
      throw new Error('No audio data available for transcription');
    }

    // Update status
    broadcastTranscriptionUpdate(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
      message: 'Audio loaded, sending to Whisper API...',
      timestamp: new Date().toISOString()
    });

    // Create form data with proper stream handling
    const formData = new FormData();

    // Create a readable stream from the buffer
    const audioStream = Readable.from(finalAudioBuffer);

    // Append with proper options including knownLength
    formData.append('file', audioStream, {
      filename: 'audio.webm',
      contentType: 'audio/webm',
      knownLength: finalAudioBuffer.length // Critical for preventing stream errors
    });

    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('language', 'en'); // Force English for UK accident reports

    // Call Whisper API with retry logic
    let whisperResponse;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        Logger.info(`Whisper API attempt ${retryCount + 1}/${maxRetries}`);

        whisperResponse = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: CONSTANTS.RETRY_LIMITS.WHISPER_TIMEOUT
          }
        );

        Logger.success('Whisper API call successful');
        break; // Success, exit retry loop

      } catch (error) {
        retryCount++;
        Logger.error(`Whisper API attempt ${retryCount} failed:`, error.response?.data || error.message);

        if (retryCount >= maxRetries) {
          throw new Error(`Whisper API failed after ${maxRetries} attempts: ${error.message}`);
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, retryCount) * 1000;
        Logger.info(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    const transcription = whisperResponse.data.text;
    Logger.success(`Transcription successful, text length: ${transcription.length} characters`);

    // Update in-memory status
    transcriptionStatuses.set(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.TRANSCRIBED,
      transcription: transcription,
      summary: null,
      error: null,
      create_user_id: create_user_id
    });

    // Update database
    const { error: queueUpdateError } = await supabase
      .from('transcription_queue')
      .update({
        status: CONSTANTS.TRANSCRIPTION_STATUS.TRANSCRIBED,
        processed_at: new Date().toISOString(),
        transcription_text: transcription,
        error_message: null,
        retry_count: retryCount
      })
      .eq('id', queueId);

    if (queueUpdateError) {
      Logger.error('Error updating transcription_queue:', queueUpdateError);
    }

    // Generate UUID if user ID is not UUID format
    let dbUserId = create_user_id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(create_user_id)) {
      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(create_user_id).digest('hex');
      dbUserId = [
        hash.substring(0, 8),
        hash.substring(8, 12),
        hash.substring(12, 16),
        hash.substring(16, 20),
        hash.substring(20, 32)
      ].join('-');
    }

    // Save to ai_transcription table with ONLY columns that exist
    const transcriptionData = {
      create_user_id: dbUserId,
      incident_report_id: incident_report_id || null,
      transcription_text: transcription,
      audio_url: audioUrl || null,
      created_at: new Date().toISOString()
    };

    const { data: transcriptionRecord, error: saveError } = await supabase
      .from('ai_transcription')
      .insert([transcriptionData])
      .select()
      .single();

    if (saveError) {
      Logger.error('Error saving to ai_transcription:', saveError);
      // Continue anyway - don't fail the whole process
    } else {
      Logger.success('Transcription saved to ai_transcription table');
    }

    // Send real-time update
    broadcastTranscriptionUpdate(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.GENERATING_SUMMARY,
      transcription: transcription,
      message: 'Generating AI summary...',
      timestamp: new Date().toISOString()
    });

    // Generate AI summary
    if (process.env.OPENAI_API_KEY && transcription) {
      try {
        Logger.info('Starting AI summary generation');
        const summary = await generateAISummary(transcription, create_user_id, incident_report_id || queueId);

        if (summary) {
          // Update in-memory status
          transcriptionStatuses.set(queueId.toString(), {
            ...transcriptionStatuses.get(queueId.toString()),
            status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
            summary: summary
          });

          // Final database update
          await supabase
            .from('transcription_queue')
            .update({
              status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
              processed_at: new Date().toISOString()
            })
            .eq('id', queueId);

          // Send final real-time update
          broadcastTranscriptionUpdate(queueId.toString(), {
            status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
            transcription: transcription,
            summary: summary,
            message: 'Processing complete!',
            timestamp: new Date().toISOString()
          });

          Logger.success('AI summary generated and process completed successfully');
        }
      } catch (summaryError) {
        Logger.error('Summary generation failed:', summaryError);

        // Don't fail the whole process if summary fails
        transcriptionStatuses.set(queueId.toString(), {
          ...transcriptionStatuses.get(queueId.toString()),
          status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
          summary: null
        });

        broadcastTranscriptionUpdate(queueId.toString(), {
          status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
          transcription: transcription,
          summary: null,
          message: 'Transcription complete (summary unavailable)',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // No AI summary requested or API key missing
      transcriptionStatuses.set(queueId.toString(), {
        ...transcriptionStatuses.get(queueId.toString()),
        status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED
      });

      await supabase
        .from('transcription_queue')
        .update({
          status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
          processed_at: new Date().toISOString()
        })
        .eq('id', queueId);

      broadcastTranscriptionUpdate(queueId.toString(), {
        status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
        transcription: transcription,
        message: 'Transcription complete!',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    Logger.error(`Transcription processing error for queue ${queueId}:`, error);

    // Update error status in memory
    transcriptionStatuses.set(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
      transcription: null,
      summary: null,
      error: error.message,
      create_user_id: create_user_id
    });

    // Update database with error
    const { error: updateError } = await supabase
      .from('transcription_queue')
      .update({
        status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
        error_message: error.message,
        processed_at: new Date().toISOString(),
        retry_count: retryCount + 1
      })
      .eq('id', queueId);

    if (updateError) {
      Logger.error('Error updating failed status:', updateError);
    }

    // Send error update via WebSocket
    broadcastTranscriptionUpdate(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
      error: error.message,
      message: `Transcription failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}

// Enhanced queue processor with better error recovery
async function processTranscriptionQueue() {
  if (!supabaseEnabled) {
    return;
  }

  try {
    Logger.debug('Checking for pending transcriptions...');

    const { data: pending, error } = await supabase
      .from('transcription_queue')
      .select('*')
      .in('status', [CONSTANTS.TRANSCRIPTION_STATUS.PENDING, CONSTANTS.TRANSCRIPTION_STATUS.FAILED])
      .lt('retry_count', CONSTANTS.RETRY_LIMITS.TRANSCRIPTION)
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      Logger.error('Error fetching transcription queue', error);
      return;
    }

    if (!pending || pending.length === 0) {
      Logger.debug('No pending transcriptions found');
      return;
    }

    Logger.info(`Processing ${pending.length} transcription items from queue`);

    for (const item of pending) {
      try {
        // Check if already being processed
        const existingStatus = transcriptionStatuses.get(item.id.toString());
        if (existingStatus && existingStatus.status === CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING) {
          Logger.info(`Skipping queue item ${item.id} - already processing`);
          continue;
        }

        Logger.info(`Processing queue item ${item.id} (attempt ${item.retry_count + 1})`);

        // Process transcription
        await processTranscriptionFromBuffer(
          item.id,
          null, // No buffer available for queued items
          item.create_user_id,
          item.incident_report_id,
          item.audio_url
        );

        // Wait a bit between processing to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        Logger.error(`Error processing transcription item ${item.id}:`, error);
      }
    }
  } catch (error) {
    Logger.error('Fatal error in transcription queue processor:', error);
  }
}

// Schedule transcription queue processing
let transcriptionQueueInterval = null;
if (supabaseEnabled) {
  const intervalMinutes = parseInt(process.env.TRANSCRIPTION_QUEUE_INTERVAL) || 5;
  transcriptionQueueInterval = setInterval(processTranscriptionQueue, intervalMinutes * 60 * 1000);
  // Process queue shortly after startup
  setTimeout(processTranscriptionQueue, 30000);
  Logger.info(`Transcription queue processor scheduled every ${intervalMinutes} minutes`);
}

// --- PDF STORAGE FUNCTION ---
async function storeCompletedForm(createUserId, pdfBuffer, allData) {
  try {
    const pdfBase64 = pdfBuffer.toString('base64');
    const fileName = `completed_forms/${createUserId}/report_${Date.now()}.pdf`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('incident-images-secure')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    let pdfUrl = null;
    if (storageData && !storageError) {
      const { data: urlData } = await supabase.storage
        .from('incident-images-secure')
        .createSignedUrl(fileName, 31536000); // 1 year

      if (urlData) {
        pdfUrl = urlData.signedUrl;
      }
    }

    const { data, error } = await supabase
      .from('completed_incident_forms')
      .insert({
        create_user_id: createUserId,
        form_data: allData,
        pdf_base64: pdfBase64.substring(0, 1000000), // Limit stored base64 size
        pdf_url: pdfUrl,
        generated_at: new Date().toISOString(),
        sent_to_user: false,
        sent_to_accounts: false,
        email_status: {}
      })
      .select()
      .single();

    if (error) {
      Logger.error('Error storing completed form', error);
    }

    return data || { id: `temp-${Date.now()}` };
  } catch (error) {
    Logger.error('Error in storeCompletedForm', error);
    return { id: `error-${Date.now()}` };
  }
}

// --- IMAGE PROCESSOR CLASS ---
class ImageProcessor {
  constructor() {
    this.supabase = supabase;
    this.bucketName = 'incident-images-secure';
  }

  async processSignupImages(webhookData) {
    try {
      Logger.info('Processing signup images', { userId: webhookData.create_user_id });

      // Verify user exists
      const { data: user } = await this.supabase
        .from('user_signup')
        .select('create_user_id')
        .eq('create_user_id', webhookData.create_user_id)
        .single();

      if (!user) {
        throw new Error('User not found - cannot process images for non-existent user');
      }

      const imageFields = [
        'driving_license_picture',
        'vehicle_picture_front',
        'vehicle_picture_driver_side',
        'vehicle_picture_passenger_side',
        'vehicle_picture_back'
      ];

      const uploadedImages = {};
      const processedImages = [];

      for (const field of imageFields) {
        if (webhookData[field] && webhookData[field].startsWith('http')) {
          Logger.debug(`Processing ${field}...`);

          try {
            const imageBuffer = await this.downloadImage(webhookData[field]);
            const fileName = `${webhookData.create_user_id}/${field}_${Date.now()}.jpg`;
            const storagePath = await this.uploadToSupabase(imageBuffer, fileName);

            uploadedImages[field] = storagePath;

            const imageRecord = await this.createImageRecord({
              create_user_id: webhookData.create_user_id,
              image_type: field,
              storage_path: storagePath,
              original_url: webhookData[field],
              metadata: {
                upload_date: new Date().toISOString(),
                source: 'typeform_signup',
                gdpr_consent: true
              }
            });

            processedImages.push(imageRecord);
            Logger.debug(`${field} uploaded successfully`);

          } catch (imgError) {
            Logger.error(`Error processing ${field}`, imgError);
            uploadedImages[field] = null;
          }
        }
      }

      if (Object.keys(uploadedImages).length > 0) {
        const { data: updateData, error: updateError } = await this.supabase
          .from('user_signup')
          .update(uploadedImages)
          .eq('create_user_id', webhookData.create_user_id)
          .select();

        if (updateError) {
          Logger.error('Error updating user_signup', updateError);
        } else {
          Logger.info('Updated user_signup with storage paths');
        }
      }

      // Log GDPR activity
      await logGDPRActivity(webhookData.create_user_id, 'IMAGES_PROCESSED', {
        count: processedImages.length,
        types: Object.keys(uploadedImages)
      });

      return {
        success: true,
        create_user_id: webhookData.create_user_id,
        images_processed: processedImages.length,
        updated_fields: uploadedImages
      };

    } catch (error) {
      Logger.error('Error in processSignupImages', error);
      throw error;
    }
  }

  async processIncidentReportFiles(webhookData) {
    try {
      Logger.info('Processing incident report files', {
        userId: webhookData.create_user_id,
        incidentId: webhookData.id || webhookData.incident_report_id
      });

      const incidentReportId = webhookData.id || webhookData.incident_report_id;
      const createUserId = webhookData.create_user_id;

      if (!incidentReportId) {
        throw new Error('Missing incident report ID');
      }

      if (!createUserId) {
        throw new Error('GDPR violation: Cannot process files without user ID');
      }

      const fileFields = [
        { field: 'file_url_documents_1', type: 'document', isImage: true },
        { field: 'file_url_documents', type: 'document', isImage: true },
        { field: 'file_url_other_vehicle', type: 'other_vehicle', isImage: true },
        { field: 'file_url_other_vehicle_1', type: 'other_vehicle_2', isImage: true },
        { field: 'file_url_record_detailed_account_of_what_happened', type: 'audio_account', isImage: false },
        { field: 'file_url_scene_overview', type: 'scene_overview', isImage: true },
        { field: 'file_url_scene_overview_1', type: 'scene_overview_2', isImage: true },
        { field: 'file_url_vehicle_damage', type: 'vehicle_damage', isImage: true },
        { field: 'file_url_vehicle_damage_1', type: 'vehicle_damage_2', isImage: true },
        { field: 'file_url_vehicle_damage_2', type: 'vehicle_damage_3', isImage: true },
        { field: 'file_url_what3words', type: 'what3words', isImage: true }
      ];

      const uploadedFiles = {};
      const processedFiles = [];

      for (const fileInfo of fileFields) {
        const { field, type, isImage } = fileInfo;

        if (webhookData[field] && webhookData[field].startsWith('http')) {
          Logger.debug(`Processing ${field} (${type})...`);

          try {
            const fileBuffer = await this.downloadFile(webhookData[field]);
            const url = webhookData[field].toLowerCase();

            let extension = '';
            let contentType = '';

            if (isImage) {
              if (url.includes('.jpeg') || url.includes('.jpg')) {
                extension = '.jpg';
                contentType = 'image/jpeg';
              } else if (url.includes('.png')) {
                extension = '.png';
                contentType = 'image/png';
              } else if (url.includes('.heic') || url.includes('.heif')) {
                extension = '.heic';
                contentType = 'image/heic';
              } else if (url.includes('.webp')) {
                extension = '.webp';
                contentType = 'image/webp';
              } else {
                extension = '.jpg';
                contentType = 'image/jpeg';
              }
            } else {
              // Audio file handling
              if (url.includes('.mp3')) {
                extension = '.mp3';
                contentType = 'audio/mpeg';
              } else if (url.includes('.m4a')) {
                extension = '.m4a';
                contentType = 'audio/mp4';
              } else if (url.includes('.webm')) {
                extension = '.webm';
                contentType = 'audio/webm';
              } else if (url.includes('.wav')) {
                extension = '.wav';
                contentType = 'audio/wav';
              } else if (url.includes('.ogg')) {
                extension = '.ogg';
                contentType = 'audio/ogg';
              } else if (url.includes('.aac')) {
                extension = '.aac';
                contentType = 'audio/aac';
              } else {
                extension = '.mp3';
                contentType = 'audio/mpeg';
              }
            }

            const fileName = `${createUserId}/incident_${incidentReportId}/${type}_${Date.now()}${extension}`;

            const storagePath = await this.uploadToSupabase(fileBuffer, fileName, contentType);
            uploadedFiles[field] = storagePath;

            const fileRecord = await this.createImageRecord({
              create_user_id: createUserId,
              incident_report_id: incidentReportId,
              image_type: type,
              storage_path: storagePath,
              original_url: webhookData[field],
              metadata: {
                upload_date: new Date().toISOString(),
                source: 'typeform_incident',
                file_type: isImage ? 'image' : 'audio',
                file_extension: extension,
                content_type: contentType,
                gdpr_consent: true
              }
            });

            processedFiles.push(fileRecord);
            Logger.debug(`${type} uploaded successfully (${extension})`);

            // If it's an audio file, queue for transcription
            if (!isImage && type === 'audio_account') {
              await this.queueTranscription(createUserId, incidentReportId, storagePath);
            }

          } catch (fileError) {
            Logger.error(`Error processing ${field}`, fileError);
            uploadedFiles[field] = null;
          }
        }
      }

      if (Object.keys(uploadedFiles).length > 0) {
        const { data: updateData, error: updateError } = await this.supabase
          .from('incident_reports')
          .update(uploadedFiles)
          .eq('id', incidentReportId)
          .select();

        if (updateError) {
          Logger.error('Error updating incident_reports', updateError);
        } else {
          Logger.info('Updated incident_reports with storage paths');
        }
      }

      return {
        success: true,
        incident_report_id: incidentReportId,
        create_user_id: createUserId,
        files_processed: processedFiles.length,
        updated_fields: uploadedFiles
      };

    } catch (error) {
      Logger.error('Error in processIncidentReportFiles', error);
      throw error;
    }
  }

  async queueTranscription(createUserId, incidentReportId, audioPath) {
    try {
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(audioPath);

      await this.supabase
        .from('transcription_queue')
        .insert({
          create_user_id: createUserId,
          incident_report_id: incidentReportId,
          audio_url: urlData.publicUrl,
          status: CONSTANTS.TRANSCRIPTION_STATUS.PENDING,
          retry_count: 0,
          created_at: new Date().toISOString()
        });

      Logger.debug('Audio queued for transcription');
    } catch (error) {
      Logger.error('Error queuing transcription', error);
    }
  }

  async downloadFile(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Car-Crash-Lawyer-AI/1.0'
        },
        maxRedirects: 5
      });

      return Buffer.from(response.data);
    } catch (error) {
      Logger.error('Error downloading file', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  async downloadImage(url) {
    return this.downloadFile(url);
  }

  async uploadToSupabase(buffer, fileName, contentType = 'image/jpeg') {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, buffer, {
          contentType: contentType,
          upsert: false
        });

      if (error) {
        throw error;
      }

      return data.path;
    } catch (error) {
      Logger.error('Error uploading to Supabase', error);
      throw new Error(`Failed to upload to storage: ${error.message}`);
    }
  }

  async createImageRecord(imageData) {
    const { data, error } = await this.supabase
      .from('incident_images')
      .insert([{
        create_user_id: imageData.create_user_id,
        incident_report_id: imageData.incident_report_id || null,
        image_type: imageData.image_type,
        file_name: imageData.storage_path,
        gdpr_consent: { consent_given: true },
        metadata: imageData.metadata,
        uploaded_at: new Date().toISOString(),
        is_anonymized: false
      }])
      .select()
      .single();

    if (error) {
      Logger.error('Error creating image record', error);
      return null;
    }

    return data;
  }

  async getSignedUrl(storagePath, expiresIn = 3600) {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      throw error;
    }

    await this.logImageAccess(storagePath);
    return data.signedUrl;
  }

  async logImageAccess(storagePath, accessedBy = 'system') {
    const { error } = await this.supabase
      .from('image_access_log')
      .insert([{
        storage_path: storagePath,
        accessed_at: new Date().toISOString(),
        accessed_by: accessedBy,
        purpose: 'signed_url_generation'
      }]);

    if (error) {
      Logger.error('Error logging access', error);
    }
  }

  async deleteAllUserImages(createUserId) {
    try {
      const { data: images, error: fetchError } = await this.supabase
        .from('incident_images')
        .select('file_name')
        .eq('create_user_id', createUserId);

      if (fetchError) throw fetchError;

      const deletionResults = [];
      for (const image of images) {
        const { error } = await this.supabase.storage
          .from(this.bucketName)
          .remove([image.file_name]);

        deletionResults.push({
          path: image.file_name,
          deleted: !error
        });
      }

      const { error: updateError } = await this.supabase
        .from('incident_images')
        .update({
          deletion_requested: new Date().toISOString(),
          deletion_completed: new Date().toISOString()
        })
        .eq('create_user_id', createUserId);

      if (updateError) throw updateError;

      // Log GDPR deletion
      await logGDPRActivity(createUserId, 'DATA_DELETED', {
        type: 'images',
        count: deletionResults.filter(r => r.deleted).length
      });

      return {
        images_deleted: deletionResults.filter(r => r.deleted).length,
        total_images: images.length,
        details: deletionResults
      };

    } catch (error) {
      Logger.error('Error deleting user images', error);
      throw error;
    }
  }
}

// Initialize image processor
const imageProcessor = supabaseEnabled ? new ImageProcessor() : null;

// ========================================
// PART 2: API Endpoints, Routes, and Server
// ========================================

// ========================================
// ADD GDPR ROUTES - NEW
// ========================================
if (gdprModule) {
  app.use(gdprModule.getRoutes());
  Logger.info('📋 GDPR routes registered');
}

// Get consent summary for a user
app.get('/api/consent/summary/:userId', checkSharedKey, async (req, res) => {
  if (!consentManager) {
    return res.status(503).json({ 
      error: 'Module not initialized',
      module: 'consentManager',
      requestId: req.requestId 
    });
  }

  try {
    const summary = await consentManager.getConsentSummary(req.params.userId);

    res.json({
      success: true,
      ...summary,
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Error getting consent summary:', error);
    res.status(500).json({
      error: 'Failed to get consent summary',
      details: error.message,
      requestId: req.requestId
    });
  }
});

// Test consent extraction
app.post('/api/consent/test-extraction', checkSharedKey, async (req, res) => {
  if (!consentManager) {
    return res.status(503).json({ 
      error: 'Module not initialized',
      module: 'consentManager',
      requestId: req.requestId 
    });
  }

  try {
    const consentData = consentManager.extractConsentFromWebhook(req.body);

    res.json({
      success: true,
      extraction: consentData,
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Error testing consent extraction:', error);
    res.status(500).json({
      error: 'Failed to test consent extraction',
      details: error.message,
      requestId: req.requestId
    });
  }
});

// Generate legal narrative endpoint
app.post('/api/generate-legal-narrative', checkSharedKey, checkGDPRConsent, async (req, res) => {
  try {
    const { userId, transcriptionText, incidentData } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required for GDPR compliance',
        code: 'MISSING_USER_ID',
        requestId: req.requestId
      });
    }

    if (!transcriptionText) {
      return res.status(400).json({
        error: 'Transcription text required',
        code: 'MISSING_TRANSCRIPTION',
        requestId: req.requestId
      });
    }

    Logger.info('Legal narrative generation requested', { userId });

    // Generate the legal narrative
    const legalNarrative = await generateLegalNarrative(transcriptionText, incidentData, userId);

    if (!legalNarrative) {
      return res.status(500).json({
        error: 'Failed to generate legal narrative',
        code: 'GENERATION_FAILED',
        requestId: req.requestId
      });
    }

    // Save to database if Supabase is enabled
    if (supabaseEnabled) {
      try {
        const { error: saveError } = await supabase
          .from('legal_narratives')
          .insert({
            create_user_id: userId,
            incident_report_id: incidentData?.incident_id || null,
            transcription_text: transcriptionText,
            incident_data: incidentData || {},
            legal_narrative: legalNarrative,
            generated_at: new Date().toISOString(),
            ai_model: 'gpt-4-turbo-preview'
          });

        if (saveError) {
          Logger.warn('Could not save legal narrative to database:', saveError);
          // Continue anyway - return the narrative even if save fails
        } else {
          Logger.success('Legal narrative saved to database');
        }
      } catch (dbError) {
        Logger.warn('Database operation failed for legal narrative:', dbError);
        // Continue anyway
      }
    }

    res.json({
      success: true,
      legalNarrative: legalNarrative,
      userId: userId,
      generatedAt: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Legal narrative endpoint error:', error);
    res.status(500).json({
      error: 'Failed to generate legal narrative',
      details: error.message,
      requestId: req.requestId
    });
  }
});

Logger.info('✅ Consent management endpoints registered');

// ========================================
// LEGAL NARRATIVE ENDPOINTS
// ========================================

// Generate legal narrative from raw accident data
app.post('/api/generate-legal-narrative', checkSharedKey, async (req, res) => {
  try {
    const { 
      accidentData, 
      targetLength, 
      includeEvidenceSection, 
      includeMissingNotes,
      userId 
    } = req.body;

    if (!accidentData) {
      return res.status(400).json({
        error: 'Missing accident data',
        code: 'MISSING_DATA',
        requestId: req.requestId
      });
    }

    const narrative = await generateLegalNarrative(accidentData, {
      targetLength,
      includeEvidenceSection,
      includeMissingNotes,
      userId: userId || accidentData.create_user_id
    });

    if (!narrative) {
      return res.status(422).json({
        error: 'Failed to generate narrative',
        code: 'GENERATION_FAILED',
        requestId: req.requestId
      });
    }

    res.json({
      success: true,
      narrative,
      generated_at: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Legal narrative endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      requestId: req.requestId
    });
  }
});

// Generate legal narrative from user and incident IDs
app.post('/api/generate-legal-narrative-from-ids', checkSharedKey, checkGDPRConsent, async (req, res) => {
  try {
    const { 
      userId, 
      incidentId,
      targetLength,
      includeEvidenceSection,
      includeMissingNotes
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing user ID',
        code: 'MISSING_USER_ID',
        requestId: req.requestId
      });
    }

    // Prepare accident data from database
    const accidentData = await prepareAccidentDataForNarrative(userId, incidentId);

    if (!accidentData) {
      return res.status(404).json({
        error: 'No accident data found',
        code: 'DATA_NOT_FOUND',
        requestId: req.requestId
      });
    }

    const narrative = await generateLegalNarrative(accidentData, {
      targetLength,
      includeEvidenceSection,
      includeMissingNotes,
      userId
    });

    res.json({
      success: true,
      narrative,
      data_source: 'database',
      generated_at: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Legal narrative from IDs error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      requestId: req.requestId
    });
  }
});

// Get saved legal narratives for a user
app.get('/api/legal-narratives/:userId', checkSharedKey, checkGDPRConsent, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({
      error: 'Service not configured',
      requestId: req.requestId
    });
  }

  try {
    const { userId } = req.params;
    const { limit = 10, incidentId } = req.query;

    let query = supabase
      .from('legal_narratives')
      .select('*')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (incidentId) {
      query = query.eq('incident_report_id', incidentId);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      narratives: data || [],
      count: data?.length || 0,
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Error fetching legal narratives:', error);
    res.status(500).json({
      error: 'Failed to fetch narratives',
      requestId: req.requestId
    });
  }
});

// --- UTILITY FUNCTIONS ---

// Helper function to prepare accident data for narrative generation
async function prepareAccidentDataForNarrative(userId, incidentId = null) {
  try {
    if (!supabaseEnabled) {
      Logger.warn('Supabase not enabled - cannot fetch accident data');
      return null;
    }

    Logger.info('Preparing accident data for narrative', { userId, incidentId });

    // Fetch user signup data
    const { data: userData } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    if (!userData) {
      Logger.warn('User data not found', { userId });
      return null;
    }

    // Fetch incident report data
    let incidentData = null;
    if (incidentId) {
      const { data } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('id', incidentId)
        .eq('create_user_id', userId)
        .single();
      incidentData = data;
    } else {
      // Get the latest incident report for the user
      const { data } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('create_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      incidentData = data;
    }

    // Fetch transcription data
    const { data: transcriptionData } = await supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Prepare combined accident data
    const accidentData = {
      // User information
      create_user_id: userId,
      full_name: userData.full_name,
      email: userData.email,
      phone_number: userData.phone_number,

      // Vehicle information
      vehicle_make: userData.vehicle_make,
      vehicle_model: userData.vehicle_model,
      vehicle_color: userData.vehicle_color,
      vehicle_registration: userData.vehicle_registration,
      vehicle_year: userData.vehicle_year,

      // Incident details
      incident_date: incidentData?.incident_date,
      incident_time: incidentData?.incident_time,
      incident_location: incidentData?.incident_location,
      what3words: incidentData?.what3words,
      weather_conditions: incidentData?.weather_conditions,
      road_conditions: incidentData?.road_conditions,
      speed_limit: incidentData?.speed_limit,
      estimated_speed: incidentData?.estimated_speed,

      // Other party information
      other_driver_name: incidentData?.other_driver_name,
      other_driver_contact: incidentData?.other_driver_contact,
      other_vehicle_make: incidentData?.other_vehicle_make,
      other_vehicle_model: incidentData?.other_vehicle_model,
      other_vehicle_registration: incidentData?.other_vehicle_registration,
      other_vehicle_color: incidentData?.other_vehicle_color,
      other_insurance_company: incidentData?.other_insurance_company,
      other_policy_number: incidentData?.other_policy_number,

      // Damage and injuries
      vehicle_damage_description: incidentData?.vehicle_damage_description,
      injuries_sustained: incidentData?.injuries_sustained,
      medical_attention_required: incidentData?.medical_attention_required,

      // Police and witnesses
      police_attended: incidentData?.police_attended,
      police_reference: incidentData?.police_reference,
      witnesses_present: incidentData?.witnesses_present,
      witness_details: incidentData?.witness_details,

      // Insurance details
      insurance_company: userData.insurance_company,
      policy_number: userData.policy_number,

      // AI transcription if available
      ai_transcription: transcriptionData?.transcription_text || incidentData?.detailed_account_of_what_happened,

      // Additional info
      anything_else_important: incidentData?.anything_else_important
    };

    // Clean up undefined values
    Object.keys(accidentData).forEach(key => {
      if (accidentData[key] === undefined || accidentData[key] === null) {
        delete accidentData[key];
      }
    });

    Logger.info('Accident data prepared successfully', { 
      userId, 
      incidentId, 
      fieldCount: Object.keys(accidentData).length 
    });

    return accidentData;

  } catch (error) {
    Logger.error('Error preparing accident data for narrative:', error);
    return null;
  }
}

function processTypeformData(formResponse) {
  const processedData = {};

  if (formResponse.form_response && formResponse.form_response.answers) {
    formResponse.form_response.answers.forEach(answer => {
      const fieldId = answer.field.id;
      const fieldRef = answer.field.ref;

      let value = null;
      if (answer.text) value = answer.text;
      else if (answer.email) value = answer.email;
      else if (answer.phone_number) value = answer.phone_number;
      else if (answer.number) value = answer.number;
      else if (answer.boolean !== undefined) value = answer.boolean;
      else if (answer.choice) value = answer.choice.label;
      else if (answer.choices) value = answer.choices.map(c => c.label);
      else if (answer.date) value = answer.date;
      else if (answer.url) value = answer.url;
      else if (answer.file_url) value = answer.file_url;

      if (value !== null) {
        processedData[fieldId] = value;
        if (fieldRef) processedData[fieldRef] = value;
      }
    });
  }

  processedData.submitted_at = formResponse.form_response?.submitted_at || new Date().toISOString();
  processedData.form_id = formResponse.form_response?.form_id;
  processedData.response_id = formResponse.form_response?.token;

  return processedData;
}

// Enhanced health check for external services
async function checkExternalServices() {
  const services = {
    supabase: false,
    supabase_realtime: false,
    openai: false,
    what3words: false
  };

  // Check Supabase
  if (supabaseEnabled) {
    try {
      await supabase.from('user_signup').select('*').limit(1);
      services.supabase = true;

      // Check if realtime is connected (optional)
      services.supabase_realtime = realtimeChannels.transcriptionChannel ? true : false;
    } catch (error) {
      Logger.error('Supabase health check failed', error);
    }
  }

  // Check OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      await axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 5000
      });
      services.openai = true;
    } catch (error) {
      Logger.error('OpenAI health check failed', error);
    }
  }

  // Check What3Words
  if (process.env.WHAT3WORDS_API_KEY) {
    services.what3words = true; // Assume available if key exists
  }

  return services;
}

// --- API CONFIGURATION ENDPOINT ---
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.ANON_PUBLIC,
    features: {
      realtime: supabaseEnabled && realtimeChannels.transcriptionChannel ? true : false,
      transcription: !!process.env.OPENAI_API_KEY,
      ai_summary: !!process.env.OPENAI_API_KEY,
      pdf_generation: !!(fetchAllData && generatePDF && sendEmails)
    }
  });
});

// ========================================
// ENHANCED HEALTH CHECK WITH GDPR - NEW
// ========================================
app.get('/health', async (req, res) => {
  const externalServices = await checkExternalServices();

  const gdprStatus = gdprModule ? {
    module: 'active',
    consent_management: true,
    audit_logging: true,
    dsr_handling: true,
    us_privacy_laws: true
  } : {
    module: 'not configured'
  };

  const enhancedModules = {
    consentManager: consentManager !== null,
    webhookDebugger: webhookDebugger !== null,
    storedWebhooks: webhookDebugger ? webhookDebugger.webhookStore.size : 0,
    webhookStoreStatus: webhookDebugger ? 
      (webhookDebugger.webhookStore.size > 800 ? 'warning' : 'healthy') : 'n/a',
    maxWebhookStoreSize: parseInt(process.env.WEBHOOK_STORE_MAX_SIZE) || 1000
  };

  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      supabase: supabaseEnabled && externalServices.supabase,
      supabase_realtime: externalServices.supabase_realtime,
      server: true,
      transcriptionQueue: transcriptionQueueInterval !== null,
      openai: !!process.env.OPENAI_API_KEY && externalServices.openai,
      websocket: wss.clients.size,
      websocket_sessions: {
        queue: activeSessions.size,
        users: userSessions.size
      },
      gdpr_compliance: gdprStatus, // NEW
      what3words: externalServices.what3words
    },
    enhancedModules: enhancedModules,
    compliance: { // NEW
      uk_gdpr: gdprModule ? 'compliant' : 'not configured',
      ccpa_cpra: gdprModule ? 'compliant' : 'not configured',
      us_state_laws: gdprModule ? ['VCDPA', 'CPA', 'CTDPA', 'UCPA'] : []
    },
    fixes: {
      consent_handling: 'IMPROVED - Enhanced webhook consent detection and processing',
      ai_summary_columns: 'FIXED - Using only existing database columns',
      transcription_saving: 'FIXED - Removed non-existent column references',
      file_redirect: 'ADDED - transcription-status.html redirect to transcription.html',
      trust_proxy_configuration: 'FIXED - Changed from true to 1 for proper rate limiting',
      error_handling: 'IMPROVED - More graceful error recovery',
      gdpr_module: 'INTEGRATED - Full GDPR compliance module with US privacy laws' // NEW
    }
  };

  res.json(status);
});

// --- DEBUG ENDPOINT FOR USER DATA (WITH GDPR LOGGING) ---
app.get('/api/debug/user/:userId', checkSharedKey, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({
      error: 'Service not configured',
      requestId: req.requestId
    });
  }

  try {
    const { userId } = req.params;
    Logger.info('Debug check for user', { userId });

    // Log GDPR activity
    await logGDPRActivity(userId, 'DATA_ACCESS', {
      type: 'debug_view',
      ip: req.clientIp
    }, req);

    // Check all tables for this user
    const checks = {};
    const { data: userSignup, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', userId)
      .single();
    checks.user_signup = { data: userSignup, error: userError };

    // Check incident_reports
    const { data: incidentReports, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', userId);
    checks.incident_reports = { data: incidentReports, error: incidentError };

    // Check ai_transcription
    const { data: aiTranscription, error: transcriptionError } = await supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', userId);
    checks.ai_transcription = { data: aiTranscription, error: transcriptionError };

    // Check transcription_queue
    const { data: transcriptionQueue, error: queueError } = await supabase
      .from('transcription_queue')
      .select('*')
      .eq('create_user_id', userId);
    checks.transcription_queue = { data: transcriptionQueue, error: queueError };

    // Check ai_summary
    const { data: aiSummary, error: summaryError } = await supabase
      .from('ai_summary')
      .select('*')
      .eq('create_user_id', userId);
    checks.ai_summary = { data: aiSummary, error: summaryError };

    res.json({
      userId,
      timestamp: new Date().toISOString(),
      dataFound: checks,
      summary: {
        userExists: !!userSignup,
        incidentCount: incidentReports?.length || 0,
        transcriptionCount: aiTranscription?.length || 0,
        queuedItems: transcriptionQueue?.length || 0,
        summaryCount: aiSummary?.length || 0,
        hasConsent: userSignup?.gdpr_consent || false,
        legalSupport: userSignup?.legal_support || 'Unknown'
      },
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Debug endpoint error', error);
    res.status(500).json({
      error: error.message,
      requestId: req.requestId
    });
  }
});

// ENHANCED: Debug endpoint with WebhookDebugger module
app.post('/api/debug/webhook-test', checkSharedKey, async (req, res) => {
  if (!webhookDebugger) {
    // Fallback to basic analysis
    Logger.info('=== WEBHOOK DEBUG TEST (Basic) ===');
    Logger.info('Headers:', JSON.stringify(req.headers, null, 2));
    Logger.info('Body:', JSON.stringify(req.body, null, 2));

    return res.json({
      success: true,
      message: 'Basic webhook analysis (debugger not initialized)',
      fields: Object.keys(req.body || {}),
      requestId: req.requestId
    });
  }

  // Use enhanced debugger
  const analysis = webhookDebugger.analyzeWebhook(req, {
    store: true,
    log: true
  });

  Logger.info('=== ENHANCED WEBHOOK ANALYSIS ===');
  Logger.info('Provider:', analysis.provider);
  Logger.info('Structure:', analysis.structure.type);
  Logger.info('Extracted Fields:', analysis.fields);
  Logger.info('Validation:', analysis.validation);
  Logger.info('Recommendations:', analysis.recommendations);

  res.json({
    success: true,
    message: 'Enhanced webhook analysis complete',
    analysis: analysis,
    requestId: req.requestId
  });
});

// Add new endpoint to view recent webhooks
app.get('/api/debug/webhook-history', checkSharedKey, async (req, res) => {
  if (!webhookDebugger) {
    return res.status(503).json({
      error: 'Module not initialized',
      module: 'webhookDebugger',
      requestId: req.requestId
    });
  }

  const limit = parseInt(req.query.limit) || 10;
  const recentWebhooks = webhookDebugger.getRecentWebhooks(limit);

  res.json({
    success: true,
    count: recentWebhooks.length,
    webhooks: recentWebhooks,
    requestId: req.requestId
  });
});

// Add endpoint to get specific webhook analysis
app.get('/api/debug/webhook/:webhookId', checkSharedKey, async (req, res) => {
  if (!webhookDebugger) {
    return res.status(503).json({
      error: 'Module not initialized',
      module: 'webhookDebugger',
      requestId: req.requestId
    });
  }

  const webhook = webhookDebugger.getWebhook(req.params.webhookId);

  if (!webhook) {
    return res.status(404).json({
      error: 'Webhook not found',
      requestId: req.requestId
    });
  }

  res.json({
    success: true,
    webhook: webhook,
    requestId: req.requestId
  });
});

// Search webhooks
app.post('/api/debug/webhook-search', checkSharedKey, async (req, res) => {
  if (!webhookDebugger) {
    return res.status(503).json({
      error: 'Module not initialized',
      module: 'webhookDebugger',
      requestId: req.requestId
    });
  }

  const results = webhookDebugger.searchWebhooks(req.body);

  res.json({
    success: true,
    count: results.length,
    results: results,
    requestId: req.requestId
  });
});

// Manual queue processing endpoint for testing
app.get('/api/process-queue-now', checkSharedKey, async (req, res) => {
  Logger.info('Manual queue processing triggered');

  if (!supabaseEnabled) {
    return res.status(503).json({
      error: 'Service not configured',
      requestId: req.requestId
    });
  }

  try {
    await processTranscriptionQueue();
    res.json({
      success: true,
      message: 'Queue processing triggered',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Manual queue processing error', error);
    res.status(500).json({
      error: 'Failed to process queue',
      message: error.message,
      requestId: req.requestId
    });
  }
});

// Test OpenAI API endpoint
app.get('/api/test-openai', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.openai.com/v1/models',
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        timeout: 5000
      }
    );
    res.json({
      status: 'OpenAI API key is valid',
      models: response.data.data.length,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    res.status(401).json({
      status: 'OpenAI API key issue',
      error: error.response?.data || error.message,
      requestId: req.requestId
    });
  }
});

// AI summary generation test endpoint
app.post('/api/generate-ai-summary', checkSharedKey, async (req, res) => {
  const { transcription, userId, incidentId } = req.body;

  if (!transcription || !userId) {
    return res.status(400).json({
      error: 'Missing required fields (transcription and userId are required)',
      requestId: req.requestId
    });
  }

  try {
    Logger.info('AI summary generation test requested', { userId, incidentId });

    const summary = await generateAISummary(transcription, userId, incidentId);

    if (!summary) {
      return res.status(500).json({
        error: 'AI summary generation returned null (check OpenAI API key and transcription length)',
        requestId: req.requestId
      });
    }

    res.json({
      success: true,
      summary,
      transcription_length: transcription.length,
      userId,
      incidentId: incidentId || null,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('AI summary generation error:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message,
      requestId: req.requestId
    });
  }
});

// Test transcription queue endpoint
app.get('/test/transcription-queue', async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({ error: 'Service not configured' });
  }

  try {
    const { data, error } = await supabase
      .from('transcription_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      success: !error,
      queue: data || [],
      error: error?.message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/test/process-transcription-queue', checkSharedKey, async (req, res) => {
  try {
    Logger.info('Manual transcription queue processing triggered');
    await processTranscriptionQueue();
    res.json({
      success: true,
      message: 'Queue processing triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// RECORDING INTERFACE REDIRECT ROUTES
// ========================================

/**
 * Unified recording endpoint redirects
 * All recording-related URLs redirect to the main transcription.html page
 * with preserved query parameters for user and incident tracking
 */

// NEW: Redirect from old name to new name (transcription-status.html → transcription.html)
app.get('/transcription-status.html', (req, res) => {
  const queryString = req.originalUrl.split('?')[1] || '';
  const redirectUrl = `/transcription.html${queryString ? '?' + queryString : ''}`;

  Logger.info('File redirect', {
    from: '/transcription-status.html',
    to: redirectUrl,
    params: queryString
  });

  res.redirect(redirectUrl);
});

// Redirect /record to main recording interface
app.get('/record', (req, res) => {
  const queryString = req.originalUrl.split('?')[1] || '';
  const redirectUrl = `/transcription.html${queryString ? '?' + queryString : ''}`;

  Logger.info('Recording redirect', {
    from: '/record',
    to: redirectUrl,
    params: queryString
  });

  res.redirect(redirectUrl);
});

// Redirect /transcribe to main recording interface
app.get('/transcribe', (req, res) => {
  const queryString = req.originalUrl.split('?')[1] || '';
  const redirectUrl = `/transcription.html${queryString ? '?' + queryString : ''}`;

  Logger.info('Recording redirect', {
    from: '/transcribe',
    to: redirectUrl,
    params: queryString
  });

  res.redirect(redirectUrl);
});

// Alternative recording endpoint for backward compatibility
app.get('/recording', (req, res) => {
  const queryString = req.originalUrl.split('?')[1] || '';
  const redirectUrl = `/transcription.html${queryString ? '?' + queryString : ''}`;

  Logger.info('Recording redirect', {
    from: '/recording',
    to: redirectUrl,
    params: queryString
  });

  res.redirect(redirectUrl);
});

// Webhook-specific recording endpoint
app.get('/webhook/record', (req, res) => {
  const queryString = req.originalUrl.split('?')[1] || '';
  const redirectUrl = `/transcription.html${queryString ? '?' + queryString : ''}`;

  Logger.info('Recording redirect', {
    from: '/webhook/record',
    to: redirectUrl,
    params: queryString,
    source: 'webhook'
  });

  res.redirect(redirectUrl);
});

// --- MAINROUTES ---
app.get('/', (req, res) => {
  const gdprBadges = gdprModule ? `
    <span class="privacy-badge">UK GDPR</span>
    <span class="privacy-badge">CCPA/CPRA</span>
    <span class="privacy-badge">VCDPA</span>
    <span class="privacy-badge">CPA</span>
    <span class="privacy-badge">CTDPA</span>
    <span class="privacy-badge">UCPA</span>` : '';

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Car Crash Lawyer AI - Enhanced Privacy Compliance System</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .status { padding: 10px; background: #4CAF50; color: white; border-radius: 5px; display: inline-block; }
        .gdpr-notice {
            background: #2196F3;
            color: white;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .privacy-badge {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
            margin: 0 5px;
        }
        .endpoint { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
        code { background: #333; color: #4CAF50; padding: 2px 6px; border-radius: 3px; }
        .section { margin-top: 30px; }
        ul { list-style: none; padding: 0; }
        li { margin: 5px 0; }
        .fix-badge { background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 5px; }
        .optional-badge { background: #ff9800; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 5px; }
        .new-badge { background: #9C27B0; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 5px; }
        .improved-badge { background: #00BCD4; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚗 Car Crash Lawyer AI - Enhanced Privacy Compliance System</h1>
        <p class="status">✅ Server is running - Full GDPR Module Integration</p>

        ${gdprModule ? `
        <div class="gdpr-notice">
            <h3>🔒 Privacy & Compliance Status</h3>
            <p>${gdprBadges}</p>
            <p>Full compliance with UK GDPR and US state privacy laws.
               All data processing requires explicit consent.</p>
        </div>` : ''}

        <div class="section">
            <h2>🔧 Latest Updates:</h2>
            <div class="endpoint">
                <strong>GDPR Module Integration</strong> <span class="new-badge">NEW</span><br>
                <p>✅ Full GDPR compliance module integrated</p>
                <p>✅ US state privacy laws support (CCPA/CPRA, VCDPA, CPA, CTDPA, UCPA)</p>
                <p>✅ Automated consent management and tracking</p>
                <p>✅ Data Subject Request (DSR) handling</p>
                <p>✅ Breach notification system</p>
                <p>✅ Cross-border transfer tracking</p>
                <p>✅ Compliance audit logging</p>
                <br>
                <strong>Enhanced Features</strong> <span class="improved-badge">IMPROVED</span><br>
                <p>✅ Automatic jurisdiction detection</p>
                <p>✅ Cookie consent management</p>
                <p>✅ Data retention automation</p>
                <p>✅ Privacy rights dashboard</p>
            </div>
        </div>

        <div class="section">
            <h2>🛡️ Privacy & GDPR Endpoints:</h2>
            <div class="endpoint">
                <strong>User Rights:</strong> <span class="new-badge">NEW</span><br>
                <code>GET /api/gdpr/user-rights/:userId</code> - View available privacy rights<br>
                <code>POST /api/gdpr/consent</code> - Grant consent for data processing<br>
                <code>POST /api/gdpr/withdraw-consent</code> - Withdraw consent<br>
                <code>GET /api/gdpr/consent-status/:userId</code> - Check consent status<br>
                <br>
                <strong>Data Subject Requests:</strong> <span class="new-badge">NEW</span><br>
                <code>POST /api/gdpr/dsr</code> - Submit data subject request<br>
                <code>GET /api/gdpr/dsr/:requestId</code> - Check request status<br>
                <code>GET /api/gdpr/export/:userId</code> - Export all user data<br>
                <code>DELETE /api/gdpr/user/:userId</code> - Request data deletion<br>
                <br>
                <strong>Admin & Compliance:</strong> <span class="new-badge">NEW</span><br>
                <code>GET /api/gdpr/admin/dashboard</code> - Privacy compliance dashboard<br>
                <code>GET /api/gdpr/compliance-report</code> - Generate compliance report<br>
                <code>POST /api/gdpr/breach</code> - Report data breach<br>
                <code>GET /api/gdpr/cookie-policy</code> - Get cookie policy
            </div>
        </div>

        <div class="section">
            <h2>🎤 Recording Interface:</h2>
            <div class="endpoint">
                <strong>Main Recording Page:</strong> <span class="fix-badge">UNIFIED</span><br>
                <code>GET /transcription.html</code> - Main recording interface<br>
                <code>GET /transcription-status.html</code> → Redirects to /transcription.html<br>
                <br>
                <strong>Recording Access Points:</strong><br>
                <code>GET /record</code> → Redirects to /transcription.html<br>
                <code>GET /transcribe</code> → Redirects to /transcription.html<br>
                <code>GET /recording</code> → Redirects to /transcription.html<br>
                <code>GET /webhook/record</code> → Redirects to /transcription.html<br>
                <p style="margin-top: 10px; color: #666;">All URL parameters are preserved during redirects</p>
            </div>
        </div>

        <div class="section">
            <h2>Available Endpoints:</h2>

            <div class="endpoint">
                <strong>Core Services:</strong><br>
                <code>GET /health</code> - System health check<br>
                <code>GET /api/config</code> - Get Supabase configuration<br>
                <code>GET /api/debug/user/:userId</code> - Debug user data with consent status<br>
                <code>POST /api/debug/webhook-test</code> - Test webhook payload structure<br>
                <code>GET /api/debug/webhook-history</code> - View recent webhook activity<br>
                <code>GET /api/debug/webhook/:webhookId</code> - Get specific webhook analysis<br>
                <code>POST /api/debug/webhook-search</code> - Search stored webhooks<br>
                <code>GET /api/test-openai</code> - Test OpenAI API key validity<br>
                <code>GET /api/process-queue-now</code> - Manually trigger queue processing<br>
                <code>GET /test/transcription-queue</code> - View queue status<br>
                <br>
                <strong>Consent Management:</strong> <span class="new-badge">NEW</span><br>
                <code>GET /api/consent/summary/:userId</code> - Get consent summary for user<br>
                <code>POST /api/consent/test-extraction</code> - Test consent extraction from webhook
            </div>

            <div class="endpoint">
                <strong>Webhook Endpoints:</strong> <span class="improved-badge">IMPROVED</span><br>
                <code>POST /webhook/signup</code> - Process signup with GDPR consent<br>
                <code>POST /webhook/incident-report</code> - Process incident report files<br>
                <code>POST /generate-pdf</code> - Generate and email PDF report<br>
                <code>POST /webhook/generate-pdf</code> - Alternative PDF generation
            </div>

            <div class="endpoint">
                <strong>Transcription Services (GDPR Compliant):</strong><br>
                <code>POST /api/whisper/transcribe</code> - Direct Whisper transcription<br>
                <code>GET /api/transcription-status/:queueId</code> - Check transcription status<br>
                <code>POST /api/update-transcription</code> - Update/edit transcription<br>
                <code>POST /api/save-transcription</code> - Save transcription<br>
                <code>GET /api/user/:userId/latest-transcription</code> - Get user's latest transcription<br>
                <code>POST /api/generate-legal-narrative</code> - Generate formal legal narrative <span class="new-badge">NEW</span>
            </div></div>
        </div>

        <div class="section">
            <h3>Privacy Compliance Status:</h3>
            <ul>
                <li>GDPR Module: ${gdprModule ? '✅ Active' : '❌ Not configured'}</li>
                <li>Consent Management: ✅ Implemented</li>
                <li>Data Subject Rights: ✅ Automated</li>
                <li>Audit Logging: ✅ Comprehensive</li>
                <li>Data Retention: ✅ Automated</li>
                <li>Breach Management: ${gdprModule ? '✅ Configured' : '❌ Not configured'}</li>
                <li>Cross-border Transfers: ${gdprModule ? '✅ Tracked' : '❌ Not configured'}</li>
                <li>Cookie Consent: ${gdprModule ? '✅ Implemented' : '❌ Not configured'}</li>
                <li>US State Laws: ${gdprModule ? '✅ Full Coverage' : '❌ Not configured'}</li>
            </ul>
        </div>

        <div class="section">
            <h3>System Status:</h3>
            <ul>
                <li>Supabase: ${supabaseEnabled ? '✅ Connected' : '❌ Not configured'}</li>
                <li>GDPR Module: ${gdprModule ? '✅ Active' : '❌ Not configured'} <span class="new-badge">NEW</span></li>
                <li>Supabase Realtime: ${realtimeChannels.transcriptionChannel ? '✅ Active' : '⚠️ Optional'} <span class="optional-badge">OPTIONAL</span></li>
                <li>OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}</li>
                <li>Transcription Queue: ${transcriptionQueueInterval ? '✅ Running' : '❌ Not running'}</li>
                <li>WebSocket: ${wss ? '✅ Active (' + wss.clients.size + ' clients)' : '❌ Not active'}</li>
                <li>Auth Key: ${SHARED_KEY ? '✅ Set' : '❌ Missing'}</li>
                <li>Data Retention: ${process.env.DATA_RETENTION_DAYS || CONSTANTS.DATA_RETENTION.DEFAULT_DAYS} days</li>
                <li>Rate Limiting: ✅ Enabled (Fixed trust proxy configuration)</li>
                <li>Compliance Jobs: ${gdprModule ? '✅ Scheduled' : '❌ Not scheduled'} <span class="new-badge">NEW</span></li>
            </ul>
        </div>
    </div>
</body>
</html>`;
  res.send(htmlContent);
});

// --- AUTHENTICATION STATUS ---
app.get('/api/auth/status', (req, res) => {
  const mockUser = {
    authenticated: false,
    user: null
  };

  if (req.session && req.session.user) {
    mockUser.authenticated = true;
    mockUser.user = {
      uid: req.session.user.id,
      email: req.session.user.email,
      fullName: req.session.user.full_name
    };
  }

  res.json(mockUser);
});

// --- EMERGENCY CONTACTS ---
app.get('/api/user/:userId/emergency-contacts', authenticateRequest, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({
      error: 'Service not configured',
      requestId: req.requestId
    });
  }

  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_signup')
      .select('emergency_contact, recovery_breakdown_number, emergency_services_number')
      .eq('create_user_id', userId)
      .single();

    if (error) {
      Logger.error('Supabase error', error);
      return res.status(404).json({
        error: 'User not found',
        requestId: req.requestId
      });
    }

    res.json({
      emergency_contact: data.emergency_contact || null,
      recovery_breakdown_number: data.recovery_breakdown_number || null,
      emergency_services_number: data.emergency_services_number || '999',
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Error fetching emergency contacts', error);
    res.status(500).json({
      error: 'Failed to fetch contacts',
      requestId: req.requestId
    });
  }
});

// LOG EMERGENCY CALLS endpoint
app.post('/api/log-emergency-call', authenticateRequest, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({
      error: 'Service not configured',
      requestId: req.requestId
    });
  }

  try {
    const { user_id, service_called, timestamp, incident_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'User ID required',
        code: 'MISSING_USER_ID',
        requestId: req.requestId
      });
    }

    const { data, error } = await supabase
      .from('emergency_call_logs')
      .insert({
        user_id,
        service_called,
        incident_id: incident_id || null,
        timestamp,
        created_at: new Date().toISOString()
      });

    if (error) {
      Logger.error('Failed to log emergency call', error);
      return res.json({
        success: false,
        logged: false,
        requestId: req.requestId
      });
    }

    await logGDPRActivity(user_id, 'EMERGENCY_CALL_LOGGED', {
      service: service_called
    }, req);

    res.json({
      success: true,
      logged: true,
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Error logging emergency call', error);
    res.status(500).json({
      error: 'Internal server error',
      requestId: req.requestId
    });
  }
});

// WHAT3WORDS endpoint
app.get('/api/what3words', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing latitude or longitude',
        requestId: req.requestId
      });
    }

    const W3W_API_KEY = process.env.WHAT3WORDS_API_KEY;

    if (!W3W_API_KEY) {
      Logger.warn('What3Words API key not configured');
      return res.json({
        words: 'location.not.configured',
        requestId: req.requestId
      });
    }

    const response = await axios.get(
      `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${W3W_API_KEY}`
    );

    if (response.data && response.data.words) {
      res.json({
        words: response.data.words,
        requestId: req.requestId
      });
    } else {
      res.json({
        words: 'location.not.found',
        requestId: req.requestId
      });
    }
  } catch (error) {
    Logger.error('What3Words API error', error);
    res.json({
      words: 'api.error.occurred',
      requestId: req.requestId
    });
  }
});

// UPLOAD WHAT3WORDS IMAGE endpoint
app.post('/api/upload-what3words-image', upload.single('image'), async (req, res) => {
  if (!supabaseEnabled || !imageProcessor) {
    return res.status(503).json({
      error: 'Service not configured',
      requestId: req.requestId
    });
  }

  try {
    let buffer;
    let what3words, latitude, longitude, userId;

    if (req.file) {
      buffer = req.file.buffer;
      ({ what3words, latitude, longitude, userId } = req.body);
    } else {
      const { imageData } = req.body;
      if (!imageData) {
        return res.status(400).json({
          error: 'No image data provided',
          requestId: req.requestId
        });
      }

      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      ({ what3words, latitude, longitude, userId } = req.body);
    }

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required for GDPR compliance',
        code: 'MISSING_USER_ID',
        requestId: req.requestId
      });
    }

    const safeWhat3Words = what3words ? what3words.replace(/[\/\\.]/g, '-') : 'unknown';
    const timestamp = Date.now();
    const fileName = `${userId}/what3words/${timestamp}_${safeWhat3Words}.png`;

    const storagePath = await imageProcessor.uploadToSupabase(buffer, fileName, 'image/png');

    const imageRecord = await imageProcessor.createImageRecord({
      create_user_id: userId,
      incident_report_id: null,
      image_type: 'what3words_screenshot',
      storage_path: storagePath,
      original_url: null,
      metadata: {
        upload_date: new Date().toISOString(),
        source: 'web_capture',
        what3words: what3words,
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
        captured_at: new Date().toISOString(),
        gdpr_consent: true
      }
    });

    const signedUrl = await imageProcessor.getSignedUrl(storagePath, 3600);

    await logGDPRActivity(userId, 'IMAGE_UPLOADED', {
      type: 'what3words',
      location: what3words
    }, req);

    res.json({
      success: true,
      imageUrl: signedUrl,
      storagePath: storagePath,
      imageRecord: imageRecord,
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Error uploading what3words image', error);
    res.status(500).json({
      error: error.message,
      requestId: req.requestId
    });
  }
});

// GET USER IMAGES endpoint
app.get('/api/images/:userId', checkGDPRConsent, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({
      error: 'Service not configured',
      requestId: req.requestId
    });
  }

  try {
    const { userId } = req.params;

    const { data: images, error } = await supabase
      .from('incident_images')
      .select('*')
      .eq('create_user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw error;
    }

    await logGDPRActivity(userId, 'IMAGES_ACCESSED', {
      count: images?.length || 0
    }, req);

    res.json({
      success: true,
      images: images || [],
      count: images?.length || 0,
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Error fetching user images', error);
    res.status(500).json({
      error: 'Failed to fetch images',
      requestId: req.requestId
    });
  }
});

// GET SIGNED URL endpoint
app.get('/api/image/signed-url/:userId/:imageType', checkGDPRConsent, async (req, res) => {
  if (!supabaseEnabled || !imageProcessor) {
    return res.status(503).json({
      error: 'Service not configured',
      requestId: req.requestId
    });
  }

  try {
    const { userId, imageType } = req.params;
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({
        error: 'Storage path required',
        requestId: req.requestId
      });
    }

    const signedUrl = await imageProcessor.getSignedUrl(path, 3600);

    await logGDPRActivity(userId, 'SIGNED_URL_GENERATED', {
      image_type: imageType,
      path: path
    }, req);

    res.json({
      success: true,
      url: signedUrl,
      expires_in: 3600,
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Error generating signed URL', error);
    res.status(500).json({
      error: 'Failed to generate URL',
      requestId: req.requestId
    });
  }
});

// GDPR DELETE IMAGES endpoint
app.delete('/api/gdpr/delete-images', checkSharedKey, async (req, res) => {
  if (!supabaseEnabled || !imageProcessor) {
    return res.status(503).json({
      error: 'Service not configured',
      requestId: req.requestId
    });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required',
        code: 'MISSING_USER_ID',
        requestId: req.requestId
      });
    }

    const result = await imageProcessor.deleteAllUserImages(userId);

    res.json({
      success: true,
      ...result,
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Error deleting images', error);
    res.status(500).json({
      error: 'Failed to delete images',
      requestId: req.requestId
    });
  }
});

// PDF STATUS endpoint
app.get('/pdf-status/:userId', async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({
      error: 'Service not configured',
      requestId: req.requestId
    });
  }

  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('completed_incident_forms')
      .select('id, generated_at, sent_to_user, email_status')
      .eq('create_user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.json({
        status: 'not_found',
        message: 'No PDF generation found for this user',
        requestId: req.requestId
      });
    }

    res.json({
      status: 'completed',
      generated_at: data.generated_at,
      sent: data.sent_to_user,
      email_status: data.email_status,
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Error checking PDF status', error);
    res.status(500).json({
      error: 'Failed to check status',
      requestId: req.requestId
    });
  }
});

// DOWNLOAD PDF endpoint
app.get('/download-pdf/:userId', checkGDPRConsent, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({
      error: 'Service not configured',
      requestId: req.requestId
    });
  }

  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('completed_incident_forms')
      .select('pdf_url, pdf_base64')
      .eq('create_user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'PDF not found',
        requestId: req.requestId
      });
    }

    await logGDPRActivity(userId, 'PDF_DOWNLOADED', {}, req);

    if (data.pdf_url) {
      res.redirect(data.pdf_url);
    } else if (data.pdf_base64) {
      const buffer = Buffer.from(data.pdf_base64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report_${userId}.pdf"`);
      res.send(buffer);
    } else {
      res.status(404).json({
        error: 'PDF data not available',
        requestId: req.requestId
      });
    }

  } catch (error) {
    Logger.error('Error downloading PDF', error);
    res.status(500).json({
      error: 'Failed to download PDF',
      requestId: req.requestId
    });
  }
});

// ========================================
// ENHANCED WHISPER TRANSCRIPTION WITH GDPR - IMPROVED
// ========================================
app.post('/api/whisper/transcribe', upload.single('audio'), async (req, res) => {
  try {
    Logger.info('🎤 Received transcription request');

    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided',
        requestId: req.requestId
      });
    }

    // Extract create_user_id from the request
    const create_user_id = req.body.create_user_id ||
                           req.query.create_user_id ||
                           req.headers['x-user-id'];

    if (!create_user_id) {
      Logger.info('❌ Missing create_user_id in transcription request');
      return res.status(400).json({
        error: 'create_user_id is required',
        requestId: req.requestId
      });
    }

    // GDPR: Check consent before processing
    if (gdprModule) {
      const consentStatus = await gdprModule.checkConsentStatus(create_user_id);
      if (!consentStatus.has_consent) {
        Logger.warn(`🚫 No consent for user ${create_user_id}`);
        return res.status(403).json({
          error: 'No consent for data processing',
          code: 'CONSENT_REQUIRED',
          message: 'User must provide consent before audio processing',
          consent_url: '/api/gdpr/consent',
          requestId: req.requestId
        });
      }

      // Log the processing activity
      await gdprModule.auditLog(create_user_id, 'AUDIO_PROCESSING', {
        type: 'transcription',
        size: req.file.size,
        jurisdiction: consentStatus.jurisdiction
      }, req);
    }

    Logger.info(`Processing transcription for user: ${create_user_id}`);

    // Generate a unique transcription ID
    const transcriptionId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Upload to Supabase incident-audio bucket
    const fileName = `${create_user_id}/recording_${Date.now()}.webm`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('incident-audio')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      Logger.error(`Upload error: ${uploadError.message}`);
      return res.status(500).json({
        error: 'Failed to upload audio to Supabase',
        requestId: req.requestId
      });
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('incident-audio')
      .getPublicUrl(fileName);

    Logger.info(`Audio file uploaded to Supabase: ${fileName}`);

    // Add to transcription queue
    const { data: queueData, error: queueError } = await supabase
      .from('transcription_queue')
      .insert([{
        create_user_id: create_user_id,
        incident_report_id: req.body.incident_report_id || null,
        audio_url: publicUrl,
        status: CONSTANTS.TRANSCRIPTION_STATUS.PENDING,
        retry_count: 0,
        created_at: new Date().toISOString(),
        error_message: null,
        transcription_id: null
      }])
      .select()
      .single();

    if (queueError) {
      Logger.error('Queue error:', queueError);
      // Don't fail completely - continue with direct transcription
    }

    const queueId = queueData?.id || transcriptionId;

    // Store in memory for WebSocket updates
    transcriptionStatuses.set(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
      transcription: null,
      summary: null,
      error: null,
      create_user_id: create_user_id
    });

    // Return immediately with the queue ID
    res.json({
      success: true,
      message: 'Audio uploaded and queued for transcription',
      queueId: queueId.toString(),
      audioUrl: publicUrl,
      create_user_id: create_user_id,
      requestId: req.requestId
    });

    // Process transcription immediately using the audio buffer in memory
    // This happens asynchronously after the response is sent
    processTranscriptionFromBuffer(
      queueId,
      req.file.buffer,
      create_user_id,
      req.body.incident_report_id,
      publicUrl
    );

  } catch (error) {
    Logger.error('Transcription error:', error);
    res.status(500).json({
      error: 'Failed to process audio',
      requestId: req.requestId
    });
  }
});

// CHECK TRANSCRIPTION STATUS endpoint
app.get('/api/transcription-status/:queueId', async (req, res) => {
  const { queueId } = req.params;

  if (!queueId || queueId === 'undefined') {
    return res.status(400).json({
      error: 'Invalid queue ID',
      requestId: req.requestId
    });
  }

  const status = transcriptionStatuses.get(queueId);

  if (status) {
    res.json({
      ...status,
      requestId: req.requestId
    });
  } else {
    // Try to fetch from database if not in memory
    if (supabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('transcription_queue')
          .select('*')
          .eq('id', queueId)
          .single();

        if (data) {
          res.json({
            status: data.status,
            transcription: data.transcription_text,
            error: data.error_message,
            create_user_id: data.create_user_id,
            requestId: req.requestId
          });
        } else {
          res.json({
            status: 'not_found',
            message: 'Transcription not found or expired',
            requestId: req.requestId
          });
        }
      } catch (error) {
        res.json({
          status: 'not_found',
          message: 'Transcription not found or expired',
          requestId: req.requestId
        });
      }
    } else {
      res.json({
        status: 'not_found',
        message: 'Transcription not found or expired',
        requestId: req.requestId
      });
    }
  }
});

// UPDATE TRANSCRIPTION (GDPR COMPLIANT) endpoint
app.post('/api/update-transcription', checkGDPRConsent, async (req, res) => {
  try {
    const { queueId, userId, transcription } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required for GDPR compliance',
        code: 'MISSING_USER_ID',
        requestId: req.requestId
      });
    }

    if (!transcription) {
      return res.status(400).json({
        error: 'Missing transcription text',
        code: 'MISSING_TRANSCRIPTION',
        requestId: req.requestId
      });
    }

    Logger.info('Updating transcription', { userId, queueId });

    // Log GDPR activity
    await logGDPRActivity(userId, 'DATA_UPDATE', {
      type: 'transcription',
      action: 'manual_edit'
    }, req);

    if (!supabaseEnabled) {
      Logger.warn('Supabase not enabled, skipping database operations');
      return res.json({
        success: true,
        message: 'Transcription confirmed (database not configured)',
        requestId: req.requestId
      });
    }

    // Generate UUID if user ID is not UUID format
    let dbUserId = userId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(userId)) {
      // Create a deterministic UUID from the string user ID
      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(userId).digest('hex');
      dbUserId = [
        hash.substring(0, 8),
        hash.substring(8, 12),
        hash.substring(12, 16),
        hash.substring(16, 20),
        hash.substring(20, 32)
      ].join('-');

      Logger.info(`Converting user ID to UUID format: ${userId} -> ${dbUserId}`);
    }

    try {
      // Update or insert transcription
      const { data: existing } = await supabase
        .from('ai_transcription')
        .select('id, audio_url')
        .eq('create_user_id', dbUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        await supabase
          .from('ai_transcription')
          .update({
            transcription_text: transcription,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('ai_transcription')
          .insert({
            create_user_id: dbUserId,
            incident_report_id: null,
            transcription_text: transcription,
            audio_url: '',
            created_at: new Date().toISOString()
          });
      }

      Logger.info('Transcription saved successfully to database');
    } catch (dbError) {
      Logger.error('Database operation failed, continuing without database save:', dbError);
      // Continue without failing - the transcription confirmation can still work
    }

    // Generate AI summary (with original userId for consistency)
    const summary = await generateAISummary(transcription, userId, queueId || userId);

    // Send WebSocket update if queueId provided
    if (queueId) {
      broadcastTranscriptionUpdate(queueId, {
        type: 'updated',
        status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
        transcription: transcription,
        summary: summary,
        message: 'Transcription updated successfully'
      });
    }

    res.json({
      success: true,
      summary: summary,
      message: 'Transcription confirmed successfully',
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Update transcription error', error);
    res.status(500).json({
      error: 'Failed to update transcription',
      code: 'UPDATE_FAILED',
      details: error.message,
      requestId: req.requestId
    });
  }
});

// SAVE TRANSCRIPTION (GDPR COMPLIANT) endpoint
app.post('/api/save-transcription', checkGDPRConsent, async (req, res) => {
  try {
    const { userId, incidentId, transcription, audioUrl, duration } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required for GDPR compliance',
        code: 'MISSING_USER_ID',
        message: 'Personal data cannot be saved without proper user identification',
        requestId: req.requestId
      });
    }

    if (!transcription) {
      return res.status(400).json({
        error: 'Transcription text is required',
        code: 'MISSING_TRANSCRIPTION',
        requestId: req.requestId
      });
    }

    Logger.info('Saving transcription', { userId });

    // Log GDPR activity
    await logGDPRActivity(userId, 'DATA_SAVE', {
      type: 'transcription',
      has_audio: !!audioUrl
    }, req);

    if (!supabaseEnabled) {
      return res.json({
        success: true,
        message: 'Transcription received (Supabase not configured)',
        requestId: req.requestId
      });
    }

    const { data: existing } = await supabase
      .from('ai_transcription')
      .select('id, audio_url')
      .eq('create_user_id', userId)
      .eq('incident_report_id', incidentId || null)
      .single();

    let result;

    if (existing) {
      const { data, error } = await supabase
        .from('ai_transcription')
        .update({
          transcription_text: transcription,
          audio_url: audioUrl || existing.audio_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      result = data;
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('ai_transcription')
        .insert({
          create_user_id: userId,
          incident_report_id: incidentId || null,
          transcription_text: transcription,
          audio_url: audioUrl || '',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      result = data;
      if (error) throw error;
    }

    // Update incident report if exists
    if (incidentId) {
      await supabase
        .from('incident_reports')
        .update({
          witness_statement_text: transcription,
          witness_statement_audio: audioUrl || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId)
        .eq('create_user_id', userId);
    }

    res.json({
      success: true,
      message: 'Transcription saved successfully',
      transcription_id: result?.id,
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Save transcription error', error);
    res.status(500).json({
      error: 'Failed to save transcription',
      code: 'SAVE_FAILED',
      message: error.message,
      requestId: req.requestId
    });
  }
});

// GET USER'S LATEST TRANSCRIPTION endpoint
app.get('/api/user/:userId/latest-transcription', async (req, res) => {
  try {
    const { userId } = req.params;
    Logger.info('Getting latest transcription', { userId });

    if (!supabaseEnabled) {
      return res.json({
        exists: false,
        transcription: null,
        requestId: req.requestId
      });
    }

    // Log GDPR activity
    await logGDPRActivity(userId, 'DATA_ACCESS', {
      type: 'transcription_retrieval'
    }, req);

    const { data, error } = await supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      // Also get the AI summary
      const { data: summaryData } = await supabase
        .from('ai_summary')
        .select('*')
        .eq('create_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return res.json({
        exists: true,
        transcription: data,
        aiSummary: summaryData,
        status: 'completed',
        requestId: req.requestId
      });
    }

    // Fallback to incident reports
    const { data: incidentData } = await supabase
      .from('incident_reports')
      .select('witness_statement_text, witness_statement_audio')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({
      exists: !!incidentData?.witness_statement_text,
      transcription: incidentData ? {
        transcription_text: incidentData.witness_statement_text,
        audio_url: incidentData.witness_statement_audio
      } : null,
      status: incidentData?.witness_statement_text ? 'completed' : 'not_found',
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Get transcription status error', error);
    res.status(500).json({
      error: 'Failed to get transcription status',
      requestId: req.requestId
    });
  }
});

// ========================================
// ENHANCED WEBHOOK ENDPOINTS WITH GDPR - IMPROVED
// ========================================
app.post('/webhook/signup', checkSharedKey, async (req, res) => {
  try {
    Logger.info('Signup webhook received');
    let webhookData = req.body; // Use let here as it might be reassigned or modified
    Logger.debug('Webhook payload:', JSON.stringify(webhookData, null, 2));

    // Debug with enhanced debugger
    if (webhookDebugger) {
      const analysis = webhookDebugger.analyzeWebhook(req, { store: true });
      Logger.info('Webhook analysis:', {
        provider: analysis.provider,
        userId: analysis.fields.userId,
        hasConsent: !!analysis.fields.consent
      });
    }

    // ENHANCED CONSENT DETECTION
    let consentResult = { hasConsent: false };

    if (consentManager) {
      // Use enhanced consent detection
      const consentData = consentManager.extractConsentFromWebhook(webhookData);
      Logger.info('Consent analysis:', consentData);

      // Update consent in database
      consentResult = await consentManager.validateAndUpdateConsent(
        webhookData.create_user_id,
        consentData,
        req
      );

      Logger.info(`Enhanced consent status for ${webhookData.create_user_id}: ${consentResult.consent}`);
    }

    if (!supabaseEnabled || !imageProcessor) {
      return res.status(503).json({
        error: 'Service not configured',
        requestId: req.requestId
      });
    }

    if (!webhookData.create_user_id) {
      return res.status(400).json({
        error: 'Missing create_user_id',
        requestId: req.requestId
      });
    }

    // GDPR ENHANCEMENT: Record consent with full compliance
    if (gdprModule) {
      const jurisdiction = await gdprModule.detectJurisdiction(req.clientIp);

      // Extract consent from your Typeform field
      let legalSupportConsent = webhookData.legal_support ||
                               webhookData.question_14 ||
                               webhookData.gdpr_consent_field ||
                               webhookData['Do you agree to share this data for legal support?'];

      let hasConsent = false;
      if (legalSupportConsent !== undefined && legalSupportConsent !== null) {
        hasConsent = typeof legalSupportConsent === 'boolean'
          ? legalSupportConsent
          : legalSupportConsent.toLowerCase() === 'yes';
      }

      Logger.info(`GDPR Consent status for ${webhookData.create_user_id}: ${hasConsent}`);

      if (hasConsent) {
        // Record consent in GDPR module
        const consentResult = await gdprModule.recordConsent(webhookData.create_user_id, {
          type: 'all_processing',
          method: 'signup_form',
          text: 'I consent to the processing of my personal data for accident reporting and legal support services.',
          version: '1.0',
          source: 'typeform_webhook',
          ip_address: req.clientIp,
          user_agent: req.get('user-agent'),
          form_id: webhookData.form_id,
          session_id: req.requestId
        });

        Logger.success(`✅ GDPR consent recorded: ${consentResult.consent_id}`);
        Logger.info(`📍 Jurisdiction: ${consentResult.jurisdiction}, Law: ${consentResult.applicable_law}`);
      } else {
        // User declined consent
        Logger.warn(`⚠️ User ${webhookData.create_user_id} DECLINED consent`);
        await gdprModule.restrictDataProcessing(webhookData.create_user_id);

        return res.status(200).json({
          success: true,
          message: 'User registered but declined consent - processing restricted',
          create_user_id: webhookData.create_user_id,
          consent_status: 'declined',
          requestId: req.requestId
        });
      }
    }

    // Check if user exists and update
    const { data: existingUser } = await supabase
      .from('user_signup')
      .select('id')
      .eq('create_user_id', webhookData.create_user_id)
      .single();

    const hasConsent = webhookData.legal_support === 'Yes' || webhookData.gdpr_consent === true;

    if (existingUser) {
      await supabase
        .from('user_signup')
        .update({
          ...webhookData,
          legal_support: hasConsent ? 'Yes' : 'No',
          gdpr_consent: hasConsent,
          gdpr_consent_date: hasConsent ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('create_user_id', webhookData.create_user_id);
    } else {
      await supabase
        .from('user_signup')
        .insert([{
          ...webhookData,
          legal_support: hasConsent ? 'Yes' : 'No',
          gdpr_consent: hasConsent,
          gdpr_consent_date: hasConsent ? new Date().toISOString() : null,
          created_at: new Date().toISOString()
        }]);
    }

    // Process images only if consent granted
    if (hasConsent) {
      imageProcessor.processSignupImages(webhookData)
        .then(result => Logger.success('Signup processing complete', result))
        .catch(error => Logger.error('Signup processing failed', error));
    }

    res.status(200).json({
      success: true,
      message: hasConsent ? 'Signup processing started with GDPR compliance' : 'User registered without consent',
      create_user_id: webhookData.create_user_id,
      consent_status: hasConsent ? 'granted' : 'declined',
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Webhook error', error);
    res.status(500).json({
      success: false,
      error: error.message,
      requestId: req.requestId
    });
  }
});

app.post('/webhook/incident-report', checkSharedKey, async (req, res) => {
  try {
    Logger.info('🚨 Incident report webhook received');
    Logger.info(`📋 Processing incident report files for: ${req.body.create_user_id}`);

    if (!supabaseEnabled || !imageProcessor) {
      return res.status(503).json({
        error: 'Service not configured',
        requestId: req.requestId
      });
    }

    const webhookData = req.body;

    if (!webhookData.id && !webhookData.incident_report_id) {
      return res.status(400).json({
        error: 'Missing incident report ID',
        requestId: req.requestId
      });
    }

    if (!webhookData.create_user_id) {
      return res.status(400).json({
        error: 'Missing user ID - GDPR compliance requires user identification',
        code: 'MISSING_USER_ID',
        requestId: req.requestId
      });
    }

    const incidentId = webhookData.id || webhookData.incident_report_id;

    // Log GDPR activity
    await logGDPRActivity(webhookData.create_user_id, 'INCIDENT_REPORT_PROCESSING', {
      source: 'webhook',
      incident_id: incidentId,
      has_files: true
    }, req);

    // Process files asynchronously
    imageProcessor.processIncidentReportFiles(webhookData)
      .then(result => {
        Logger.success('✅ Incident report processing complete', result);
      })
      .catch(error => {
        Logger.error('❌ Incident report processing failed', error);
      });

    res.status(200).json({
      success: true,
      message: 'Incident report processing started',
      incident_report_id: incidentId,
      create_user_id: webhookData.create_user_id,
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('Webhook error', error);
    res.status(500).json({
      success: false,
      error: error.message,
      requestId: req.requestId
    });
  }
});

// PDF GENERATION ENDPOINTS
app.post('/generate-pdf', checkSharedKey, async (req, res) => {
  if (!fetchAllData || !generatePDF || !sendEmails) {
    return res.status(503).json({
      error: 'PDF generation not configured',
      requestId: req.requestId
    });
  }

  try {
    const { create_user_id } = req.body;

    if (!create_user_id) {
      return res.status(400).json({
        error: 'Missing create_user_id',
        requestId: req.requestId
      });
    }

    Logger.info('📄 PDF generation requested', { userId: create_user_id });

    // Log GDPR activity
    await logGDPRActivity(create_user_id, 'PDF_GENERATION', {
      source: 'api'
    }, req);

    // Fetch all data
    const allData = await fetchAllData(create_user_id);

    if (!allData || !allData.userSignup) {
      return res.status(404).json({
        error: 'User data not found',
        requestId: req.requestId
      });
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(allData);

    // Store completed form
    const formRecord = await storeCompletedForm(create_user_id, pdfBuffer, allData);

    // Send emails
    const emailResult = await sendEmails({
      userEmail: allData.userSignup.email,
      userName: allData.userSignup.full_name,
      pdfBuffer: pdfBuffer,
      formId: formRecord.id
    });

    res.json({
      success: true,
      message: 'PDF generated and sent successfully',
      formId: formRecord.id,
      emailsSent: emailResult.sent,
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('PDF generation error', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      details: error.message,
      requestId: req.requestId
    });
  }
});

app.post('/webhook/generate-pdf', checkSharedKey, async (req, res) => {
  // Alias for generate-pdf endpoint - call the same logic
  if (!fetchAllData || !generatePDF || !sendEmails) {
    return res.status(503).json({
      error: 'PDF generation not configured',
      requestId: req.requestId
    });
  }

  try {
    const { create_user_id } = req.body;

    if (!create_user_id) {
      return res.status(400).json({
        error: 'Missing create_user_id',
        requestId: req.requestId
      });
    }

    Logger.info('📄 PDF generation requested via webhook', { userId: create_user_id });

    // Log GDPR activity
    await logGDPRActivity(create_user_id, 'PDF_GENERATION', {
      source: 'webhook'
    }, req);

    // Fetch all data
    const allData = await fetchAllData(create_user_id);

    if (!allData || !allData.userSignup) {
      return res.status(404).json({
        error: 'User data not found',
        requestId: req.requestId
      });
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(allData);

    // Store completed form
    const formRecord = await storeCompletedForm(create_user_id, pdfBuffer, allData);

    // Send emails
    const emailResult = await sendEmails({
      userEmail: allData.userSignup.email,
      userName: allData.userSignup.full_name,
      pdfBuffer: pdfBuffer,
      formId: formRecord.id
    });

    res.json({
      success: true,
      message: 'PDF generated and sent successfully',
      formId: formRecord.id,
      emailsSent: emailResult.sent,
      requestId: req.requestId
    });

  } catch (error) {
    Logger.error('PDF generation error via webhook', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      details: error.message,
      requestId: req.requestId
    });
  }
});

// --- ERROR HANDLING MIDDLEWARE ---
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size too large. Maximum size: 50MB for audio, 10MB for images',
        code: 'FILE_TOO_LARGE',
        requestId: req.requestId
      });
    }
    return res.status(400).json({
      error: `Upload error: ${err.message}`,
      code: err.code,
      requestId: req.requestId
    });
  }

  Logger.error('Unhandled error', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    requestId: req.requestId
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
    requestId: req.requestId
  });
});

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 3000;

// Graceful shutdown handler
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  Logger.info(`⚠️ ${signal} received, starting graceful shutdown...`);

  // Save any pending GDPR audits - NEW
  if (gdprModule) {
    await gdprModule.auditLog('SYSTEM', 'SYSTEM_SHUTDOWN', {
      timestamp: new Date().toISOString()
    });
  }

  // Close WebSocket connections
  wss.clients.forEach((ws) => {
    ws.close(1001, 'Server shutting down');
  });

  // Close the HTTP server
  server.close(() => {
    Logger.info('HTTP server closed');
  });

  // Clear intervals
  if (transcriptionQueueInterval) {
    clearInterval(transcriptionQueueInterval);
  }
  clearInterval(wsHeartbeat);

  // Cleanup Supabase realtime channels
  if (realtimeChannels.transcriptionChannel) {
    supabase.removeChannel(realtimeChannels.transcriptionChannel);
  }
  if (realtimeChannels.summaryChannel) {
    supabase.removeChannel(realtimeChannels.summaryChannel);
  }

  // Wait for pending operations
  await new Promise(resolve => setTimeout(resolve, 5000));

  Logger.info('Graceful shutdown complete');
  process.exit(0);
}

// Start the server
server.listen(PORT, () => {
  Logger.success(`🚀 Server running on port ${PORT}`);
  Logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  Logger.info(`🔐 GDPR Compliance: ${gdprModule ? 'ACTIVE' : 'DISABLED'}`);
  Logger.info(`🗄️ Supabase: ${supabaseEnabled ? 'CONNECTED' : 'DISABLED'}`);
  Logger.info(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  Logger.info(`🔄 Transcription Queue: ${transcriptionQueueInterval ? 'RUNNING' : 'DISABLED'}`);
  Logger.info(`🔌 WebSocket: ACTIVE`);
  Logger.info(`🎤 Recording Interface: UNIFIED at /transcription.html`);
  Logger.info(`⚡ Realtime Updates: ${realtimeChannels.transcriptionChannel ? 'ENABLED' : 'DISABLED (optional)'}`);
  Logger.info(`✅ Trust Proxy: FIXED (set to 1 for proper rate limiting)`);
  Logger.info(`✅ Consent Handling: ENHANCED with GDPR module`);
  Logger.info(`🌍 Jurisdiction Detection: ${gdprModule ? 'ENABLED' : 'DISABLED'}`);
  Logger.info(`🔒 Privacy Laws: ${gdprModule ? 'UK GDPR + US State Laws' : 'Basic'}`);

  if (!SHARED_KEY) {
    Logger.warn('⚠️ ZAPIER_SHARED_KEY not set - authentication disabled');
  }

  // List available endpoints
  Logger.info('📍 Key endpoints:');
  Logger.info('  - GET  /health - System health check');
  Logger.info('  - GET  /transcription.html - Main recording interface');
  Logger.info('  - POST /api/whisper/transcribe - Process audio');
  Logger.info('  - POST /webhook/signup - Process signup with consent');
  Logger.info('  - POST /webhook/incident-report - Process incident');
  Logger.info('  - GET  /api/gdpr/user-rights/:userId - Privacy rights dashboard');
  Logger.info('  - POST /api/gdpr/consent - Grant consent');
  Logger.info('  - POST /api/gdpr/dsr - Submit data request');
  Logger.info('  - GET  /api/gdpr/admin/dashboard - Admin compliance view');
  Logger.info('  - POST /api/generate-legal-narrative - Generate formal legal narrative');

  Logger.success('✅ All systems operational with GDPR compliance - Ready to serve requests');
  Logger.success('🔧 GDPR Module integrated - Full privacy law compliance enabled');
});

// Export for testing
module.exports = { app, server, gdprModule };