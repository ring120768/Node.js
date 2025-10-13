const { createClient } = require('@supabase/supabase-js');
const { verifyTypeform } = require('../middleware/security');
const logger = require('../utils/logger');

// Initialize Supabase client
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    logger.info('✅ Webhook Supabase client initialized');
  } else {
    logger.error('❌ Missing Supabase environment variables for webhooks');
  }
} catch (error) {
  logger.error('❌ Failed to initialize Supabase for webhooks:', error.message);
}

// Simple response wrapper - always return 200 to prevent retries
function webhookResponse(res, data = {}) {
  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    ...data
  });
}

// Verify Typeform signature using centralized security middleware
function verifyTypeformSignature(req) {
  const secret = process.env.TYPEFORM_SECRET || '4SJem6FtyEUgLUATL8yQ4LGDDiBNybLXik6nV1N2S25Q';
  
  if (!req.get('Typeform-Signature')) {
    logger.debug('No Typeform signature header');
    return process.env.NODE_ENV === 'development'; // Allow in dev
  }

  const isValid = verifyTypeform(req, secret);
  if (!isValid) {
    logger.error('Typeform signature verification failed');
  }
  
  return isValid;
}

// Health check endpoint
function health(req, res) {
  return webhookResponse(res, {
    status: 'healthy',
    services: {
      supabase: !!supabase,
      environment: process.env.NODE_ENV || 'development'
    }
  });
}

// Simple test endpoint
function handleWebhookTest(req, res) {
  const requestId = `test_${Date.now()}`;
  logger.info(`[${requestId}] Test webhook called`);

  return webhookResponse(res, {
    message: 'Webhook test successful',
    request_id: requestId,
    method: req.method,
    path: req.path
  });
}

// User signup webhook - simplified version
async function handleSignup(req, res) {
  const requestId = `signup_${Date.now()}`;

  try {
    logger.info(`[${requestId}] User signup webhook received`, {
      method: req.method,
      path: req.path,
      headers: {
        'content-type': req.get('content-type'),
        'typeform-signature': req.get('typeform-signature') ? 'present' : 'missing'
      },
      bodySize: JSON.stringify(req.body || {}).length
    });

    // Check Supabase availability
    if (!supabase) {
      logger.error(`[${requestId}] Supabase not available`);
      return webhookResponse(res, { accepted: false, reason: 'service_unavailable' });
    }

    // Basic payload validation
    if (!req.body || typeof req.body !== 'object') {
      logger.error(`[${requestId}] Invalid or missing request body`);
      return webhookResponse(res, { accepted: false, reason: 'invalid_payload' });
    }

    // Verify signature
    if (!verifyTypeformSignature(req)) {
      logger.warn(`[${requestId}] Invalid signature`);
      return webhookResponse(res, { accepted: false, reason: 'invalid_signature' });
    }

    const payload = req.body;
    const formResponse = payload?.form_response;
    const hidden = formResponse?.hidden || {};

    logger.info(`[${requestId}] Processing signup for user: ${hidden.auth_user_id}`, {
      hasFormResponse: !!formResponse,
      hiddenFields: Object.keys(hidden)
    });

    // Basic validation
    if (!hidden.auth_user_id || !hidden.email || !hidden.auth_code) {
      logger.warn(`[${requestId}] Missing required fields`, {
        hasUserId: !!hidden.auth_user_id,
        hasEmail: !!hidden.email,
        hasAuthCode: !!hidden.auth_code,
        receivedFields: Object.keys(hidden)
      });
      return webhookResponse(res, {
        accepted: false,
        reason: 'missing_fields',
        required: ['auth_user_id', 'email', 'auth_code'],
        received: Object.keys(hidden)
      });
    }

    // Verify user exists
    const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(hidden.auth_user_id);
    if (userErr || !userRes?.user) {
      logger.error(`[${requestId}] User not found: ${userErr?.message}`);
      return webhookResponse(res, { accepted: false, reason: 'user_not_found' });
    }

    // Verify auth code
    const { temp_nonce } = userRes.user.user_metadata || {};
    if (temp_nonce !== hidden.auth_code) {
      logger.warn(`[${requestId}] Auth code mismatch`);
      return webhookResponse(res, { accepted: false, reason: 'invalid_auth_code' });
    }

    // Create basic signup record
    const signupData = {
      create_user_id: hidden.auth_user_id,
      email: hidden.email,
      time_stamp: new Date().toISOString(),
      name: null,
      surname: null,
      gdpr_consent: 'yes'
    };

    // Process form answers if present
    const answers = formResponse?.answers || [];
    answers.forEach(answer => {
      try {
        if (answer.field?.ref === '3f614832-1ccd-4a7e-9c4a-bde45b6b930e' && answer.text) {
          signupData.name = answer.text;
        }
        if (answer.field?.ref === '52af54a6-11d9-48f7-8878-7a7030f0cacd' && answer.text) {
          signupData.surname = answer.text;
        }
        if (answer.field?.ref === '437aacde-95e2-411c-af09-fea3c4fc3bdb' && answer.email) {
          signupData.email = answer.email;
        }
      } catch (e) {
        logger.warn(`[${requestId}] Error processing answer: ${e.message}`);
      }
    });

    // Insert into database
    const { data: inserted, error: insertErr } = await supabase
      .from('user_signup')
      .insert([signupData])
      .select()
      .single();

    if (insertErr) {
      logger.error(`[${requestId}] Database insert failed: ${insertErr.message}`);
      return webhookResponse(res, { accepted: false, reason: 'database_error' });
    }

    // Update user metadata
    try {
      await supabase.auth.admin.updateUserById(hidden.auth_user_id, {
        user_metadata: {
          ...userRes.user.user_metadata,
          temp_nonce: null,
          profile_completed: true,
          profile_completed_at: new Date().toISOString(),
          signup_record_id: inserted.id
        }
      });
    } catch (e) {
      logger.warn(`[${requestId}] Metadata update failed (non-critical): ${e.message}`);
    }

    logger.success(`[${requestId}] Signup completed successfully: ${inserted.id}`);
    return webhookResponse(res, {
      accepted: true,
      message: 'Profile completed successfully',
      user_id: hidden.auth_user_id,
      signup_id: inserted.id
    });

  } catch (error) {
    logger.error(`[${requestId}] Webhook error: ${error.message}`, {
      stack: error.stack,
      code: error.code
    });

    return webhookResponse(res, {
      accepted: false,
      reason: 'internal_error',
      error: error.message
    });
  }
}

// Incident report webhook - stub
async function handleIncidentReport(req, res) {
  const requestId = `incident_${Date.now()}`;
  logger.info(`[${requestId}] Incident report webhook received`);

  return webhookResponse(res, {
    accepted: true,
    message: 'Incident report received',
    request_id: requestId
  });
}

// Demo webhook - stub
async function handleDemo(req, res) {
  const requestId = `demo_${Date.now()}`;
  logger.info(`[${requestId}] Demo webhook received`);

  return webhookResponse(res, {
    accepted: true,
    message: 'Demo submission received',
    request_id: requestId
  });
}

// Typeform-specific handler (alias to handleSignup)
async function typeform(req, res) {
  const requestId = `typeform_${Date.now()}`;
  logger.info(`[${requestId}] Typeform webhook received`);
  return handleSignup(req, res);
}

// Zapier-specific handler (alias to handleSignup) 
async function zapier(req, res) {
  const requestId = `zapier_${Date.now()}`;
  logger.info(`[${requestId}] Zapier webhook received`);
  return handleSignup(req, res);
}

module.exports = {
  health,
  handleSignup,
  handleIncidentReport,
  handleDemo,
  handleWebhookTest,
  typeform,
  zapier
};