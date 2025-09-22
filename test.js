<artifact identifier="enhanced-indexmaster-js" type="application/vnd.ant.code" language="javascript" title="Enhanced indexmaster.js with GDPR Improvements">
// ========================================
// Car Crash Lawyer AI - Main Server
// Version: 2.0.0
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
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();
// Import rate limiting
const rateLimit = require('express-rate-limit');
// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
// Import PDF generation modules - with error handling
let fetchAllData, generatePDF, sendEmails, generateAndSaveLegalNarrative;
try {
  fetchAllData = require('./lib/dataFetcher').fetchAllData;
  generatePDF = require('./lib/pdfGenerator').generatePDF;
  sendEmails = require('./lib/emailService').sendEmails;
} catch (error) {
  console.warn('PDF generation modules not found - PDF features will be disabled', error.message);
}
// Load Legal Narrative Generator
try {
  generateAndSaveLegalNarrative = require('./lib/aiSummaryGenerator').generateAndSaveLegalNarrative;
  console.log('✅ Legal Narrative Generator loaded');
} catch (error) {
  console.warn('⚠️ Legal Narrative Generator not found:', error.message);
}
// ========================================
// Constants and Configuration
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
  GDPR: {
    CONSENT_TYPES: {
      DATA_SHARING: 'data_sharing_for_claim',
      MARKETING: 'marketing_communications',
      THIRD_PARTY: 'third_party_sharing',
      ANALYTICS: 'analytics_and_improvement'
    }
  }
};
// ========================================
// Enhanced Logging Utility
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
// Express App Setup
// ========================================
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
          incident_id: report.id,
          reason: 'Retention policy'
        });
      }
      Logger.info(`Archived ${oldReports.length} old reports`);
    }
    // Delete old transcription queue entries
    const { data: oldQueues, error: queueError } = await supabase
      .from('transcription_queue')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('status', CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED);
    if (queueError) {
      Logger.error('Error deleting old transcription queue entries', queueError);
    } else if (oldQueues?.length > 0) {
      Logger.info(`Deleted ${oldQueues.length} old transcription queue entries`);
    }
  } catch (error) {
    Logger.error('Data retention enforcement error', error);
  }
}
// Schedule data retention enforcement
if (supabaseEnabled) {
  setInterval(enforceDataRetention, 24 * 60 * 60 * 1000); // Run daily
  enforceDataRetention(); // Run on startup
}
// ========================================
// WebSocket Setup
// ========================================
const wss = new WebSocket.Server({ server });
const activeSessions = new Map(); // queueId -> Set<WebSocket>
const userSessions = new Map(); // userId -> Set<WebSocket>
const transcriptionStatuses = new Map(); // queueId -> status object
// WebSocket heartbeat for connection health
function noop() {}
function heartbeat() {
  this.isAlive = true;
}
const wsHeartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      Logger.warn('Terminating dead WebSocket connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);
// WebSocket message handlers
wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  // Parse userId from query params if present
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const userId = urlParams.get('userId');
  if (userId) {
    if (!userSessions.has(userId)) {
      userSessions.set(userId, new Set());
    }
    userSessions.get(userId).add(ws);
    Logger.debug('WebSocket connected for user', { userId: userId.substring(0, 8) + '...' });
  }
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case CONSTANTS.WS_MESSAGE_TYPES.SUBSCRIBE:
          if (data.queueId) {
            if (!activeSessions.has(data.queueId)) {
              activeSessions.set(data.queueId, new Set());
            }
            activeSessions.get(data.queueId).add(ws);
            // Send current status if available
            if (transcriptionStatuses.has(data.queueId)) {
              ws.send(JSON.stringify({
                type: CONSTANTS.WS_MESSAGE_TYPES.STATUS,
                ...transcriptionStatuses.get(data.queueId)
              }));
            }
            Logger.debug('Subscribed to queue', { queueId: data.queueId });
          }
          break;
        case CONSTANTS.WS_MESSAGE_TYPES.UNSUBSCRIBE:
          if (data.queueId && activeSessions.has(data.queueId)) {
            activeSessions.get(data.queueId).delete(ws);
            if (activeSessions.get(data.queueId).size === 0) {
              activeSessions.delete(data.queueId);
            }
          }
          break;
        case CONSTANTS.WS_MESSAGE_TYPES.PING:
          ws.send(JSON.stringify({ type: CONSTANTS.WS_MESSAGE_TYPES.PONG }));
          break;
        default:
          ws.send(JSON.stringify({ 
            type: CONSTANTS.WS_MESSAGE_TYPES.ERROR,
            message: 'Invalid message type' 
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
    // Clean up subscriptions
    activeSessions.forEach((clients, queueId) => {
      clients.delete(ws);
      if (clients.size === 0) {
        activeSessions.delete(queueId);
      }
    });
    // Clean up user sessions
    if (userId && userSessions.has(userId)) {
      userSessions.get(userId).delete(ws);
      if (userSessions.get(userId).size === 0) {
        userSessions.delete(userId);
      }
    }
  });
});
// Broadcast functions
function broadcastTranscriptionUpdate(queueId, message) {
  if (activeSessions.has(queueId)) {
    const payload = JSON.stringify(message);
    activeSessions.get(queueId).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}
function broadcastToUser(userId, message) {
  if (userSessions.has(userId)) {
    const payload = JSON.stringify(message);
    userSessions.get(userId).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}
// ========================================
// Transcription Queue Processor
// ========================================
let transcriptionQueueInterval = null;
async function processTranscriptionQueue() {
  if (!supabaseEnabled || !process.env.OPENAI_API_KEY) return;
  try {
    const { data: queuedItems } = await supabase
      .from('transcription_queue')
      .select('*')
      .eq('status', CONSTANTS.TRANSCRIPTION_STATUS.PENDING)
      .order('created_at', { ascending: true })
      .limit(5); // Process in batches
    if (!queuedItems || queuedItems.length === 0) return;
    for (const item of queuedItems) {
      try {
        // Update status to processing
        await supabase
          .from('transcription_queue')
          .update({ 
            status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
            processing_started_at: new Date().toISOString()
          })
          .eq('id', item.id);
        transcriptionStatuses.set(item.id, {
          status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
          progress: 0
        });
        broadcastTranscriptionUpdate(item.id, {
          type: CONSTANTS.WS_MESSAGE_TYPES.STATUS,
          status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
          message: 'Starting transcription...'
        });
        // Download audio from Supabase storage
        const { data: audioData, error: downloadError } = await supabase.storage
          .from('audio_uploads')
          .download(item.audio_path);
        if (downloadError) throw downloadError;
        const audioBuffer = Buffer.from(await audioData.arrayBuffer());
        // Prepare form data for Whisper API
        const form = new FormData();
        form.append('file', audioBuffer, { 
          filename: 'audio.webm',
          contentType: 'audio/webm' 
        });
        form.append('model', 'whisper-1');
        form.append('response_format', 'text');
        form.append('language', 'en');
        // Send to OpenAI Whisper
        const { data: transcription } = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          form,
          {
            headers: {
              ...form.getHeaders(),
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            timeout: CONSTANTS.RETRY_LIMITS.WHISPER_TIMEOUT
          }
        );
        // Save transcription
        const transcriptionData = {
          create_user_id: item.create_user_id,
          incident_id: item.incident_id,
          transcription_text: transcription,
          transcription_date: new Date().toISOString(),
          audio_path: item.audio_path
        };
        const { data: savedTranscription, error: saveError } = await supabase
          .from('ai_transcription')
          .insert([transcriptionData])
          .select()
          .single();
        if (saveError) throw saveError;
        // Update queue status
        await supabase
          .from('transcription_queue')
          .update({
            status: CONSTANTS.TRANSCRIPTION_STATUS.TRANSCRIBED,
            transcription_text: transcription,
            transcription_id: savedTranscription.id,
            completed_at: new Date().toISOString()
          })
          .eq('id', item.id);
        transcriptionStatuses.set(item.id, {
          status: CONSTANTS.TRANSCRIPTION_STATUS.TRANSCRIBED,
          transcription: transcription,
          progress: 100
        });
        broadcastTranscriptionUpdate(item.id, {
          type: CONSTANTS.WS_MESSAGE_TYPES.STATUS,
          status: CONSTANTS.TRANSCRIPTION_STATUS.TRANSCRIBED,
          transcription: transcription,
          message: 'Transcription complete!'
        });
        // Start AI summary generation
        generateAndSaveLegalNarrative(item.incident_id, item.create_user_id, transcription)
          .then(summary => {
            // Update status to completed
            supabase
              .from('transcription_queue')
              .update({
                status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
                summary_text: summary
              })
              .eq('id', item.id);
            transcriptionStatuses.set(item.id, {
              ...transcriptionStatuses.get(item.id),
              status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
              summary: summary
            });
            broadcastTranscriptionUpdate(item.id, {
              type: CONSTANTS.WS_MESSAGE_TYPES.STATUS,
              status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
              summary: summary,
              message: 'AI summary generated!'
            });
          })
          .catch(summaryError => {
            Logger.error('AI summary generation failed', summaryError);
            supabase
              .from('transcription_queue')
              .update({
                status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
                error_message: summaryError.message
              })
              .eq('id', item.id);
            broadcastTranscriptionUpdate(item.id, {
              type: CONSTANTS.WS_MESSAGE_TYPES.ERROR,
              message: 'AI summary generation failed'
            });
          });
      } catch (error) {
        Logger.error('Transcription processing error', error);
        const retryCount = (item.retry_count || 0) + 1;
        if (retryCount >= CONSTANTS.RETRY_LIMITS.TRANSCRIPTION) {
          await supabase
            .from('transcription_queue')
            .update({
              status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
              error_message: error.message,
              retry_count: retryCount
            })
            .eq('id', item.id);
          broadcastTranscriptionUpdate(item.id, {
            type: CONSTANTS.WS_MESSAGE_TYPES.ERROR,
            message: 'Transcription failed after retries'
          });
        } else {
          await supabase
            .from('transcription_queue')
            .update({
              status: CONSTANTS.TRANSCRIPTION_STATUS.PENDING,
              retry_count: retryCount
            })
            .eq('id', item.id);
        }
      }
    }
  } catch (error) {
    Logger.error('Queue processing error', error);
  }
}
// Start queue processor if enabled
if (supabaseEnabled && process.env.OPENAI_API_KEY) {
  transcriptionQueueInterval = setInterval(processTranscriptionQueue, 10000); // Every 10 seconds
}
// ========================================
// Image Processor Class
// ========================================
class ImageProcessor {
  constructor() {
    this.supabase = supabase;
    this.bucketName = 'incident_images';
    this.allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
    ];
  }
  async processSignupImages(webhookData) {
    try {
      const imageFields = [
        'profile_photo_url',
        'license_front_url',
        'license_back_url',
        'insurance_card_front_url',
        'insurance_card_back_url',
        'registration_front_url',
        'registration_back_url'
      ];
      const processedImages = [];
      for (const field of imageFields) {
        if (webhookData[field]) {
          const imageUrl = webhookData[field];
          const imageData = await this.processImage(imageUrl, webhookData.create_user_id, 'signup');
          if (imageData) {
            processedImages.push(imageData);
          }
        }
      }
      return { success: true, processed: processedImages.length };
    } catch (error) {
      Logger.error('Signup image processing error', error);
      throw error;
    }
  }
  async processIncidentReportFiles(webhookData) {
    try {
      const imageFields = [
        'incident_photo_1_url',
        'incident_photo_2_url',
        'incident_photo_3_url',
        'incident_photo_4_url'
      ];
      const processedImages = [];
      for (const field of imageFields) {
        if (webhookData[field]) {
          const imageUrl = webhookData[field];
          const imageData = await this.processImage(
            imageUrl, 
            webhookData.create_user_id, 
            'incident_report',
            webhookData.id || webhookData.incident_report_id
          );
          if (imageData) {
            processedImages.push(imageData);
          }
        }
      }
      return { success: true, processed: processedImages.length };
    } catch (error) {
      Logger.error('Incident report image processing error', error);
      throw error;
    }
  }
  async processImage(imageUrl, createUserId, type, incidentId = null) {
    try {
      // Download image
      const { data: imageBuffer } = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        timeout: CONSTANTS.RETRY_LIMITS.DOWNLOAD_TIMEOUT
      });
      // Determine file extension
      const contentType = imageBuffer.headers['content-type'] || 'image/jpeg';
      const extension = contentType.split('/')[1] || 'jpg';
      const fileName = `${createUserId}/${Date.now()}.${extension}`;
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, imageBuffer, {
          contentType: contentType,
          upsert: false
        });
      if (uploadError) throw uploadError;
      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);
      // Save metadata to database
      const imageMetadata = {
        create_user_id: createUserId,
        image_type: type,
        file_name: fileName,
        public_url: publicUrl,
        content_type: contentType,
        upload_date: new Date().toISOString(),
        incident_id: incidentId
      };
      const { error: insertError } = await this.supabase
        .from('incident_images')
        .insert([imageMetadata]);
      if (insertError) throw insertError;
      // Log GDPR activity
      await logGDPRActivity(createUserId, 'IMAGE_UPLOADED', {
        type: type,
        file: fileName,
        incident_id: incidentId
      });
      return imageMetadata;
    } catch (error) {
      Logger.error('Image processing error', error);
      return null;
    }
  }
  async deleteUserImages(createUserId) {
    try {
      const { data: images } = await this.supabase
        .from('incident_images')
        .select('file_name')
        .eq('create_user_id', createUserId)
        .is('deletion_requested', null);
      if (!images || images.length === 0) return { images_deleted: 0 };
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
// API Endpoints
// ========================================
// Enhanced health check endpoint
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
      what3words: externalServices.what3words
    },
    fixes: {
      consent_handling: 'IMPROVED - Enhanced webhook consent detection and processing',
      ai_summary_columns: 'FIXED - Using only existing database columns',
      transcription_saving: 'FIXED - Removed non-existent column references',
      file_redirect: 'ADDED - transcription-status.html redirect to transcription.html',
      trust_proxy_configuration: 'FIXED - Changed from true to 1 for proper IP-based rate limiting',
      error_handling: 'IMPROVED - More graceful error recovery',
      gdpr_consent_endpoint: 'ADDED - Complete GDPR consent logging with database updates'
    }
  };
  res.json(status);
});
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
// ========================================
// NEW ENHANCED GDPR ENDPOINTS
// ========================================
/**
Enhanced GDPR Consent Logging Endpoint
Provides comprehensive consent tracking with multiple database updates
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
      incident_id: incident_id || null
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
          incident_id: incident_id || existingConsent.incident_id
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
GDPR Data Export Endpoint
Allows users to export all their data for GDPR compliance
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
        consent_records: userData.consent_history.length
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
Debug Webhook Test Endpoint
Helps understand webhook payload structures for debugging
*/
app.post('/api/debug/webhook-test', checkSharedKey, async (req, res) => {
  Logger.info('=== WEBHOOK DEBUG TEST ===');
  Logger.info('Headers:', JSON.stringify(req.headers, null, 2));
  Logger.info('Body:', JSON.stringify(req.body, null, 2));
  // Analyze all fields in the request body
  const fieldAnalysis = {};
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
    // Look for consent-related fields
    Logger.info('Consent field search:');
    const consentFields = [];
    Object.keys(req.body).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('legal') || 
          lowerKey.includes('consent') || 
          lowerKey.includes('agree') ||
          lowerKey.includes('share') ||
          lowerKey.includes('gdpr') ||
          lowerKey.includes('privacy') ||
          lowerKey.includes('terms')) {
        Logger.info(`  FOUND CONSENT FIELD: ${key} = ${req.body[key]}`);
        consentFields.push({
          field: key,
          value: req.body[key]
        });
      }
    });
  }
  // Response with analysis
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
        consentRelatedFields: consentFields
      }
    },
    fieldDetails: fieldAnalysis,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});
// --- IMPROVED WEBHOOK ENDPOINTS ---
app.post('/webhook/signup', checkSharedKey, async (req, res) => {
  try {
    Logger.info('Signup webhook received');
    Logger.debug('Webhook payload:', JSON.stringify(req.body, null, 2));
    if (!supabaseEnabled || !imageProcessor) {
      return res.status(503).json({ 
        error: 'Service not configured',
        requestId: req.requestId 
      });
    }
    const webhookData = req.body;
    if (!webhookData.create_user_id) {
      return res.status(400).json({ 
        error: 'Missing create_user_id',
        requestId: req.requestId 
      });
    }
    // DEBUG: Log all fields to find the consent field
    Logger.debug('Looking for consent fields in webhook data:');
    Object.keys(webhookData).forEach(key => {
      if (key.toLowerCase().includes('legal') || 
          key.toLowerCase().includes('consent') || 
          key.toLowerCase().includes('agree') ||
          key.toLowerCase().includes('share') ||
          key.toLowerCase().includes('gdpr') ||
          key.toLowerCase().includes('question') ||
          key.toLowerCase().includes('q14')) {
        Logger.debug(`  ${key}: ${webhookData[key]}`);
      }
    });
    // Extract legal_support consent from Typeform Q14
    // Try different possible field names based on Typeform structure
    let legalSupportConsent = webhookData.legal_support || 
                             webhookData.question_14 || 
                             webhookData.q14 ||
                             webhookData['Do you agree to share this data for legal support?'] ||
                             webhookData.data_sharing_consent ||
                             webhookData.gdpr_consent_field;
    Logger.info(`Legal support consent value found: ${legalSupportConsent}`);
    // Normalize the consent value (handle "Yes", "No", true, false, etc.)
    let hasConsent = false;
    if (legalSupportConsent !== undefined && legalSupportConsent !== null) {
      if (typeof legalSupportConsent === 'boolean') {
        hasConsent = legalSupportConsent;
      } else if (typeof legalSupportConsent === 'string') {
        hasConsent = legalSupportConsent.toLowerCase() === 'yes' || 
                    legalSupportConsent.toLowerCase() === 'true' ||
                    legalSupportConsent.toLowerCase() === 'agreed' ||
                    legalSupportConsent.toLowerCase() === 'agree';
      }
    }
    Logger.info(`Processed consent status: ${hasConsent}`);
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_signup')
      .select('id, legal_support, gdpr_consent')
      .eq('create_user_id', webhookData.create_user_id)
      .single();
    if (existingUser) {
      Logger.info('Updating existing user with consent');
      // Update existing user with consent
      const { error: updateError } = await supabase
        .from('user_signup')
        .update({
          legal_support: hasConsent ? 'Yes' : 'No',
          gdpr_consent: hasConsent,
          gdpr_consent_date: hasConsent ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('create_user_id', webhookData.create_user_id);
      if (updateError) {
        Logger.error('Error updating user consent:', updateError);
      } else {
        Logger.success(`Updated user ${webhookData.create_user_id} - Consent: ${hasConsent}`);
      }
    } else {
      Logger.info('Creating new user with consent');
      // Create new user with all webhook data plus consent
      const userData = {
        ...webhookData,
        legal_support: hasConsent ? 'Yes' : 'No',
        gdpr_consent: hasConsent,
        gdpr_consent_date: hasConsent ? new Date().toISOString() : null,
        created_at: new Date().toISOString()
      };
      const { error: insertError } = await supabase
        .from('user_signup')
        .insert([userData]);
      if (insertError) {
        Logger.error('Error creating user:', insertError);
      } else {
        Logger.success(`Created user ${webhookData.create_user_id} - Consent: ${hasConsent}`);
      }
    }
    // Handle declined consent
    if (!hasConsent) {
      Logger.warn(`User ${webhookData.create_user_id} DECLINED legal support consent`);
      // Log GDPR activity for declined consent
      await logGDPRActivity(webhookData.create_user_id, 'CONSENT_DECLINED', {
        source: 'webhook',
        reason: 'User declined legal support data sharing',
        timestamp: new Date().toISOString()
      }, req);
      // TODO: Implement email notification service
      // Here you would typically send an email to the user explaining:
      // 1. They've declined consent for legal support
      // 2. How to change this decision if needed
      // 3. What services are limited without consent
      Logger.info('TODO: Send notification to user about declined consent and how to change it');
      return res.status(200).json({ 
        success: true,
        message: 'User registered but declined legal support - no processing will occur',
        create_user_id: webhookData.create_user_id,
        consent_status: 'declined',
        action_required: 'User should be notified about how to enable legal support',
        requestId: req.requestId 
      });
    }
    // User has consent - proceed with normal processing
    await logGDPRActivity(webhookData.create_user_id, 'CONSENT_GRANTED', {
      source: 'webhook',
      legal_support: 'Yes',
      timestamp: new Date().toISOString()
    }, req);
    // Process images asynchronously only if consent granted
    imageProcessor.processSignupImages(webhookData)
      .then(result => {
        Logger.success('Signup processing complete', result);
      })
      .catch(error => {
        Logger.error('Signup processing failed', error);
      });
    res.status(200).json({ 
      success: true, 
      message: 'Signup processing started with consent',
      create_user_id: webhookData.create_user_id,
      consent_status: 'granted',
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

// ========================================
// Car Crash Lawyer AI - Main Server
// Version: 2.0.0
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
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();
// Import rate limiting
const rateLimit = require('express-rate-limit');
// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
// Import PDF generation modules - with error handling
let fetchAllData, generatePDF, sendEmails, generateAndSaveLegalNarrative;
try {
  fetchAllData = require('./lib/dataFetcher').fetchAllData;
  generatePDF = require('./lib/pdfGenerator').generatePDF;
  sendEmails = require('./lib/emailService').sendEmails;
} catch (error) {
  console.warn('PDF generation modules not found - PDF features will be disabled', error.message);
}
// Load Legal Narrative Generator
try {
  generateAndSaveLegalNarrative = require('./lib/aiSummaryGenerator').generateAndSaveLegalNarrative;
  console.log('✅ Legal Narrative Generator loaded');
} catch (error) {
  console.warn('⚠️ Legal Narrative Generator not found:', error.message);
}
// ========================================
// Constants and Configuration
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
  GDPR: {
    CONSENT_TYPES: {
      DATA_SHARING: 'data_sharing_for_claim',
      MARKETING: 'marketing_communications',
      THIRD_PARTY: 'third_party_sharing',
      ANALYTICS: 'analytics_and_improvement'
    }
  }
};
// ========================================
// Enhanced Logging Utility
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
// Express App Setup
// ========================================
const app = express();
const server = http.createServer(app);
// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());
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
          type: 'incident_report',
          incident_id: report.id
        });
      }
    }
  } catch (error) {
    Logger.error('Data retention enforcement error', error);
  }
}

// Schedule data retention check (daily)
setInterval(enforceDataRetention, 24 * 60 * 60 * 1000); // 24 hours

// --- WEBSOCKET SETUP ---
const wss = new WebSocket.Server({ server });
const activeSessions = new Map(); // queueId -> Set of ws clients
const userSessions = new Map(); // userId -> Set of ws clients
const transcriptionStatuses = new Map(); // queueId -> status object

// WebSocket heartbeat interval
const wsHeartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Broadcast to all clients subscribed to a queueId
function broadcastTranscriptionUpdate(queueId, message) {
  const clients = activeSessions.get(queueId);
  if (clients) {
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}

// Broadcast to all clients subscribed to a userId
function broadcastToUser(userId, message) {
  const clients = userSessions.get(userId);
  if (clients) {
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case CONSTANTS.WS_MESSAGE_TYPES.SUBSCRIBE:
          if (data.queueId) {
            if (!activeSessions.has(data.queueId)) {
              activeSessions.set(data.queueId, new Set());
            }
            activeSessions.get(data.queueId).add(ws);
          }
          if (data.userId) {
            if (!userSessions.has(data.userId)) {
              userSessions.set(data.userId, new Set());
            }
            userSessions.get(data.userId).add(ws);
          }
          ws.send(JSON.stringify({ 
            type: CONSTANTS.WS_MESSAGE_TYPES.STATUS, 
            subscribed: true 
          }));
          break;

        case CONSTANTS.WS_MESSAGE_TYPES.UNSUBSCRIBE:
          if (data.queueId && activeSessions.has(data.queueId)) {
            activeSessions.get(data.queueId).delete(ws);
            if (activeSessions.get(data.queueId).size === 0) {
              activeSessions.delete(data.queueId);
            }
          }
          if (data.userId && userSessions.has(data.userId)) {
            userSessions.get(data.userId).delete(ws);
            if (userSessions.get(data.userId).size === 0) {
              userSessions.delete(data.userId);
            }
          }
          break;

        case CONSTANTS.WS_MESSAGE_TYPES.PING:
          ws.send(JSON.stringify({ type: CONSTANTS.WS_MESSAGE_TYPES.PONG }));
          break;
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
    // Clean up subscriptions
    activeSessions.forEach((clients, queueId) => {
      clients.delete(ws);
      if (clients.size === 0) activeSessions.delete(queueId);
    });
    userSessions.forEach((clients, userId) => {
      clients.delete(ws);
      if (clients.size === 0) userSessions.delete(userId);
    });
  });
});

// --- OPENAI TRANSCRIPTION FUNCTION ---
async function transcribeAudioWithOpenAI(audioUrl, model = 'whisper-1', maxRetries = CONSTANTS.RETRY_LIMITS.TRANSCRIPTION) {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      // Download audio from Supabase
      const { data: audioStream, error: downloadError } = await supabase.storage
        .from('audio-files')
        .download(audioUrl);

      if (downloadError) throw downloadError;

      const formData = new FormData();
      formData.append('file', audioStream, { filename: 'audio.webm' });
      formData.append('model', model);

      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        timeout: CONSTANTS.RETRY_LIMITS.WHISPER_TIMEOUT
      });

      return response.data.text;
    } catch (error) {
      attempts++;
      Logger.error(`Transcription attempt ${attempts} failed`, error);
      if (attempts >= maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Exponential backoff
    }
  }
}

// --- AI SUMMARY GENERATION FUNCTION ---
async function generateAISummary(transcriptionText, incidentData = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `
    You are a legal assistant specializing in car crash incidents. Create a concise summary of the following transcription from an emergency call or witness statement. Focus on key facts relevant to legal claims: who was involved, what happened, when and where it occurred, injuries, vehicle details, and any admissions of fault.

    Transcription: ${transcriptionText}

    Additional incident data: ${JSON.stringify(incidentData)}

    Summary format:
    - Incident Overview
    - Parties Involved
    - Sequence of Events
    - Injuries/Damages
    - Potential Liability
    - Recommendations
  `;

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      timeout: CONSTANTS.RETRY_LIMITS.API_TIMEOUT
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    Logger.error('AI summary generation error', error);
    throw error;
  }
}

// --- TRANSCRIPTION QUEUE PROCESSOR ---
let transcriptionQueueInterval = null;
if (supabaseEnabled && process.env.OPENAI_API_KEY) {
  transcriptionQueueInterval = setInterval(async () => {
    try {
      const { data: pendingItems } = await supabase
        .from('transcription_queue')
        .select('*')
        .eq('status', CONSTANTS.TRANSCRIPTION_STATUS.PENDING)
        .order('created_at', { ascending: true })
        .limit(5); // Process up to 5 at a time

      for (const item of pendingItems || []) {
        try {
          // Update status to processing
          await supabase
            .from('transcription_queue')
            .update({ status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING })
            .eq('id', item.id);

          broadcastTranscriptionUpdate(item.id, {
            type: CONSTANTS.WS_MESSAGE_TYPES.STATUS,
            status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING
          });

          // Transcribe
          const transcription = await transcribeAudioWithOpenAI(item.audio_url);

          // Save transcription
          const { error: transcriptionError } = await supabase
            .from('ai_transcription')
            .insert({
              create_user_id: item.create_user_id,
              transcription_text: transcription,
              incident_id: item.incident_id,
              audio_url: item.audio_url,
              created_at: new Date().toISOString()
            });

          if (transcriptionError) throw transcriptionError;

          // Update queue
          await supabase
            .from('transcription_queue')
            .update({
              status: CONSTANTS.TRANSCRIPTION_STATUS.TRANSCRIBED,
              transcription_text: transcription,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          broadcastTranscriptionUpdate(item.id, {
            type: CONSTANTS.WS_MESSAGE_TYPES.STATUS,
            status: CONSTANTS.TRANSCRIPTION_STATUS.TRANSCRIBED,
            transcription: transcription
          });

          // Generate summary
          await supabase
            .from('transcription_queue')
            .update({ status: CONSTANTS.TRANSCRIPTION_STATUS.GENERATING_SUMMARY })
            .eq('id', item.id);

          broadcastTranscriptionUpdate(item.id, {
            type: CONSTANTS.WS_MESSAGE_TYPES.STATUS,
            status: CONSTANTS.TRANSCRIPTION_STATUS.GENERATING_SUMMARY
          });

          const summary = await generateAISummary(transcription, { incident_id: item.incident_id });

          // Save summary
          const { error: summaryError } = await supabase
            .from('ai_summary')
            .insert({
              create_user_id: item.create_user_id,
              summary_text: summary,
              incident_id: item.incident_id,
              created_at: new Date().toISOString()
            });

          if (summaryError) throw summaryError;

          // Complete queue item
          await supabase
            .from('transcription_queue')
            .update({
              status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
              summary_text: summary,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          broadcastTranscriptionUpdate(item.id, {
            type: CONSTANTS.WS_MESSAGE_TYPES.STATUS,
            status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
            summary: summary
          });

        } catch (error) {
          Logger.error('Queue processing error for item ' + item.id, error);
          await supabase
            .from('transcription_queue')
            .update({
              status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
              error_message: error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          broadcastTranscriptionUpdate(item.id, {
            type: CONSTANTS.WS_MESSAGE_TYPES.ERROR,
            status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
            error: error.message
          });
        }
      }
    } catch (error) {
      Logger.error('Transcription queue processing error', error);
    }
  }, 10000); // Check every 10 seconds
}

// --- IMAGE PROCESSOR CLASS ---
class ImageProcessor {
  constructor() {
    this.supabase = supabase;
    this.bucketName = 'incident-images';
  }

  async processSignupImages(webhookData) {
    try {
      const images = [];
      const fieldsToCheck = [
        'drivers_license_front', 'drivers_license_back',
        'vehicle_registration_front', 'vehicle_registration_back',
        'insurance_card_front', 'insurance_card_back'
      ];

      for (const field of fieldsToCheck) {
        if (webhookData[field]) {
          images.push({
            url: webhookData[field],
            type: field
          });
        }
      }

      if (images.length === 0) return { success: true, message: 'No images to process' };

      for (const image of images) {
        const fileName = `${webhookData.create_user_id}/${crypto.randomBytes(16).toString('hex')}.jpg`;

        // Download image
        const { data: imageBuffer } = await axios.get(image.url, { 
          responseType: 'arraybuffer',
          timeout: CONSTANTS.RETRY_LIMITS.DOWNLOAD_TIMEOUT
        });

        // Upload to Supabase
        const { error } = await this.supabase.storage
          .from(this.bucketName)
          .upload(fileName, imageBuffer, { contentType: 'image/jpeg' });

        if (error) throw error;

        // Save metadata
        await this.supabase
          .from('incident_images')
          .insert({
            create_user_id: webhookData.create_user_id,
            file_name: fileName,
            image_type: image.type,
            incident_id: null, // Signup images may not have incident_id
            created_at: new Date().toISOString()
          });
      }

      return { success: true, imagesProcessed: images.length };
    } catch (error) {
      Logger.error('Signup image processing error', error);
      throw error;
    }
  }

  async processIncidentReportFiles(webhookData) {
    try {
      const images = [];
      const fieldsToCheck = [
        'accident_scene_photo_1', 'accident_scene_photo_2',
        'accident_scene_photo_3', 'accident_scene_photo_4',
        'accident_scene_photo_5', 'accident_scene_photo_6',
        'vehicle_damage_photo_1', 'vehicle_damage_photo_2',
        'other_vehicle_damage_photo_1', 'other_vehicle_damage_photo_2',
        'other_vehicle_license_plate', 'police_report_photo'
      ];

      for (const field of fieldsToCheck) {
        if (webhookData[field]) {
          images.push({
            url: webhookData[field],
            type: field
          });
        }
      }

      if (images.length === 0) return { success: true, message: 'No files to process' };

      const incidentId = webhookData.id || webhookData.incident_report_id;

      for (const image of images) {
        const fileName = `${webhookData.create_user_id}/${incidentId}/${crypto.randomBytes(16).toString('hex')}.jpg`;

        // Download image
        const { data: imageBuffer } = await axios.get(image.url, { 
          responseType: 'arraybuffer',
          timeout: CONSTANTS.RETRY_LIMITS.DOWNLOAD_TIMEOUT
        });

        // Upload to Supabase
        const { error } = await this.supabase.storage
          .from(this.bucketName)
          .upload(fileName, imageBuffer, { contentType: 'image/jpeg' });

        if (error) throw error;

        // Save metadata
        await this.supabase
          .from('incident_images')
          .insert({
            create_user_id: webhookData.create_user_id,
            file_name: fileName,
            image_type: image.type,
            incident_id: incidentId,
            created_at: new Date().toISOString()
          });
      }

      return { success: true, imagesProcessed: images.length };
    } catch (error) {
      Logger.error('Incident report file processing error', error);
      throw error;
    }
  }

  async deleteUserImages(createUserId) {
    try {
      const { data: images } = await this.supabase
        .from('incident_images')
        .select('file_name')
        .eq('create_user_id', createUserId)
        .is('deletion_requested', null);

      if (!images || images.length === 0) {
        return { success: true, message: 'No images to delete' };
      }

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

// === CONTINUATION POINT [API_ENDPOINTS_PART_1] ===

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
      pdf_generation: !!(fetchAllData && generatePDF && sendEmails)
    }
  });
});

// Enhanced health check endpoint
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
      what3words: externalServices.what3words
    },
    fixes: {
      consent_handling: 'IMPROVED - Enhanced webhook consent detection and processing',
      ai_summary_columns: 'FIXED - Using only existing database columns',
      transcription_saving: 'FIXED - Removed non-existent column references',
      file_redirect: 'ADDED - transcription-status.html redirect to transcription.html',
      trust_proxy_configuration: 'FIXED - Changed from true to 1 for proper IP-based rate limiting',
      error_handling: 'IMPROVED - More graceful error recovery',
      gdpr_consent_endpoint: 'ADDED - Complete GDPR consent logging with database updates'
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

// --- AUDIO UPLOAD AND TRANSCRIPTION QUEUE ENDPOINT ---
app.post('/api/whisper/upload', upload.single('audio'), checkSharedKey, checkGDPRConsent, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({ 
      error: 'Database unavailable',
      requestId: req.requestId 
    });
  }

  if (!req.file) {
    return res.status(400).json({ 
      error: 'No audio file uploaded',
      requestId: req.requestId 
    });
  }

  const { create_user_id, incident_id } = req.body;

  if (!create_user_id) {
    return res.status(400).json({ 
      error: 'Missing create_user_id',
      requestId: req.requestId 
    });
  }

  try {
    const fileName = `${create_user_id}/${Date.now()}.webm`;

    // Upload to Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) throw uploadError;

    const audioUrl = uploadData.path;

    // Add to queue
    const { data: queueItem, error: queueError } = await supabase
      .from('transcription_queue')
      .insert({
        create_user_id,
        incident_id,
        audio_url: audioUrl,
        status: CONSTANTS.TRANSCRIPTION_STATUS.PENDING,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (queueError) throw queueError;

    // Log GDPR activity
    await logGDPRActivity(create_user_id, 'AUDIO_UPLOADED', {
      queue_id: queueItem.id,
      incident_id,
      file: audioUrl
    }, req);

    // Store initial status
    transcriptionStatuses.set(queueItem.id, {
      status: CONSTANTS.TRANSCRIPTION_STATUS.PENDING,
      created_at: queueItem.created_at
    });

    res.json({
      success: true,
      queue_id: queueItem.id,
      status: CONSTANTS.TRANSCRIPTION_STATUS.PENDING,
      requestId: req.requestId
    });
  } catch (error) {
    Logger.error('Audio upload error', error);
    res.status(500).json({ 
      error: 'Failed to queue transcription',
      details: error.message,
      requestId: req.requestId 
    });
  }
});

// --- TRANSCRIPTION STATUS ENDPOINT ---
app.get('/api/whisper/status/:id', checkSharedKey, async (req, res) => {
  try {
    const { id } = req.params;

    // Check in-memory first
    if (transcriptionStatuses.has(id)) {
      return res.json({
        ...transcriptionStatuses.get(id),
        source: 'memory',
        requestId: req.requestId
      });
    }

    if (!supabaseEnabled) {
      return res.status(404).json({ 
        error: 'Queue item not found',
        requestId: req.requestId 
      });
    }

    // Fallback to database
    const { data: queueItem } = await supabase
      .from('transcription_queue')
      .select('*')
      .eq('id', id)
      .single();

    if (!queueItem) {
      return res.status(404).json({ 
        error: 'Queue item not found',
        requestId: req.requestId 
      });
    }

    // Cache in memory
    transcriptionStatuses.set(id, {
      status: queueItem.status,
      transcription: queueItem.transcription_text,
      summary: queueItem.summary_text,
      error: queueItem.error_message,
      created_at: queueItem.created_at,
      updated_at: queueItem.updated_at
    });

    res.json({
      status: queueItem.status,
      transcription: queueItem.transcription_text,
      summary: queueItem.summary_text,
      error: queueItem.error_message,
      created_at: queueItem.created_at,
      updated_at: queueItem.updated_at,
      source: 'database',
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

// --- IMPROVED WEBHOOK ENDPOINTS ---
app.post('/webhook/signup', checkSharedKey, async (req, res) => {
  try {
    Logger.info('Signup webhook received');
    Logger.debug('Webhook payload:', JSON.stringify(req.body, null, 2));

    if (!supabaseEnabled || !imageProcessor) {
      return res.status(503).json({ 
        error: 'Service not configured',
        requestId: req.requestId 
      });
    }

    const webhookData = req.body;

    if (!webhookData.create_user_id) {
      return res.status(400).json({ 
        error: 'Missing create_user_id',
        requestId: req.requestId 
      });
    }

    // DEBUG: Log all fields to find the consent field
    Logger.debug('Looking for consent fields in webhook data:');
    Object.keys(webhookData).forEach(key => {
      if (key.toLowerCase().includes('legal') || 
          key.toLowerCase().includes('consent') || 
          key.toLowerCase().includes('agree') ||
          key.toLowerCase().includes('share') ||
          key.toLowerCase().includes('gdpr') ||
          key.toLowerCase().includes('question') ||
          key.toLowerCase().includes('q14')) {
        Logger.debug(`  ${key}: ${webhookData[key]}`);
      }
    });

    // Extract legal_support consent from Typeform Q14
    // Try different possible field names based on Typeform structure
    let legalSupportConsent = webhookData.legal_support || 
                             webhookData.question_14 || 
                             webhookData.q14 ||
                             webhookData['Do you agree to share this data for legal support?'] ||
                             webhookData.data_sharing_consent ||
                             webhookData.gdpr_consent_field;

    Logger.info(`Legal support consent value found: ${legalSupportConsent}`);

    // Normalize the consent value (handle "Yes", "No", true, false, etc.)
    let hasConsent = false;
    if (legalSupportConsent !== undefined && legalSupportConsent !== null) {
      if (typeof legalSupportConsent === 'boolean') {
        hasConsent = legalSupportConsent;
      } else if (typeof legalSupportConsent === 'string') {
        hasConsent = legalSupportConsent.toLowerCase() === 'yes' || 
                    legalSupportConsent.toLowerCase() === 'true' ||
                    legalSupportConsent.toLowerCase() === 'agreed' ||
                    legalSupportConsent.toLowerCase() === 'agree';
      }
    }

    Logger.info(`Processed consent status: ${hasConsent}`);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_signup')
      .select('id, legal_support, gdpr_consent')
      .eq('create_user_id', webhookData.create_user_id)
      .single();

    if (existingUser) {
      Logger.info('Updating existing user with consent');

      // Update existing user with consent
      const { error: updateError } = await supabase
        .from('user_signup')
        .update({
          legal_support: hasConsent ? 'Yes' : 'No',
          gdpr_consent: hasConsent,
          gdpr_consent_date: hasConsent ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('create_user_id', webhookData.create_user_id);

      if (updateError) {
        Logger.error('Error updating user consent:', updateError);
      } else {
        Logger.success(`Updated user ${webhookData.create_user_id} - Consent: ${hasConsent}`);
      }
    } else {
      Logger.info('Creating new user with consent');

      // Create new user with all webhook data plus consent
      const userData = {
        ...webhookData,
        legal_support: hasConsent ? 'Yes' : 'No',
        gdpr_consent: hasConsent,
        gdpr_consent_date: hasConsent ? new Date().toISOString() : null,
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('user_signup')
        .insert([userData]);

      if (insertError) {
        Logger.error('Error creating user:', insertError);
      } else {
        Logger.success(`Created user ${webhookData.create_user_id} - Consent: ${hasConsent}`);
      }
    }

    // Handle declined consent
    if (!hasConsent) {
      Logger.warn(`User ${webhookData.create_user_id} DECLINED legal support consent`);

      // Log GDPR activity for declined consent
      await logGDPRActivity(webhookData.create_user_id, 'CONSENT_DECLINED', {
        source: 'webhook',
        reason: 'User declined legal support data sharing',
        timestamp: new Date().toISOString()
      }, req);

      // TODO: Implement email notification service
      // Here you would typically send an email to the user explaining:
      // 1. They've declined consent for legal support
      // 2. How to change this decision if needed
      // 3. What services are limited without consent
      Logger.info('TODO: Send notification to user about declined consent and how to change it');

      return res.status(200).json({ 
        success: true,
        message: 'User registered but declined legal support - no processing will occur',
        create_user_id: webhookData.create_user_id,
        consent_status: 'declined',
        action_required: 'User should be notified about how to enable legal support',
        requestId: req.requestId 
      });
    }

    // User has consent - proceed with normal processing
    await logGDPRActivity(webhookData.create_user_id, 'CONSENT_GRANTED', {
      source: 'webhook',
      legal_support: 'Yes',
      timestamp: new Date().toISOString()
    }, req);

    // Process images asynchronously only if consent granted
    imageProcessor.processSignupImages(webhookData)
      .then(result => {
        Logger.success('Signup processing complete', result);
      })
      .catch(error => {
        Logger.error('Signup processing failed', error);
      });

    res.status(200).json({ 
      success: true, 
      message: 'Signup processing started with consent',
      create_user_id: webhookData.create_user_id,
      consent_status: 'granted',
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

// Delete user data
app.post('/api/gdpr/delete/:userId', checkSharedKey, checkGDPRConsent, async (req, res) => {
  const { userId } = req.params;
  if (!supabaseEnabled) {
    return res.status(503).json({ error: 'Database unavailable' });
  }
  try {
    await supabase
      .from('user_signup')
      .delete()
      .eq('create_user_id', userId);
    await supabase
      .from('incident_reports')
      .delete()
      .eq('create_user_id', userId);
    await supabase
      .from('ai_transcription')
      .delete()
      .eq('create_user_id', userId);
    await supabase
      .from('transcription_queue')
      .delete()
      .eq('create_user_id', userId);
    await supabase
      .from('ai_summary')
      .delete()
      .eq('create_user_id', userId);

    await logGDPRActivity(userId, 'DATA_DELETED', { timestamp: new Date().toISOString() });

    res.json({ message: 'User data deleted', userId });
  } catch (error) {
    Logger.error('Error deleting user data', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// Anonymize user data
app.post('/api/gdpr/anonymize/:userId', checkSharedKey, checkGDPRConsent, async (req, res) => {
  const { userId } = req.params;
  if (!supabaseEnabled) {
    return res.status(503).json({ error: 'Database unavailable' });
  }
  try {
    await supabase
      .from('user_signup')
      .update({
        email: `anon_${userId}@anonymized.com`,
        full_name: 'Anonymized User',
        phone_number: 'ANONYMIZED',
        gdpr_consent: false,
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', userId);
    await supabase
      .from('transcription_queue')
      .update({
        transcription_text: 'ANONYMIZED',
        summary_text: 'ANONYMIZED'
      })
      .eq('create_user_id', userId);

    await logGDPRActivity(userId, 'DATA_ANONYMIZED', { timestamp: new Date().toISOString() });

    res.json({ message: 'User data anonymized', userId });
  } catch (error) {
    Logger.error('Error anonymizing user data', error);
    res.status(500).json({ error: 'Failed to anonymize data' });
  }
});

// ========================================
// NEW ENHANCED GDPR ENDPOINTS
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
      incident_id: incident_id || null
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
          incident_id: incident_id || existingConsent.incident_id
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
 * GDPR Data Export Endpoint
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
        consent_records: userData.consent_history.length
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
 * Debug Webhook Test Endpoint
 * Helps understand webhook payload structures for debugging
 */
app.post('/api/debug/webhook-test', checkSharedKey, async (req, res) => {
  Logger.info('=== WEBHOOK DEBUG TEST ===');
  Logger.info('Headers:', JSON.stringify(req.headers, null, 2));
  Logger.info('Body:', JSON.stringify(req.body, null, 2));

  // Analyze all fields in the request body
  const fieldAnalysis = {};
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

    // Look for consent-related fields
    Logger.info('Consent field search:');
    const consentFields = [];

    Object.keys(req.body).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('legal') || 
          lowerKey.includes('consent') || 
          lowerKey.includes('agree') ||
          lowerKey.includes('share') ||
          lowerKey.includes('gdpr') ||
          lowerKey.includes('privacy') ||
          lowerKey.includes('terms')) {
        Logger.info(`  FOUND CONSENT FIELD: ${key} = ${req.body[key]}`);
        consentFields.push({
          field: key,
          value: req.body[key]
        });
      }
    });
  }
  // Response with analysis
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
        consentRelatedFields: consentFields
      }
    },
    fieldDetails: fieldAnalysis,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// ========================================
// PDF Generation Endpoint
// ========================================
app.post('/api/pdf/generate', checkSharedKey, checkGDPRConsent, async (req, res) => {
  const { userId, incidentId } = req.body;
  if (!userId || !incidentId) {
    return res.status(400).json({ error: 'userId and incidentId required' });
  }
  if (!fetchAllData || !generatePDF) {
    return res.status(503).json({ error: 'PDF service unavailable' });
  }
  try {
    const allData = await fetchAllData(userId, incidentId);
    const pdfBuffer = await generatePDF(allData);
    const fileName = `${userId}/reports/${incidentId}_${Date.now()}.pdf`;
    const { data: uploadData, error } = await supabase.storage
      .from('pdf-reports')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf' });

    if (error) throw error;

    const publicUrl = supabase.storage
      .from('pdf-reports')
      .getPublicUrl(fileName).data.publicUrl;

    res.json({ message: 'PDF generated', url: publicUrl });
  } catch (error) {
    Logger.error('PDF generation error', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// ========================================
// Server Startup and Graceful Shutdown
// ========================================
const PORT = process.env.PORT || 3000;
// Graceful shutdown handler
async function gracefulShutdown(signal) {
  Logger.info(`⚠️ ${signal} received, starting graceful shutdown...`);
  server.close(() => {
    Logger.info('HTTP server closed');
  });
  wss.clients.forEach((ws) => {
    ws.close(1001, 'Server shutting down');
  });
  if (transcriptionQueueInterval) {
    clearInterval(transcriptionQueueInterval);
  }
  clearInterval(wsHeartbeat);
  if (realtimeChannels.transcriptionChannel) {
    supabase.removeChannel(realtimeChannels.transcriptionChannel);
  }
  if (realtimeChannels.summaryChannel) {
    supabase.removeChannel(realtimeChannels.summaryChannel);
  }
  await new Promise(resolve => setTimeout(resolve, 5000));
  Logger.info('Graceful shutdown complete');
  process.exit(0);
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
// Start the server
server.listen(PORT, () => {
  Logger.success(`🚀 Server running on port ${PORT}`);
  Logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  Logger.info(`🔐 GDPR Compliance: ENHANCED`);
  Logger.info(`🗄️ Supabase: ${supabaseEnabled ? 'CONNECTED' : 'DISABLED'}`);
  Logger.info(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  Logger.info(`🔄 Transcription Queue: ${transcriptionQueueInterval ? 'RUNNING' : 'DISABLED'}`);
  Logger.info(`🔌 WebSocket: ACTIVE`);
  Logger.info(`⚡ Realtime Updates: ${realtimeChannels.transcriptionChannel ? 'ENABLED' : 'DISABLED'}`);
  Logger.info(`📚 Version: 2.0.0 - Enhanced GDPR Compliance Edition`);
  if (!SHARED_KEY) {
    Logger.warn('⚠️ ZAPIER_SHARED_KEY not set - authentication disabled');
  }
  Logger.info('📍 Key endpoints:');
  Logger.info('  - GET  /health - System health check');
  Logger.info('  - POST /api/gdpr/log-consent - Enhanced GDPR consent logging [NEW]');
  Logger.info('  - GET  /api/gdpr/export/:userId - GDPR data export [NEW]');
  Logger.info('  - POST /api/debug/webhook-test - Webhook debugging [NEW]');
  Logger.info('  - POST /webhook/typeform - Typeform webhook');
  Logger.info('  - POST /webhook/zapier - Zapier webhook');
  Logger.info('  - POST /api/whisper/upload - Queue audio for transcription');
  Logger.info('  - GET  /api/whisper/status/:id - Check transcription status');
  Logger.info('  - POST /api/pdf/generate - Generate PDF report');
  Logger.success('✅ All systems operational - Ready to serve requests');
});
// Export for testing
module.exports = { app, server };
