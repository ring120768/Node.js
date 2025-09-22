// --- NEW: GDPR CONSENT LOGGING ENDPOINT ---
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

    if (!create_user_id) {
      return res.status(400).json({ 
        error: 'User ID required',
        code: 'MISSING_USER_ID',
        requestId: req.requestId
      });
    }

    Logger.info('Processing GDPR consent', { 
      userId: create_user_id, 
      consentGiven: consent_given,
      type: consent_type 
    });

    if (!supabaseEnabled) {
      return res.json({ 
        success: true, 
        message: 'Consent recorded (database not configured)',
        requestId: req.requestId 
      });
    }

    // 1. Log to gdpr_audit_log for audit trail
    const auditLogData = {
      user_id: create_user_id,
      activity_type: consent_given ? 'CONSENT_GRANTED' : 'CONSENT_DECLINED',
      details: {
        consent_type: consent_type || 'data_sharing_for_claim',
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

    // 4. Update user_signup table as well for consistency
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

    // If consent was declined, you might want to send a notification
    if (!consent_given) {
      Logger.warn(`User ${create_user_id} declined GDPR consent for incident ${incident_id}`);
      // TODO: Trigger email notification about declined consent
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
2. Debug Webhook Test Endpoint (/api/debug/webhook-test)
Useful for testing and understanding webhook payload structures:
javascript// NEW: DEBUG ENDPOINT to inspect webhook payload structure
app.post('/api/debug/webhook-test', checkSharedKey, async (req, res) => {
  Logger.info('=== WEBHOOK DEBUG TEST ===');
  Logger.info('Headers:', JSON.stringify(req.headers, null, 2));
  Logger.info('Body:', JSON.stringify(req.body, null, 2));

  // Log all fields
  if (req.body) {
    Logger.info('Field analysis:');
    Object.keys(req.body).forEach(key => {
      Logger.info(`  ${key}: [${typeof req.body[key]}] ${JSON.stringify(req.body[key])}`);
    });

    // Look for consent-related fields
    Logger.info('Consent field search:');
    Object.keys(req.body).forEach(key => {
      if (key.toLowerCase().includes('legal') || 
          key.toLowerCase().includes('consent') || 
          key.toLowerCase().includes('agree') ||
          key.toLowerCase().includes('share') ||
          key.toLowerCase().includes('gdpr') ||
          key.toLowerCase().includes('question') ||
          key.toLowerCase().includes('q14')) {
        Logger.info(`  FOUND CONSENT FIELD: ${key} = ${req.body[key]}`);
      }
    });
  }

  res.json({
    success: true,
    message: 'Check server logs for webhook structure',
    fields: Object.keys(req.body || {}),
    consentRelatedFields: Object.keys(req.body || {}).filter(key => 
      key.toLowerCase().includes('legal') || 
      key.toLowerCase().includes('consent') || 
      key.toLowerCase().includes('agree') ||
      key.toLowerCase().includes('share') ||
      key.toLowerCase().includes('gdpr')
    ),
    requestId: req.requestId
  });
});
3. GDPR Data Export Endpoint (/api/gdpr/export/:userId)
Essential for GDPR compliance - allows users to export all their data:
javascript// --- GDPR DATA EXPORT ENDPOINT ---
app.get('/api/gdpr/export/:userId', checkSharedKey, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({ 
      error: 'Service not configured',
      requestId: req.requestId 
    });
  }

  const { userId } = req.params;

  try {
    // Verify user exists and has consent
    const { data: user } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.requestId
      });
    }

    // Collect all user data
    const userData = {
      user_profile: user,
      incident_reports: [],
      transcriptions: [],
      ai_summaries: [],
      images: [],
      emergency_calls: []
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

    // Log the export
    await logGDPRActivity(userId, 'DATA_EXPORT', {
      requested_by: req.clientIp,
      items_exported: {
        incidents: userData.incident_reports.length,
        transcriptions: userData.transcriptions.length,
        images: userData.images.length
      }
    }, req);

    // Generate export
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
    res.status(500).json({ 
      error: 'Failed to export data',
      code: 'EXPORT_FAILED',
      requestId: req.requestId
    });
  }
});
Where to Add These Endpoints in index.js:
Add these three endpoints right after the existing GDPR endpoints section (after the /api/gdpr/anonymize/:userId endpoint, around line 2180 in your index.js file).
These additions will provide:

Better GDPR consent tracking with multiple database updates and comprehensive audit logging
Webhook debugging capabilities to understand incoming data structures
GDPR-compliant data export functionality for user data portability

The rest of the functionality in temp.js appears to already exist in index.js, so these three endpoints are the essential missing pieces that would enhance your application's functionality.RetryIRUpdate and enhance the following code using best practices and optimal solutions. Deliver the complete updated file in an artifact.
Code to update:
index.js 
Desired improvements: GDPR Data Export Endpoint, Debug Webhook Test Endpoint, nhanced GDPR Consent Logging Endpoint
Requirements:
1. Code Improvements - Apply ALL relevant updates:
* Bug fixes: Identify and fix any errors or potential issues
* Performance: Optimize for speed and efficiency
* Modern syntax: Use current JavaScript (ES6+) features where appropriate
* Code organization: Improve structure and readability
* Error handling: Add proper error handling where missing
* User experience: Enhance UI responsiveness and feedback
* Accessibility: Ensure basic accessibility standards are met
* Security: Fix any obvious security issues
* Comments: Add clear comments for complex logic
2. Best Practices to Follow:
* Use semantic HTML elements
* Implement responsive design basics
* Follow DRY (Don't Repeat Yourself) principle
* Use meaningful variable and function names
* Add input validation where needed
* Ensure cross-browser compatibility
* Mobile-friendly approach
3. Deliverables:
1. Complete updated code in an artifact (ready to copy and use)
2. Brief summary (3-5 bullet points) of the main improvements made
3. Beginner-friendly note highlighting the most important change and why it matters
4. Code Style:
* Clean, readable formatting
* Consistent indentation
* Logical grouping of related code
* Clear naming conventions
Please ensure the updated code is production-ready and follows modern web development standards while remaining understandable for someone learning to code.EditStrategized comprehensive index.js enhancement with GDPR endpointsThe user wants me to update the index.js file by adding the three essential endpoints from temp.js that I identified:

Enhanced GDPR Consent Logging Endpoint
Debug Webhook Test Endpoint
GDPR Data Export Endpoint

I need to:

Take the complete index.js file
Add these three endpoints in the appropriate location
Apply any other improvements following best practices
Fix any bugs I notice
Ensure proper error handling, security, and modern syntax

Let me review the index.js file structure and add these endpoints after the existing GDPR endpoints section. I'll also look for any other improvements that can be made.
Key improvements to make:

Add the three missing endpoints
Ensure consistent error handling
Add proper validation
Use modern ES6+ syntax where appropriate
Add helpful comments
Fix any security issues
Ensure GDPR compliance

I'll place the new endpoints after line ~2180 where the other GDPR endpoints are located.I'll update your index.js file with the three essential GDPR endpoints and apply modern best practices throughout. Here's the complete enhanced version:
<artifacts>
<artifact identifier="enhanced-index-js" type="application/vnd.ant.code" language="javascript" title="Enhanced index.js with GDPR Improvements">
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
console.log([INFO] ${new Date().toISOString()} ${message}, data || '');
}
},
error: (message, error) => {
const errorMessage = error?.message || error || '';
const errorStack = error?.stack || '';
console.error([ERROR] ${new Date().toISOString()} ${message}, errorMessage);
if (errorStack && process.env.DEBUG === 'true') {
console.error(errorStack);
}
},
warn: (message, data) => {
console.warn([WARN] ${new Date().toISOString()} ${message}, data || '');
},
debug: (message, data) => {
if (process.env.DEBUG === 'true') {
console.log([DEBUG] ${new Date().toISOString()} ${message}, data || '');
}
},
success: (message, data) => {
console.log([✅ SUCCESS] ${new Date().toISOString()} ${message}, data || '');
}
};
// ========================================
// Express App Setup
// ========================================
const app = express();
const server = http.createServer(app);
// Security middleware
app.use(helmet({
contentSecurityPolicy: false,
crossOriginEmbedderPolicy: false
}));
app.use(compression());
// FIXED: Set trust proxy to 1 instead of true to resolve the X-Forwarded-For warning
app.set('trust proxy', 1);
// ========================================
// File Upload Configuration
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
// Rate Limiting Configuration
// ========================================
const apiLimiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes
max: 100,
message: 'Too many requests from this IP, please try again later.',
standardHeaders: true,
legacyHeaders: false,
trustProxy: 1,
skip: (req) => req.path === '/health'
});
const strictLimiter = rateLimit({
windowMs: 15 * 60 * 1000,
max: 10,
message: 'Rate limit exceeded for this operation.',
standardHeaders: true,
legacyHeaders: false,
trustProxy: 1
});
// ========================================
// Middleware Setup
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
const sanitizedPath = req.path.replace(//user/[^/]+/g, '/user/[REDACTED]');
Logger.debug(${req.method} ${sanitizedPath}, { timestamp });
const userId = req.body?.create_user_id || req.body?.userId ||
req.params?.userId || req.query?.userId || req.headers['x-user-id'];
if (userId) {
Logger.debug('User ID', { userId: userId.substring(0, 8) + '...' });
}
req.clientIp = req.ip ||
req.connection?.remoteAddress ||
req.headers['x-forwarded-for']?.split(',')[0].trim() ||
'unknown';
req.requestId = req_${Date.now()}_${Math.random().toString(36).substr(2, 9)};
res.setHeader('X-Request-Id', req.requestId);
next();
});
// ========================================
// Authentication Middleware
// ========================================
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
// ========================================
// GDPR Consent Check Middleware
// ========================================
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
Logger.debug('authenticateRequest called');
next();
}
// ========================================
// Supabase Setup
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
initializeGDPRTables();
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
const transcriptionChannel = supabase
.channel('transcription-updates')
.on(
'postgres_changes',
{
event: '',
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
event: '',
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
  if (transcriptionStatuses.has(queueId)) {
    transcriptionStatuses.set(queueId, {
      ...transcriptionStatuses.get(queueId),
      status: status,
      transcription: transcription || transcriptionStatuses.get(queueId).transcription
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
// Initialize GDPR tables
async function initializeGDPRTables() {
try {
const { error: consentError } = await supabase
.from('gdpr_consent')
.select('*')
.limit(1);
if (consentError && consentError.code === '42P01') {
  Logger.info('GDPR consent table needs creation (handle via migrations)');
}

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
// GDPR Activity Logging
// ========================================
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
// ========================================
// Data Retention Policy
// ========================================
async function enforceDataRetention() {
if (!supabaseEnabled) return;
const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS) || CONSTANTS.DATA_RETENTION.DEFAULT_DAYS;
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
try {
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
// WebSocket Setup
// ========================================
const wss = new WebSocket.Server({
noServer: true,
clientTracking: true,
maxPayload: 10 * 1024 * 1024
});
const activeSessions = new Map();
const userSessions = new Map();
const transcriptionStatuses = new Map();
// Cleanup stale WebSocket connections
setInterval(() => {
activeSessions.forEach((ws, queueId) => {
if (ws.readyState !== WebSocket.OPEN) {
activeSessions.delete(queueId);
Logger.debug(Cleaned up stale session for queue ${queueId});
}
});
userSessions.forEach((wsSets, userId) => {
const activeSockets = Array.from(wsSets).filter(ws => ws.readyState === WebSocket.OPEN);
if (activeSockets.length !== wsSets.size) {
userSessions.set(userId, new Set(activeSockets));
Logger.debug(Cleaned up ${wsSets.size - activeSockets.length} stale sockets for user ${userId});
}
if (activeSockets.length === 0) {
userSessions.delete(userId);
}
});
}, 60000);
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
// WebSocket broadcast functions
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
function broadcastTranscriptionUpdate(queueId, data) {
if (transcriptionStatuses.has(queueId)) {
Object.assign(transcriptionStatuses.get(queueId), data);
}
sendTranscriptionUpdate(queueId, data);
const statusData = transcriptionStatuses.get(queueId);
if (statusData?.create_user_id) {
broadcastToUser(statusData.create_user_id, data);
}
}
// ========================================
// Helper Functions
// ========================================
async function downloadFile(url) {
try {
const response = await axios.get(url, {
responseType: 'arraybuffer',
timeout: CONSTANTS.RETRY_LIMITS.DOWNLOAD_TIMEOUT
});
return Buffer.from(response.data);
} catch (error) {
Logger.error(Error downloading file from ${url}, error);
throw new Error(Failed to download file: ${error.message});
}
}
// ========================================
// AI Summary Generation
// ========================================
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
    fault_analysis: 'Manual review recommended'
  };
}

aiAnalysis = {
  summary_text: aiAnalysis.summary_text || 'Summary generation failed',
  key_points: Array.isArray(aiAnalysis.key_points) ? aiAnalysis.key_points : [],
  fault_analysis: aiAnalysis.fault_analysis || 'Unable to determine'
};

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

const summaryData = {
  create_user_id: dbUserId,
  incident_id: incidentId || dbUserId,
  summary_text: aiAnalysis.summary_text,
  key_points: aiAnalysis.key_points,
  created_at: new Date().toISOString()
};

const { data, error } = await supabase
  .from('ai_summary')
  .insert(summaryData)
  .select()
  .single();

if (error) {
  Logger.error('Error saving AI summary to database:', error);
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
// Transcription Processing
// ========================================
async function processTranscriptionFromBuffer(queueId, audioBuffer, create_user_id, incident_report_id, audioUrl) {
let retryCount = 0;
try {
Logger.info(Processing transcription for queue ${queueId}, user ${create_user_id});
if (!create_user_id) {
  throw new Error('User ID is required for transcription processing');
}

transcriptionStatuses.set(queueId.toString(), {
  status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
  transcription: null,
  summary: null,
  error: null,
  create_user_id: create_user_id
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
  Logger.info(`Downloading audio from URL: ${audioUrl}`);
  finalAudioBuffer = await downloadFile(audioUrl);
  Logger.info(`Downloaded buffer size: ${finalAudioBuffer.length} bytes`);
} else {
  throw new Error('No audio source provided (neither buffer nor URL)');
}

if (!finalAudioBuffer || finalAudioBuffer.length === 0) {
  throw new Error('No audio data available for transcription');
}

broadcastTranscriptionUpdate(queueId.toString(), {
  status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
  message: 'Audio loaded, sending to Whisper API...',
  timestamp: new Date().toISOString()
});

const formData = new FormData();
const audioStream = Readable.from(finalAudioBuffer);

formData.append('file', audioStream, {
  filename: 'audio.webm',
  contentType: 'audio/webm',
  knownLength: finalAudioBuffer.length
});

formData.append('model', 'whisper-1');
formData.append('response_format', 'json');
formData.append('language', 'en');

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
Logger.success(`Transcription successful, text length: ${transcription.length} characters`);

transcriptionStatuses.set(queueId.toString(), {
  status: CONSTANTS.TRANSCRIPTION_STATUS.TRANSCRIBED,
  transcription: transcription,
  summary: null,
  error: null,
  create_user_id: create_user_id
});

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
} else {
  Logger.success('Transcription saved to ai_transcription table');
}

broadcastTranscriptionUpdate(queueId.toString(), {
  status: CONSTANTS.TRANSCRIPTION_STATUS.GENERATING_SUMMARY,
  transcription: transcription,
  message: 'Generating AI summary...',
  timestamp: new Date().toISOString()
});

if (process.env.OPENAI_API_KEY && transcription) {
  try {
    Logger.info('Starting AI summary generation');
    const summary = await generateAISummary(transcription, create_user_id, incident_report_id || queueId);

    if (summary) {
      transcriptionStatuses.set(queueId.toString(), {
        ...transcriptionStatuses.get(queueId.toString()),
        status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
        summary: summary
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
Logger.error(Transcription processing error for queue ${queueId}:, error);
transcriptionStatuses.set(queueId.toString(), {
  status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
  transcription: null,
  summary: null,
  error: error.message,
  create_user_id: create_user_id
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
// Process transcription queue
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
Logger.info(Transcription queue processor scheduled every ${intervalMinutes} minutes);
}
// ========================================
// PDF Storage Function
// ========================================
async function storeCompletedForm(createUserId, pdfBuffer, allData) {
try {
const pdfBase64 = pdfBuffer.toString('base64');
const fileName = completed_forms/${createUserId}/report_${Date.now()}.pdf;
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
return { id: error-${Date.now()} };
}
}
// ========================================
// Image Processor Class
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
const imageProcessor = supabaseEnabled ? new ImageProcessor() : null;
// ========================================
// Utility Functions
// ========================================
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
headers: { 'Authorization': Bearer ${process.env.OPENAI_API_KEY} },
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
// API Routes
// ========================================
// Configuration endpoint
app.get('/api/config', (req, res) => {
res.json({
supabaseUrl: process.env.SUPABASE_URL,
supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.ANON_PUBLIC,
features: {
realtime: supabaseEnabled && realtimeChannels.transcriptionChannel ? true : false,
transcription: !!process.env.OPENAI_API_KEY,
ai_summary: !!process.env.OPENAI_API_KEY,
pdf_generation: !!(fetchAllData && generatePDF && sendEmails),
legal_narrative: !!generateAndSaveLegalNarrative,
gdpr_compliant: true
}
});
});
// Health check endpoint
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
version: '2.0.0',
fixes: {
consent_handling: 'ENHANCED - Comprehensive GDPR consent logging with multiple database updates',
ai_summary_columns: 'FIXED - Using only existing database columns',
transcription_saving: 'FIXED - Removed non-existent column references',
trust_proxy_configuration: 'FIXED - Changed from true to 1 for proper IP-based rate limiting',
error_handling: 'IMPROVED - More graceful error recovery',
gdpr_export: 'ADDED - Complete GDPR-compliant data export functionality',
webhook_debugging: 'ADDED - Debug endpoint for webhook payload inspection'
}
};
res.json(status);
});
// ========================================
// Essential Webhook Endpoints
// ========================================
// Typeform webhook
app.post('/webhook/typeform', checkSharedKey, async (req, res) => {
Logger.info('Typeform webhook received');
try {
const { form_response } = req.body;
if (!form_response) {
return res.status(400).json({ error: 'No form_response found' });
}
const answers = form_response.answers || [];
const userId = form_response.hidden?.create_user_id || 
              answers.find(a => a.field.ref === 'user_id')?.text || 
              'anonymous';
const incidentId = form_response.hidden?.incident_id || form_response.form_id;

const processedData = processTypeformData(req.body);

if (supabaseEnabled) {
  const { error } = await supabase
    .from('typeform_submissions')
    .insert({ 
      user_id: userId, 
      incident_id: incidentId, 
      data: processedData,
      created_at: new Date().toISOString()
    });

  if (error) {
    Logger.error('Error saving Typeform submission', error);
  }
}

res.status(200).json({ message: 'Typeform webhook processed' });
} catch (error) {
Logger.error('Typeform webhook error', error);
res.status(500).json({ error: 'Internal server error' });
}
});
// Zapier webhook
app.post('/webhook/zapier', checkSharedKey, async (req, res) => {
Logger.info('Zapier webhook received');
try {
const { event, payload } = req.body;
if (!event) {
  return res.status(400).json({ error: 'Event type is required' });
}

switch (event) {
  case 'new_incident':
    if (supabaseEnabled && payload) {
      const { error } = await supabase
        .from('incidents')
        .insert({ 
          id: payload.incidentId, 
          user_id: payload.userId, 
          data: payload,
          created_at: new Date().toISOString()
        });
      if (error) Logger.error('Error saving incident', error);
    }
    break;

  case 'update_status':
    if (supabaseEnabled && payload) {
      const { error } = await supabase
        .from('incidents')
        .update({ 
          status: payload.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.incidentId);
      if (error) Logger.error('Error updating status', error);
    }
    break;

  default:
    Logger.warn('Unknown Zapier event type', { event });
}

res.status(200).json({ message: `Event '${event}' processed` });
} catch (error) {
Logger.error('Zapier webhook error', error);
res.status(500).json({ error: 'Internal server error' });
}
});
// Upload audio for queued transcription
app.post('/api/whisper/upload', checkSharedKey, upload.single('audio'), async (req, res) => {
if (!req.file) {
return res.status(400).json({ error: 'No audio file provided' });
}
const userId = req.body.userId || 'anonymous';
try {
const fileName = ${userId}/audio_${Date.now()}.webm;
const { data: uploadData, error: uploadError } = await supabase.storage
.from('incident-audio')
.upload(fileName, req.file.buffer, {
contentType: req.file.mimetype
});
if (uploadError) throw uploadError;

const publicUrl = supabase.storage
  .from('incident-audio')
  .getPublicUrl(fileName).data.publicUrl;

const { data, error } = await supabase
  .from('transcription_queue')
  .insert({
    create_user_id: userId,
    audio_url: publicUrl,
    status: CONSTANTS.TRANSCRIPTION_STATUS.PENDING,
    created_at: new Date().toISOString()
  })
  .select()
  .single();

if (error) throw error;

res.status(202).json({ 
  message: 'Audio queued for transcription',
  queueId: data.id 
});
} catch (error) {
Logger.error('Audio upload error', error);
res.status(500).json({ error: 'Failed to queue audio' });
}
});
// Get transcription status
app.get('/api/whisper/status/:queueId', checkSharedKey, async (req, res) => {
const { queueId } = req.params;
const memoryStatus = transcriptionStatuses.get(queueId);
if (memoryStatus) {
return res.json(memoryStatus);
}
if (supabaseEnabled) {
const { data, error } = await supabase
.from('transcription_queue')
.select('status, transcription_text, summary_text, error_message')
.eq('id', queueId)
.single();
if (data) {
  return res.json({
    queueId,
    status: data.status,
    transcription: data.transcription_text,
    summary: data.summary_text,
    error: data.error_message
  });
}
}
res.status(404).json({ error: 'Transcription not found' });
});
// Get all user transcriptions
app.get('/api/whisper/user/:userId', checkSharedKey, checkGDPRConsent, async (req, res) => {
const { userId } = req.params;
if (!supabaseEnabled) {
return res.status(503).json({ error: 'Database unavailable' });
}
const { data, error } = await supabase
.from('transcription_queue')
.select('*')
.eq('create_user_id', userId)
.order('created_at', { ascending: false });
if (error) {
return res.status(500).json({ error: 'Failed to fetch transcriptions' });
}
res.json({ userId, transcriptions: data || [] });
});
// ========================================
// GDPR Endpoints
// ========================================
// Simple GDPR consent endpoint
app.post('/api/gdpr/consent', checkSharedKey, async (req, res) => {
const { userId, consent } = req.body;
if (!userId || typeof consent !== 'boolean') {
return res.status(400).json({ error: 'userId and consent required' });
}
if (!supabaseEnabled) {
return res.status(503).json({ error: 'Database unavailable' });
}
const { error } = await supabase
.from('user_signup')
.upsert({
create_user_id: userId,
gdpr_consent: consent,
gdpr_consent_date: consent ? new Date().toISOString() : null,
updated_at: new Date().toISOString()
});
if (error) {
Logger.error('Error updating consent', error);
return res.status(500).json({ error: 'Failed to update consent' });
}
await logGDPRActivity(userId, consent ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED', { consent });
res.json({ message: 'Consent updated', userId, consent });
});
// Delete user data
app.delete('/api/gdpr/data/:userId', checkSharedKey, checkGDPRConsent, async (req, res) => {
const { userId } = req.params;
if (!supabaseEnabled) {
return res.status(503).json({ error: 'Database unavailable' });
}
try {
await supabase.from('ai_summary').delete().eq('create_user_id', userId);
await supabase.from('ai_transcription').delete().eq('create_user_id', userId);
await supabase.from('transcription_queue').delete().eq('create_user_id', userId);
await supabase.from('incident_reports').delete().eq('create_user_id', userId);
await supabase.from('user_signup').delete().eq('create_user_id', userId);
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
email: anon_${userId}@anonymized.com,
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
Logger.success(Updated GDPR consent for user ${create_user_id});
}
} else {
// Insert new consent record
const { error: insertError } = await supabase
.from('gdpr_consent')
.insert([consentData]);
if (insertError) {
Logger.error('Error inserting into gdpr_consent:', insertError);
} else {
Logger.success(Recorded GDPR consent for user ${create_user_id});
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
Logger.success(Updated incident report ${incident_id} with consent status);
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
Logger.warn(User ${create_user_id} declined GDPR consent for incident ${incident_id});
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
// ========================================
// Debug Endpoint for User Data
// ========================================
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
await logGDPRActivity(userId, 'DATA_ACCESS', {
  type: 'debug_view',
  ip: req.clientIp
}, req);

const checks = {};
const { data: userSignup, error: userError } = await supabase
  .from('user_signup')
  .select('*')
  .eq('create_user_id', userId)
  .single();
checks.user_signup = { data: userSignup, error: userError };

const { data: incidentReports, error: incidentError } = await supabase
  .from('incident_reports')
  .select('*')
  .eq('create_user_id', userId);
checks.incident_reports = { data: incidentReports, error: incidentError };

const { data: aiTranscription, error: transcriptionError } = await supabase
  .from('ai_transcription')
  .select('*')
  .eq('create_user_id', userId);
checks.ai_transcription = { data: aiTranscription, error: transcriptionError };

const { data: transcriptionQueue, error: queueError } = await supabase
  .from('transcription_queue')
  .select('*')
  .eq('create_user_id', userId);
checks.transcription_queue = { data: transcriptionQueue, error: queueError };

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
Logger.info(⚠️ ${signal} received, starting graceful shutdown...);
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
Logger.success(🚀 Server running on port ${PORT});
Logger.info(📊 Environment: ${process.env.NODE_ENV || 'development'});
Logger.info(🔐 GDPR Compliance: ENHANCED);
Logger.info(🗄️ Supabase: ${supabaseEnabled ? 'CONNECTED' : 'DISABLED'});
Logger.info(🤖 OpenAI: ${process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED'});
Logger.info(🔄 Transcription Queue: ${transcriptionQueueInterval ? 'RUNNING' : 'DISABLED'});
Logger.info(🔌 WebSocket: ACTIVE);
Logger.info(⚡ Realtime Updates: ${realtimeChannels.transcriptionChannel ? 'ENABLED' : 'DISABLED'});
Logger.info(📚 Version: 2.0.0 - Enhanced GDPR Compliance Edition);
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
</artifact>
</artifacts>