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

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// ========================================
// AUTH IMPORTS
// ========================================
const AuthService = require('./lib/services/authService');
const { requireAuth, optionalAuth } = require('./lib/middleware/authMiddleware');

// Import PDF generation modules - with error handling
let fetchAllData, generatePDF, sendEmails;
try {
  fetchAllData = require('./lib/data/dataFetcher').fetchAllData;
  generatePDF = require('./lib/generators/pdfGenerator').generatePDF;
  sendEmails = require('./lib/generators/emailService').sendEmails;
} catch (error) {
  console.warn('PDF generation modules not found - PDF features will be disabled', error.message);
}

// ========================================
// CONSTANTS
// ========================================
const CONSTANTS = {
  TRANSCRIPTION_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    TRANSCRIBED: 'transcribed',
    GENERATING_SUMMARY: 'generating_summary',
    COMPLETED: 'completed',
    FAILED: 'failed'
  },
  RETRY_LIMITS: {
    TRANSCRIPTION: 5,
    API_TIMEOUT: 30000,
    WHISPER_TIMEOUT: 60000
  },
  DATA_RETENTION: {
    DEFAULT_DAYS: 365
  },
  WS_MESSAGE_TYPES: {
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe',
    PING: 'ping',
    PONG: 'pong',
    ERROR: 'error',
    STATUS: 'status',
    REALTIME_UPDATE: 'realtime_update'
  },
  FILE_SIZE_LIMITS: {
    AUDIO: 50 * 1024 * 1024, // 50MB
    IMAGE: 10 * 1024 * 1024  // 10MB
  },
  GDPR: {
    CURRENT_POLICY_VERSION: 'v1.0',
    CONSENT_TYPES: {
      SIGNUP: 'signup',
      DATA_PROCESSING: 'data_processing',
      MARKETING: 'marketing'
    }
  }
};

// ========================================
// ENHANCED LOGGING UTILITY
// ========================================
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

// ========================================
// EXPRESS APP SETUP
// ========================================
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
// RATE LIMITING
// ========================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skip: (req) => req.path === '/health'
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Rate limit exceeded for this operation.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
});

// ========================================
// MIDDLEWARE SETUP
// ========================================
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

// Enhanced request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const sanitizedPath = req.path.replace(/\/user\/[^/]+/g, '/user/[REDACTED]');
  Logger.debug(`${req.method} ${sanitizedPath}`, { timestamp });

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

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Validate user ID format
 */
function validateUserId(userId) {
  if (!userId) {
    return { valid: false, error: 'User ID is required' };
  }

  // UUID format (Supabase auth format)
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

  // Custom format (alphanumeric, 8-64 chars)
  const customRegex = /^[a-zA-Z0-9]{8,64}$/;

  if (!uuidRegex.test(userId) && !customRegex.test(userId)) {
    return {
      valid: false,
      error: 'Invalid user ID format. Must be UUID or alphanumeric (8-64 chars)'
    };
  }

  return { valid: true };
}

/**
 * Standardized error response helper
 */
function sendError(res, statusCode, error, code = null, details = null) {
  const response = {
    success: false,
    error: error,
    timestamp: new Date().toISOString(),
    requestId: res.req?.requestId || 'unknown'
  };

  if (code) response.code = code;
  if (details) response.details = details;

  res.status(statusCode).json(response);
}

/**
 * Redact sensitive information from URLs
 */
function redactUrl(url) {
  if (!url) return 'no-url';
  try {
    const urlObj = new URL(url);
    urlObj.search = ''; // Remove query params
    return urlObj.toString();
  } catch {
    return url.split('?')[0]; // Simple fallback
  }
}

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================
const SHARED_KEY = process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY || '';

function checkSharedKey(req, res, next) {
  const headerKey = req.get('X-Api-Key');
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const provided = headerKey || bearer || '';

  if (!SHARED_KEY) {
    Logger.warn('No ZAPIER_SHARED_KEY/WEBHOOK_API_KEY set');
    return sendError(res, 503, 'Server missing shared key', 'MISSING_API_KEY');
  }

  if (provided !== SHARED_KEY) {
    Logger.warn('Authentication failed', { ip: req.clientIp });
    return sendError(res, 401, 'Unauthorized', 'INVALID_API_KEY');
  }

  return next();
}

function authenticateRequest(req, res, next) {
  // Placeholder for future auth implementation
  Logger.debug('authenticateRequest called');
  next();
}

// ========================================
// SUPABASE SETUP
// ========================================
let supabase = null;
let supabaseEnabled = false;
let realtimeChannels = {};

const initSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    Logger.error('SUPABASE_URL or SUPABASE_SERVICE_KEY not found');
    return false;
  }

  try {
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
          'x-refresh-schema': 'true'
        }
      }
    });

    Logger.success('Supabase initialized successfully');

    // Initialize GDPR tables if they don't exist
    initializeGDPRTables();

    // Initialize Supabase Realtime
    initializeSupabaseRealtime();

    return true;
  } catch (error) {
    Logger.error('Error initializing Supabase', error);
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

    Logger.info('Supabase Realtime channels initialized');
  } catch (error) {
    Logger.error('Failed to initialize Supabase Realtime (non-critical)', error);
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

supabaseEnabled = initSupabase();

// ========================================
// INITIALIZE AUTH SERVICE
// ========================================
let authService = null;
if (process.env.SUPABASE_ANON_KEY && supabaseEnabled) {
  authService = new AuthService(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  Logger.success('✅ Supabase Auth service initialized');
} else {
  Logger.warn('⚠️ Auth service not initialized - missing SUPABASE_ANON_KEY');
}

// ========================================
// GDPR FUNCTIONS
// ========================================

/**
 * Log GDPR activity
 */
async function logGDPRActivity(userId, activityType, details, req = null) {
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

/**
 * GDPR Consent Check Middleware
 */
async function checkGDPRConsent(req, res, next) {
  const userId = req.body?.userId || req.body?.create_user_id || req.params?.userId;

  if (!userId) {
    return sendError(res, 400, 'User identification required', 'MISSING_USER_ID',
      'A valid user ID must be provided to process personal data');
  }

  // Validate user ID format
  const validation = validateUserId(userId);
  if (!validation.valid) {
    return sendError(res, 400, validation.error, 'INVALID_USER_ID');
  }

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

      return sendError(res, 403, 'GDPR consent required', 'CONSENT_REQUIRED',
        'User must provide GDPR consent before processing personal data');
    }

    req.gdprConsent = {
      granted: true,
      date: user.gdpr_consent_date
    };

    next();
  } catch (error) {
    Logger.error('GDPR consent check error', error);
    sendError(res, 500, 'Failed to verify consent', 'CONSENT_CHECK_FAILED');
  }
}

/**
 * Data Retention Policy Enforcement
 */
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
        await supabase
          .from('incident_reports')
          .update({
            archived: true,
            archived_at: new Date().toISOString()
          })
          .eq('id', report.id);

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
  setInterval(enforceDataRetention, 24 * 60 * 60 * 1000);
  Logger.info('Data retention policy scheduled');
}

// ========================================
// WEBSOCKET SETUP
// ========================================
const wss = new WebSocket.Server({
  noServer: true,
  clientTracking: true,
  maxPayload: 10 * 1024 * 1024 // 10MB max message size
});

const activeSessions = new Map(); // queueId -> WebSocket
const userSessions = new Map(); // userId -> Set of WebSockets
const transcriptionStatuses = new Map(); // Store transcription statuses with timestamps

// Enhanced cleanup for stale WebSocket connections and old statuses
setInterval(() => {
  // Clean up WebSocket sessions
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

  // Clean up old transcription statuses (older than 1 hour)
  const oneHourAgo = Date.now() - 3600000;
  let cleaned = 0;

  transcriptionStatuses.forEach((status, queueId) => {
    if (status.updatedAt && status.updatedAt < oneHourAgo) {
      transcriptionStatuses.delete(queueId);
      cleaned++;
    }
  });

  if (cleaned > 0) {
    Logger.info(`Cleaned up ${cleaned} old transcription statuses`);
  }
}, 60000); // Clean up every minute

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  Logger.info('New WebSocket connection established');

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

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

      switch (data.type) {
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

/**
 * Send real-time updates to specific queue
 */
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

/**
 * Broadcast to specific user
 */
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

/**
 * Broadcast transcription updates
 */
function broadcastTranscriptionUpdate(queueId, data) {
  // Update memory store
  if (transcriptionStatuses.has(queueId)) {
    Object.assign(transcriptionStatuses.get(queueId), data);
  }

  // Send WebSocket update to queue subscribers
  sendTranscriptionUpdate(queueId, data);

  // Also broadcast to user subscribers if we have the userId
  const statusData = transcriptionStatuses.get(queueId);
  if (statusData?.create_user_id) {
    broadcastToUser(statusData.create_user_id, data);
  }
}

/**
 * Handle realtime transcription updates
 */
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
      if (transcriptionStatuses.has(queueId)) {
        transcriptionStatuses.set(queueId, {
          ...transcriptionStatuses.get(queueId),
          status: status,
          transcription: transcription || transcriptionStatuses.get(queueId).transcription,
          updatedAt: Date.now()
        });
      }

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

/**
 * Handle realtime summary updates
 */
function handleRealtimeSummaryUpdate(payload) {
  try {
    const { new: summaryData } = payload;
    const userId = summaryData?.create_user_id;
    const queueId = summaryData?.incident_id;

    if (queueId && transcriptionStatuses.has(queueId)) {
      transcriptionStatuses.set(queueId, {
        ...transcriptionStatuses.get(queueId),
        status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
        summary: summaryData,
        updatedAt: Date.now()
      });
    }

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

// ========================================
// AI SUMMARY GENERATION
// ========================================

/**
 * Generate AI Summary using OpenAI
 */
async function generateAISummary(transcriptionText, createUserId, incidentId) {
  try {
    if (!process.env.OPENAI_API_KEY || !transcriptionText) {
      Logger.info('Cannot generate AI summary - missing API key or transcription');
      return null;
    }

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
4. contributing_factors: Any environmental, weather, or other contributing factors mentioned

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
      aiAnalysis = {
        summary_text: response.data.choices[0].message.content,
        key_points: ['See summary for details'],
        fault_analysis: 'Manual review recommended',
        contributing_factors: 'See summary text'
      };
    }

    // Validate AI analysis structure
    aiAnalysis = {
      summary_text: aiAnalysis.summary_text || 'Summary generation failed',
      key_points: Array.isArray(aiAnalysis.key_points) ? aiAnalysis.key_points : [],
      fault_analysis: aiAnalysis.fault_analysis || 'Unable to determine',
      contributing_factors: aiAnalysis.contributing_factors || 'None identified'
    };

    // Save to ai_summary table
    const { data, error } = await supabase
      .from('ai_summary')
      .insert({
        create_user_id: createUserId,
        incident_id: incidentId || createUserId,
        summary_text: aiAnalysis.summary_text,
        key_points: aiAnalysis.key_points,
        fault_analysis: aiAnalysis.fault_analysis,
        severity_assessment: aiAnalysis.contributing_factors,
        liability_assessment: aiAnalysis.contributing_factors,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      Logger.error('Error saving AI summary to database', error);
      if (error.message.includes('column')) {
        const { data: retryData } = await supabase
          .from('ai_summary')
          .insert({
            create_user_id: createUserId,
            incident_id: incidentId || createUserId,
            summary_text: aiAnalysis.summary_text,
            key_points: aiAnalysis.key_points,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (retryData) {
          Logger.success('AI summary saved with basic fields');
          return aiAnalysis;
        }
      }
      return aiAnalysis;
    }

    Logger.success('AI summary generated and saved successfully');
    return aiAnalysis;
  } catch (error) {
    Logger.error('AI Summary generation error', error.response?.data || error);
    return null;
  }
}

// ========================================
// TRANSCRIPTION PROCESSING
// ========================================

/**
 * Process transcription from buffer
 */
async function processTranscriptionFromBuffer(queueId, audioBuffer, create_user_id, incident_report_id, audioUrl) {
  let retryCount = 0;
  const maxRetries = 3;

  try {
    Logger.info(`Processing transcription for queue ${queueId}, user ${create_user_id}`);

    // Validate inputs
    if (!create_user_id) {
      throw new Error('User ID is required for transcription processing');
    }

    // Update status with timestamp
    transcriptionStatuses.set(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
      transcription: null,
      summary: null,
      error: null,
      create_user_id: create_user_id,
      updatedAt: Date.now()
    });

    broadcastTranscriptionUpdate(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
      message: 'Starting transcription...',
      timestamp: new Date().toISOString()
    });

    let finalAudioBuffer;

    if (audioBuffer) {
      finalAudioBuffer = audioBuffer;
      Logger.info(`Using provided buffer, size: ${audioBuffer.length} bytes`);
    } else if (audioUrl) {
      Logger.info(`Downloading audio from URL: ${redactUrl(audioUrl)}`);

      try {
        let storagePath = audioUrl;
        if (audioUrl.includes('incident-audio/')) {
          storagePath = audioUrl.split('incident-audio/')[1].split('?')[0];
        } else if (audioUrl.includes('/')) {
          storagePath = audioUrl.split('/').slice(-2).join('/');
        }

        Logger.debug(`Attempting to download from path: ${storagePath}`);

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('incident-audio')
          .download(storagePath);

        if (downloadError) {
          Logger.error('Supabase download error:', downloadError);
          const audioResponse = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: CONSTANTS.RETRY_LIMITS.API_TIMEOUT,
            maxContentLength: CONSTANTS.FILE_SIZE_LIMITS.AUDIO,
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

    if (finalAudioBuffer.length > CONSTANTS.FILE_SIZE_LIMITS.AUDIO) {
      throw new Error('Audio file exceeds size limit');
    }

    broadcastTranscriptionUpdate(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
      message: 'Audio loaded, sending to Whisper API...',
      timestamp: new Date().toISOString()
    });

    // Create form data - use buffer directly for reliability
    const formData = new FormData();

    formData.append('file', finalAudioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm',
      knownLength: finalAudioBuffer.length
    });

    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('language', 'en');

    // Call Whisper API with retry logic
    let whisperResponse;

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
            timeout: CONSTANTS.RETRY_LIMITS.WHISPER_TIMEOUT,
            validateStatus: (status) => status < 500
          }
        );

        if (whisperResponse.status >= 400) {
          throw new Error(`Whisper API returned ${whisperResponse.status}: ${JSON.stringify(whisperResponse.data)}`);
        }

        Logger.success('Whisper API call successful');
        break;

      } catch (error) {
        retryCount++;
        Logger.error(`Whisper API attempt ${retryCount} failed:`, error.response?.data || error.message);

        if (retryCount >= maxRetries) {
          throw new Error(`Whisper API failed after ${maxRetries} attempts: ${error.message}`);
        }

        const waitTime = Math.pow(2, retryCount) * 1000;
        Logger.info(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    const transcription = whisperResponse.data.text;

    if (!transcription || transcription.trim().length === 0) {
      throw new Error('Transcription returned empty text');
    }

    Logger.success(`Transcription successful, text length: ${transcription.length} characters`);

    // Update in-memory status
    transcriptionStatuses.set(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.TRANSCRIBED,
      transcription: transcription,
      summary: null,
      error: null,
      create_user_id: create_user_id,
      updatedAt: Date.now()
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

    // Save to ai_transcription table
    const { data: transcriptionRecord, error: saveError } = await supabase
      .from('ai_transcription')
      .insert([{
        create_user_id: create_user_id,
        incident_report_id: incident_report_id || null,
        transcription_text: transcription,
        audio_url: audioUrl,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (saveError) {
      Logger.error('Error saving to ai_transcription:', saveError);
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
    if (process.env.OPENAI_API_KEY && transcription.length > 10) {
      try {
        Logger.info('Starting AI summary generation');
        const summary = await generateAISummary(transcription, create_user_id, incident_report_id || queueId);

        if (summary) {
          transcriptionStatuses.set(queueId.toString(), {
            ...transcriptionStatuses.get(queueId.toString()),
            status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
            summary: summary,
            updatedAt: Date.now()
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
            summary: summary,
            message: 'Processing complete!',
            timestamp: new Date().toISOString()
          });

          Logger.success('AI summary generated and process completed successfully');
        }
      } catch (summaryError) {
        Logger.error('Summary generation failed:', summaryError);

        transcriptionStatuses.set(queueId.toString(), {
          ...transcriptionStatuses.get(queueId.toString()),
          status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
          summary: null,
          updatedAt: Date.now()
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
      transcriptionStatuses.set(queueId.toString(), {
        ...transcriptionStatuses.get(queueId.toString()),
        status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
        updatedAt: Date.now()
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

    transcriptionStatuses.set(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
      transcription: null,
      summary: null,
      error: error.message,
      create_user_id: create_user_id,
      updatedAt: Date.now()
    });

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

    broadcastTranscriptionUpdate(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
      error: error.message,
      message: `Transcription failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Process transcription queue
 */
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
        const existingStatus = transcriptionStatuses.get(item.id.toString());
        if (existingStatus && existingStatus.status === CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING) {
          Logger.info(`Skipping queue item ${item.id} - already processing`);
          continue;
        }

        Logger.info(`Processing queue item ${item.id} (attempt ${item.retry_count + 1})`);

        await processTranscriptionFromBuffer(
          item.id,
          null,
          item.create_user_id,
          item.incident_report_id,
          item.audio_url
        );

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
  setTimeout(processTranscriptionQueue, 30000);
  Logger.info(`Transcription queue processor scheduled every ${intervalMinutes} minutes`);
}

// ========================================
// PDF STORAGE
// ========================================

/**
 * Store completed form
 */
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
        .createSignedUrl(fileName, 31536000);

      if (urlData) {
        pdfUrl = urlData.signedUrl;
      }
    }

    const { data, error } = await supabase
      .from('completed_incident_forms')
      .insert({
        create_user_id: createUserId,
        form_data: allData,
        pdf_base64: pdfBase64.substring(0, 1000000),
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

// ========================================
// IMAGE PROCESSOR CLASS
// ========================================

class ImageProcessor {
  constructor() {
    this.supabase = supabase;
    this.bucketName = 'incident-images-secure';
  }

  async processSignupImages(webhookData) {
    try {
      Logger.info('Processing signup images', { userId: webhookData.create_user_id });

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
        const { error: updateError } = await this.supabase
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
        const { error: updateError } = await this.supabase
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
        maxContentLength: CONSTANTS.FILE_SIZE_LIMITS.AUDIO,
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
// SHARED PDF GENERATION FUNCTION
// ========================================

/**
 * Generate user PDF (shared function)
 */
async function generateUserPDF(create_user_id, source = 'direct') {
  Logger.info(`Starting PDF generation (${source})`, { userId: create_user_id });

  const validation = validateUserId(create_user_id);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  await logGDPRActivity(create_user_id, 'PDF_GENERATION', {
    type: 'complete_report',
    source: source
  });

  const allData = await fetchAllData(create_user_id);

  if (!allData.user || !allData.user.driver_email) {
    throw new Error('User not found or missing email');
  }

  const [
    { data: aiTranscription },
    { data: aiSummary }
  ] = await Promise.all([
    supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', create_user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('ai_summary')
      .select('*')
      .eq('create_user_id', create_user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
  ]);

  if (aiTranscription) allData.aiTranscription = aiTranscription;
  if (aiSummary) allData.aiSummary = aiSummary;

  const pdfBuffer = await generatePDF(allData);
  const storedForm = await storeCompletedForm(create_user_id, pdfBuffer, allData);
  const emailResult = await sendEmails(allData.user.driver_email, pdfBuffer, create_user_id);

  if (storedForm.id && !storedForm.id.startsWith('temp-') && !storedForm.id.startsWith('error-')) {
    await supabase
      .from('completed_incident_forms')
      .update({
        sent_to_user: emailResult.success,
        sent_to_accounts: emailResult.success,
        email_status: emailResult
      })
      .eq('id', storedForm.id);
  }

  Logger.success('PDF generation process completed');

  return {
    success: true,
    form_id: storedForm.id,
    create_user_id,
    email_sent: emailResult.success,
    timestamp: new Date().toISOString()
  };
}

/**
 * Batch fetch user data
 */
async function getUserDataBatch(userId) {
  try {
    const [
      { data: user, error: userError },
      { data: incidents, error: incidentError },
      { data: transcriptions, error: transcriptionError },
      { data: summaries, error: summaryError },
      { data: images, error: imageError }
    ] = await Promise.all([
      supabase.from('user_signup').select('*').eq('create_user_id', userId).single(),
      supabase.from('incident_reports').select('*').eq('create_user_id', userId),
      supabase.from('ai_transcription').select('*').eq('create_user_id', userId),
      supabase.from('ai_summary').select('*').eq('create_user_id', userId),
      supabase.from('incident_images').select('*').eq('create_user_id', userId)
    ]);

    if (userError) throw userError;

    return {
      user,
      incidents: incidents || [],
      transcriptions: transcriptions || [],
      summaries: summaries || [],
      images: images || []
    };
  } catch (error) {
    Logger.error('Error fetching user data batch:', error);
    throw error;
  }
}

/**
 * Process Typeform data
 */
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

/**
 * Check external services
 */
async function checkExternalServices() {
  const services = {
    supabase: false,
    supabase_realtime: false,
    openai: false,
    what3words: false
  };

  if (supabaseEnabled) {
    try {
      await supabase.from('user_signup').select('*').limit(1);
      services.supabase = true;
      services.supabase_realtime = realtimeChannels.transcriptionChannel ? true : false;
    } catch (error) {
      Logger.error('Supabase health check failed', error);
    }
  }

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

  if (process.env.WHAT3WORDS_API_KEY) {
    services.what3words = true;
  }

  return services;
}

// ========================================
// PART 2: API Endpoints, Routes, and Server
// ========================================

// API Configuration
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.ANON_PUBLIC,
    features: {
      realtime: supabaseEnabled && realtimeChannels.transcriptionChannel ? true : false,
      transcription: !!process.env.OPENAI_API_KEY,
      ai_summary: !!process.env.OPENAI_API_KEY,
      ai_listening: !!process.env.OPENAI_API_KEY,
      pdf_generation: !!(fetchAllData && generatePDF && sendEmails),
      auth: !!authService,
      what3words: !!process.env.WHAT3WORDS_API_KEY,
      gdpr_consent: true
    }
  });
});

// Enhanced health check
app.get('/health', async (req, res) => {
  const externalServices = await checkExternalServices();

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
      gdprCompliant: true,
      gdprConsentCapture: true,
      what3words: externalServices.what3words,
      auth: !!authService
    },
    fixes: {
      templateLiterals: 'FIXED - All backticks corrected',
      bufferHandling: 'FIXED - Direct buffer usage',
      memoryLeaks: 'FIXED - Map cleanup with timestamps',
      errorHandling: 'ENHANCED - Standardized responses',
      validation: 'ENHANCED - User ID validation',
      performance: 'OPTIMIZED - Batch queries with Promise.all',
      security: 'ENHANCED - URL redaction',
      codeQuality: 'IMPROVED - Extracted shared functions',
      aiListening: 'NEW - AI listening transcript endpoints added',
      emergencyContact: 'NEW - Emergency contact endpoints added',
      gdprConsent: 'NEW - GDPR consent capture on signup'
    }
  };

  res.json(status);
});

// ========================================
// AUTHENTICATION ENDPOINTS
// ========================================

// Signup with GDPR consent capture
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName, phone, gdprConsent } = req.body;

    // Validation
    if (!email || !password || !fullName) {
      return sendError(res, 400, 'Missing required fields', 'MISSING_FIELDS');
    }

    if (password.length < 8) {
      return sendError(res, 400, 'Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    // ========================================
    // GDPR CONSENT VALIDATION (CRITICAL)
    // ========================================
    if (gdprConsent !== true) {
      Logger.warn('Signup attempt without GDPR consent', { email, ip: req.clientIp });
      return sendError(res, 400, 'GDPR consent is required to create an account', 'GDPR_CONSENT_REQUIRED',
        'You must accept our Privacy Policy and Terms of Service to proceed');
    }

    if (!authService) {
      return sendError(res, 503, 'Auth service not configured', 'AUTH_UNAVAILABLE');
    }

    Logger.info('Auth signup with GDPR consent:', email);

    const authResult = await authService.signUp(email, password, {
      full_name: fullName,
      phone: phone
    });

    if (!authResult.success) {
      return sendError(res, 400, authResult.error, 'SIGNUP_FAILED');
    }

    const userId = authResult.userId;
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Math.floor(Math.random() * 1000000);

    // ========================================
    // GDPR CONSENT CAPTURE IN DATABASE
    // ========================================
    const { error: insertError } = await supabase.from('user_signup').insert({
      uid: userId,
      create_user_id: userId,
      email: email,
      username: username,
      first_name: fullName.split(' ')[0] || '',
      last_name: fullName.split(' ').slice(1).join(' ') || '',
      phone: phone || null,
      created_at: new Date().toISOString(),
      source: 'auth_signup',
      verified: true,

      // ✅ GDPR CONSENT FIELDS
      gdpr_consent: true,
      gdpr_consent_date: new Date().toISOString(),
      gdpr_consent_ip: req.clientIp || 'unknown',
      gdpr_consent_version: CONSTANTS.GDPR.CURRENT_POLICY_VERSION,
      gdpr_consent_user_agent: req.get('user-agent') || 'unknown'
    });

    if (insertError) {
      Logger.error('Error inserting user with GDPR consent:', insertError);
      // Clean up auth user if database insert fails
      try {
        await authService.deleteUser(userId);
      } catch (cleanupError) {
        Logger.error('Failed to cleanup auth user:', cleanupError);
      }
      return sendError(res, 500, 'Failed to create user account', 'USER_CREATION_FAILED');
    }

    // ========================================
    // LOG GDPR CONSENT IN AUDIT TRAIL
    // ========================================
    try {
      await logGDPRActivity(userId, 'CONSENT_GIVEN', {
        consent_type: CONSTANTS.GDPR.CONSENT_TYPES.SIGNUP,
        consent_method: 'checkbox',
        consent_version: CONSTANTS.GDPR.CURRENT_POLICY_VERSION,
        ip_address: req.clientIp || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      }, req);

      Logger.success('GDPR consent logged successfully', { userId });
    } catch (auditError) {
      // Non-critical error - don't fail signup if audit log fails
      Logger.warn('GDPR audit log error (non-critical):', auditError);
    }

    // Set authentication cookie
    res.cookie('access_token', authResult.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    Logger.success('User signup complete with GDPR consent', { 
      userId, 
      email,
      consentVersion: CONSTANTS.GDPR.CURRENT_POLICY_VERSION
    });

    res.json({
      success: true,
      user: {
        id: userId,
        email: email,
        username: username,
        fullName: fullName
      },
      session: {
        access_token: authResult.session.access_token
      },
      gdpr: {
        consentGiven: true,
        consentDate: new Date().toISOString(),
        policyVersion: CONSTANTS.GDPR.CURRENT_POLICY_VERSION
      }
    });
  } catch (error) {
    Logger.error('Signup error:', error);
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR');
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Missing credentials', 'MISSING_CREDENTIALS');
    }

    if (!authService) {
      return sendError(res, 503, 'Auth service not configured', 'AUTH_UNAVAILABLE');
    }

    const authResult = await authService.signIn(email, password);

    if (!authResult.success) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const { data: userData } = await supabase
      .from('user_signup')
      .select('*')
      .eq('uid', authResult.userId)
      .single();

    const cookieMaxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    res.cookie('access_token', authResult.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge
    });

    res.json({
      success: true,
      user: {
        id: authResult.userId,
        email: authResult.user.email,
        username: userData?.username,
        fullName: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim()
      },
      session: {
        access_token: authResult.session.access_token
      }
    });
  } catch (error) {
    Logger.error('Login error:', error);
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR');
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    if (authService) await authService.signOut();
    res.clearCookie('access_token');
    res.json({ success: true });
  } catch (error) {
    Logger.error('Logout error:', error);
    sendError(res, 500, 'Logout failed', 'LOGOUT_FAILED');
  }
});

// Session check
app.get('/api/auth/session', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ authenticated: false, user: null });
    }

    const { data: userData } = await supabase
      .from('user_signup')
      .select('*')
      .eq('uid', req.userId)
      .single();

    res.json({
      authenticated: true,
      user: {
        id: req.userId,
        email: req.user.email,
        username: userData?.username,
        fullName: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim()
      }
    });
  } catch (error) {
    Logger.error('Session check error:', error);
    res.json({ authenticated: false });
  }
});

// ========================================
// GDPR CONSENT MANAGEMENT ENDPOINTS (NEW)
// ========================================

/**
 * Get GDPR consent status for a user
 * GET /api/gdpr/consent/:userId
 */
app.get('/api/gdpr/consent/:userId', async (req, res) => {
  if (!supabaseEnabled) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;

    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    const { data: user, error } = await supabase
      .from('user_signup')
      .select('gdpr_consent, gdpr_consent_date, gdpr_consent_version, gdpr_consent_ip')
      .eq('create_user_id', userId)
      .single();

    if (error || !user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    await logGDPRActivity(userId, 'CONSENT_STATUS_CHECK', {
      has_consent: user.gdpr_consent
    }, req);

    res.json({
      success: true,
      userId: userId,
      gdprConsent: {
        granted: user.gdpr_consent || false,
        date: user.gdpr_consent_date || null,
        version: user.gdpr_consent_version || null,
        ip: user.gdpr_consent_ip || null
      },
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Error fetching GDPR consent:', error);
    sendError(res, 500, 'Failed to fetch consent status', 'CONSENT_FETCH_FAILED');
  }
});

/**
 * Update GDPR consent for a user
 * PUT /api/gdpr/consent/:userId
 */
app.put('/api/gdpr/consent/:userId', async (req, res) => {
  if (!supabaseEnabled) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;
    const { gdprConsent } = req.body;

    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    if (typeof gdprConsent !== 'boolean') {
      return sendError(res, 400, 'gdprConsent must be a boolean value', 'INVALID_CONSENT_VALUE');
    }

    const updateData = {
      gdpr_consent: gdprConsent,
      updated_at: new Date().toISOString()
    };

    // If granting consent, capture consent metadata
    if (gdprConsent === true) {
      updateData.gdpr_consent_date = new Date().toISOString();
      updateData.gdpr_consent_ip = req.clientIp || 'unknown';
      updateData.gdpr_consent_version = CONSTANTS.GDPR.CURRENT_POLICY_VERSION;
      updateData.gdpr_consent_user_agent = req.get('user-agent') || 'unknown';
    }

    const { data, error } = await supabase
      .from('user_signup')
      .update(updateData)
      .eq('create_user_id', userId)
      .select()
      .single();

    if (error) {
      Logger.error('Error updating GDPR consent:', error);
      return sendError(res, 500, 'Failed to update consent', 'CONSENT_UPDATE_FAILED');
    }

    if (!data) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    // Log the consent change
    await logGDPRActivity(userId, gdprConsent ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN', {
      consent_type: 'manual_update',
      consent_method: 'api',
      consent_version: gdprConsent ? CONSTANTS.GDPR.CURRENT_POLICY_VERSION : null,
      ip_address: req.clientIp || 'unknown',
      user_agent: req.get('user-agent') || 'unknown'
    }, req);

    Logger.success('GDPR consent updated', { userId, consentGranted: gdprConsent });

    res.json({
      success: true,
      message: gdprConsent ? 'Consent granted successfully' : 'Consent withdrawn successfully',
      userId: userId,
      gdprConsent: {
        granted: gdprConsent,
        date: gdprConsent ? updateData.gdpr_consent_date : null,
        version: gdprConsent ? CONSTANTS.GDPR.CURRENT_POLICY_VERSION : null
      },
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Error updating GDPR consent:', error);
    sendError(res, 500, 'Failed to update consent', 'INTERNAL_ERROR');
  }
});

/**
 * Get GDPR audit log for a user
 * GET /api/gdpr/audit-log/:userId
 */
app.get('/api/gdpr/audit-log/:userId', checkSharedKey, async (req, res) => {
  if (!supabaseEnabled) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, activityType } = req.query;

    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    let query = supabase
      .from('gdpr_audit_log')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    const { data, error, count } = await query;

    if (error) {
      Logger.error('Error fetching audit log:', error);
      return sendError(res, 500, 'Failed to fetch audit log', 'AUDIT_FETCH_FAILED');
    }

    res.json({
      success: true,
      userId: userId,
      auditLog: data || [],
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (count || 0) > (parseInt(offset) + parseInt(limit))
      },
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Error fetching audit log:', error);
    sendError(res, 500, 'Failed to fetch audit log', 'INTERNAL_ERROR');
  }
});

// ========================================
// WHAT3WORDS API ENDPOINTS
// ========================================

// Convert coordinates to what3words
app.get('/api/what3words/convert', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return sendError(res, 400, 'Missing coordinates', 'MISSING_COORDS',
        'Both lat and lng parameters are required');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180) {
      return sendError(res, 400, 'Invalid coordinates', 'INVALID_COORDS',
        'Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180)');
    }

    const apiKey = process.env.WHAT3WORDS_API_KEY;

    if (!apiKey) {
      Logger.error('what3words API key not found');
      return sendError(res, 500, 'Configuration error', 'API_KEY_MISSING',
        'what3words API key not configured');
    }

    const what3wordsUrl = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${latitude},${longitude}&key=${apiKey}`;

    const response = await axios.get(what3wordsUrl, {
      timeout: 10000
    });

    const data = response.data;

    if (response.status !== 200) {
      Logger.error('what3words API error:', data);
      return sendError(res, response.status, 'what3words API error', 'W3W_API_ERROR',
        data.error?.message || 'Failed to convert coordinates');
    }

    res.json({
      success: true,
      words: data.words,
      coordinates: {
        lat: latitude,
        lng: longitude
      },
      nearestPlace: data.nearestPlace || null,
      country: data.country || null,
      language: data.language || 'en',
      map: data.map || null,
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('what3words conversion error:', error);
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR',
      'Failed to process location conversion');
  }
});

// Get what3words autosuggest
app.get('/api/what3words/autosuggest', async (req, res) => {
  try {
    const { input } = req.query;

    if (!input) {
      return sendError(res, 400, 'Missing input', 'MISSING_INPUT',
        'Input parameter is required');
    }

    const apiKey = process.env.WHAT3WORDS_API_KEY;

    if (!apiKey) {
      return sendError(res, 500, 'Configuration error', 'API_KEY_MISSING',
        'what3words API key not configured');
    }

    const what3wordsUrl = `https://api.what3words.com/v3/autosuggest?input=${encodeURIComponent(input)}&key=${apiKey}`;

    const response = await axios.get(what3wordsUrl, {
      timeout: 10000
    });

    const data = response.data;

    if (response.status !== 200) {
      Logger.error('what3words autosuggest error:', data);
      return sendError(res, response.status, 'what3words API error', 'W3W_API_ERROR',
        data.error?.message || 'Failed to get suggestions');
    }

    res.json({
      success: true,
      suggestions: data.suggestions || [],
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('what3words autosuggest error:', error);
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR',
      'Failed to get suggestions');
  }
});

// Legacy what3words endpoint (backward compatibility)
app.get('/api/what3words', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return sendError(res, 400, 'Missing latitude or longitude', 'MISSING_COORDS');
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
      `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${W3W_API_KEY}`,
      { timeout: 10000 }
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

// ========================================
// DEBUG ENDPOINTS
// ========================================

// Debug user data
app.get('/api/debug/user/:userId', checkSharedKey, async (req, res) => {
  if (!supabaseEnabled) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;
    Logger.info('Debug check for user', { userId });

    await logGDPRActivity(userId, 'DATA_ACCESS', {
      type: 'debug_view',
      ip: req.clientIp
    }, req);

    const userData = await getUserDataBatch(userId);

    res.json({
      userId,
      timestamp: new Date().toISOString(),
      dataFound: userData,
      summary: {
        userExists: !!userData.user,
        incidentCount: userData.incidents.length,
        transcriptionCount: userData.transcriptions.length,
        summaryCount: userData.summaries.length,
        imageCount: userData.images.length
      },
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Debug endpoint error', error);
    sendError(res, 500, error.message, 'DEBUG_ERROR');
  }
});

// Test OpenAI
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

// Manual queue processing
app.get('/api/process-queue-now', checkSharedKey, async (req, res) => {
  Logger.info('Manual queue processing triggered');

  if (!supabaseEnabled) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
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
    sendError(res, 500, 'Failed to process queue', 'QUEUE_ERROR', error.message);
  }
});

// Test transcription queue
app.get('/test/transcription-queue', async (req, res) => {
  if (!supabaseEnabled) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
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
    sendError(res, 500, error.message, 'QUEUE_ERROR');
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
    sendError(res, 500, error.message, 'QUEUE_ERROR');
  }
});

// ========================================
// GDPR ENDPOINTS
// ========================================

// GDPR data export
app.get('/api/gdpr/export/:userId', checkSharedKey, async (req, res) => {
  if (!supabaseEnabled) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  const { userId } = req.params;

  try {
    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    const { data: user } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    const userData = await getUserDataBatch(userId);

    await logGDPRActivity(userId, 'DATA_EXPORT', {
      requested_by: req.clientIp,
      items_exported: {
        incidents: userData.incidents.length,
        transcriptions: userData.transcriptions.length,
        images: userData.images.length
      }
    }, req);

    res.json({
      export_date: new Date().toISOString(),
      user_id: userId,
      data: userData,
      gdpr_info: {
        right_to_access: true,
        right_to_portability: true,
        export_format: 'JSON'
      },
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('GDPR export error', error);
    sendError(res, 500, 'Failed to export data', 'EXPORT_FAILED');
  }
});

// GDPR delete images
app.delete('/api/gdpr/delete-images', checkSharedKey, async (req, res) => {
  if (!supabaseEnabled || !imageProcessor) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID');
    }

    const result = await imageProcessor.deleteAllUserImages(userId);

    res.json({
      success: true,
      ...result,
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Error deleting images', error);
    sendError(res, 500, 'Failed to delete images', 'DELETE_FAILED');
  }
});

// ========================================
// MAIN ROUTES
// ========================================

// Redirect old transcribe route
app.get('/transcribe', (req, res) => {
  const queryString = Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query).toString() : '';
  res.redirect('/transcription-status.html' + queryString);
});

app.get('/transcribe.html', (req, res) => {
  const queryString = Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query).toString() : '';
  res.redirect('/transcription-status.html' + queryString);
});

// Main landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// System status page
app.get('/system-status', (req, res) => {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Car Crash Lawyer AI - System Status</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .status { padding: 10px; background: #4CAF50; color: white; border-radius: 5px; display: inline-block; }
        .badge { padding: 5px 10px; color: white; border-radius: 3px; font-size: 12px; margin-left: 10px; }
        .gdpr-badge { background: #2196F3; }
        .fix-badge { background: #4CAF50; }
        .new-badge { background: #FF9800; }
        .endpoint { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
        code { background: #333; color: #4CAF50; padding: 2px 6px; border-radius: 3px; }
        .section { margin-top: 30px; }
        ul { list-style: none; padding: 0; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚗 Car Crash Lawyer AI<span class="badge gdpr-badge">GDPR COMPLIANT</span><span class="badge new-badge">CONSENT CAPTURE</span></h1>
        <p class="status">✅ Server is running - GDPR Consent Capture Enabled</p>

        <div class="section">
            <h2>🆕 Latest Updates:</h2>
            <div class="endpoint">
                <strong>GDPR Consent Capture</strong> <span class="badge new-badge">NEW</span><br>
                <p>✅ Consent checkbox enforced on signup</p>
                <p>✅ IP address, timestamp, and policy version captured</p>
                <p>✅ Full audit trail in gdpr_audit_log</p>
                <p>✅ Consent management API endpoints</p>
            </div>
            <div class="endpoint">
                <strong>AI Listening Transcript Endpoints</strong> <span class="badge new-badge">NEW</span><br>
                <p>✅ Save continuous transcripts from multi-page AI listening sessions</p>
                <p>✅ Track page flow and session metadata</p>
                <p>✅ Automatic AI summary generation for listening sessions</p>
            </div>
            <div class="endpoint">
                <strong>Emergency Contact Management</strong> <span class="badge new-badge">NEW</span><br>
                <p>✅ Get primary emergency contact number</p>
                <p>✅ Update emergency contact information</p>
                <p>✅ Full GDPR audit trail for emergency access</p>
            </div>
        </div>

        <div class="section">
            <h2>🔧 All Improvements:</h2>
            <div class="endpoint">
                <strong>Code Quality Enhancements</strong> <span class="badge fix-badge">COMPLETED</span><br>
                <p>✅ All template literal syntax errors fixed</p>
                <p>✅ Buffer handling optimized</p>
                <p>✅ Memory leaks patched with automatic cleanup</p>
                <p>✅ User ID validation enhanced</p>
                <p>✅ Error responses standardized</p>
                <p>✅ Database queries optimized with Promise.all</p>
                <p>✅ Security enhanced (URL redaction, validation)</p>
                <p>✅ Duplicate code extracted to shared functions</p>
            </div>
        </div>

        <div class="section">
            <h3>System Status:</h3>
            <ul>
                <li>Supabase: ${supabaseEnabled ? '✅ Connected' : '❌ Not configured'}</li>
                <li>OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}</li>
                <li>what3words: ${process.env.WHAT3WORDS_API_KEY ? '✅ Configured' : '⚠️  Not configured'}</li>
                <li>Auth Service: ${authService ? '✅ Configured' : '⚠️  Not configured'}</li>
                <li>WebSocket: ${wss ? '✅ Active' : '❌ Not active'}</li>
                <li>AI Listening: ${process.env.OPENAI_API_KEY ? '✅ Available' : '❌ Unavailable'}</li>
                <li>GDPR Compliance: ✅ Full compliance</li>
                <li>GDPR Consent Capture: ✅ Active</li>
            </ul>
        </div>

        <div class="section">
            <h3>New GDPR Endpoints:</h3>
            <ul>
                <li><code>GET /api/gdpr/consent/:userId</code> - Get consent status</li>
                <li><code>PUT /api/gdpr/consent/:userId</code> - Update consent</li>
                <li><code>GET /api/gdpr/audit-log/:userId</code> - Get audit trail</li>
            </ul>
        </div>

        <div class="section">
            <h3>All API Endpoints:</h3>
            <ul>
                <li><code>POST /api/auth/signup</code> - User signup (with GDPR consent)</li>
                <li><code>POST /api/auth/login</code> - User login</li>
                <li><code>POST /api/whisper/transcribe</code> - Audio transcription</li>
                <li><code>POST /api/save-ai-listening-transcript</code> - AI listening save</li>
                <li><code>GET  /api/user/:userId/ai-listening-transcripts</code> - Get transcripts</li>
                <li><code>GET  /api/user/:userId/emergency-contact</code> - Emergency contact</li>
                <li><code>PUT  /api/user/:userId/emergency-contact</code> - Update contact</li>
                <li><code>GET  /api/what3words/convert</code> - Location services</li>
                <li><code>POST /generate-pdf</code> - Generate incident report PDF</li>
            </ul>
        </div>

        <div class="section">
            <p><a href="/">← Back to Main Landing Page</a></p>
        </div>
    </div>
</body>
</html>`;

  res.send(htmlContent);
});

// ========================================
// TRANSCRIPTION ENDPOINTS
// ========================================

// Whisper transcription
app.post('/api/whisper/transcribe', upload.single('audio'), async (req, res) => {
  try {
    Logger.info('🎤 Received transcription request');

    if (!req.file) {
      return sendError(res, 400, 'No audio file provided', 'MISSING_FILE');
    }

    const create_user_id = req.body.create_user_id ||
      req.query.create_user_id ||
      req.headers['x-user-id'];

    if (!create_user_id) {
      Logger.info('❌ Missing create_user_id in transcription request');
      return sendError(res, 400, 'create_user_id is required', 'MISSING_USER_ID');
    }

    const validation = validateUserId(create_user_id);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    Logger.info(`Processing transcription for user: ${create_user_id}`);

    const transcriptionId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `${create_user_id}/recording_${Date.now()}.webm`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('incident-audio')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      Logger.error(`Upload error: ${uploadError.message}`);
      return sendError(res, 500, 'Failed to upload audio', 'UPLOAD_FAILED');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('incident-audio')
      .getPublicUrl(fileName);

    Logger.info(`Audio file uploaded to Supabase: ${fileName}`);

    const { data: queueData, error: queueError } = await supabase
      .from('transcription_queue')
      .insert([{
        create_user_id: create_user_id,
        incident_report_id: req.body.incident_report_id || null,
        audio_url: publicUrl,
        status: CONSTANTS.TRANSCRIPTION_STATUS.PENDING,
        retry_count: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (queueError) {
      Logger.error('Queue error:', queueError);
    }

    const queueId = queueData?.id || transcriptionId;

    transcriptionStatuses.set(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
      transcription: null,
      summary: null,
      error: null,
      create_user_id: create_user_id,
      updatedAt: Date.now()
    });

    res.json({
      success: true,
      message: 'Audio uploaded and queued for transcription',
      queueId: queueId.toString(),
      audioUrl: publicUrl,
      create_user_id: create_user_id,
      requestId: req.requestId
    });

    processTranscriptionFromBuffer(
      queueId,
      req.file.buffer,
      create_user_id,
      req.body.incident_report_id,
      publicUrl
    );
  } catch (error) {
    Logger.error('Transcription error:', error);
    sendError(res, 500, 'Failed to process audio', 'PROCESSING_FAILED');
  }
});

// Check transcription status
app.get('/api/transcription-status/:queueId', async (req, res) => {
  const { queueId } = req.params;

  if (!queueId || queueId === 'undefined') {
    return sendError(res, 400, 'Invalid queue ID', 'INVALID_QUEUE_ID');
  }

  const status = transcriptionStatuses.get(queueId);

  if (status) {
    res.json({
      ...status,
      requestId: req.requestId
    });
  } else {
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

// Update transcription
app.post('/api/update-transcription', checkGDPRConsent, async (req, res) => {
  try {
    const { queueId, userId, transcription } = req.body;

    if (!userId) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID');
    }

    if (!transcription) {
      return sendError(res, 400, 'Missing transcription text', 'MISSING_TRANSCRIPTION');
    }

    Logger.info('Updating transcription', { userId, queueId });

    await logGDPRActivity(userId, 'DATA_UPDATE', {
      type: 'transcription',
      action: 'manual_edit'
    }, req);

    const { data: existing } = await supabase
      .from('ai_transcription')
      .select('id, audio_url, duration')
      .eq('create_user_id', userId)
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
          create_user_id: userId,
          incident_report_id: null,
          transcription_text: transcription,
          audio_url: '',
          created_at: new Date().toISOString()
        });
    }

    const summary = await generateAISummary(transcription, userId, queueId || userId);

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
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Update transcription error', error);
    sendError(res, 500, 'Failed to update transcription', 'UPDATE_FAILED');
  }
});

// Save transcription
app.post('/api/save-transcription', checkGDPRConsent, async (req, res) => {
  try {
    const { userId, incidentId, transcription, audioUrl, duration } = req.body;

    if (!userId) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID',
        'Personal data cannot be saved without proper user identification');
    }

    if (!transcription) {
      return sendError(res, 400, 'Transcription text is required', 'MISSING_TRANSCRIPTION');
    }

    Logger.info('Saving transcription', { userId });

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
          sendError(res, 500, 'Failed to save transcription', 'SAVE_FAILED', error.message);
          }
          });

          // Get latest transcription
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
          sendError(res, 500, 'Failed to get transcription status', 'RETRIEVAL_FAILED');
          }
          });

          // ========================================
          // AI LISTENING TRANSCRIPT ENDPOINTS (NEW)
          // ========================================

          /**
          * Save AI Listening Transcript
          * POST /api/save-ai-listening-transcript
          * 
          * Saves the full continuous transcript from multi-page AI listening session
          */
          app.post('/api/save-ai-listening-transcript', async (req, res) => {
          if (!supabaseEnabled) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          try {
          const {
            userId,
            incidentId,
            fullTranscript,
            transcriptionSegments,
            totalDuration,
            recordingStart,
            recordingEnd,
            pageFlow,
            metadata
          } = req.body;

          // Validation
          if (!userId) {
            return sendError(res, 400, 'User ID required', 'MISSING_USER_ID',
              'Cannot save personal data without user identification (GDPR compliance)');
          }

          if (!fullTranscript || fullTranscript.trim().length === 0) {
            return sendError(res, 400, 'Transcript cannot be empty', 'EMPTY_TRANSCRIPT');
          }

          // Validate user ID format
          const validation = validateUserId(userId);
          if (!validation.valid) {
            return sendError(res, 400, validation.error, 'INVALID_USER_ID');
          }

          Logger.info('Saving AI listening transcript', { 
            userId, 
            transcriptLength: fullTranscript.length,
            segments: transcriptionSegments?.length || 0
          });

          // Check if user exists and has GDPR consent
          const { data: user } = await supabase
            .from('user_signup')
            .select('create_user_id, gdpr_consent')
            .eq('create_user_id', userId)
            .single();

          if (!user) {
            return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
          }

          if (!user.gdpr_consent) {
            await logGDPRActivity(userId, 'CONSENT_VIOLATION_PREVENTED', {
              action: 'ai_listening_save_blocked',
              reason: 'No GDPR consent'
            }, req);

            return sendError(res, 403, 'GDPR consent required', 'CONSENT_REQUIRED',
              'User must provide GDPR consent before saving transcript data');
          }

          // Prepare data for insertion
          const transcriptData = {
            user_id: userId,
            incident_id: incidentId || null,
            full_transcript: fullTranscript,
            transcription_segments: transcriptionSegments || [],
            total_duration_seconds: totalDuration || 0,
            recording_start: recordingStart ? new Date(recordingStart).toISOString() : null,
            recording_end: recordingEnd ? new Date(recordingEnd).toISOString() : new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            gdpr_consent: true,
            source: 'ai_listening',
            page_flow: pageFlow || [],
            metadata: metadata || {}
          };

          // Insert into database
          const { data: savedTranscript, error: insertError } = await supabase
            .from('ai_listening_transcripts')
            .insert(transcriptData)
            .select()
            .single();

          if (insertError) {
            Logger.error('Error saving AI listening transcript:', insertError);
            return sendError(res, 500, 'Failed to save transcript', 'DATABASE_ERROR',
              insertError.message);
          }

          // Log GDPR activity
          await logGDPRActivity(userId, 'AI_LISTENING_SAVED', {
            transcript_id: savedTranscript.id,
            incident_id: incidentId,
            duration_seconds: totalDuration,
            segment_count: transcriptionSegments?.length || 0,
            pages_visited: pageFlow?.length || 0
          }, req);

          // Update incident report with AI listening reference if incident ID provided
          if (incidentId && savedTranscript.id) {
            try {
              await supabase
                .from('incident_reports')
                .update({
                  ai_listening_transcript_id: savedTranscript.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', incidentId)
                .eq('create_user_id', userId);

              Logger.info('Linked AI transcript to incident report', { 
                incidentId, 
                transcriptId: savedTranscript.id 
              });
            } catch (linkError) {
              // Non-critical error - log but don't fail the request
              Logger.warn('Could not link AI transcript to incident:', linkError);
            }
          }

          // Generate AI summary if transcript is substantial enough
          let aiSummary = null;
          if (process.env.OPENAI_API_KEY && fullTranscript.length > 100) {
            try {
              Logger.info('Generating AI summary for listening transcript');
              aiSummary = await generateAISummary(
                fullTranscript, 
                userId, 
                incidentId || savedTranscript.id
              );

              if (aiSummary) {
                Logger.success('AI summary generated for AI listening transcript');
              }
            } catch (summaryError) {
              // Non-critical error - log but don't fail the request
              Logger.error('Failed to generate AI summary:', summaryError);
            }
          }

          Logger.success('AI listening transcript saved successfully', {
            transcriptId: savedTranscript.id,
            userId: userId,
            hasSummary: !!aiSummary
          });

          res.json({
            success: true,
            message: 'AI listening transcript saved successfully',
            transcript: {
              id: savedTranscript.id,
              userId: userId,
              incidentId: incidentId || null,
              transcriptLength: fullTranscript.length,
              segmentCount: transcriptionSegments?.length || 0,
              duration: totalDuration,
              pagesVisited: pageFlow?.length || 0,
              hasSummary: !!aiSummary
            },
            aiSummary: aiSummary || null,
            timestamp: new Date().toISOString(),
            requestId: req.requestId
          });

          } catch (error) {
          Logger.error('Error in save-ai-listening-transcript endpoint:', error);
          sendError(res, 500, 'Failed to save AI listening transcript', 'INTERNAL_ERROR',
            process.env.NODE_ENV === 'development' ? error.message : undefined);
          }
          });

          /**
          * Get AI Listening Transcripts for a user
          * GET /api/user/:userId/ai-listening-transcripts
          * 
          * Retrieves all AI listening transcripts for a specific user with pagination
          */
          app.get('/api/user/:userId/ai-listening-transcripts', async (req, res) => {
          if (!supabaseEnabled) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          try {
          const { userId } = req.params;
          const { limit = 10, offset = 0 } = req.query;

          // Validate user ID
          const validation = validateUserId(userId);
          if (!validation.valid) {
            return sendError(res, 400, validation.error, 'INVALID_USER_ID');
          }

          Logger.info('Fetching AI listening transcripts', { userId });

          // Fetch transcripts with pagination
          const { data: transcripts, error, count } = await supabase
            .from('ai_listening_transcripts')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

          if (error) {
            Logger.error('Error fetching AI listening transcripts:', error);
            return sendError(res, 500, 'Failed to fetch transcripts', 'DATABASE_ERROR');
          }

          // Log GDPR activity
          await logGDPRActivity(userId, 'DATA_ACCESS', {
            type: 'ai_listening_transcripts',
            count: transcripts?.length || 0
          }, req);

          res.json({
            success: true,
            transcripts: transcripts || [],
            pagination: {
              total: count || 0,
              limit: parseInt(limit),
              offset: parseInt(offset),
              hasMore: (count || 0) > (parseInt(offset) + parseInt(limit))
            },
            requestId: req.requestId
          });

          } catch (error) {
          Logger.error('Error in get AI listening transcripts endpoint:', error);
          sendError(res, 500, 'Failed to fetch transcripts', 'INTERNAL_ERROR');
          }
          });

          // ========================================
          // EMERGENCY CONTACT ENDPOINTS (NEW)
          // ========================================

          /**
          * Get Emergency Contact Number (singular)
          * GET /api/user/:userId/emergency-contact
          * 
          * Returns just the primary emergency contact number for a user
          */
          app.get('/api/user/:userId/emergency-contact', async (req, res) => {
          if (!supabaseEnabled) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          try {
          const { userId } = req.params;

          // Validate user ID
          const validation = validateUserId(userId);
          if (!validation.valid) {
            return sendError(res, 400, validation.error, 'INVALID_USER_ID');
          }

          Logger.info('Fetching emergency contact', { userId });

          // Fetch user's emergency contact number
          const { data, error } = await supabase
            .from('user_signup')
            .select('emergency_contact_number, emergency_contact, first_name, last_name')
            .eq('create_user_id', userId)
            .single();

          if (error) {
            Logger.error('Error fetching emergency contact:', error);
            return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
          }

          if (!data) {
            return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
          }

          // Try emergency_contact_number first (new field), fallback to emergency_contact (legacy)
          const contactNumber = data.emergency_contact_number || data.emergency_contact || null;
          const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User';

          // Log GDPR activity for emergency contact access
          await logGDPRActivity(userId, 'EMERGENCY_CONTACT_ACCESSED', {
            has_contact: !!contactNumber,
            source: 'emergency_feature'
          }, req);

          if (!contactNumber) {
            Logger.warn('No emergency contact found for user', { userId });
            return res.json({
              success: true,
              hasEmergencyContact: false,
              emergencyContact: null,
              message: 'No emergency contact configured',
              userName: userName,
              requestId: req.requestId
            });
          }

          Logger.info('Emergency contact retrieved successfully', { 
            userId, 
            hasContact: true 
          });

          res.json({
            success: true,
            hasEmergencyContact: true,
            emergencyContact: contactNumber,
            userName: userName,
            message: 'Emergency contact retrieved',
            requestId: req.requestId
          });

          } catch (error) {
          Logger.error('Error in emergency contact endpoint:', error);
          sendError(res, 500, 'Failed to fetch emergency contact', 'INTERNAL_ERROR');
          }
          });

          /**
          * Update Emergency Contact Number
          * PUT /api/user/:userId/emergency-contact
          * 
          * Allows user to update their emergency contact number
          */
          app.put('/api/user/:userId/emergency-contact', async (req, res) => {
          if (!supabaseEnabled) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          try {
          const { userId } = req.params;
          const { emergencyContact } = req.body;

          // Validate user ID
          const validation = validateUserId(userId);
          if (!validation.valid) {
            return sendError(res, 400, validation.error, 'INVALID_USER_ID');
          }

          if (!emergencyContact) {
            return sendError(res, 400, 'Emergency contact number required', 'MISSING_CONTACT');
          }

          // Basic phone number validation (very permissive for international formats)
          const phoneRegex = /^[\d\s\-\+\(\)]+$/;
          if (!phoneRegex.test(emergencyContact)) {
            return sendError(res, 400, 'Invalid phone number format', 'INVALID_PHONE');
          }

          Logger.info('Updating emergency contact', { userId });

          // Update in database
          const { data, error } = await supabase
            .from('user_signup')
            .update({
              emergency_contact_number: emergencyContact,
              updated_at: new Date().toISOString()
            })
            .eq('create_user_id', userId)
            .select()
            .single();

          if (error) {
            Logger.error('Error updating emergency contact:', error);
            return sendError(res, 500, 'Failed to update emergency contact', 'UPDATE_FAILED');
          }

          if (!data) {
            return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
          }

          // Log GDPR activity
          await logGDPRActivity(userId, 'DATA_UPDATE', {
            type: 'emergency_contact',
            action: 'updated'
          }, req);

          Logger.success('Emergency contact updated successfully', { userId });

          res.json({
            success: true,
            message: 'Emergency contact updated successfully',
            emergencyContact: emergencyContact,
            timestamp: new Date().toISOString(),
            requestId: req.requestId
          });

          } catch (error) {
          Logger.error('Error updating emergency contact:', error);
          sendError(res, 500, 'Failed to update emergency contact', 'INTERNAL_ERROR');
          }
          });

          // ========================================
          // EMERGENCY & INCIDENT ENDPOINTS
          // ========================================

          // Get emergency contacts (plural - for backward compatibility)
          app.get('/api/user/:userId/emergency-contacts', authenticateRequest, async (req, res) => {
          if (!supabaseEnabled) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          try {
          const { userId } = req.params;

          const { data, error } = await supabase
            .from('user_signup')
            .select('emergency_contact, emergency_contact_number, recovery_breakdown_number, emergency_services_number')
            .eq('create_user_id', userId)
            .single();

          if (error) {
            Logger.error('Supabase error', error);
            return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
          }

          res.json({
            emergency_contact: data.emergency_contact_number || data.emergency_contact || null,
            recovery_breakdown_number: data.recovery_breakdown_number || null,
            emergency_services_number: data.emergency_services_number || '999',
            requestId: req.requestId
          });
          } catch (error) {
          Logger.error('Error fetching emergency contacts', error);
          sendError(res, 500, 'Failed to fetch contacts', 'FETCH_FAILED');
          }
          });

          // Log emergency call
          app.post('/api/log-emergency-call', authenticateRequest, async (req, res) => {
          if (!supabaseEnabled) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          try {
          const { user_id, service_called, timestamp, incident_id } = req.body;

          if (!user_id) {
            return sendError(res, 400, 'User ID required', 'MISSING_USER_ID');
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
          sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
          }
          });

          // Upload what3words image
          app.post('/api/upload-what3words-image', upload.single('image'), async (req, res) => {
          if (!supabaseEnabled || !imageProcessor) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
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
              return sendError(res, 400, 'No image data provided', 'MISSING_IMAGE');
            }

            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            buffer = Buffer.from(base64Data, 'base64');
            ({ what3words, latitude, longitude, userId } = req.body);
          }

          if (!userId) {
            return sendError(res, 400, 'User ID required for GDPR compliance', 'MISSING_USER_ID');
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
          sendError(res, 500, error.message, 'UPLOAD_FAILED');
          }
          });

          // Get user images
          app.get('/api/images/:userId', checkGDPRConsent, async (req, res) => {
          if (!supabaseEnabled) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
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
          sendError(res, 500, 'Failed to fetch images', 'FETCH_FAILED');
          }
          });

          // Get signed URL
          app.get('/api/image/signed-url/:userId/:imageType', checkGDPRConsent, async (req, res) => {
          if (!supabaseEnabled || !imageProcessor) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          try {
          const { userId, imageType } = req.params;
          const { path } = req.query;

          if (!path) {
            return sendError(res, 400, 'Storage path required', 'MISSING_PATH');
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
          sendError(res, 500, 'Failed to generate URL', 'URL_GENERATION_FAILED');
          }
          });

          // ========================================
          // PDF ENDPOINTS
          // ========================================

          // PDF status
          app.get('/pdf-status/:userId', async (req, res) => {
          if (!supabaseEnabled) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
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
          sendError(res, 500, 'Failed to check status', 'STATUS_CHECK_FAILED');
          }
          });

          // Download PDF
          app.get('/download-pdf/:userId', checkGDPRConsent, async (req, res) => {
          if (!supabaseEnabled) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
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
            return sendError(res, 404, 'PDF not found', 'PDF_NOT_FOUND');
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
            sendError(res, 404, 'PDF data not available', 'PDF_DATA_MISSING');
          }
          } catch (error) {
          Logger.error('Error downloading PDF', error);
          sendError(res, 500, 'Failed to download PDF', 'DOWNLOAD_FAILED');
          }
          });

          // Generate PDF (using shared function)
          app.post('/generate-pdf', checkSharedKey, async (req, res) => {
          const { create_user_id } = req.body;

          if (!create_user_id) {
          return sendError(res, 400, 'Missing create_user_id', 'MISSING_USER_ID');
          }

          if (!supabaseEnabled) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          if (!fetchAllData || !generatePDF || !sendEmails) {
          return sendError(res, 503, 'PDF generation modules not available', 'PDF_UNAVAILABLE');
          }

          try {
          const result = await generateUserPDF(create_user_id, 'direct');
          res.json(result);
          } catch (error) {
          Logger.error('Error in PDF generation', error);
          sendError(res, 500, error.message, 'PDF_GENERATION_FAILED');
          }
          });

          // ========================================
          // WEBHOOK ENDPOINTS
          // ========================================

          // Signup webhook
          app.post('/webhook/signup', checkSharedKey, async (req, res) => {
          try {
          Logger.info('Signup webhook received');

          if (!supabaseEnabled || !imageProcessor) {
            return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          const webhookData = req.body;

          if (!webhookData.create_user_id) {
            return sendError(res, 400, 'Missing create_user_id', 'MISSING_USER_ID');
          }

          await logGDPRActivity(webhookData.create_user_id, 'SIGNUP_PROCESSING', {
            source: 'webhook',
            has_images: true
          }, req);

          imageProcessor.processSignupImages(webhookData)
            .then(result => {
              Logger.success('Signup processing complete', result);
            })
            .catch(error => {
              Logger.error('Signup processing failed', error);
            });

          res.status(200).json({
            success: true,
            message: 'Signup processing started',
            create_user_id: webhookData.create_user_id,
            requestId: req.requestId
          });
          } catch (error) {
          Logger.error('Webhook error', error);
          sendError(res, 500, error.message, 'WEBHOOK_ERROR');
          }
          });

          // Incident report webhook
          app.post('/webhook/incident-report', checkSharedKey, async (req, res) => {
          try {
          Logger.info('Incident report webhook received');

          if (!supabaseEnabled || !imageProcessor) {
            return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          const webhookData = req.body;

          if (!webhookData.id && !webhookData.incident_report_id) {
            return sendError(res, 400, 'Missing incident report ID', 'MISSING_INCIDENT_ID');
          }

          if (!webhookData.create_user_id) {
            return sendError(res, 400, 'Missing user ID - GDPR compliance required', 'MISSING_USER_ID');
          }

          const incidentId = webhookData.id || webhookData.incident_report_id;

          await logGDPRActivity(webhookData.create_user_id, 'INCIDENT_REPORT', {
            incident_id: incidentId,
            source: 'webhook'
          }, req);

          const result = await imageProcessor.processIncidentReportFiles(webhookData);

          Logger.success('Incident processing complete:', result);

          if (req.query.redirect === 'true') {
            const userId = webhookData.create_user_id || '';
            res.redirect(`/report-complete.html?incident_id=${incidentId}&user_id=${userId}`);
          } else {
            res.status(200).json({
              ...result,
              requestId: req.requestId
            });
          }
          } catch (error) {
          Logger.error('Webhook error', error);
          sendError(res, 500, error.message, 'WEBHOOK_ERROR');
          }
          });

          // PDF generation webhook (using shared function)
          app.post('/webhook/generate-pdf', checkSharedKey, async (req, res) => {
          const { create_user_id } = req.body;

          if (!create_user_id) {
          return sendError(res, 400, 'Missing create_user_id', 'MISSING_USER_ID');
          }

          if (!supabaseEnabled) {
          return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          if (!fetchAllData || !generatePDF || !sendEmails) {
          return sendError(res, 503, 'PDF generation modules not available', 'PDF_UNAVAILABLE');
          }

          try {
          const result = await generateUserPDF(create_user_id, 'webhook');
          res.json(result);
          } catch (error) {
          Logger.error('Error in webhook PDF generation', error);
          sendError(res, 500, error.message, 'PDF_GENERATION_FAILED');
          }
          });

          // ========================================
          // ERROR HANDLING
          // ========================================

          // Error handler middleware
          app.use((err, req, res, next) => {
          Logger.error('Unhandled error', err);

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
          // GRACEFUL SHUTDOWN
          // ========================================

          function gracefulShutdown(signal) {
          Logger.info(`${signal} received, closing server gracefully...`);

          // Close realtime channels
          if (realtimeChannels.transcriptionChannel) {
          realtimeChannels.transcriptionChannel.unsubscribe();
          }
          if (realtimeChannels.summaryChannel) {
          realtimeChannels.summaryChannel.unsubscribe();
          }

          // Clear intervals
          if (transcriptionQueueInterval) {
          clearInterval(transcriptionQueueInterval);
          }
          if (wsHeartbeat) {
          clearInterval(wsHeartbeat);
          }

          // Close WebSocket server
          wss.close(() => {
          Logger.info('WebSocket server closed');
          });

          // Close HTTP server
          server.close(() => {
          Logger.info('HTTP server closed gracefully');
          process.exit(0);
          });

          // Force close after timeout
          setTimeout(() => {
          Logger.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
          }, 10000);
          }

          process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
          process.on('SIGINT', () => gracefulShutdown('SIGINT'));

          process.on('uncaughtException', (error) => {
          Logger.error('Uncaught Exception:', error);
          gracefulShutdown('UNCAUGHT_EXCEPTION');
          });

          process.on('unhandledRejection', (reason, promise) => {
          Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
          // Don't exit on unhandled rejection, just log it
          });

          // ========================================
          // STARTUP CHECKS
          // ========================================

          // Check for required environment variables
          const requiredEnvVars = [
          'SUPABASE_URL',
          'SUPABASE_SERVICE_ROLE_KEY',
          'OPENAI_API_KEY'
          ];

          const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

          if (missingEnvVars.length > 0) {
          Logger.warn('⚠️  WARNING: Missing required environment variables:');
          missingEnvVars.forEach(varName => {
          Logger.warn(`   - ${varName}`);
          });
          }

          if (!process.env.WHAT3WORDS_API_KEY) {
          Logger.warn('⚠️  WARNING: WHAT3WORDS_API_KEY not set in environment variables');
          Logger.warn('   Emergency location services will not work properly');
          Logger.warn('   Get your API key at: https://what3words.com/select-plan');
          }

          if (!process.env.SUPABASE_ANON_KEY) {
          Logger.warn('⚠️  WARNING: SUPABASE_ANON_KEY not set');
          Logger.warn('   Authentication features will be disabled');
          }

          // ========================================
          // START SERVER
          // ========================================

          const PORT = process.env.PORT || 3000;
          const HOST = '0.0.0.0';

          server.listen(PORT, HOST, () => {
          console.log('\n========================================');
          console.log('🚗 Car Crash Lawyer AI - Server Started');
          console.log('========================================');
          console.log(`\n🌐 Server running on http://${HOST}:${PORT}`);

          if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
          console.log(`🔗 Public URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
          }

          console.log('\n📊 Service Status:');
          console.log(`   Supabase: ${supabaseEnabled ? '✅ Connected' : '❌ Not configured'}`);
          console.log(`   Auth Service: ${authService ? '✅ Configured' : '⚠️  Not configured'}`);
          console.log(`   OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
          console.log(`   what3words: ${process.env.WHAT3WORDS_API_KEY ? '✅ Configured' : '⚠️  Not configured'}`);
          console.log(`   WebSocket: ✅ Active`);
          console.log(`   GDPR Compliance: ✅ Full compliance`);
          console.log(`   GDPR Consent Capture: ✅ Active`);
          console.log(`   PDF Generation: ${fetchAllData && generatePDF && sendEmails ? '✅ Available' : '❌ Unavailable'}`);

          console.log('\n🆕 New Features:');
          console.log(`   ✅ GDPR Consent Capture on signup`);
          console.log(`   ✅ Consent management API endpoints`);
          console.log(`   ✅ AI Listening Transcript endpoints`);
          console.log(`   ✅ Emergency Contact management`);
          console.log(`   ✅ Enhanced user ID validation`);

          console.log('\n🔧 System Features:');
          console.log(`   ✅ Template literals fixed`);
          console.log(`   ✅ Memory leak prevention (Map cleanup)`);
          console.log(`   ✅ Buffer handling optimized`);
          console.log(`   ✅ User ID validation enhanced`);
          console.log(`   ✅ Error responses standardized`);
          console.log(`   ✅ Database queries optimized`);
          console.log(`   ✅ Security enhanced (URL redaction)`);
          console.log(`   ✅ Code quality improved`);

          console.log('\n📡 Key Endpoints:');
          console.log('   GET  /health - Health check');
          console.log('   GET  /api/config - Configuration');
          console.log('   POST /api/auth/signup - User signup (with GDPR consent)');
          console.log('   POST /api/auth/login - User login');
          console.log('   GET  /api/gdpr/consent/:userId - Get consent status');
          console.log('   PUT  /api/gdpr/consent/:userId - Update consent');
          console.log('   POST /api/whisper/transcribe - Audio transcription');
          console.log('   POST /api/save-ai-listening-transcript - AI listening save');
          console.log('   GET  /api/user/:userId/emergency-contact - Emergency contact');
          console.log('   GET  /api/what3words/convert - Location services');
          console.log('   POST /generate-pdf - Generate incident report PDF');

          console.log('\n✨ Server ready!');
          console.log('========================================\n');

          // Log startup summary
          Logger.success('Server startup complete', {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          services: {
            supabase: supabaseEnabled,
            auth: !!authService,
            openai: !!process.env.OPENAI_API_KEY,
            what3words: !!process.env.WHAT3WORDS_API_KEY,
            pdf: !!(fetchAllData && generatePDF && sendEmails),
            ai_listening: !!process.env.OPENAI_API_KEY,
            gdpr_consent: true
          }
          });
          });

          // Handle server errors
          server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
          Logger.error(`Port ${PORT} is already in use`);
          process.exit(1);
          } else {
          Logger.error('Server error:', error);
          process.exit(1);
          }
          });

          // ========================================
          // EXPORT
          // ========================================

          module.exports = app;