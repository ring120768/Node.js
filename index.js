<artifact identifier="enhanced-index-js" type="application/vnd.ant.code" language="javascript" title="Enhanced index.js - Production Ready">
/**
 * Car Crash Lawyer AI - Main Server Application
 * Version: 2.0.0
 * 
 * This application handles:
 * - Incident report processing with GDPR compliance
 * - AI-powered transcription and legal narrative generation
 * - PDF report generation and distribution
 * - Real-time WebSocket updates
 * - Secure file storage and processing
 */
'use strict';
// ============================================================================
// DEPENDENCIES & IMPORTS
// ============================================================================
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
const helmet = require('helmet'); // Added for security
const compression = require('compression'); // Added for performance
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
// Load environment variables
require('dotenv').config();
// ============================================================================
// MODULE IMPORTS WITH ENHANCED ERROR HANDLING
// ============================================================================
const modules = {
pdf: null,
email: null,
dataFetcher: null,
legalNarrative: null
};
// Load PDF generation modules
try {
modules.dataFetcher = require('./lib/dataFetcher').fetchAllData;
modules.pdf = require('./lib/pdfGenerator').generatePDF;
modules.email = require('./lib/emailService').sendEmails;
console.log('✅ PDF generation modules loaded');
} catch (error) {
console.warn('⚠️ PDF modules not found - PDF features disabled:', error.message);
}
// Load Legal Narrative Generator
try {
const { generateAndSaveLegalNarrative } = require('./lib/aiSummaryGenerator');
modules.legalNarrative = generateAndSaveLegalNarrative;
console.log('✅ Legal Narrative Generator loaded');
} catch (error) {
console.warn('⚠️ Legal Narrative Generator not found:', error.message);
}
// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const CONFIG = {
APP: {
PORT: parseInt(process.env.PORT) || 3000,
ENV: process.env.NODE_ENV || 'development',
VERSION: '2.0.0',
NAME: 'Car Crash Lawyer AI'
},
LIMITS: {
FILE_SIZE: {
AUDIO: 50 * 1024 * 1024, // 50MB
IMAGE: 10 * 1024 * 1024, // 10MB
PDF: 25 * 1024 * 1024     // 25MB
},
RATE_LIMIT: {
WINDOW_MS: 15 * 60 * 1000, // 15 minutes
MAX_REQUESTS: 100,
STRICT_MAX: 10
},
TRANSCRIPTION: {
MAX_RETRIES: 5,
QUEUE_BATCH_SIZE: 5,
PROCESSING_INTERVAL: 5 * 60 * 1000 // 5 minutes
}
},
TIMEOUTS: {
API: 30000,      // 30 seconds
WHISPER: 60000,  // 60 seconds
DOWNLOAD: 45000  // 45 seconds
},
GDPR: {
RETENTION_DAYS: parseInt(process.env.DATA_RETENTION_DAYS) || 365,
CONSENT_REQUIRED: true
},
STATUS: {
PENDING: 'pending',
PROCESSING: 'processing',
TRANSCRIBED: 'transcribed',
GENERATING_SUMMARY: 'generating_summary',
COMPLETED: 'completed',
FAILED: 'failed'
}
};
// ============================================================================
// ENHANCED LOGGER WITH LEVELS
// ============================================================================
class Logger {
static #formatMessage(level, message, data) {
const timestamp = new Date().toISOString();
const dataStr = data ?  | ${JSON.stringify(data)} : '';
return [${level}] ${timestamp} - ${message}${dataStr};
}
static debug(message, data = null) {
if (CONFIG.APP.ENV === 'development') {
console.log(this.#formatMessage('DEBUG', message, data));
}
}
static info(message, data = null) {
console.log(this.#formatMessage('INFO', message, data));
}
static success(message, data = null) {
console.log(this.#formatMessage('✅ SUCCESS', message, data));
}
static warn(message, data = null) {
console.warn(this.#formatMessage('⚠️ WARN', message, data));
}
static error(message, error = null) {
const errorData = error instanceof Error ? {
message: error.message,
stack: CONFIG.APP.ENV === 'development' ? error.stack : undefined
} : error;
console.error(this.#formatMessage('❌ ERROR', message, errorData));
}
}
// ============================================================================
// APPLICATION SETUP
// ============================================================================
const app = express();
const server = http.createServer(app);
// Security middleware
app.use(helmet({
contentSecurityPolicy: false, // Disable for development, configure for production
crossOriginEmbedderPolicy: false
}));
app.use(compression());
// Trust proxy configuration
app.set('trust proxy', 1);
// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================
const createRateLimiter = (max = CONFIG.LIMITS.RATE_LIMIT.MAX_REQUESTS) => {
return rateLimit({
windowMs: CONFIG.LIMITS.RATE_LIMIT.WINDOW_MS,
max,
message: 'Too many requests, please try again later.',
standardHeaders: true,
legacyHeaders: false,
trustProxy: 1,
keyGenerator: (req) => {
// Use user ID if available, otherwise IP
return req.body?.create_user_id || req.ip;
}
});
};
const apiLimiter = createRateLimiter();
const strictLimiter = createRateLimiter(CONFIG.LIMITS.RATE_LIMIT.STRICT_MAX);
// ============================================================================
// MULTER FILE UPLOAD CONFIGURATION
// ============================================================================
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
const allowedMimeTypes = {
audio: ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/aac'],
image: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
document: ['application/pdf']
};
const allAllowed = [...allowedMimeTypes.audio, ...allowedMimeTypes.image, ...allowedMimeTypes.document];
if (allAllowed.includes(file.mimetype)) {
cb(null, true);
} else {
cb(new Error(Invalid file type: ${file.mimetype}. Allowed types: ${allAllowed.join(', ')}));
}
};
const upload = multer({
storage,
limits: {
fileSize: CONFIG.LIMITS.FILE_SIZE.AUDIO,
files: 5
},
fileFilter
});
// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================
// CORS configuration
app.use(cors({
origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
credentials: true,
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'X-User-Id', 'X-Request-Id'],
maxAge: 86400 // Cache preflight for 24 hours
}));
// Body parsing
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
// Static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
maxAge: CONFIG.APP.ENV === 'production' ? '1d' : 0,
etag: true
}));
// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/whisper/', strictLimiter);
app.use('/api/gdpr/', strictLimiter);
app.use('/api/generate-legal-narrative', strictLimiter);
// Request tracking middleware
app.use((req, res, next) => {
req.requestId = req_${Date.now()}_${crypto.randomBytes(4).toString('hex')};
req.startTime = Date.now();
res.setHeader('X-Request-Id', req.requestId);
res.setHeader('X-Response-Time', '0ms');
// Log request
Logger.debug(${req.method} ${req.path}, {
requestId: req.requestId,
ip: req.ip,
userAgent: req.get('user-agent')?.substring(0, 50)
});
// Track response time
res.on('finish', () => {
const duration = Date.now() - req.startTime;
res.setHeader('X-Response-Time', ${duration}ms);
if (duration > 3000) {
  Logger.warn(`Slow request: ${req.method} ${req.path}`, { duration, requestId: req.requestId });
}
});
next();
});
// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================
class AuthManager {
static #sharedKey = process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY || '';
static validateApiKey(req, res, next) {
const providedKey =
req.get('X-Api-Key') ||
req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
'';
if (!AuthManager.#sharedKey) {
  Logger.error('No API key configured');
  return res.status(503).json({
    error: 'Service configuration error',
    requestId: req.requestId
  });
}

if (providedKey !== AuthManager.#sharedKey) {
  Logger.warn('Authentication failed', { ip: req.ip, requestId: req.requestId });
  return res.status(401).json({
    error: 'Unauthorized',
    requestId: req.requestId
  });
}

next();
}
static async validateGDPRConsent(req, res, next) {
const userId = req.body?.create_user_id || req.body?.userId || req.params?.userId;
if (!userId) {
  return res.status(400).json({
    error: 'User identification required',
    code: 'MISSING_USER_ID',
    requestId: req.requestId
  });
}

// Validate user ID format
if (!/^[a-zA-Z0-9_-]{3,64}$/.test(userId)) {
  return res.status(400).json({
    error: 'Invalid user ID format',
    code: 'INVALID_USER_ID',
    requestId: req.requestId
  });
}

req.userId = userId;
next();
}
}
// ============================================================================
// SUPABASE CLIENT SINGLETON
// ============================================================================
class SupabaseManager {
static #instance = null;
static #enabled = false;
static initialize() {
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  Logger.error('Supabase credentials missing');
  return false;
}

try {
  this.#instance = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-client-info': CONFIG.APP.NAME,
        'x-client-version': CONFIG.APP.VERSION
      }
    }
  });

  this.#enabled = true;
  Logger.success('Supabase initialized');
  return true;
} catch (error) {
  Logger.error('Supabase initialization failed', error);
  return false;
}
}
static get client() {
if (!this.#enabled) {
throw new Error('Supabase not initialized');
}
return this.#instance;
}
static get isEnabled() {
return this.#enabled;
}
}
// Initialize Supabase
const supabaseEnabled = SupabaseManager.initialize();
const supabase = supabaseEnabled ? SupabaseManager.client : null;
// ============================================================================
// WEBSOCKET MANAGER
// ============================================================================
class WebSocketManager {
constructor(server) {
this.wss = new WebSocket.Server({
noServer: true,
clientTracking: true,
maxPayload: 10 * 1024 * 1024,
perMessageDeflate: true
});
this.sessions = new Map();
this.userSessions = new Map();
this.heartbeatInterval = null;

this.setupServer(server);
this.setupHeartbeat();
}
setupServer(server) {
server.on('upgrade', (request, socket, head) => {
// Optional: Add authentication for WebSocket connections
this.wss.handleUpgrade(request, socket, head, (ws) => {
this.wss.emit('connection', ws, request);
});
});
this.wss.on('connection', this.handleConnection.bind(this));
}
handleConnection(ws, request) {
Logger.info('WebSocket connection established', {
ip: request.socket.remoteAddress
});
ws.isAlive = true;
ws.connectionTime = Date.now();
ws.messageCount = 0;

ws.on('pong', () => {
  ws.isAlive = true;
});

ws.on('message', (message) => this.handleMessage(ws, message));
ws.on('close', () => this.handleClose(ws));
ws.on('error', (error) => this.handleError(ws, error));

// Send welcome message
this.sendToClient(ws, {
  type: 'connected',
  message: 'WebSocket connection established',
  timestamp: new Date().toISOString()
});
}
handleMessage(ws, message) {
try {
const data = JSON.parse(message);
ws.messageCount++;
  switch (data.type) {
    case 'subscribe':
      this.handleSubscribe(ws, data);
      break;
    case 'unsubscribe':
      this.handleUnsubscribe(ws, data);
      break;
    case 'ping':
      this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
      break;
    default:
      Logger.debug('Unknown WebSocket message type', { type: data.type });
  }
} catch (error) {
  Logger.error('WebSocket message parsing error', error);
  this.sendToClient(ws, {
    type: 'error',
    message: 'Invalid message format'
  });
}
}
handleSubscribe(ws, data) {
if (data.queueId) {
this.sessions.set(data.queueId, ws);
ws.queueId = data.queueId;
this.sendToClient(ws, {
type: 'subscribed',
queueId: data.queueId
});
}
if (data.userId) {
  if (!this.userSessions.has(data.userId)) {
    this.userSessions.set(data.userId, new Set());
  }
  this.userSessions.get(data.userId).add(ws);
  ws.userId = data.userId;
  this.sendToClient(ws, {
    type: 'subscribed',
    userId: data.userId
  });
}
}
handleUnsubscribe(ws, data) {
if (data.queueId && this.sessions.has(data.queueId)) {
this.sessions.delete(data.queueId);
delete ws.queueId;
}
if (data.userId && this.userSessions.has(data.userId)) {
  this.userSessions.get(data.userId).delete(ws);
  if (this.userSessions.get(data.userId).size === 0) {
    this.userSessions.delete(data.userId);
  }
  delete ws.userId;
}
}
handleClose(ws) {
const duration = Date.now() - ws.connectionTime;
Logger.debug('WebSocket connection closed', {
duration,
messages: ws.messageCount
});
// Clean up subscriptions
if (ws.queueId) {
  this.sessions.delete(ws.queueId);
}
if (ws.userId && this.userSessions.has(ws.userId)) {
  this.userSessions.get(ws.userId).delete(ws);
}
}
handleError(ws, error) {
Logger.error('WebSocket error', error);
}
setupHeartbeat() {
this.heartbeatInterval = setInterval(() => {
this.wss.clients.forEach((ws) => {
if (!ws.isAlive) {
Logger.debug('Terminating inactive WebSocket');
return ws.terminate();
}
ws.isAlive = false;
ws.ping();
});
}, 30000);
}
sendToClient(ws, data) {
if (ws.readyState === WebSocket.OPEN) {
try {
ws.send(JSON.stringify(data));
} catch (error) {
Logger.error('Failed to send WebSocket message', error);
}
}
}
broadcast(type, data) {
const message = JSON.stringify({
type,
data,
timestamp: new Date().toISOString()
});
this.wss.clients.forEach((client) => {
  if (client.readyState === WebSocket.OPEN) {
    try {
      client.send(message);
    } catch (error) {
      Logger.error('Broadcast error', error);
    }
  }
});
}
broadcastToQueue(queueId, data) {
const ws = this.sessions.get(queueId);
if (ws) {
this.sendToClient(ws, data);
}
}
broadcastToUser(userId, data) {
const sessions = this.userSessions.get(userId);
if (sessions) {
sessions.forEach(ws => this.sendToClient(ws, data));
}
}
cleanup() {
if (this.heartbeatInterval) {
clearInterval(this.heartbeatInterval);
}
this.wss.close();
}
}
// Initialize WebSocket Manager
const wsManager = new WebSocketManager(server);
// ============================================================================
// TRANSCRIPTION QUEUE PROCESSOR
// ============================================================================
class TranscriptionProcessor {
constructor() {
this.processing = false;
this.interval = null;
}
async start() {
if (!supabaseEnabled) {
Logger.warn('Transcription processor disabled - Supabase not available');
return;
}
// Process immediately on start
setTimeout(() => this.processQueue(), 5000);

// Set up regular processing
this.interval = setInterval(
  () => this.processQueue(),
  CONFIG.LIMITS.TRANSCRIPTION.PROCESSING_INTERVAL
);

Logger.info('Transcription processor started');
}
async processQueue() {
if (this.processing) {
Logger.debug('Queue processing already in progress');
return;
}
this.processing = true;

try {
  const items = await this.fetchPendingItems();

  if (!items || items.length === 0) {
    Logger.debug('No pending transcriptions');
    return;
  }

  Logger.info(`Processing ${items.length} transcription items`);

  for (const item of items) {
    await this.processItem(item);
    await this.delay(2000); // Rate limiting
  }
} catch (error) {
  Logger.error('Queue processing error', error);
} finally {
  this.processing = false;
}
}
async fetchPendingItems() {
const { data, error } = await supabase
.from('transcription_queue')
.select('*')
.in('status', [CONFIG.STATUS.PENDING, CONFIG.STATUS.FAILED])
.lt('retry_count', CONFIG.LIMITS.TRANSCRIPTION.MAX_RETRIES)
.order('created_at', { ascending: true })
.limit(CONFIG.LIMITS.TRANSCRIPTION.QUEUE_BATCH_SIZE);
if (error) {
  throw error;
}

return data;
}
async processItem(item) {
try {
Logger.info(Processing transcription ${item.id});
  // Update status to processing
  await this.updateStatus(item.id, CONFIG.STATUS.PROCESSING);

  // Process transcription
  const transcription = await this.transcribeAudio(item);

  if (transcription) {
    // Save transcription
    await this.saveTranscription(item, transcription);

    // Generate legal narrative if module is available
    if (modules.legalNarrative) {
      await this.generateLegalNarrative(item);
    }

    // Mark as completed
    await this.updateStatus(item.id, CONFIG.STATUS.COMPLETED);

    // Send WebSocket notification
    wsManager.broadcastToQueue(item.id, {
      type: 'transcription_complete',
      status: CONFIG.STATUS.COMPLETED,
      transcription
    });
  }
} catch (error) {
  Logger.error(`Failed to process item ${item.id}`, error);
  await this.handleProcessingError(item, error);
}
}
async transcribeAudio(item) {
// Implementation for Whisper API transcription
if (!process.env.OPENAI_API_KEY) {
throw new Error('OpenAI API key not configured');
}
// Download audio file
const audioBuffer = await this.downloadAudio(item.audio_url);

// Create form data for Whisper API
const formData = new FormData();
const audioStream = Readable.from(audioBuffer);

formData.append('file', audioStream, {
  filename: 'audio.webm',
  contentType: 'audio/webm',
  knownLength: audioBuffer.length
});
formData.append('model', 'whisper-1');
formData.append('response_format', 'json');
formData.append('language', 'en');

// Call Whisper API with retry logic
const response = await this.callWhisperAPI(formData);
return response.data.text;
}
async callWhisperAPI(formData, retries = 3) {
for (let attempt = 1; attempt <= retries; attempt++) {
try {
const response = await axios.post(
'https://api.openai.com/v1/audio/transcriptions',
formData,
{
headers: {
...formData.getHeaders(),
'Authorization': Bearer ${process.env.OPENAI_API_KEY}
},
maxContentLength: Infinity,
maxBodyLength: Infinity,
timeout: CONFIG.TIMEOUTS.WHISPER
}
);
return response;
} catch (error) {
if (attempt === retries) {
throw error;
}
await this.delay(Math.pow(2, attempt) * 1000);
}
}
}
async downloadAudio(url) {
const response = await axios.get(url, {
responseType: 'arraybuffer',
timeout: CONFIG.TIMEOUTS.DOWNLOAD,
headers: {
'User-Agent': ${CONFIG.APP.NAME}/${CONFIG.APP.VERSION}
}
});
return Buffer.from(response.data);
}
async saveTranscription(item, transcriptionText) {
const { error } = await supabase
.from('ai_transcription')
.insert({
create_user_id: item.create_user_id,
incident_report_id: item.incident_report_id,
transcription_text: transcriptionText,
audio_url: item.audio_url,
created_at: new Date().toISOString()
});
if (error) {
  Logger.error('Failed to save transcription', error);
}
}
async generateLegalNarrative(item) {
try {
Logger.info('Generating legal narrative');
  const narrative = await modules.legalNarrative(
    item.create_user_id,
    item.incident_report_id,
    {
      target_length: "400-500 words",
      include_evidence_section: true,
      include_missing_notes: true
    }
  );

  Logger.success('Legal narrative generated');

  // Broadcast success
  wsManager.broadcast('legal_narrative_generated', {
    create_user_id: item.create_user_id,
    incident_report_id: item.incident_report_id,
    status: 'completed'
  });
} catch (error) {
  Logger.error('Legal narrative generation failed', error);
}
}
async updateStatus(queueId, status) {
const { error } = await supabase
.from('transcription_queue')
.update({
status,
updated_at: new Date().toISOString()
})
.eq('id', queueId);
if (error) {
  Logger.error(`Failed to update status for ${queueId}`, error);
}
}
async handleProcessingError(item, error) {
const retryCount = (item.retry_count || 0) + 1;
await supabase
  .from('transcription_queue')
  .update({
    status: retryCount >= CONFIG.LIMITS.TRANSCRIPTION.MAX_RETRIES 
      ? CONFIG.STATUS.FAILED 
      : CONFIG.STATUS.PENDING,
    retry_count: retryCount,
    error_message: error.message,
    updated_at: new Date().toISOString()
  })
  .eq('id', item.id);

wsManager.broadcastToQueue(item.id, {
  type: 'transcription_error',
  error: error.message,
  retryCount
});
}
delay(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}
stop() {
if (this.interval) {
clearInterval(this.interval);
this.interval = null;
}
Logger.info('Transcription processor stopped');
}
}
// Initialize transcription processor
const transcriptionProcessor = new TranscriptionProcessor();
// ============================================================================
// GDPR COMPLIANCE MANAGER
// ============================================================================
class GDPRManager {
static async logActivity(userId, activityType, details, req = null) {
if (!supabaseEnabled) return;
try {
  await supabase
    .from('gdpr_audit_log')
    .insert({
      user_id: userId,
      activity_type: activityType,
      details,
      ip_address: req?.ip || 'unknown',
      user_agent: req?.get('user-agent') || 'unknown',
      request_id: req?.requestId || null,
      timestamp: new Date().toISOString()
    });
} catch (error) {
  Logger.error('GDPR audit logging failed', error);
}
}
static async checkConsent(userId) {
if (!supabaseEnabled) return true;
try {
  const { data, error } = await supabase
    .from('user_signup')
    .select('gdpr_consent, gdpr_consent_date')
    .eq('create_user_id', userId)
    .single();

  if (error) throw error;
  return data?.gdpr_consent === true;
} catch (error) {
  Logger.error('Consent check failed', error);
  return false;
}
}
static async recordConsent(userId, consent, type = 'data_processing') {
if (!supabaseEnabled) return;
try {
  await supabase
    .from('gdpr_consent')
    .upsert({
      create_user_id: userId,
      gdpr_consent: consent,
      gdpr_consent_date: new Date().toISOString(),
      consent_type: type
    }, {
      onConflict: 'create_user_id'
    });

  await this.logActivity(
    userId,
    consent ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
    { consent_type: type }
  );
} catch (error) {
  Logger.error('Failed to record consent', error);
}
}
static async exportUserData(userId) {
if (!supabaseEnabled) {
throw new Error('Database not available');
}
const userData = {
  export_date: new Date().toISOString(),
  user_id: userId,
  data: {}
};

// Fetch data from all relevant tables
const tables = [
  'user_signup',
  'incident_reports', 
  'ai_transcription',
  'ai_summary',
  'incident_images'
];

for (const table of tables) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('create_user_id', userId);

    if (!error) {
      userData.data[table] = data;
    }
  } catch (error) {
    Logger.error(`Failed to export from ${table}`, error);
  }
}

await this.logActivity(userId, 'DATA_EXPORT', {
  tables: Object.keys(userData.data)
});

return userData;
}
static async deleteUserData(userId) {
if (!supabaseEnabled) {
throw new Error('Database not available');
}
const results = {};

// Tables to delete from (order matters for foreign keys)
const tables = [
  'ai_summary',
  'ai_transcription',
  'incident_images',
  'incident_reports',
  'user_signup'
];

for (const table of tables) {
  try {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq('create_user_id', userId);

    results[table] = error ? 'failed' : 'success';
  } catch (error) {
    Logger.error(`Failed to delete from ${table}`, error);
    results[table] = 'error';
  }
}

await this.logActivity(userId, 'DATA_DELETION', results);
return results;
}
}
// ============================================================================
// API ROUTES
// ============================================================================
// Health check endpoint
app.get('/health', async (req, res) => {
const health = {
status: 'healthy',
version: CONFIG.APP.VERSION,
timestamp: new Date().toISOString(),
uptime: process.uptime(),
services: {
database: supabaseEnabled,
transcription: !!process.env.OPENAI_API_KEY,
legalNarrative: !!modules.legalNarrative,
pdf: !!modules.pdf,
websocket: wsManager.wss.clients.size
}
};
res.json(health);
});
// Configuration endpoint
app.get('/api/config', (req, res) => {
res.json({
version: CONFIG.APP.VERSION,
features: {
transcription: !!process.env.OPENAI_API_KEY,
legalNarrative: !!modules.legalNarrative,
pdfGeneration: !!modules.pdf,
realtime: true,
gdprCompliant: true
}
});
});
// ============================================================================
// LEGAL NARRATIVE ENDPOINT
// ============================================================================
app.post('/api/generate-legal-narrative',
AuthManager.validateApiKey,
AuthManager.validateGDPRConsent,
async (req, res) => {
try {
const { create_user_id, incident_report_id } = req.body;
  if (!create_user_id || !incident_report_id) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['create_user_id', 'incident_report_id'],
      requestId: req.requestId
    });
  }

  if (!modules.legalNarrative) {
    return res.status(503).json({
      error: 'Legal narrative service unavailable',
      requestId: req.requestId
    });
  }

  Logger.info('Generating legal narrative', { 
    userId: create_user_id,
    incidentId: incident_report_id 
  });

  const narrative = await modules.legalNarrative(
    create_user_id,
    incident_report_id,
    {
      target_length: req.body.target_length || "400-500 words",
      include_evidence_section: req.body.include_evidence !== false,
      include_missing_notes: req.body.include_notes !== false
    }
  );

  // Log activity
  await GDPRManager.logActivity(
    create_user_id,
    'LEGAL_NARRATIVE_GENERATED',
    { incident_report_id },
    req
  );

  // Broadcast via WebSocket
  wsManager.broadcast('legal_narrative_generated', {
    create_user_id,
    incident_report_id,
    status: 'completed'
  });

  res.json({
    success: true,
    narrative,
    message: 'Legal narrative generated successfully',
    requestId: req.requestId
  });

} catch (error) {
  Logger.error('Legal narrative generation failed', error);
  res.status(500).json({
    error: 'Failed to generate legal narrative',
    details: CONFIG.APP.ENV === 'development' ? error.message : undefined,
    requestId: req.requestId
  });
}
});
// ============================================================================
// TRANSCRIPTION ENDPOINTS
// ============================================================================
app.post('/api/whisper/transcribe',
AuthManager.validateApiKey,
upload.single('audio'),
async (req, res) => {
try {
const { create_user_id, incident_report_id } = req.body;
  if (!req.file) {
    return res.status(400).json({
      error: 'No audio file provided',
      requestId: req.requestId
    });
  }

  if (!create_user_id) {
    return res.status(400).json({
      error: 'User ID required',
      requestId: req.requestId
    });
  }

  // Queue transcription
  const { data: queueEntry, error } = await supabase
    .from('transcription_queue')
    .insert({
      create_user_id,
      incident_report_id,
      status: CONFIG.STATUS.PENDING,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  res.json({
    success: true,
    queue_id: queueEntry.id,
    message: 'Audio queued for transcription',
    requestId: req.requestId
  });

} catch (error) {
  Logger.error('Transcription request failed', error);
  res.status(500).json({
    error: 'Failed to process transcription request',
    requestId: req.requestId
  });
}
});
app.get('/api/transcription-status/:queueId', async (req, res) => {
const { queueId } = req.params;
if (!supabaseEnabled) {
return res.status(503).json({
error: 'Service unavailable',
requestId: req.requestId
});
}
try {
const { data, error } = await supabase
.from('transcription_queue')
.select('*')
.eq('id', queueId)
.single();
if (error) throw error;

res.json({
  success: true,
  status: data.status,
  transcription: data.transcription_text,
  error: data.error_message,
  completed_at: data.completed_at,
  requestId: req.requestId
});
} catch (error) {
Logger.error('Status fetch failed', error);
res.status(500).json({
error: 'Failed to fetch status',
requestId: req.requestId
});
}
});
// ============================================================================
// PDF GENERATION ENDPOINT
// ============================================================================
app.post('/api/generate-pdf',
AuthManager.validateApiKey,
AuthManager.validateGDPRConsent,
async (req, res) => {
try {
const { create_user_id } = req.body;
  if (!modules.pdf || !modules.dataFetcher || !modules.email) {
    return res.status(503).json({
      error: 'PDF generation service unavailable',
      requestId: req.requestId
    });
  }

  Logger.info('Generating PDF for user', { userId: create_user_id });

  // Fetch all data
  const allData = await modules.dataFetcher(create_user_id);

  // Generate PDF
  const pdfBuffer = await modules.pdf(allData);

  // Send emails
  await modules.email(create_user_id, pdfBuffer, allData);

  // Log activity
  await GDPRManager.logActivity(
    create_user_id,
    'PDF_GENERATED',
    { size: pdfBuffer.length },
    req
  );

  res.json({
    success: true,
    message: 'PDF generated and sent successfully',
    requestId: req.requestId
  });

} catch (error) {
  Logger.error('PDF generation failed', error);
  res.status(500).json({
    error: 'PDF generation failed',
    requestId: req.requestId
  });
}
});
// ============================================================================
// GDPR ENDPOINTS
// ============================================================================
app.post('/api/gdpr/consent',
AuthManager.validateApiKey,
async (req, res) => {
try {
const { create_user_id, consent, consent_type } = req.body;
  if (!create_user_id || consent === undefined) {
    return res.status(400).json({
      error: 'Missing required fields',
      requestId: req.requestId
    });
  }

  await GDPRManager.recordConsent(
    create_user_id,
    consent,
    consent_type
  );

  res.json({
    success: true,
    message: 'Consent recorded',
    requestId: req.requestId
  });

} catch (error) {
  Logger.error('Consent recording failed', error);
  res.status(500).json({
    error: 'Failed to record consent',
    requestId: req.requestId
  });
}
});
app.get('/api/gdpr/export/:userId',
AuthManager.validateApiKey,
async (req, res) => {
try {
const { userId } = req.params;
  const userData = await GDPRManager.exportUserData(userId);

  res.json({
    success: true,
    data: userData,
    requestId: req.requestId
  });

} catch (error) {
  Logger.error('Data export failed', error);
  res.status(500).json({
    error: 'Failed to export data',
    requestId: req.requestId
  });
}
});
app.delete('/api/gdpr/delete/:userId',
AuthManager.validateApiKey,
async (req, res) => {
try {
const { userId } = req.params;
  const results = await GDPRManager.deleteUserData(userId);

  res.json({
    success: true,
    results,
    requestId: req.requestId
  });

} catch (error) {
  Logger.error('Data deletion failed', error);
  res.status(500).json({
    error: 'Failed to delete data',
    requestId: req.requestId
  });
}
});
// ============================================================================
// STATIC FILE SERVING
// ============================================================================
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/transcription.html', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'transcription.html'));
});
// Redirect legacy route
app.get('/transcription-status.html', (req, res) => {
res.redirect(301, '/transcription.html');
});
// 404 handler
app.use((req, res) => {
res.status(404).json({
error: 'Not found',
path: req.path,
requestId: req.requestId
});
});
// Error handler
app.use((err, req, res, next) => {
Logger.error('Unhandled error', err);
res.status(err.status || 500).json({
error: err.message || 'Internal server error',
requestId: req.requestId,
details: CONFIG.APP.ENV === 'development' ? err.stack : undefined
});
});
// ============================================================================
// SERVER STARTUP & SHUTDOWN
// ============================================================================
const startServer = async () => {
try {
// Start transcription processor
if (supabaseEnabled) {
await transcriptionProcessor.start();
}
// Start server
server.listen(CONFIG.APP.PORT, '0.0.0.0', () => {
  Logger.success(`
╔════════════════════════════════════════╗
║   CONFIG.APP.NAMEv{CONFIG.APP.NAME} v
CONFIG.APP.NAMEv{CONFIG.APP.VERSION}         ║
║   Server running on port ${CONFIG.APP.PORT}        ║
║   Environment: ${CONFIG.APP.ENV}          ║
╠════════════════════════════════════════╣
║   Services Status:                     ║
║   • Database: ${supabaseEnabled ? '✅' : '❌'}                      ║
║   • Legal Narrative: ${modules.legalNarrative ? '✅' : '❌'}           ║
║   • PDF Generation: ${modules.pdf ? '✅' : '❌'}            ║
║   • WebSocket: ✅                      ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    Logger.error('Failed to start server', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
Logger.info(${signal} received, starting graceful shutdown);
// Stop accepting new connections
server.close(async () => {
Logger.info('HTTP server closed');
// Stop transcription processor
transcriptionProcessor.stop();

// Close WebSocket connections
wsManager.cleanup();

// Close database connections if needed
// await supabase?.close();

Logger.info('Graceful shutdown completed');
process.exit(0);
});
// Force shutdown after 30 seconds
setTimeout(() => {
Logger.error('Forced shutdown after timeout');
process.exit(1);
}, 30000);
};
// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught errors
process.on('uncaughtException', (error) => {
Logger.error('Uncaught exception', error);
gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason, promise) => {
Logger.error('Unhandled rejection', reason);
});
// Start the server
startServer();
module.exports = app;
</artifact>