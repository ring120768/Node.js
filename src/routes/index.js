// src/routes/index.js - CLEAN PRODUCTION VERSION

/**
 * Central Router for Car Crash Lawyer AI
 * Handles all API routes and system endpoints
 * 
 * Note: Webhooks are mounted in app.js at /webhooks/* (not here)
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const logger = require('../utils/logger');

// ==================== ROUTE IMPORTS ====================

const authRoutes = require('./auth.routes');
const transcriptionRoutes = require('./transcription.routes');
const gdprRoutes = require('./gdpr.routes');
const emergencyRoutes = require('./emergency.routes');
const pdfRoutes = require('./pdf.routes');
const exportRoutes = require('./export.routes'); // NEW: Export functionality for dual retention
const aiRoutes = require('./ai.routes'); // NEW: AI analysis routes
const incidentRoutes = require('./incident.routes'); // NEW: Incident reports routes
const profileRoutes = require('./profile.routes'); // NEW: User profile management
const userDocumentsRoutes = require('./userDocuments.routes'); // NEW: User documents/images API
const imageProxyRoutes = require('./imageProxy.routes'); // NEW: Image proxy for authenticated access
const witnessesRoutes = require('./witnesses.routes'); // NEW: Witnesses management
const vehiclesRoutes = require('./vehicles.routes'); // NEW: Other vehicles with DVLA integration
const safetyRoutes = require('./safety.routes'); // NEW: Safety check status management
const dvlaRoutes = require('./dvla.routes'); // NEW: DVLA vehicle lookup (frontend-friendly)
const signupRoutes = require('./signup.routes'); // NEW: User signup form submission
const imageUploadRoutes = require('./imageUpload.routes'); // NEW: Post-signup image upload
const tempImageUploadRoutes = require('./tempImageUpload.routes'); // NEW: Immediate temp upload for mobile
const incidentFormRoutes = require('./incidentForm.routes'); // NEW: Multi-page incident form submission

// GitHub webhooks are mounted in app.js via webhook.routes.js (not imported here)
const locationRoutes = require('./location.routes');
const debugRoutes = require('./debug.routes');
const healthRoutes = require('./health.routes');

// ==================== HELPER FUNCTIONS ====================

/**
 * Get WebSocket client count safely
 */
function getWebSocketCount(websocketModule) {
  if (!websocketModule) return 0;
  if (typeof websocketModule.getClientCount === 'function') {
    try {
      return websocketModule.getClientCount();
    } catch (err) {
      logger.warn('Failed to get WebSocket count:', err.message);
      return 0;
    }
  }
  return 0;
}

/**
 * Check WebSocket initialization safely
 */
function isWebSocketInitialized(websocketModule) {
  if (!websocketModule) return false;
  if (typeof websocketModule.isInitialized === 'function') {
    try {
      return websocketModule.isInitialized();
    } catch (err) {
      return false;
    }
  }
  return false;
}

/**
 * Check external service configuration status
 */
function getServiceStatus() {
  return {
    supabase: !!(config.supabase.url && config.supabase.serviceKey),
    openai: !!config.openai.apiKey,
    what3words: !!config.what3words.apiKey,
    dvla: !!config.dvla.apiKey
  };
}

// ==================== SYSTEM ENDPOINTS ====================

/**
 * Health Check Endpoint
 * GET /health
 */
router.get('/health', async (req, res) => {
  try {
    const services = getServiceStatus();
    const websocketModule = req.app.locals.websocketModule;
    const supabaseEnabled = req.app.locals.supabaseEnabled;
    const authService = req.app.locals.authService;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        supabase: supabaseEnabled && services.supabase,
        openai: services.openai,
        what3words: services.what3words,
        dvla: services.dvla,
        websocket: getWebSocketCount(websocketModule),
        auth: !!authService,
        gdprCompliant: true
      }
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API Configuration Endpoint
 * GET /api/config
 */
router.get('/api/config', (req, res) => {
  try {
    const supabaseEnabled = req.app.locals.supabaseEnabled;
    const authService = req.app.locals.authService;
    const websocketModule = req.app.locals.websocketModule;
    const pdfModules = req.app.locals.pdfModules;

    res.json({
      supabaseUrl: config.supabase.url,
      supabaseAnonKey: config.supabase.anonKey,
      features: {
        realtime: supabaseEnabled && isWebSocketInitialized(websocketModule),
        transcription: config.openai.enabled,
        ai_summary: config.openai.enabled,
        ai_listening: config.openai.enabled,
        pdf_generation: !!pdfModules,
        auth: !!authService,
        what3words: config.what3words.enabled,
        dvla: config.dvla.enabled,
        gdpr_consent: true
      }
    });
  } catch (error) {
    logger.error('API config error:', error);
    res.status(500).json({
      error: 'Failed to load API configuration',
      message: error.message
    });
  }
});

/**
 * System Status Page
 * GET /system-status
 */
router.get('/system-status', async (req, res) => {
  try {
    const services = getServiceStatus();
    const supabaseEnabled = req.app.locals.supabaseEnabled;
    const authService = req.app.locals.authService;
    const websocketModule = req.app.locals.websocketModule;
    const pdfModules = req.app.locals.pdfModules;

    const status = (condition, active = 'Active', inactive = 'Not configured') => 
      condition ? `✅ ${active}` : `⚠️ ${inactive}`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Status - Car Crash Lawyer AI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container { 
            max-width: 900px; 
            width: 100%;
            background: white; 
            padding: 40px; 
            border-radius: 15px; 
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { color: #333; margin-bottom: 10px; font-size: 28px; }
        .status-badge { 
            padding: 12px 20px; 
            background: #4CAF50; 
            color: white; 
            border-radius: 8px; 
            display: inline-block;
            font-weight: 600;
            margin: 10px 0;
        }
        .badge { 
            padding: 6px 12px; 
            color: white; 
            border-radius: 5px; 
            font-size: 11px; 
            margin-left: 10px;
            font-weight: 600;
            text-transform: uppercase;
            background: #2196F3;
        }
        .section { 
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
        }
        .section:first-of-type { border-top: none; margin-top: 20px; }
        h3 { color: #667eea; margin-bottom: 15px; font-size: 18px; }
        ul { list-style: none; padding: 0; }
        li { 
            margin: 8px 0;
            padding: 10px;
            background: #f9f9f9;
            border-radius: 5px;
            font-size: 14px;
        }
        code { 
            background: #667eea; 
            color: white; 
            padding: 4px 8px; 
            border-radius: 4px;
            font-size: 13px;
            font-weight: 600;
        }
        .links {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
            text-align: center;
        }
        a { color: #667eea; text-decoration: none; font-weight: 600; margin: 0 10px; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚗 Car Crash Lawyer AI<span class="badge">GDPR Compliant</span></h1>
        <div class="status-badge">✅ All Systems Operational</div>

        <div class="section">
            <h3>📊 System Status</h3>
            <ul>
                <li>Supabase: ${status(supabaseEnabled && services.supabase, 'Connected')}</li>
                <li>OpenAI: ${status(services.openai, 'Configured')}</li>
                <li>what3words: ${status(services.what3words, 'Configured')}</li>
                <li>DVLA: ${status(services.dvla, 'Configured')}</li>
                <li>Auth: ${status(authService)}</li>
                <li>WebSocket: ${status(isWebSocketInitialized(websocketModule))}</li>
                <li>PDF: ${status(pdfModules, 'Available', 'Unavailable')}</li>
                <li>GDPR: ✅ Full audit logging</li>
            </ul>
        </div>

        <div class="section">
            <h3>🔌 API Endpoints</h3>
            <ul>
                <li><code>/api/auth/*</code> - Authentication</li>
                <li><code>/api/signup/*</code> - User signup (custom form)</li>
                <li><code>/api/profile/*</code> - User profile management</li>
                <li><code>/api/safety-status/*</code> - Safety check assessment</li>
                <li><code>/api/transcription/*</code> - Audio transcription</li>
                <li><code>/api/gdpr/*</code> - GDPR compliance</li>
                <li><code>/api/emergency/*</code> - Emergency contacts</li>
                <li><code>/api/pdf/*</code> - PDF generation</li>
                <li><code>/api/location/*</code> - Location services</li>
                <li><code>/api/witnesses/*</code> - Witness management</li>
                <li><code>/api/other-vehicles/*</code> - Other vehicles (DVLA)</li>
                <li><code>/api/dvla/*</code> - DVLA vehicle lookup (GET)</li>
                <li><code>/api/images/*</code> - Post-signup image upload</li>
                <li><code>/api/debug/*</code> - Debug tools</li>
            </ul>
        </div>

        <div class="section">
            <h3>🎣 Webhooks</h3>
            <ul>
                <li><code>/webhooks/github</code> - ✅ GitHub repository events</li>
            </ul>
            <p style="margin-top: 10px; font-size: 12px; color: #666;">
                Note: Typeform webhooks removed - application now uses in-house HTML forms
            </p>
        </div>

        <div class="links">
            <a href="/">Main</a>
            <a href="/health">Health</a>
            <a href="/webhooks/health">Webhooks</a>
        </div>
    </div>
</body>
</html>`;

    res.send(htmlContent);
  } catch (error) {
    logger.error('System status error:', error);
    res.status(500).send('<h1>Error loading system status</h1>');
  }
});

// ==================== MOUNT API ROUTES ====================

// Health check routes (no rate limiting)
router.use('/', healthRoutes);

// Mount all routes
router.use('/api/auth', authRoutes);
router.use('/api/transcription', transcriptionRoutes); // FIXED: Was catching all /api/* routes with /:transcriptionId
router.use('/api/gdpr', gdprRoutes);
router.use('/api/emergency', emergencyRoutes); // FIXED: More specific path
router.use('/', pdfRoutes);
router.use('/api/export', exportRoutes); // FIXED: More specific path
router.use('/api/ai', aiRoutes); // NEW: AI analysis routes
router.use('/api/incident-reports', incidentRoutes); // NEW: Incident reports routes
router.use('/api/profile', profileRoutes); // NEW: User profile management
router.use('/api/user-documents', userDocumentsRoutes); // NEW: User documents/images API
router.use('/api', imageProxyRoutes); // NEW: Image proxy routes (/api/images/:id)
router.use('/api/images', tempImageUploadRoutes); // NEW: Immediate temp upload (must be before imageUploadRoutes)
router.use('/api/images', imageUploadRoutes); // NEW: Post-signup image upload endpoint
router.use('/api/witnesses', witnessesRoutes); // NEW: Witnesses management
router.use('/api/other-vehicles', vehiclesRoutes); // NEW: Other vehicles with DVLA integration
router.use('/api/dvla', dvlaRoutes); // NEW: DVLA vehicle lookup (frontend-friendly GET endpoints)
router.use('/api', safetyRoutes); // NEW: Safety check status management (/api/safety-status/*)
router.use('/api/signup', signupRoutes); // NEW: User signup form submission (custom HTML form)
router.use('/api/incident-form', incidentFormRoutes); // NEW: Multi-page incident form submission (Pages 1-12)
// Note: Webhook routes are mounted directly in app.js for raw body handling
// GitHub webhooks are mounted in app.js via webhook.routes.js (not here)
router.use('/api/location', locationRoutes);
router.use('/api/debug', debugRoutes);

// ==================== LEGACY REDIRECTS ====================

/**
 * Payment Success Redirect (Typeform)
 * Short URL redirect to payment-success.html with full parameter names
 * Works around Typeform's character limit for redirect URLs
 *
 * Usage in Typeform: /s?u={{hidden:auth_user_id}}&e={{hidden:email}}
 * Redirects to: /payment-success.html?auth_user_id=xxx&email=xxx
 */
router.get('/s', (req, res) => {
  try {
    // Accept short parameter names
    const userId = req.query.u || req.query.uid || req.query.auth_user_id || req.query.user_id;
    const email = req.query.e || req.query.em || req.query.email;

    // Build redirect URL with full parameter names
    const params = new URLSearchParams();
    if (userId) params.append('auth_user_id', userId);
    if (email) params.append('email', email);

    const redirectUrl = `/payment-success.html${params.toString() ? '?' + params.toString() : ''}`;

    logger.info('Payment success redirect', { userId, email, redirectUrl });

    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Payment success redirect error:', error);
    // Fallback to payment success page without parameters
    res.redirect('/payment-success.html');
  }
});

/**
 * Legacy Transcription Endpoints
 */
router.post('/api/whisper/transcribe', (req, res) => {
  res.redirect(307, '/api/transcription/transcribe');
});

router.get('/api/transcription-status/:queueId', (req, res) => {
  res.redirect(`/api/transcription/status/${req.params.queueId}`);
});

router.post('/api/update-transcription', (req, res) => {
  res.redirect(307, '/api/transcription/update');
});

router.post('/api/save-transcription', (req, res) => {
  res.redirect(307, '/api/transcription/save');
});

router.get('/api/user/:userId/latest-transcription', (req, res) => {
  res.redirect(`/api/transcription/user/${req.params.userId}/latest`);
});

router.get('/api/user/:userId/transcriptions', (req, res) => {
  res.redirect(`/api/transcription/user/${req.params.userId}/all`);
});

/**
 * Legacy Location Endpoints
 */
router.get('/api/what3words/convert', (req, res) => {
  res.redirect(`/api/location/convert?${new URLSearchParams(req.query)}`);
});

router.get('/api/what3words/autosuggest', (req, res) => {
  res.redirect(`/api/location/autosuggest?${new URLSearchParams(req.query)}`);
});

router.get('/api/what3words', (req, res) => {
  res.redirect(`/api/location/legacy?${new URLSearchParams(req.query)}`);
});

/**
 * Legacy PDF Endpoints
 */
router.post('/generate-pdf', (req, res) => {
  res.redirect(307, '/api/pdf/generate');
});

router.get('/pdf-status/:userId', (req, res) => {
  res.redirect(`/api/pdf/status/${req.params.userId}`);
});

router.get('/download-pdf/:userId', (req, res) => {
  res.redirect(`/api/pdf/download/${req.params.userId}`);
});

/**
 * Legacy Webhook Endpoints
 * Note: Typeform webhook redirects removed - application now uses in-house HTML forms
 * All form submissions now go through /api/incident-form/* endpoints
 */

/**
 * Legacy Debug Endpoints
 */
router.get('/api/test-openai', (req, res) => {
  res.redirect('/api/debug/test-openai');
});

router.get('/api/process-queue-now', (req, res) => {
  res.redirect('/api/debug/process-queue');
});

router.get('/test/transcription-queue', (req, res) => {
  res.redirect('/api/debug/transcription-queue');
});

router.post('/test/process-transcription-queue', (req, res) => {
  res.redirect(307, '/api/debug/process-transcription-queue');
});

module.exports = router;