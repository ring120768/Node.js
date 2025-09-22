// ========================================
// PART 1: Core Setup, Middleware, and Classes
// Version: 2.1.0 - Enhanced GDPR Edition
// Last Updated: 2024
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
const crypto = require('crypto');
require('dotenv').config();

// Import rate limiting
const rateLimit = require('express-rate-limit');

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Import PDF generation modules - with error handling
let fetchAllData, generatePDF, sendEmails;
try {
  fetchAllData = require('./lib/dataFetcher').fetchAllData;
  generatePDF = require('./lib/pdfGenerator').generatePDF;
  sendEmails = require('./lib/emailService').sendEmails;
} catch (error) {
  console.warn('PDF generation modules not found - PDF features will be disabled', error.message);
}

// Enhanced Constants for better maintainability
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
    WHISPER_TIMEOUT: 60000,
    DOWNLOAD_TIMEOUT: 45000
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
  // NEW: Enhanced GDPR consent types
  GDPR: {
    CONSENT_TYPES: {
      DATA_SHARING: 'data_sharing_for_claim',
      MARKETING: 'marketing_communications',
      THIRD_PARTY: 'third_party_sharing',
      ANALYTICS: 'analytics_and_improvement',
      LEGAL_SUPPORT: 'legal_support_consent'
    }
  }
};

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

supabaseEnabled = initSupabase();

// --- GDPR ACTIVITY LOGGING ---
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

// --- UTILITY FUNCTIONS ---
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
      pdf_generation: !!(fetchAllData && generatePDF && sendEmails),
      enhanced_gdpr: true,
      webhook_debugging: true
    }
  });
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const externalServices = await checkExternalServices();

  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
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
      what3words: externalServices.what3words
    },
    enhancements: {
      consent_handling: 'ENHANCED - Comprehensive GDPR consent logging with multiple database updates',
      gdpr_export: 'ENHANCED - Complete GDPR-compliant data export with audit trails',
      webhook_debugging: 'ENHANCED - Advanced webhook payload inspection',
      consent_detection: 'ENHANCED - Improved consent field detection in webhooks',
      trust_proxy: 'FIXED - Set to 1 for proper IP-based rate limiting',
      error_handling: 'IMPROVED - Better error recovery and logging'
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

    // NEW: Check GDPR consent history
    const { data: gdprConsent, error: consentError } = await supabase
      .from('gdpr_consent')
      .select('*')
      .eq('create_user_id', userId)
      .order('gdpr_consent_date', { ascending: false });
    checks.gdpr_consent = { data: gdprConsent, error: consentError };

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
        legalSupport: userSignup?.legal_support || 'Unknown',
        consentRecords: gdprConsent?.length || 0
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

// ========================================
// NEW ENHANCED ENDPOINTS
// ========================================

/**
 * Enhanced GDPR Consent Logging Endpoint
 * Provides comprehensive consent tracking with multiple database updates
 */
app.post('/api/gdpr/log-consent', checkSharedKey, async (req, res) => {
  try {
    const { 
      create_user_id, 
      incident_id, 
      consent_type, 
      consent_given, 
      consent_date,
      page 
    } = req.body;

    // Validate required fields
    if (!create_user_id) {
      return res.status(400).json({ 
        error: 'User ID required',
        code: 'MISSING_USER_ID',
        requestId: req.requestId
      });
    }

    // Validate consent_given is boolean
    if (typeof consent_given !== 'boolean') {
      return res.status(400).json({ 
        error: 'consent_given must be a boolean value',
        code: 'INVALID_CONSENT_VALUE',
        requestId: req.requestId
      });
    }

    Logger.info('Processing GDPR consent', { 
      userId: create_user_id, 
      consentGiven: consent_given,
      type: consent_type || 'data_sharing_for_claim' 
    });

    if (!supabaseEnabled) {
      return res.json({ 
        success: true, 
        message: 'Consent recorded (database not configured)',
        requestId: req.requestId 
      });
    }

    // 1. Log to gdpr_audit_log for complete audit trail
    const auditLogData = {
      user_id: create_user_id,
      activity_type: consent_given ? 'CONSENT_GRANTED' : 'CONSENT_DECLINED',
      details: {
        consent_type: consent_type || CONSTANTS.GDPR.CONSENT_TYPES.DATA_SHARING,
        consent_given: consent_given,
        incident_id: incident_id,
        source_page: page || 'declaration.html',
        timestamp: consent_date || new Date().toISOString()
      },
      ip_address: req.clientIp || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      request_id: req.requestId,
      timestamp: new Date().toISOString()
    };

    const { error: auditError } = await supabase
      .from('gdpr_audit_log')
      .insert([auditLogData]);

    if (auditError) {
      Logger.error('Error logging to audit log:', auditError);
    }

    // 2. Record in gdpr_consent table
    const consentData = {
      create_user_id: create_user_id,
      gdpr_consent: consent_given,
      gdpr_consent_date: consent_date || new Date().toISOString(),
      incident_id: incident_id || null,
      consent_type: consent_type || CONSTANTS.GDPR.CONSENT_TYPES.DATA_SHARING
    };

    // Check if consent record already exists for this user
    const { data: existingConsent } = await supabase
      .from('gdpr_consent')
      .select('id')
      .eq('create_user_id', create_user_id)
      .maybeSingle();

    if (existingConsent) {
      // Update existing consent record
      const { error: updateError } = await supabase
        .from('gdpr_consent')
        .update({
          gdpr_consent: consent_given,
          gdpr_consent_date: consent_date || new Date().toISOString(),
          incident_id: incident_id || existingConsent.incident_id,
          consent_type: consent_type || CONSTANTS.GDPR.CONSENT_TYPES.DATA_SHARING
        })
        .eq('id', existingConsent.id);

      if (updateError) {
        Logger.error('Error updating gdpr_consent:', updateError);
      } else {
        Logger.success(`Updated GDPR consent for user ${create_user_id}`);
      }
    } else {
      // Insert new consent record
      const { error: insertError } = await supabase
        .from('gdpr_consent')
        .insert([consentData]);

      if (insertError) {
        Logger.error('Error inserting into gdpr_consent:', insertError);
      } else {
        Logger.success(`Recorded GDPR consent for user ${create_user_id}`);
      }
    }

    // 3. Update incident_reports table if incident_id is provided
    if (incident_id) {
      const { error: incidentError } = await supabase
        .from('incident_reports')
        .update({
          gdpr_consent_confirmed: consent_given,
          gdpr_consent_date: consent_date || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', incident_id)
        .eq('create_user_id', create_user_id);

      if (incidentError) {
        Logger.error('Error updating incident_reports:', incidentError);
      } else {
        Logger.success(`Updated incident report ${incident_id} with consent status`);
      }
    }

    // 4. Update user_signup table for consistency
    const { error: userUpdateError } = await supabase
      .from('user_signup')
      .update({
        gdpr_consent: consent_given,
        gdpr_consent_date: consent_given ? (consent_date || new Date().toISOString()) : null,
        legal_support: consent_given ? 'Yes' : 'No',
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', create_user_id);

    if (userUpdateError) {
      Logger.error('Error updating user_signup:', userUpdateError);
    }

    // Send success response
    res.json({
      success: true,
      message: consent_given 
        ? 'Consent granted and recorded successfully' 
        : 'Consent declined - data will not be processed',
      consent_status: consent_given ? 'granted' : 'declined',
      user_id: create_user_id,
      incident_id: incident_id,
      consent_type: consent_type || CONSTANTS.GDPR.CONSENT_TYPES.DATA_SHARING,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

    // If consent was declined, log warning for follow-up
    if (!consent_given) {
      Logger.warn(`User ${create_user_id} declined GDPR consent for incident ${incident_id}`);
      // TODO: Implement email notification about declined consent
    }

  } catch (error) {
    Logger.error('GDPR consent logging error:', error);
    res.status(500).json({ 
      error: 'Failed to log consent',
      code: 'CONSENT_LOGGING_FAILED',
      details: error.message,
      requestId: req.requestId 
    });
  }
});

/**
 * Enhanced GDPR Data Export Endpoint
 * Allows users to export all their data for GDPR compliance
 */
app.get('/api/gdpr/export/:userId', checkSharedKey, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({ 
      error: 'Service not configured',
      requestId: req.requestId 
    });
  }

  const { userId } = req.params;
  const { format = 'json' } = req.query; // Support different export formats in the future

  try {
    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }

    // Collect all user data from different tables
    const userData = {
      export_metadata: {
        export_date: new Date().toISOString(),
        user_id: userId,
        format: format,
        gdpr_info: {
          right_to_access: true,
          right_to_portability: true,
          export_format: format.toUpperCase()
        }
      },
      user_profile: user,
      incident_reports: [],
      transcriptions: [],
      ai_summaries: [],
      images: [],
      consent_history: [],
      audit_logs: []
    };

    // Get incident reports
    const { data: incidents } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', userId);
    userData.incident_reports = incidents || [];

    // Get transcriptions
    const { data: transcriptions } = await supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', userId);
    userData.transcriptions = transcriptions || [];

    // Get AI summaries
    const { data: summaries } = await supabase
      .from('ai_summary')
      .select('*')
      .eq('create_user_id', userId);
    userData.ai_summaries = summaries || [];

    // Get images
    const { data: images } = await supabase
      .from('incident_images')
      .select('*')
      .eq('create_user_id', userId);
    userData.images = images || [];

    // Get consent history
    const { data: consentHistory } = await supabase
      .from('gdpr_consent')
      .select('*')
      .eq('create_user_id', userId)
      .order('gdpr_consent_date', { ascending: false });
    userData.consent_history = consentHistory || [];

    // Get audit logs (limited to last 100 entries)
    const { data: auditLogs } = await supabase
      .from('gdpr_audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100);
    userData.audit_logs = auditLogs || [];

    // Log the export activity
    await logGDPRActivity(userId, 'DATA_EXPORT', {
      requested_by: req.clientIp,
      format: format,
      items_exported: {
        incidents: userData.incident_reports.length,
        transcriptions: userData.transcriptions.length,
        summaries: userData.ai_summaries.length,
        images: userData.images.length,
        consent_records: userData.consent_history.length,
        audit_logs: userData.audit_logs.length
      }
    }, req);

    // Set appropriate response headers for download
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="gdpr-export-${userId}-${Date.now()}.json"`);
    }

    // Send the export data
    res.json(userData);

  } catch (error) {
    Logger.error('GDPR export error', error);
    res.status(500).json({ 
      error: 'Failed to export data',
      code: 'EXPORT_FAILED',
      details: error.message,
      requestId: req.requestId 
    });
  }
});

/**
 * Enhanced Debug Webhook Test Endpoint
 * Helps understand webhook payload structures for debugging
 */
app.post('/api/debug/webhook-test', checkSharedKey, async (req, res) => {
  Logger.info('=== WEBHOOK DEBUG TEST ===');
  Logger.info('Headers:', JSON.stringify(req.headers, null, 2));
  Logger.info('Body:', JSON.stringify(req.body, null, 2));

  // Analyze all fields in the request body
  const fieldAnalysis = {};
  const consentFields = [];

  if (req.body) {
    Logger.info('Field analysis:');
    Object.keys(req.body).forEach(key => {
      const value = req.body[key];
      const fieldInfo = {
        type: typeof value,
        value: value,
        length: Array.isArray(value) ? value.length : (typeof value === 'string' ? value.length : null)
      };

      fieldAnalysis[key] = fieldInfo;
      Logger.info(`  ${key}: [${fieldInfo.type}] ${JSON.stringify(value).substring(0, 100)}...`);
    });

    // Enhanced consent field detection
    Logger.info('Consent field search:');
    Object.keys(req.body).forEach(key => {
      const lowerKey = key.toLowerCase();
      const consentKeywords = [
        'legal', 'consent', 'agree', 'share', 'gdpr', 'privacy', 
        'terms', 'accept', 'permission', 'allow', 'authorize',
        'opt_in', 'opt_out', 'marketing', 'data_protection'
      ];

      if (consentKeywords.some(keyword => lowerKey.includes(keyword))) {
        Logger.info(`  FOUND CONSENT FIELD: ${key} = ${req.body[key]}`);
        consentFields.push({
          field: key,
          value: req.body[key],
          type: typeof req.body[key]
        });
      }

      // Also check for Q14 or similar question patterns
      if (/^q\d+/.test(lowerKey) || /question_\d+/.test(lowerKey)) {
        const value = req.body[key];
        if (typeof value === 'string' && 
            (value.toLowerCase().includes('yes') || value.toLowerCase().includes('no') ||
             value.toLowerCase().includes('agree') || value.toLowerCase().includes('decline'))) {
          Logger.info(`  POTENTIAL CONSENT QUESTION: ${key} = ${value}`);
          consentFields.push({
            field: key,
            value: value,
            type: 'potential_consent_question'
          });
        }
      }
    });

    // Check for Typeform specific structure
    if (req.body.form_response) {
      Logger.info('Typeform webhook detected');
      if (req.body.form_response.answers) {
        Logger.info('Analyzing Typeform answers...');
        req.body.form_response.answers.forEach((answer, index) => {
          Logger.info(`  Answer ${index}: Field ${answer.field?.ref || answer.field?.id} = ${JSON.stringify(answer)}`);
        });
      }
    }
  }

  // Response with comprehensive analysis
  res.json({
    success: true,
    message: 'Webhook structure analyzed - check server logs for details',
    analysis: {
      method: req.method,
      headers: {
        contentType: req.get('content-type'),
        apiKey: req.get('X-Api-Key') ? 'Present' : 'Missing',
        authorization: req.get('Authorization') ? 'Present' : 'Missing'
      },
      body: {
        fields: Object.keys(req.body || {}),
        fieldCount: Object.keys(req.body || {}).length,
        consentRelatedFields: consentFields,
        isTypeform: !!req.body.form_response,
        hasUserId: !!(req.body.create_user_id || req.body.userId)
      }
    },
    fieldDetails: fieldAnalysis,
    recommendations: {
      consentFields: consentFields.length > 0 ? 
        'Consent fields detected. Map these to your consent processing logic.' :
        'No obvious consent fields detected. Check if consent is in nested structures.',
      userId: (req.body.create_user_id || req.body.userId) ?
        'User ID field found.' :
        'No user ID field detected. Ensure user identification is present.'
    },
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// --- CONTINUED GDPR ENDPOINTS ---

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

// Redirect from old name to new name (transcription-status.html → transcription.html)
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

// --- MAIN ROUTES ---
app.get('/', (req, res) => {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Car Crash Lawyer AI - Enhanced GDPR System v2.1.0</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .status { padding: 10px; background: #4CAF50; color: white; border-radius: 5px; display: inline-block; }
        .gdpr-badge { padding: 5px 10px; background: #2196F3; color: white; border-radius: 3px; font-size: 12px; margin-left: 10px; }
        .endpoint { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
        code { background: #333; color: #4CAF50; padding: 2px 6px; border-radius: 3px; }
        .section { margin-top: 30px; }
        ul { list-style: none; padding: 0; }
        li { margin: 5px 0; }
        .fix-badge { background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 5px; }
        .optional-badge { background: #ff9800; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 5px; }
        .new-badge { background: #9C27B0; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 5px; }
        .enhanced-badge { background: #00BCD4; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 5px; }
        .version { background: #E91E63; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px; margin-left: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚗 Car Crash Lawyer AI - Enhanced GDPR System <span class="gdpr-badge">GDPR COMPLIANT</span> <span class="version">v2.1.0</span></h1>
        <p class="status">✅ Server is running - Enhanced GDPR Features Active</p>

        <div class="section">
            <h2>🔧 Latest Enhancements (v2.1.0):</h2>
            <div class="endpoint">
                <strong>GDPR Compliance Enhancements</strong> <span class="enhanced-badge">ENHANCED</span><br>
                <p>✅ Comprehensive GDPR consent logging with multiple database updates</p>
                <p>✅ Enhanced GDPR data export with full audit trail</p>
                <p>✅ Advanced webhook debugging for better consent detection</p>
                <p>✅ Improved consent field detection algorithms</p>
                <p>✅ Multiple consent type support</p>
                <br>
                <strong>Technical Improvements</strong> <span class="fix-badge">FIXED</span><br>
                <p>✅ Trust proxy set to 1 for proper IP-based rate limiting</p>
                <p>✅ Enhanced error recovery mechanisms</p>
                <p>✅ Better WebSocket connection management</p>
                <p>✅ Improved database column handling</p>
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
            <h2>Enhanced GDPR Endpoints:</h2>

            <div class="endpoint">
                <strong>Enhanced Consent Logging:</strong> <span class="enhanced-badge">ENHANCED</span><br>
                <code>POST /api/gdpr/log-consent</code> - Comprehensive consent tracking<br>
                <em>Features: Multiple database updates, audit trail, consent types</em>
            </div>

            <div class="endpoint">
                <strong>Enhanced Data Export:</strong> <span class="enhanced-badge">ENHANCED</span><br>
                <code>GET /api/gdpr/export/:userId</code> - Complete GDPR data export<br>
                <em>Includes: All user data, consent history, audit logs</em>
            </div>

            <div class="endpoint">
                <strong>Webhook Debugging:</strong> <span class="enhanced-badge">ENHANCED</span><br>
                <code>POST /api/debug/webhook-test</code> - Advanced payload analysis<br>
                <em>Features: Field detection, consent analysis, recommendations</em>
            </div>
        </div>

        <div class="section">
            <h2>Core Endpoints:</h2>

            <div class="endpoint">
                <strong>Core Services:</strong><br>
                <code>GET /health</code> - System health check with service status<br>
                <code>GET /api/config</code> - Get Supabase configuration<br>
                <code>GET /api/debug/user/:userId</code> - Debug user data with consent status<br>
                <code>GET /api/test-openai</code> - Test OpenAI API key validity<br>
                <code>GET /api/process-queue-now</code> - Manually trigger queue processing<br>
                <code>GET /test/transcription-queue</code> - View queue status
            </div>

            <div class="endpoint">
                <strong>Webhook Endpoints:</strong> <span class="enhanced-badge">ENHANCED</span><br>
                <code>POST /webhook/signup</code> - Process signup with enhanced consent handling<br>
                <code>POST /webhook/incident-report</code> - Process incident report files<br>
                <code>POST /generate-pdf</code> - Generate and email PDF report<br>
                <code>POST /webhook/generate-pdf</code> - Alternative PDF generation
            </div>

            <div class="endpoint">
                <strong>Transcription Services:</strong><br>
                <code>POST /api/whisper/transcribe</code> - Direct Whisper transcription<br>
                <code>GET /api/transcription-status/:queueId</code> - Check transcription status<br>
                <code>POST /api/update-transcription</code> - Update/edit transcription<br>
                <code>POST /api/save-transcription</code> - Save transcription<br>
                <code>GET /api/user/:userId/latest-transcription</code> - Get user's latest transcription
            </div>
        </div>

        <div class="section">
            <h3>System Status:</h3>
            <ul>
                <li>Supabase: ${supabaseEnabled ? '✅ Connected' : '❌ Not configured'}</li>
                <li>Supabase Realtime: ${realtimeChannels.transcriptionChannel ? '✅ Active' : '⚠️ Optional'} <span class="optional-badge">OPTIONAL</span></li>
                <li>OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}</li>
                <li>Transcription Queue: ${transcriptionQueueInterval ? '✅ Running' : '❌ Not running'}</li>
                <li>WebSocket: ${wss ? '✅ Active (' + wss.clients.size + ' clients)' : '❌ Not active'}</li>
                <li>Auth Key: ${SHARED_KEY ? '✅ Set' : '❌ Missing'}</li>
                <li>GDPR Compliance: ✅ Enhanced with comprehensive tracking</li>
                <li>Consent Handling: ✅ Multi-database updates with audit trail <span class="enhanced-badge">ENHANCED</span></li>
                <li>Data Retention: ${process.env.DATA_RETENTION_DAYS || CONSTANTS.DATA_RETENTION.DEFAULT_DAYS} days</li>
                <li>Rate Limiting: ✅ Enabled (Fixed trust proxy configuration)</li>
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

// --- ENHANCED WHISPER TRANSCRIPTION (GDPR COMPLIANT) ---
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
        incident_report_id: req.body.incident_