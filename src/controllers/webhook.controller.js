// src/controllers/webhook.controller.js

/**
 * Webhook Controller — Car Crash Lawyer AI
 *
 * - Hardened Typeform webhook handling (raw-body HMAC verification)
 * - Always 200 responses to avoid retry storms (with accepted:true/false)
 * - GDPR audit logging hooks
 * - Health endpoint for external monitors
 *
 * NOTE: You must capture req.rawBody in your server boot:
 *   app.use(express.json({
 *     type: ['application/json', 'application/vnd.typeform.v2+json'],
 *     verify: (req, _res, buf) => { req.rawBody = buf; }
 *   }));
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Import services with fallback
let gdprService;
try {
  gdprService = require('../services/gdprService');
} catch (e) {
  logger.warn('GDPR service not available:', e.message);
  gdprService = null;
}

// Response utilities (inline since import might be missing)
const successResponse = (res, data, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, message = 'Error', statusCode = 500, data = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data
  });
};

// ==================== INIT: Supabase (Service Role) ====================
let supabase = null;

try {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('Missing Supabase environment variables');
    throw new Error('Supabase configuration missing');
  }

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
  logger.info('Supabase client initialized for webhooks');
} catch (error) {
  logger.error('Failed to initialize Supabase for webhooks:', error.message);
}

// ==================== Typeform field mapping ====================
// Map Typeform field `ref` -> user_signup column
const TYPEFORM_FIELD_MAP = {
  // Personal
  '3f614832-1ccd-4a7e-9c4a-bde45b6b930e': 'name',
  '52af54a6-11d9-48f7-8878-7a7030f0cacd': 'surname',
  '437aacde-95e2-411c-af09-fea3c4fc3bdb': 'email',
  '2388c44c-d913-40fc-a346-9b43ac259576': 'mobile',

  // Address
  '91d5b1fd-4651-4a37-9fc7-ea26d58f1090': 'street_address',
  '75639534-cd2c-46bb-a228-c374bbc5e55b': 'street_address_optional',
  '336d5b69-89e1-4e00-8a0e-2a35c54fa1dd': 'town',
  '347c3245-3d30-4737-8062-8e2e7c56afbb': 'postcode',
  '38628048-596d-4d73-bc8a-74e7ce41cd99': 'country',

  // Driving licence
  '72b3e18b-34fd-40fa-8d68-f768c49a8cd3': 'driving_license_number',
  'f0a0f10f-dd89-4447-8546-cbe9836d38ac': 'driving_license_picture',

  // Vehicle
  '91f7e275-976a-4dfe-ab15-1189736eae4a': 'car_registration_number',
  'f60af70d-5f59-4311-a237-99ddb8b4793e': 'vehicle_make',
  'ebfe28c8-8c2b-4d4f-9ce8-8b9f87d11061': 'vehicle_model',
  '6b607ed8-5f6e-4ac6-9108-841dae7a55fd': 'vehicle_colour',
  'c81e98b2-aa58-4968-9b76-867355ab42c4': 'vehicle_condition',

  // Vehicle images
  '2cfdc74e-3635-49dc-b9e2-ce6c37824063': 'vehicle_picture_front',
  '379c1eb3-f917-4ec4-a716-f32854a94047': 'vehicle_picture_driver_side',
  'cbb46409-101d-4814-ba05-ac227f37fa73': 'vehicle_picture_passenger_side',
  '4f3dc270-038e-4f1d-8bde-fe9e8150115f': 'vehicle_picture_back',

  // Insurance
  'eeb8719e-29f5-4a9d-8bf0-71afd057c93c': 'insurance_company',
  'e65721d6-210e-40fd-8299-c666ee2e7065': 'policy_number',
  '49c5997b-9884-4104-9bcd-c89d70cf9b2f': 'policy_holder',
  '94b2ed65-e993-4535-bd61-4ab81e883b87': 'cover_type',

  // Recovery
  '031816f4-8142-4659-83c3-7b00f39df8d0': 'recovery_company',
  'ef405cc7-012b-4638-9cb1-b0ed4303734b': 'recovery_breakdown_number',
  'a871e5b4-13f1-475f-8257-15e2b8f38825': 'recovery_breakdown_email',

  // Emergency contact (split fields)
  '58758955-3ac2-42f6-9ab0-0124f96a8e5e': 'emergency_contact_first_name',
  'f9c22998-2090-4f87-9f14-fa6f13d09f4a': 'emergency_contact_last_name',
  '9de39426-29cb-41a4-b015-2e645e93b051': 'emergency_contact_phone',
  '0e7f7f5a-33b0-49b5-8a6f-2b4f7b563f4e': 'emergency_contact_email',
  '8ebeb1e8-9158-40cf-9202-63be1e3eba68': 'emergency_contact_company',

  // Legal & meta
  '8da3763d-0c30-4626-8493-46893cfd1e3e': 'gdpr_consent',
  'f00d4aa3-e56d-4b7e-9971-3710e096edd2': 'time_stamp',
  '403a4be2-162b-4c58-9518-b8db2ff12b40': 'create_user_id'
};

// ==================== Helpers ====================

function safeOk(res, payload = {}) {
  // Always 200 to prevent third-party retries
  return res.status(200).json(payload);
}

async function logToGDPRAudit(userId, eventType, details, req) {
  try {
    if (gdprService && typeof gdprService.logActivity === 'function') {
      await gdprService.logActivity(userId, eventType, details, req);
    } else {
      // Simple logging if GDPR service unavailable
      logger.info(`GDPR Log: ${eventType} for user ${userId}`, details);
    }
  } catch (e) {
    logger.warn('GDPR audit logging failed (non-critical):', e.message);
  }
}

// Verify Typeform HMAC (base64) over the RAW body
function verifyTypeformSignature(req) {
  const secret = process.env.TYPEFORM_SECRET || '4SJem6FtyEUgLUATL8yQ4LGDDiBNybLXik6nV1N2S25Q';
  if (!secret) {
    logger.warn('TYPEFORM_SECRET not set; skipping signature check');
    return true; // allow in dev
  }
  const header = req.get('Typeform-Signature'); // "sha256=BASE64"
  if (!header || !header.startsWith('sha256=')) {
    logger.debug('No valid Typeform signature header found');
    return false;
  }

  try {
    const sent = Buffer.from(header.slice(7), 'base64');
    const hmac = crypto.createHmac('sha256', secret);

    // Handle missing rawBody gracefully
    let bodyBuffer = req.rawBody;
    if (!bodyBuffer) {
      if (req.body && typeof req.body === 'string') {
        bodyBuffer = Buffer.from(req.body);
      } else if (req.body && typeof req.body === 'object') {
        bodyBuffer = Buffer.from(JSON.stringify(req.body));
      } else {
        bodyBuffer = Buffer.alloc(0);
      }
      logger.debug('Used fallback body buffer for signature verification');
    }

    const digest = Buffer.from(hmac.update(bodyBuffer).digest('base64'));
    return crypto.timingSafeEqual(sent, digest);
  } catch (error) {
    logger.error('Signature verification failed:', error.message);
    return false;
  }
}

function parseTypeformAnswers(answers, requestId) {
  const out = {};
  (answers || []).forEach((answer, i) => {
    try {
      const ref = answer?.field?.ref;
      const column = TYPEFORM_FIELD_MAP[ref];
      if (!column) return;

      let value = null;
      if ('text' in answer) value = answer.text;
      else if ('email' in answer) value = answer.email;
      else if ('phone_number' in answer) value = answer.phone_number;
      else if ('number' in answer) value = answer.number;
      else if ('boolean' in answer) value = answer.boolean ? 'yes' : 'no';
      else if (answer.choice?.label) value = answer.choice.label;
      else if ('date' in answer) value = answer.date;
      else if ('file_url' in answer) value = answer.file_url;
      else if ('url' in answer) value = answer.url;

      if (value !== null) out[column] = value;
    } catch (e) {
      logger.warn(`[${requestId}] parseTypeformAnswers(${i}) failed:`, e.message);
    }
  });
  return out;
}

function buildSignupData(userId, email, parsed) {
  const data = {
    create_user_id: userId,
    email,
    time_stamp: new Date().toISOString(),

    // Personal
    name: parsed.name ?? null,
    surname: parsed.surname ?? null,
    mobile: parsed.mobile ? String(parsed.mobile) : null,

    // Address
    street_address: parsed.street_address ?? null,
    street_address_optional: parsed.street_address_optional ?? null,
    town: parsed.town ?? null,
    postcode: parsed.postcode ?? null,
    country: parsed.country ?? null,

    // Licence
    driving_license_number: parsed.driving_license_number ?? null,
    driving_license_picture: parsed.driving_license_picture ?? null,

    // Vehicle
    car_registration_number: parsed.car_registration_number ?? null,
    vehicle_make: parsed.vehicle_make ?? null,
    vehicle_model: parsed.vehicle_model ?? null,
    vehicle_colour: parsed.vehicle_colour ?? null,
    vehicle_condition: parsed.vehicle_condition ?? null,

    // Images
    vehicle_picture_front: parsed.vehicle_picture_front ?? null,
    vehicle_picture_driver_side: parsed.vehicle_picture_driver_side ?? null,
    vehicle_picture_passenger_side: parsed.vehicle_picture_passenger_side ?? null,
    vehicle_picture_back: parsed.vehicle_picture_back ?? null,

    // Insurance
    insurance_company: parsed.insurance_company ?? null,
    policy_number: parsed.policy_number ?? null,
    policy_holder: parsed.policy_holder ?? null,
    cover_type: parsed.cover_type ?? null,

    // Recovery
    recovery_company: parsed.recovery_company ?? null,
    recovery_breakdown_number: parsed.recovery_breakdown_number ?? null,
    recovery_breakdown_email: parsed.recovery_breakdown_email ?? null,

    // Emergency (split fields retained)
    emergency_contact_first_name: parsed.emergency_contact_first_name ?? null,
    emergency_contact_last_name: parsed.emergency_contact_last_name ?? null,
    emergency_contact_phone: parsed.emergency_contact_phone ?? null,
    emergency_contact_email: parsed.emergency_contact_email ?? null,
    emergency_contact_company: parsed.emergency_contact_company ?? null,

    // Legal
    gdpr_consent: parsed.gdpr_consent ?? 'yes'
  };

  // Remove nulls for tidy inserts
  for (const k of Object.keys(data)) if (data[k] === null) delete data[k];
  return data;
}

async function updateUserMetadata(userId, existing, signupId, productId, requestId) {
  try {
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existing,
        temp_nonce: null,
        temp_nonce_expires: null,
        profile_completed: true,
        profile_completed_at: new Date().toISOString(),
        signup_record_id: signupId,
        account_status: 'active',
        product_id: productId || 'car_crash_lawyer_ai'
      }
    });
    logger.info(`[${requestId}] Auth metadata updated`);
  } catch (e) {
    logger.warn(`[${requestId}] Auth metadata update failed (non-critical): ${e.message}`);
  }
}

// ==================== Public Handlers ====================

// GET /webhooks/health
function health(req, res) {
  return safeOk(res, { status: 'ok', time: new Date().toISOString() });
}

// POST /webhooks/user_signup
async function handleSignup(req, res) {
  const requestId = `signup_${Date.now()}`;
  try {
    logger.info(`[${requestId}] User signup webhook called`, {
      method: req.method,
      hasBody: !!req.body,
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
      contentType: req.get('content-type'),
      userAgent: req.get('user-agent')
    });

    // Check if Supabase is available
    if (!supabase) {
      logger.error(`[${requestId}] Supabase not initialized`);
      return safeOk(res, { accepted: false, reason: 'service_unavailable' });
    }
    // Signature check first
    if (!verifyTypeformSignature(req)) {
      await logToGDPRAudit('system', 'TYPEFORM_SIG_INVALID', { ip: req.ip }, req);
      logger.warn(`[${requestId}] Invalid Typeform signature`);
      return safeOk(res, { accepted: false, reason: 'invalid_signature' });
    }

    const payload = req.body;
    logger.info(`[${requestId}] Payload received`, {
      hasPayload: !!payload,
      payloadKeys: payload ? Object.keys(payload) : [],
      hasFormResponse: !!(payload?.form_response),
      rawPayload: process.env.NODE_ENV === 'development' ? payload : 'hidden'
    });

    if (!payload?.form_response) {
      logger.error(`[${requestId}] Invalid payload: missing form_response`, {
        receivedPayload: payload
      });
      return safeOk(res, { accepted: false, reason: 'invalid_payload' });
    }

    const form = payload.form_response;
    const hidden = form.hidden || {};
    const answers = form.answers || [];
    const { auth_user_id, email, auth_code, product_id } = hidden;

    logger.info(`[${requestId}] Form data parsed`, {
      hasHidden: !!form.hidden,
      hiddenKeys: Object.keys(hidden),
      answersCount: answers.length,
      auth_user_id: auth_user_id ? 'present' : 'missing',
      email: email ? 'present' : 'missing',
      auth_code: auth_code ? 'present' : 'missing'
    });

    // Required hidden fields
    if (!auth_user_id || !email || !auth_code) {
      await logToGDPRAudit('system', 'HIDDEN_FIELDS_MISSING', { hiddenKeys: Object.keys(hidden) }, req);
      return safeOk(res, {
        accepted: false,
        reason: 'missing_hidden_fields',
        required: ['auth_user_id', 'email', 'auth_code']
      });
    }

    // Validate nonce (auth_code) against auth.user_metadata.temp_nonce
    const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(auth_user_id);
    if (userErr || !userRes?.user) {
      logger.error(`[${requestId}] User not found ${auth_user_id}: ${userErr?.message || 'unknown'}`);
      return safeOk(res, { accepted: false, reason: 'user_not_found' });
    }

    const user = userRes.user;
    const { temp_nonce, temp_nonce_expires } = user.user_metadata || {};
    if (!temp_nonce || auth_code !== temp_nonce) {
      await logToGDPRAudit(auth_user_id, 'AUTH_CODE_INVALID', { ip: req.ip }, req);
      return safeOk(res, { accepted: false, reason: 'nonce_mismatch' });
    }
    if (temp_nonce_expires && Date.now() > temp_nonce_expires) {
      await logToGDPRAudit(auth_user_id, 'AUTH_CODE_EXPIRED', { expiresAt: temp_nonce_expires }, req);
      return safeOk(res, { accepted: false, reason: 'nonce_expired' });
    }

    // Parse & map answers
    const parsed = parseTypeformAnswers(answers, requestId);
    const row = buildSignupData(auth_user_id, email, parsed);

    // Insert into user_signup
    const { data: inserted, error: insErr } = await supabase
      .from('user_signup')
      .insert([row])
      .select()
      .single();

    if (insErr) {
      logger.error(`[${requestId}] Insert failed: ${insErr.message}`);
      await logToGDPRAudit(auth_user_id, 'SIGNUP_INSERT_FAILED', { message: insErr.message }, req);
      return safeOk(res, { accepted: false, reason: 'insert_failed' });
    }

    // Update auth metadata & log completion
    await updateUserMetadata(auth_user_id, user.user_metadata, inserted.id, product_id, requestId);
    await logToGDPRAudit(auth_user_id, 'TYPEFORM_PROFILE_COMPLETED', {
      signup_id: inserted.id,
      email,
      fields_count: Object.keys(row).length,
      product_id
    }, req);

    logger.info(`[${requestId}] Signup complete: signup_id=${inserted.id}`);
    return safeOk(res, {
      accepted: true,
      message: 'Profile completed',
      user_id: auth_user_id,
      signup_id: inserted.id,
      fields_saved: Object.keys(row).length
    });
  } catch (e) {
    // Enhanced logging for DNS resolution issues
    const errorDetails = {
      stack: e.stack,
      name: e.name,
      code: e.code,
      errno: e.errno,
      syscall: e.syscall,
      hostname: e.hostname,
      path: req.path,
      method: req.method,
      headers: req.headers,
      body: req.body ? Object.keys(req.body) : 'no body'
    };

    // Check for DNS resolution errors
    if (e.code === 'ENOTFOUND' || e.code === 'EAI_AGAIN' || e.message.includes('could not resolve host')) {
      logger.error(`[${requestId}] DNS Resolution Error: ${e.message}`, errorDetails);
      logger.warn(`[${requestId}] This may be a DNS configuration issue. Consider using public DNS servers.`);
    } else {
      logger.error(`[${requestId}] Unexpected error: ${e.message}`, errorDetails);
    }

    await logToGDPRAudit('system', 'WEBHOOK_ERROR', {
      message: e.message,
      path: req.path,
      error_name: e.name,
      error_code: e.code,
      stack: e.stack
    }, req);
    return safeOk(res, { accepted: false, reason: 'unexpected_error', error: e.message });
  }
}

// POST /webhooks/incident_reports  (stubbed; mirror signup shape when ready)
async function handleIncidentReport(req, res) {
  const requestId = `incident_${Date.now()}`;
  try {
    logger.info(`[${requestId}] Incident report webhook received`);
    // TODO: implement incident handling (parse → map → insert into incident_reports)
    await logToGDPRAudit('system', 'INCIDENT_RECEIVED', { hasBody: !!req.body }, req);
    return safeOk(res, { accepted: true, message: 'Incident received (stub)' });
  } catch (e) {
    logger.error(`[${requestId}] Incident error: ${e.message}`);
    return safeOk(res, { accepted: false, reason: 'unexpected_error' });
  }
}

// POST /webhooks/demo
async function handleDemo(req, res) {
  const requestId = `demo_${Date.now()}`;
  try {
    logger.info(`[${requestId}] Demo webhook`);
    await logToGDPRAudit('system', 'DEMO_SUBMISSION', { at: new Date().toISOString() }, req);
    return safeOk(res, { accepted: true, message: 'Demo OK' });
  } catch (e) {
    logger.error(`[${requestId}] Demo error: ${e.message}`);
    return safeOk(res, { accepted: false, reason: 'unexpected_error' });
  }
}

// POST /webhooks/test
async function handleWebhookTest(req, res) {
  const requestId = `test_${Date.now()}`;
  await logToGDPRAudit('system', 'WEBHOOK_TEST', { method: req.method, ip: req.ip }, req);
  return safeOk(res, {
    message: 'Webhook test OK',
    received: { method: req.method, headers: Object.keys(req.headers) },
    services: { supabase: !!supabase, gdpr: !!gdprService },
    time: new Date().toISOString(),
    request_id: requestId
  });
}

// POST /webhooks/simulate-typeform (calls real signup handler)
async function handleTypeformSimulation(req, res) {
  const now = new Date().toISOString();
  req.body = {
    event_id: `test_${Date.now()}`,
    event_type: 'form_response',
    form_response: {
      form_id: 'test_form',
      token: `test_${Math.random().toString(36).slice(2)}`,
      landed_at: now,
      submitted_at: now,
      hidden: {
        auth_user_id: req.body.auth_user_id || 'test-user-id',
        email: req.body.email || 'test@example.com',
        auth_code: req.body.auth_code || 'test-code',
        product_id: req.body.product_id || 'car_crash_lawyer_ai'
      },
      answers: [
        { field: { id: 't1', ref: '3f614832-1ccd-4a7e-9c4a-bde45b6b930e' }, type: 'text', text: 'Test' },
        { field: { id: 't2', ref: '52af54a6-11d9-48f7-8878-7a7030f0cacd' }, type: 'text', text: 'User' }
      ]
    }
  };
  return handleSignup(req, res);
}

// POST /webhooks/debug
async function handleDebug(req, res) {
  const requestId = `debug_${Date.now()}`;
  try {
    logger.info(`[${requestId}] Debug webhook called`);
    
    const debugInfo = {
      message: 'Debug endpoint working',
      timestamp: new Date().toISOString(),
      request_id: requestId,
      services: {
        supabase: !!supabase,
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        gdpr: !!gdprService
      },
      environment: {
        node_env: process.env.NODE_ENV,
        has_supabase_url: !!process.env.SUPABASE_URL,
        has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        has_typeform_secret: !!process.env.TYPEFORM_SECRET,
        supabase_url_preview: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'missing'
      },
      request: {
        method: req.method,
        path: req.path,
        headers: Object.keys(req.headers || {}),
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        contentType: req.get('content-type'),
        userAgent: req.get('user-agent')
      }
    };

    await logToGDPRAudit('system', 'DEBUG_ENDPOINT', debugInfo, req);
    return safeOk(res, debugInfo);
  } catch (e) {
    logger.error(`[${requestId}] Debug error: ${e.message}`, { stack: e.stack });
    return safeOk(res, { 
      accepted: false, 
      reason: 'debug_error',
      error: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : 'hidden',
      request_id: requestId
    });
  }
}

// POST /webhooks/simple-test
async function handleSimpleTest(req, res) {
  const requestId = `simple_${Date.now()}`;
  logger.info(`[${requestId}] Simple test called`);
  
  return safeOk(res, {
    success: true,
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString(),
    request_id: requestId,
    method: req.method,
    hasBody: !!req.body
  });
}

module.exports = {
  health,
  handleSignup,
  handleIncidentReport,
  handleDemo,
  handleWebhookTest,
  handleTypeformSimulation,
  handleDebug,
  handleSimpleTest
};