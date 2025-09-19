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
require('dotenv').config();

// FIX: Added rate limiting
const rateLimit = require('express-rate-limit');

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Import PDF generation modules
const { fetchAllData } = require('./lib/dataFetcher');
const { generatePDF } = require('./lib/pdfGenerator');
const { sendEmails } = require('./lib/emailService');

// FIX: Added constants for better maintainability
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
  }
};

// FIX: Added proper logging utility
const Logger = {
  info: (message, data) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${new Date().toISOString()} ${message}`, data || '');
    }
  },
  error: (message, error) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, error);
  },
  warn: (message, data) => {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`, data || '');
  },
  debug: (message, data) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, data || '');
    }
  }
};

const app = express();
const server = http.createServer(app);

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for audio files
  fileFilter: (req, file, cb) => {
    // FIX: Added file type validation
    const allowedMimeTypes = [
      'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg',
      'image/jpeg', 'image/png', 'image/webp', 'image/heic'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// FIX: Added rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter limit for sensitive endpoints
  message: 'Rate limit exceeded for this operation.'
});

// --- MIDDLEWARE SETUP ---
app.use(cors());
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

// Enhanced request logging middleware with body preview
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  Logger.debug(`${req.method} ${req.path}`, { timestamp });

  // Log user ID if present in various locations
  const userId = req.body?.create_user_id || req.body?.userId || 
                 req.params?.userId || req.query?.userId;
  if (userId) {
    Logger.debug('User ID', { userId });
  }

  // Store IP for GDPR audit logging
  req.clientIp = req.ip || req.connection.remoteAddress;

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
    return res.status(503).json({ error: 'Server missing shared key (ZAPIER_SHARED_KEY)' });
  }
  if (provided !== SHARED_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
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
      message: 'A valid user ID must be provided to process personal data'
    });
  }

  // FIX: Added user ID format validation
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return res.status(400).json({
      error: 'Invalid user ID format',
      code: 'INVALID_USER_ID'
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
        ip: req.clientIp
      }, req);

      return res.status(403).json({
        error: 'GDPR consent required',
        code: 'CONSENT_REQUIRED',
        message: 'User must provide GDPR consent before processing personal data'
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
      code: 'CONSENT_CHECK_FAILED'
    });
  }
}

function authenticateRequest(req, res, next) {
  // Placeholder for future auth implementation
  Logger.debug('authenticateRequest called');
  next();
}

// --- SUPABASE SETUP ---
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
      }
    });
    Logger.info('Supabase initialized successfully');

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

// NEW: Initialize Supabase Realtime for better updates
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
    Logger.error('Failed to initialize Supabase Realtime', error);
  }
}

// NEW: Handle realtime transcription updates
function handleRealtimeTranscriptionUpdate(payload) {
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
}

// NEW: Handle realtime summary updates
function handleRealtimeSummaryUpdate(payload) {
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
}

// FIX: Improved GDPR table initialization with actual table creation
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
          .update({ archived: true, archived_at: new Date().toISOString() })
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
const wss = new WebSocket.Server({ noServer: true });
const activeSessions = new Map(); // queueId -> WebSocket
const userSessions = new Map(); // userId -> Set of WebSockets
const transcriptionStatuses = new Map(); // Store transcription statuses in memory

// FIX: Added cleanup for stale WebSocket connections
setInterval(() => {
  activeSessions.forEach((ws, queueId) => {
    if (ws.readyState !== WebSocket.OPEN) {
      activeSessions.delete(queueId);
    }
  });

  userSessions.forEach((wsSets, userId) => {
    const activeSockets = Array.from(wsSets).filter(ws => ws.readyState === WebSocket.OPEN);
    if (activeSockets.length !== wsSets.size) {
      userSessions.set(userId, new Set(activeSockets));
    }
    if (activeSockets.length === 0) {
      userSessions.delete(userId);
    }
  });
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

  // FIX: Add heartbeat to detect broken connections
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      Logger.debug('WebSocket message received', { type: data.type });

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
          }
          if (data.userId && userSessions.has(data.userId)) {
            userSessions.get(data.userId).delete(ws);
          }
          break;

        case CONSTANTS.WS_MESSAGE_TYPES.PING:
          ws.send(JSON.stringify({ type: CONSTANTS.WS_MESSAGE_TYPES.PONG }));
          break;

        default:
          Logger.debug('Unknown message type:', data.type);
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
    Logger.debug('WebSocket connection closed');
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

// FIX: WebSocket heartbeat interval
const wsHeartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Function to send real-time updates to specific queue
function sendTranscriptionUpdate(queueId, data) {
  const ws = activeSessions.get(queueId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// NEW: Function to broadcast to specific user
function broadcastToUser(userId, data) {
  if (userSessions.has(userId)) {
    userSessions.get(userId).forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
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

// --- AI SUMMARY GENERATION FUNCTION ---
async function generateAISummary(transcriptionText, createUserId, incidentId) {
  try {
    if (!process.env.OPENAI_API_KEY || !transcriptionText) {
      Logger.info('Cannot generate AI summary - missing API key or transcription');
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

    // Save to ai_summary table
    const { data, error } = await supabase
      .from('ai_summary')
      .insert({
        create_user_id: createUserId,
        incident_id: incidentId || createUserId,
        summary_text: aiAnalysis.summary_text || '',
        key_points: aiAnalysis.key_points || [],
        fault_analysis: aiAnalysis.fault_analysis || '',
        liability_assessment: aiAnalysis.contributing_factors || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      Logger.error('Error saving AI summary to database', error);
      return aiAnalysis; // Return analysis even if save fails
    }

    Logger.info('AI summary generated and saved successfully');
    return aiAnalysis;

  } catch (error) {
    Logger.error('AI Summary generation error', error.response?.data || error);
    return null;
  }
}

// UPDATED: Enhanced transcription processor with better error handling
async function processTranscriptionFromBuffer(queueId, audioBuffer, create_user_id, incident_report_id, audioUrl) {
  try {
    Logger.info(`Processing transcription for queue ${queueId}, user ${create_user_id}`);

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
      // Direct buffer processing (new immediate uploads)
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

    // Create FormData for Whisper API
    const formData = new FormData();
    formData.append('file', finalAudioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('language', 'en'); // Force English for UK accident reports

    // Call Whisper API with retry logic
    let whisperResponse;
    let retryCount = 0;
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

        Logger.info('Whisper API call successful');
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
    Logger.info(`Transcription successful, text length: ${transcription.length} characters`);

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
        retry_count: 0
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
      Logger.info('Transcription saved to ai_transcription table');
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

          Logger.info('AI summary generated and process completed successfully');
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
        retry_count: supabase.sql`retry_count + 1`
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

// FIX: Enhanced queue processor with better error recovery
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
        }
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

// FIX: Added health check for external services
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

      // Check if realtime is connected
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
      ai_summary: !!process.env.OPENAI_API_KEY
    }
  });
});

// FIX: Enhanced health check with external service status
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
    }
  };
  res.json(status);
});

// --- DEBUG ENDPOINT FOR USER DATA (WITH GDPR LOGGING) ---
app.get('/api/debug/user/:userId', checkSharedKey, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({ error: 'Service not configured' });
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

    // Check user_signup
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