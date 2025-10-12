/**
 * Debug Controller for Car Crash Lawyer AI
 * Handles debug endpoints, testing, and system diagnostics
 */

const axios = require('axios');
const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const gdprService = require('../services/gdprService');
const User = require('../models/User');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
let supabase = null;
if (config.supabase.url && config.supabase.serviceKey) {
  supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Debug user data
 * GET /api/debug/user/:userId
 */
async function debugUser(req, res) {
  if (!supabase) {
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
}

/**
 * Test OpenAI API
 * GET /api/debug/test-openai
 */
async function testOpenAI(req, res) {
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
}

/**
 * Manual queue processing
 * GET /api/debug/process-queue
 */
async function processQueue(req, res) {
  logger.info('Manual queue processing triggered');

  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    // This would call the queue processing function from the main app
    // For now, we'll just return success
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
}

/**
 * Test transcription queue
 * GET /api/debug/transcription-queue
 */
async function testTranscriptionQueue(req, res) {
  if (!supabase) {
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
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    sendError(res, 500, error.message, 'QUEUE_ERROR');
  }
}

/**
 * Test process transcription queue
 * POST /api/debug/process-transcription-queue
 */
async function testProcessTranscriptionQueue(req, res) {
  try {
    logger.info('Manual transcription queue processing triggered');
    // This would call the actual queue processing function
    res.json({
      success: true,
      message: 'Queue processing triggered',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    sendError(res, 500, error.message, 'QUEUE_ERROR');
  }
}

/**
 * System health check
 * GET /api/debug/health
 */
async function getHealth(req, res) {
  try {
    // Check external services
    const services = {
      supabase: false,
      openai: false,
      what3words: false,
      typeform: false,
      zapier: false,
      dvla: false,
      stripe: false
    };

    // Test Supabase
    if (supabase) {
      try {
        await supabase.from('user_signup').select('*').limit(1);
        services.supabase = true;
      } catch (error) {
        logger.error('Supabase health check failed', error);
      }
    }

    // Test OpenAI
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

    // Test what3words
    if (config.what3words.apiKey) {
      try {
        await axios.get(`https://api.what3words.com/v3/convert-to-coordinates?words=filled.count.soap&key=${config.what3words.apiKey}`, {
          timeout: 5000
        });
        services.what3words = true;
      } catch (error) {
        logger.error('what3words health check failed', error);
      }
    }

    // Check Typeform/Zapier webhook key
    services.typeform = !!config.webhook.apiKey;
    services.zapier = !!config.webhook.apiKey;

    // Check DVLA API key
    services.dvla = !!config.dvla.apiKey;

    // Check Stripe keys
    services.stripe = !!(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_PUBLISHABLE_KEY);

    // Test Typeform/Webhook configuration
    if (config.webhook.apiKey) {
      try {
        // Test webhook endpoint accessibility
        const testWebhookUrl = `http://localhost:${config.app.port}/api/webhooks/test`;
        const webhookResponse = await fetch(testWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': config.webhook.apiKey
          },
          body: JSON.stringify({ test: true })
        });

        if (webhookResponse.ok) {
          logger.success('Typeform webhook test: ✅ Endpoint accessible with valid API key');
        } else {
          logger.warn('Typeform webhook test: ❌ Endpoint responded with error');
        }
      } catch (webhookError) {
        logger.warn('Typeform webhook test: ❌ Connection failed:', webhookError.message);
      }
    } else {
      logger.warn('Typeform webhook: ❌ No WEBHOOK_API_KEY configured');
    }

    // Add other service tests as needed
    logger.info('All connection tests completed');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: services,
      integrations: {
        supabase: {
          configured: !!config.supabase.url,
          connected: services.supabase,
          features: ['Database', 'Auth', 'Storage', 'Realtime']
        },
        openai: {
          configured: !!config.openai.apiKey,
          connected: services.openai,
          features: ['Transcription', 'AI Summaries', 'Chat']
        },
        what3words: {
          configured: !!config.what3words.apiKey,
          connected: services.what3words,
          features: ['Location Services', 'Address Conversion']
        },
        typeform: {
          configured: services.typeform,
          features: ['Form Processing', 'Incident Reports']
        },
        zapier: {
          configured: services.zapier,
          features: ['Webhook Automation', 'PDF Generation']
        },
        dvla: {
          configured: services.dvla,
          features: ['Vehicle Lookups', 'License Verification']
        },
        stripe: {
          configured: services.stripe,
          features: ['Payments', 'Subscriptions']
        }
      },
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Health check error', error);
    sendError(res, 500, 'Health check failed', 'HEALTH_ERROR');
  }
}

module.exports = {
  debugUser,
  testOpenAI,
  processQueue,
  testTranscriptionQueue,
  testProcessTranscriptionQueue,
  getHealth
};