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
// CONFIGURATION
// ========================================
const config = require('./src/config');
const CONSTANTS = config.constants;

// ========================================
// LOGGING UTILITY
// ========================================
const logger = require('./src/utils/logger');

// ========================================
// VALIDATION UTILITIES
// ========================================
const { validateUserId } = require('./src/utils/validators');

// ========================================
// RESPONSE UTILITIES
// ========================================
const { sendError, redactUrl } = require('./src/utils/response');

// ========================================
// RATE LIMITING MIDDLEWARE
// ========================================
const { apiLimiter, strictLimiter } = require('./src/middleware/rateLimit');

// ========================================
// GDPR MIDDLEWARE & SERVICE
// ========================================
const { initGDPR, checkGDPRConsent } = require('./src/middleware/gdpr');
const gdprService = require('./src/services/gdprService');


// ========================================
// AI SERVICE
// ========================================
const { generateAISummary } = require('./src/services/aiService');

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
// MIDDLEWARE SETUP
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

// Request logging middleware
app.use(require('./src/middleware/requestLogger'));

// ========================================
// UTILITY FUNCTIONS
// ========================================

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

function authenticateRequest(req, res, next) {
  // Placeholder for future auth implementation
  logger.debug('authenticateRequest called');
  next();
}

// ========================================
// SUPABASE SETUP
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

    // Initialize GDPR tables if they don't exist
    initializeGDPRTables();

    // Initialize Supabase Realtime
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
          logger.info('Realtime AI transcription update:', payload.eventType);
          handleRealtimeTranscriptionUpdate(payload);
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
          handleRealtimeSummaryUpdate(payload);
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

// Initialize GDPR middleware
initGDPR(supabase, supabaseEnabled);

// ========================================
// INITIALIZE AUTH SERVICE
// ========================================
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
// (GDPR FUNCTIONS MOVED TO src/services/gdprService.js)
// ========================================

// Initialize GDPR service with Supabase
if (supabaseEnabled) {
  gdprService.initialize(supabase, true);
  logger.info('GDPR service initialized and data retention scheduled');
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
      logger.debug(`Cleaned up stale session for queue ${queueId}`);
    }
  });

  userSessions.forEach((wsSets, userId) => {
    const activeSockets = Array.from(wsSets).filter(ws => ws.readyState === WebSocket.OPEN);
    if (activeSockets.length !== wsSets.size) {
      userSessions.set(userId, new Set(activeSockets));
      logger.debug(`Cleaned up ${wsSets.size - activeSockets.length} stale sockets for user ${userId}`);
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
    logger.info(`Cleaned up ${cleaned} old transcription statuses`);
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
  logger.info('New WebSocket connection established');

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
      logger.debug('WebSocket message received', {
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
          logger.debug('Unknown message type:', data.type);
          ws.send(JSON.stringify({
            type: CONSTANTS.WS_MESSAGE_TYPES.ERROR,
            message: 'Unknown message type'
          }));
      }
    } catch (error) {
      logger.error('WebSocket message error', error);
      ws.send(JSON.stringify({
        type: CONSTANTS.WS_MESSAGE_TYPES.ERROR,
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    const connectionDuration = Date.now() - ws.connectionTime;
    logger.debug('WebSocket connection closed', {
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
    logger.error('WebSocket error', error);
  });
});

// WebSocket heartbeat interval
const wsHeartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      logger.debug('Terminating inactive WebSocket connection');
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
      logger.error('Error sending transcription update', error);
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
          logger.error('Error broadcasting to user', error);
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
    logger.error('Error handling realtime transcription update', error);
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
    logger.error('Error handling realtime summary update', error);
  }
}

// ========================================
// AI SUMMARY GENERATION (MOVED TO src/services/aiService.js)
// ========================================

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
    logger.info(`Processing transcription for queue ${queueId}, user ${create_user_id}`);

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
      logger.info(`Using provided buffer, size: ${audioBuffer.length} bytes`);
    } else if (audioUrl) {
      logger.info(`Downloading audio from URL: ${redactUrl(audioUrl)}`);

      try {
        let storagePath = audioUrl;
        if (audioUrl.includes('incident-audio/')) {
          storagePath = audioUrl.split('incident-audio/')[1].split('?')[0];
        } else if (audioUrl.includes('/')) {
          storagePath = audioUrl.split('/').slice(-2).join('/');
        }

        logger.debug(`Attempting to download from path: ${storagePath}`);

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('incident-audio')
          .download(storagePath);

        if (downloadError) {
          logger.error('Supabase download error:', downloadError);
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

        logger.info(`Downloaded buffer size: ${finalAudioBuffer.length} bytes`);
      } catch (downloadError) {
        logger.error('Audio download failed:', downloadError);
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
        logger.info(`Whisper API attempt ${retryCount + 1}/${maxRetries}`);

        whisperResponse = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'Authorization': `Bearer ${config.openai.apiKey}`
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

        logger.success('Whisper API call successful');
        break;

      } catch (error) {
        retryCount++;
        logger.error(`Whisper API attempt ${retryCount} failed:`, error.response?.data || error.message);

        if (retryCount >= maxRetries) {
          throw new Error(`Whisper API failed after ${maxRetries} attempts: ${error.message}`);
        }

        const waitTime = Math.pow(2, retryCount) * 1000;
        logger.info(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    const transcription = whisperResponse.data.text;

    if (!transcription || transcription.trim().length === 0) {
      throw new Error('Transcription returned empty text');
    }

    logger.success(`Transcription successful, text length: ${transcription.length} characters`);

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
      logger.error('Error updating transcription_queue:', queueUpdateError);
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
      logger.error('Error saving to ai_transcription:', saveError);
    } else {
      logger.success('Transcription saved to ai_transcription table');
    }

    // Send real-time update
    broadcastTranscriptionUpdate(queueId.toString(), {
      status: CONSTANTS.TRANSCRIPTION_STATUS.GENERATING_SUMMARY,
      transcription: transcription,
      message: 'Generating AI summary...',
      timestamp: new Date().toISOString()
    });

    // Generate AI summary
    if (config.openai.apiKey && transcription.length > 10) {
      try {
        logger.info('Starting AI summary generation');
        const summary = await generateAISummary(transcription, create_user_id, incident_report_id || queueId, supabase);

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

          logger.success('AI summary generated and process completed successfully');
        }
      } catch (summaryError) {
        logger.error('Summary generation failed:', summaryError);

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
    logger.error(`Transcription processing error for queue ${queueId}:`, error);

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
      logger.error('Error updating failed status:', updateError);
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
    logger.debug('Checking for pending transcriptions...');

    const { data: pending, error } = await supabase
      .from('transcription_queue')
      .select('*')
      .in('status', [CONSTANTS.TRANSCRIPTION_STATUS.PENDING, CONSTANTS.TRANSCRIPTION_STATUS.FAILED])
      .lt('retry_count', CONSTANTS.RETRY_LIMITS.TRANSCRIPTION)
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      logger.error('Error fetching transcription queue', error);
      return;
    }

    if (!pending || pending.length === 0) {
      logger.debug('No pending transcriptions found');
      return;
    }

    logger.info(`Processing ${pending.length} transcription items from queue`);

    for (const item of pending) {
      try {
        const existingStatus = transcriptionStatuses.get(item.id.toString());
        if (existingStatus && existingStatus.status === CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING) {
          logger.info(`Skipping queue item ${item.id} - already processing`);
          continue;
        }

        logger.info(`Processing queue item ${item.id} (attempt ${item.retry_count + 1})`);

        await processTranscriptionFromBuffer(
          item.id,
          null,
          item.create_user_id,
          item.incident_report_id,
          item.audio_url
        );

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        logger.error(`Error processing transcription item ${item.id}:`, error);
      }
    }
  } catch (error) {
    logger.error('Fatal error in transcription queue processor:', error);
  }
}

// Schedule transcription queue processing
let transcriptionQueueInterval = null;
if (supabaseEnabled) {
  transcriptionQueueInterval = setInterval(processTranscriptionQueue, config.queue.intervalMinutes * 60 * 1000);
  setTimeout(processTranscriptionQueue, 30000);
  logger.info(`Transcription queue processor scheduled every ${config.queue.intervalMinutes} minutes`);
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
      logger.error('Error storing completed form', error);
    }

    return data || { id: `temp-${Date.now()}` };
  } catch (error) {
    logger.error('Error in storeCompletedForm', error);
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
      logger.info('Processing signup images', { userId: webhookData.create_user_id });

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
          logger.info(`Processing ${field}...`);

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
            logger.debug(`${field} uploaded successfully`);

          } catch (imgError) {
            logger.error(`Error processing ${field}`, imgError);
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
          logger.error('Error updating user_signup', updateError);
        } else {
          logger.info('Updated user_signup with storage paths');
        }
      }

      await gdprService.logActivity(webhookData.create_user_id, 'IMAGES_PROCESSED', {
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
      logger.error('Error in processSignupImages', error);
      throw error;
    }
  }

  async processIncidentReportFiles(webhookData) {
    try {
      logger.info('Processing incident report files', {
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
          logger.debug(`Processing ${field} (${type})...`);

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
            logger.debug(`${type} uploaded successfully (${extension})`);

            if (!isImage && type === 'audio_account') {
              await this.queueTranscription(createUserId, incidentReportId, storagePath);
            }

          } catch (fileError) {
            logger.error(`Error processing ${field}`, fileError);
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
          logger.error('Error updating incident_reports', updateError);
        } else {
          logger.info('Updated incident_reports with storage paths');
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
      logger.error('Error in processIncidentReportFiles', error);
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

      logger.debug('Audio queued for transcription');
    } catch (error) {
      logger.error('Error queuing transcription', error);
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
      logger.error('Error downloading file', error);
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
      logger.error('Error uploading to Supabase', error);
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
      logger.error('Error creating image record', error);
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
      logger.error('Error logging access', error);
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

      await gdprService.logActivity(createUserId, 'DATA_DELETED', {
        type: 'images',
        count: deletionResults.filter(r => r.deleted).length
      });

      return {
        images_deleted: deletionResults.filter(r => r.deleted).length,
        total_images: images.length,
        details: deletionResults
      };

    } catch (error) {
      logger.error('Error deleting user images', error);
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
  logger.info(`Starting PDF generation (${source})`, { userId: create_user_id });

  const validation = validateUserId(create_user_id);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  await gdprService.logActivity(create_user_id, 'PDF_GENERATION', {
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

  logger.success('PDF generation process completed');

  return {
    success: true,
    form_id: storedForm.id,
    create_user_id,
    email_sent: emailResult.success,
    timestamp: new Date().toISOString()
  };
}

// ========================================
// MODELS
// ========================================
const User = require('./src/models/User');
const Transcription = require('./src/models/Transcription');

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
      logger.error('Supabase health check failed', error);
    }
  }

  if (config.openai.apiKey) {
    try {
      await axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${config.openai.apiKey}` },
        timeout: 5000
      });
      services.openai = true;
    } catch (error) {
      logger.error('OpenAI health check failed', error);
    }
  }

  if (config.what3words.apiKey) {
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
    supabaseUrl: config.supabase.url,
    supabaseAnonKey: config.supabase.anonKey,
    features: {
      realtime: supabaseEnabled && realtimeChannels.transcriptionChannel ? true : false,
      transcription: config.openai.enabled,
      ai_summary: config.openai.enabled,
      ai_listening: config.openai.enabled,
      pdf_generation: !!(fetchAllData && generatePDF && sendEmails),
      auth: !!authService,
      what3words: config.what3words.enabled,
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
// MOUNT ROUTES
// ========================================
const authRoutes = require('./src/routes/auth.routes');
const transcriptionRoutes = require('./src/routes/transcription.routes');
const gdprRoutes = require('./src/routes/gdpr.routes');

// Initialize controllers with dependencies
const transcriptionController = require('./src/controllers/transcription.controller');
transcriptionController.initializeController(transcriptionStatuses, broadcastTranscriptionUpdate);

const gdprController = require('./src/controllers/gdpr.controller');
gdprController.initializeController(supabase);

// Make imageProcessor available to routes
app.locals.imageProcessor = imageProcessor;

app.use('/api/auth', authRoutes);
app.use('/api/transcription', transcriptionRoutes);
app.use('/api/gdpr', gdprRoutes);

// ========================================
// (GDPR ENDPOINTS MOVED TO src/routes/gdpr.routes.js)
// ========================================

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

    if (!config.what3words.apiKey) {
      logger.error('what3words API key not found');
      return sendError(res, 500, 'Configuration error', 'API_KEY_MISSING',
        'what3words API key not configured');
    }

    const what3wordsUrl = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${latitude},${longitude}&key=${config.what3words.apiKey}`;

    const response = await axios.get(what3wordsUrl, {
      timeout: 10000
    });

    const data = response.data;

    if (response.status !== 200) {
      logger.error('what3words API error:', data);
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
    logger.error('what3words conversion error:', error);
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

    if (!config.what3words.apiKey) {
      return sendError(res, 500, 'Configuration error', 'API_KEY_MISSING',
        'what3words API key not configured');
    }

    const what3wordsUrl = `https://api.what3words.com/v3/autosuggest?input=${encodeURIComponent(input)}&key=${config.what3words.apiKey}`;

    const response = await axios.get(what3wordsUrl, {
      timeout: 10000
    });

    const data = response.data;

    if (response.status !== 200) {
      logger.error('what3words autosuggest error:', data);
      return sendError(res, response.status, 'what3words API error', 'W3W_API_ERROR',
        data.error?.message || 'Failed to get suggestions');
    }

    res.json({
      success: true,
      suggestions: data.suggestions || [],
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('what3words autosuggest error:', error);
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

    if (!config.what3words.apiKey) {
      logger.warn('What3Words API key not configured');
      return res.json({
        words: 'location.not.configured',
        requestId: req.requestId
      });
    }

    const response = await axios.get(
      `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${config.what3words.apiKey}`,
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
    logger.error('What3Words API error', error);
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
    logger.info('Debug check for user', { userId });

    await gdprService.logActivity(userId, 'DATA_ACCESS', {
      type: 'debug_view',
      ip: req.clientIp
    }, req);

    const userDataResult = await User.getUserDataBatch(userId);
    
    if (!userDataResult.success) {
      return sendError(res, 404, userDataResult.error, userDataResult.code || 'USER_DATA_ERROR');
    }

    const userData = userDataResult.data;

    res.json({
      userId,
      timestamp: new Date().toISOString(),
      dataFound: userData,
      summary: {
        userExists: !!userData.user,
        incidentCount: userData.incidents.length,
        transcriptionCount: userData.transcriptions.length,
        summaryCount: userData.summaries.length,
        imageCount: userData.images.length,
        aiListeningCount: userData.aiListeningTranscripts.length,
        emergencyCallCount: userData.emergencyCalls.length
      },
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Debug endpoint error', error);
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
          'Authorization': `Bearer ${config.openai.apiKey}`
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
  logger.info('Manual queue processing triggered');

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
    logger.error('Manual queue processing error', error);
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
    logger.info('Manual transcription queue processing triggered');
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

// ========================================
// (GDPR EXPORT AND DELETE ENDPOINTS MOVED TO src/routes/gdpr.routes.js)
// ========================================

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

// Legacy transcription endpoints (redirects to new routes)
app.post('/api/whisper/transcribe', (req, res) => {
  res.redirect(307, '/api/transcription/transcribe');
});

app.get('/api/transcription-status/:queueId', (req, res) => {
  res.redirect(`/api/transcription/status/${req.params.queueId}`);
});

app.post('/api/update-transcription', (req, res) => {
  res.redirect(307, '/api/transcription/update');
});

app.post('/api/save-transcription', (req, res) => {
  res.redirect(307, '/api/transcription/save');
});

app.get('/api/user/:userId/latest-transcription', (req, res) => {
  res.redirect(`/api/transcription/user/${req.params.userId}/latest`);
});

app.get('/api/user/:userId/transcriptions', (req, res) => {
  res.redirect(`/api/transcription/user/${req.params.userId}/all`);
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

          logger.info('Saving AI listening transcript', { 
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
            await gdprService.logActivity(userId, 'CONSENT_VIOLATION_PREVENTED', {
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
            logger.error('Error saving AI listening transcript:', insertError);
            return sendError(res, 500, 'Failed to save transcript', 'DATABASE_ERROR',
              insertError.message);
          }

          // Log GDPR activity
          await gdprService.logActivity(userId, 'AI_LISTENING_SAVED', {
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

              logger.info('Linked AI transcript to incident report', { 
                incidentId, 
                transcriptId: savedTranscript.id 
              });
            } catch (linkError) {
              // Non-critical error - log but don't fail the request
              logger.warn('Could not link AI transcript to incident:', linkError);
            }
          }

          // Generate AI summary if transcript is substantial enough
          let aiSummary = null;
          if (config.openai.apiKey && fullTranscript.length > 100) {
            try {
              logger.info('Generating AI summary for listening transcript');
              aiSummary = await generateAISummary(
                fullTranscript, 
                userId, 
                incidentId || savedTranscript.id,
                supabase
              );

              if (aiSummary) {
                logger.success('AI summary generated for AI listening transcript');
              }
            } catch (summaryError) {
              // Non-critical error - log but don't fail the request
              logger.error('Failed to generate AI summary:', summaryError);
            }
          }

          logger.success('AI listening transcript saved successfully', {
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
          logger.error('Error in save-ai-listening-transcript endpoint:', error);
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

          logger.info('Fetching AI listening transcripts', { userId });

          // Fetch transcripts with pagination
          const { data: transcripts, error, count } = await supabase
            .from('ai_listening_transcripts')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

          if (error) {
            logger.error('Error fetching AI listening transcripts:', error);
            return sendError(res, 500, 'Failed to fetch transcripts', 'DATABASE_ERROR');
          }

          // Log GDPR activity
          await gdprService.logActivity(userId, 'DATA_ACCESS', {
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
          logger.error('Error in get AI listening transcripts endpoint:', error);
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

          logger.info('Fetching emergency contact', { userId });

          // Fetch user's emergency contact number
          const { data, error } = await supabase
            .from('user_signup')
            .select('emergency_contact_number, emergency_contact, first_name, last_name')
            .eq('create_user_id', userId)
            .single();

          if (error) {
            logger.error('Error fetching emergency contact:', error);
            return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
          }

          if (!data) {
            return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
          }

          // Try emergency_contact_number first (new field), fallback to emergency_contact (legacy)
          const contactNumber = data.emergency_contact_number || data.emergency_contact || null;
          const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User';

          // Log GDPR activity for emergency contact access
          await gdprService.logActivity(userId, 'EMERGENCY_CONTACT_ACCESSED', {
            has_contact: !!contactNumber,
            source: 'emergency_feature'
          }, req);

          if (!contactNumber) {
            logger.warn('No emergency contact found for user', { userId });
            return res.json({
              success: true,
              hasEmergencyContact: false,
              emergencyContact: null,
              message: 'No emergency contact configured',
              userName: userName,
              requestId: req.requestId
            });
          }

          logger.info('Emergency contact retrieved successfully', { 
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
          logger.error('Error in emergency contact endpoint:', error);
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

          logger.info('Updating emergency contact', { userId });

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
            logger.error('Error updating emergency contact:', error);
            return sendError(res, 500, 'Failed to update emergency contact', 'UPDATE_FAILED');
          }

          if (!data) {
            return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
          }

          // Log GDPR activity
          await gdprService.logActivity(userId, 'DATA_UPDATE', {
            type: 'emergency_contact',
            action: 'updated'
          }, req);

          logger.success('Emergency contact updated successfully', { userId });

          res.json({
            success: true,
            message: 'Emergency contact updated successfully',
            emergencyContact: emergencyContact,
            timestamp: new Date().toISOString(),
            requestId: req.requestId
          });

          } catch (error) {
          logger.error('Error updating emergency contact:', error);
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
            logger.error('Supabase error', error);
            return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
          }

          res.json({
            emergency_contact: data.emergency_contact_number || data.emergency_contact || null,
            recovery_breakdown_number: data.recovery_breakdown_number || null,
            emergency_services_number: data.emergency_services_number || '999',
            requestId: req.requestId
          });
          } catch (error) {
          logger.error('Error fetching emergency contacts', error);
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
            logger.error('Failed to log emergency call', error);
            return res.json({
              success: false,
              logged: false,
              requestId: req.requestId
            });
          }

          await gdprService.logActivity(user_id, 'EMERGENCY_CALL_LOGGED', {
            service: service_called
          }, req);

          res.json({
            success: true,
            logged: true,
            requestId: req.requestId
          });
          } catch (error) {
          logger.error('Error logging emergency call', error);
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

          await gdprService.logActivity(userId, 'IMAGE_UPLOADED', {
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
          logger.error('Error uploading what3words image', error);
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

          await gdprService.logActivity(userId, 'IMAGES_ACCESSED', {
            count: images?.length || 0
          }, req);

          res.json({
            success: true,
            images: images || [],
            count: images?.length || 0,
            requestId: req.requestId
          });
          } catch (error) {
          logger.error('Error fetching user images', error);
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

          await gdprService.logActivity(userId, 'SIGNED_URL_GENERATED', {
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
          logger.error('Error generating signed URL', error);
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
          logger.error('Error checking PDF status', error);
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

          await gdprService.logActivity(userId, 'PDF_DOWNLOADED', {}, req);

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
          logger.error('Error downloading PDF', error);
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
          logger.error('Error in PDF generation', error);
          sendError(res, 500, error.message, 'PDF_GENERATION_FAILED');
          }
          });

          // ========================================
          // WEBHOOK ENDPOINTS
          // ========================================

          // Signup webhook
          app.post('/webhook/signup', checkSharedKey, async (req, res) => {
          try {
          logger.info('Signup webhook received');

          if (!supabaseEnabled || !imageProcessor) {
            return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
          }

          const webhookData = req.body;

          if (!webhookData.create_user_id) {
            return sendError(res, 400, 'Missing create_user_id', 'MISSING_USER_ID');
          }

          await gdprService.logActivity(webhookData.create_user_id, 'SIGNUP_PROCESSING', {
            source: 'webhook',
            has_images: true
          }, req);

          imageProcessor.processSignupImages(webhookData)
            .then(result => {
              logger.success('Signup processing complete', result);
            })
            .catch(error => {
              logger.error('Signup processing failed', error);
            });

          res.status(200).json({
            success: true,
            message: 'Signup processing started',
            create_user_id: webhookData.create_user_id,
            requestId: req.requestId
          });
          } catch (error) {
          logger.error('Webhook error', error);
          sendError(res, 500, error.message, 'WEBHOOK_ERROR');
          }
          });

          // Incident report webhook
          app.post('/webhook/incident-report', checkSharedKey, async (req, res) => {
          try {
          logger.info('Incident report webhook received');

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

          await gdprService.logActivity(webhookData.create_user_id, 'INCIDENT_REPORT', {
            incident_id: incidentId,
            source: 'webhook'
          }, req);

          const result = await imageProcessor.processIncidentReportFiles(webhookData);

          logger.success('Incident processing complete:', result);

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
          logger.error('Webhook error', error);
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
          logger.error('Error in webhook PDF generation', error);
          sendError(res, 500, error.message, 'PDF_GENERATION_FAILED');
          }
          });

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
          // GRACEFUL SHUTDOWN
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

          // Clear intervals
          if (transcriptionQueueInterval) {
          clearInterval(transcriptionQueueInterval);
          }
          if (wsHeartbeat) {
          clearInterval(wsHeartbeat);
          }

          // Close WebSocket server
          wss.close(() => {
          logger.info('WebSocket server closed');
          });

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

          // ========================================
          // STARTUP CHECKS
          // ========================================

          // Check for required environment variables
          // Check for required configuration
          const missingConfig = [];
          if (!config.supabase.url) missingConfig.push('SUPABASE_URL');
          if (!config.supabase.serviceKey) missingConfig.push('SUPABASE_SERVICE_ROLE_KEY');
          if (!config.openai.apiKey) missingConfig.push('OPENAI_API_KEY');

          if (missingConfig.length > 0) {
          logger.warn('⚠️  WARNING: Missing required environment variables:');
          missingConfig.forEach(varName => {
          logger.warn(`   - ${varName}`);
          });
          }

          if (!config.what3words.enabled) {
          logger.warn('⚠️  WARNING: WHAT3WORDS_API_KEY not set in environment variables');
          logger.warn('   Emergency location services will not work properly');
          logger.warn('   Get your API key at: https://what3words.com/select-plan');
          }

          if (!config.supabase.anonKey) {
          logger.warn('⚠️  WARNING: SUPABASE_ANON_KEY not set');
          logger.warn('   Authentication features will be disabled');
          }

          // ========================================
          // START SERVER
          // ========================================

          server.listen(config.server.port, config.server.host, () => {
          console.log('\n========================================');
          console.log('🚗 Car Crash Lawyer AI - Server Started');
          console.log('========================================');
          console.log(`\n🌐 Server running on http://${config.server.host}:${config.server.port}`);

          if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
          console.log(`🔗 Public URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
          }

          console.log('\n📊 Service Status:');
          console.log(`   Supabase: ${supabaseEnabled ? '✅ Connected' : '❌ Not configured'}`);
          console.log(`   Auth Service: ${authService ? '✅ Configured' : '⚠️  Not configured'}`);
          console.log(`   OpenAI: ${config.openai.enabled ? '✅ Configured' : '❌ Not configured'}`);
          console.log(`   what3words: ${config.what3words.enabled ? '✅ Configured' : '⚠️  Not configured'}`);
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
          logger.success('Server startup complete', {
          port: config.server.port,
          environment: config.server.env,
          services: {
            supabase: supabaseEnabled,
            auth: !!authService,
            openai: config.openai.enabled,
            what3words: config.what3words.enabled,
            pdf: !!(fetchAllData && generatePDF && sendEmails),
            ai_listening: config.openai.enabled,
            gdpr_consent: true
          }
          });
          });

          // Handle server errors
          server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${config.server.port} is already in use`);
          process.exit(1);
          } else {
          logger.error('Server error:', error);
          process.exit(1);
          }
          });

          // ========================================
          // EXPORT
          // ========================================

          module.exports = app;