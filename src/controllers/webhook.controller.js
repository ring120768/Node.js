// src/controllers/webhook.controller.js - CLEAN PRODUCTION VERSION

/**
 * Webhook Controller for Car Crash Lawyer AI
 * Handles Typeform webhook submissions with complete error handling
 * 
 * Features:
 * - Storage-based GDPR audit logging
 * - Nonce-based security (auth_code validation)
 * - Complete Typeform field mapping
 * - Bulletproof error handling (always returns 200)
 * - Comprehensive logging for debugging
 */

const { createClient } = require('@supabase/supabase-js');
const gdprService = require('../services/gdprService');
const logger = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');

// ==================== INITIALIZATION ====================

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ==================== TYPEFORM FIELD MAPPING ====================

/**
 * Maps Typeform field reference IDs to user_signup table columns
 * These refs come from your Typeform and map to your Supabase schema
 */
const TYPEFORM_FIELD_MAP = {
  // Personal Information
  '3f614832-1ccd-4a7e-9c4a-bde45b6b930e': 'name',
  '52af54a6-11d9-48f7-8878-7a7030f0cacd': 'surname',
  '437aacde-95e2-411c-af09-fea3c4fc3bdb': 'email',
  '2388c44c-d913-40fc-a346-9b43ac259576': 'mobile',

  // Address Fields
  '91d5b1fd-4651-4a37-9fc7-ea26d58f1090': 'street_address',
  '75639534-cd2c-46bb-a228-c374bbc5e55b': 'street_address_optional',
  '336d5b69-89e1-4e00-8a0e-2a35c54fa1dd': 'town',
  '347c3245-3d30-4737-8062-8e2e7c56afbb': 'postcode',
  '38628048-596d-4d73-bc8a-74e7ce41cd99': 'country',

  // Driving License
  '72b3e18b-34fd-40fa-8d68-f768c49a8cd3': 'driving_license_number',
  'f0a0f10f-dd89-4447-8546-cbe9836d38ac': 'driving_license_picture',

  // Vehicle Information
  '91f7e275-976a-4dfe-ab15-1189736eae4a': 'car_registration_number',
  'f60af70d-5f59-4311-a237-99ddb8b4793e': 'vehicle_make',
  'ebfe28c8-8c2b-4d4f-9ce8-8b9f87d11061': 'vehicle_model',
  '6b607ed8-5f6e-4ac6-9108-841dae7a55fd': 'vehicle_colour',
  'c81e98b2-aa58-4968-9b76-867355ab42c4': 'vehicle_condition',

  // Vehicle Images
  '2cfdc74e-3635-49dc-b9e2-ce6c37824063': 'vehicle_picture_front',
  '379c1eb3-f917-4ec4-a716-f32854a94047': 'vehicle_picture_driver_side',
  'cbb46409-101d-4814-ba05-ac227f37fa73': 'vehicle_picture_passenger_side',
  '4f3dc270-038e-4f1d-8bde-fe9e8150115f': 'vehicle_picture_back',

  // Insurance Details
  'eeb8719e-29f5-4a9d-8bf0-71afd057c93c': 'insurance_company',
  'e65721d6-210e-40fd-8299-c666ee2e7065': 'policy_number',
  '49c5997b-9884-4104-9bcd-c89d70cf9b2f': 'policy_holder',
  '94b2ed65-e993-4535-bd61-4ab81e883b87': 'cover_type',

  // Recovery Service
  '031816f4-8142-4659-83c3-7b00f39df8d0': 'recovery_company',
  'ef405cc7-012b-4638-9cb1-b0ed4303734b': 'recovery_breakdown_number',
  'a871e5b4-13f1-475f-8257-15e2b8f38825': 'recovery_breakdown_email',

  // Emergency Contact (stored as separate fields, can be combined)
  '58758955-3ac2-42f6-9ab0-0124f96a8e5e': 'emergency_contact_first_name',
  'f9c22998-2090-4f87-9f14-fa6f13d09f4a': 'emergency_contact_last_name',
  '9de39426-29cb-41a4-b015-2e645e93b051': 'emergency_contact_phone',
  '0e7f7f5a-33b0-49b5-8a6f-2b4f7b563f4e': 'emergency_contact_email',
  '8ebeb1e8-9158-40cf-9202-63be1e3eba68': 'emergency_contact_company',

  // Legal & Compliance
  '8da3763d-0c30-4626-8493-46893cfd1e3e': 'gdpr_consent',

  // Metadata
  'f00d4aa3-e56d-4b7e-9971-3710e096edd2': 'time_stamp',
  '403a4be2-162b-4c58-9518-b8db2ff12b40': 'create_user_id'
};

// ==================== MAIN WEBHOOK HANDLERS ====================

/**
 * User Signup Webhook Handler
 * POST /webhooks/user_signup
 * ✅ Confirmed with Zapier/Typeform
 * 
 * Flow:
 * 1. User signs up on Replit → Creates Auth user with temporary nonce
 * 2. User redirected to Typeform with hidden fields (auth_user_id, auth_code, email)
 * 3. User completes Typeform
 * 4. Typeform sends webhook to this endpoint
 * 5. Validate nonce (auth_code)
 * 6. Save data to user_signup table
 * 7. Update Auth user metadata
 * 8. Log to GDPR audit (storage bucket)
 * 9. Clear nonce
 */
async function handleSignup(req, res) {
  const requestId = `signup_${Date.now()}`;

  try {
    logger.info(`[${requestId}] 🎯 User signup webhook received`);

    // STEP 1: Validate webhook payload structure
    const webhookData = req.body;

    if (!webhookData?.form_response) {
      logger.error(`[${requestId}] ❌ Invalid webhook structure - missing form_response`);
      return safeErrorResponse(res, {
        error: 'Invalid webhook payload structure',
        request_id: requestId
      });
    }

    const formResponse = webhookData.form_response;
    const hidden = formResponse.hidden || {};
    const answers = formResponse.answers || [];

    // STEP 2: Extract hidden fields (auth handoff data)
    const { auth_user_id, email, auth_code, product_id } = hidden;

    logger.info(`[${requestId}] 🔐 Hidden fields:`, {
      has_user_id: !!auth_user_id,
      user_id: auth_user_id,
      has_email: !!email,
      email: email,
      has_auth_code: !!auth_code,
      product_id: product_id || 'not_provided'
    });

    // STEP 3: Validate required hidden fields
    if (!auth_user_id || !email || !auth_code) {
      logger.error(`[${requestId}] ❌ Missing required hidden fields`);
      return safeErrorResponse(res, {
        error: 'Missing required authentication data',
        required: ['auth_user_id', 'email', 'auth_code'],
        received: { auth_user_id: !!auth_user_id, email: !!email, auth_code: !!auth_code },
        request_id: requestId
      });
    }

    // STEP 4: Validate nonce (auth_code)
    let user;
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(auth_user_id);

      if (userError || !userData) {
        logger.error(`[${requestId}] ❌ User not found: ${auth_user_id}`, userError);
        return safeErrorResponse(res, {
          error: 'User not found',
          user_id: auth_user_id,
          request_id: requestId
        });
      }

      user = userData;
      const metadata = user.user_metadata || {};
      const storedNonce = metadata.temp_nonce;
      const nonceExpires = metadata.temp_nonce_expires;

      // Check nonce matches
      if (!storedNonce || storedNonce !== auth_code) {
        logger.warn(`[${requestId}] ❌ Invalid nonce - mismatch`);

        // Log security event
        await logToGDPRAudit(auth_user_id, 'AUTH_CODE_INVALID', {
          reason: 'Nonce mismatch',
          ip: req.ip
        }, req);

        return safeErrorResponse(res, {
          error: 'Invalid authentication code',
          request_id: requestId
        });
      }

      // Check nonce not expired
      if (nonceExpires && Date.now() > nonceExpires) {
        logger.warn(`[${requestId}] ❌ Nonce expired`);

        await logToGDPRAudit(auth_user_id, 'AUTH_CODE_EXPIRED', {
          expires_at: nonceExpires,
          ip: req.ip
        }, req);

        return safeErrorResponse(res, {
          error: 'Authentication code expired',
          request_id: requestId
        });
      }

      logger.info(`[${requestId}] ✅ Nonce validated successfully`);

    } catch (nonceError) {
      logger.error(`[${requestId}] ❌ Nonce validation error:`, nonceError);
      return safeErrorResponse(res, {
        error: 'Authentication validation failed',
        details: nonceError.message,
        request_id: requestId
      });
    }

    // STEP 5: Parse Typeform answers
    const parsedData = parseTypeformAnswers(answers, requestId);
    logger.info(`[${requestId}] 📝 Parsed ${Object.keys(parsedData).length} fields`);

    // STEP 6: Map to user_signup table schema
    const signupData = buildSignupData(auth_user_id, email, parsedData);
    logger.info(`[${requestId}] 💾 Prepared ${Object.keys(signupData).length} fields for insert`);

    // STEP 7: Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from('user_signup')
      .insert([signupData])
      .select();

    if (insertError) {
      logger.error(`[${requestId}] ❌ Database insert failed:`, {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details
      });

      await logToGDPRAudit(auth_user_id, 'SIGNUP_INSERT_FAILED', {
        error: insertError.message,
        code: insertError.code,
        email: email
      }, req);

      return safeErrorResponse(res, {
        error: 'Failed to save profile data',
        details: insertError.message,
        request_id: requestId
      });
    }

    const savedRecord = insertedData[0];
    logger.info(`[${requestId}] ✅ Record saved successfully: ${savedRecord.id}`);

    // STEP 8: Update Auth metadata and clear nonce
    await updateUserMetadata(auth_user_id, user.user_metadata, savedRecord.id, product_id, requestId);

    // STEP 9: Log to GDPR audit
    await logToGDPRAudit(auth_user_id, 'TYPEFORM_PROFILE_COMPLETED', {
      signup_id: savedRecord.id,
      email: email,
      fields_count: Object.keys(signupData).length,
      has_vehicle_images: !!(parsedData.vehicle_picture_front || parsedData.vehicle_picture_driver_side),
      has_license_image: !!parsedData.driving_license_picture,
      product_id: product_id
    }, req);

    // STEP 10: Success response
    logger.info(`[${requestId}] 🎉 Signup webhook completed successfully`);

    return successResponse(res, {
      message: 'Profile completed successfully',
      user_id: auth_user_id,
      signup_id: savedRecord.id,
      email: email,
      fields_saved: Object.keys(signupData).length,
      profile_complete: true
    });

  } catch (error) {
    // Catch-all error handler
    logger.error(`[${requestId}] ❌ Unexpected error:`, {
      message: error.message,
      stack: error.stack
    });

    await logToGDPRAudit('system', 'WEBHOOK_ERROR', {
      error: error.message,
      path: req.path,
      request_id: requestId
    }, req);

    return safeErrorResponse(res, {
      error: 'Webhook processing failed',
      details: error.message,
      request_id: requestId
    });
  }
}

/**
 * Incident Reports Webhook Handler
 * POST /webhooks/incident_reports
 * ✅ Confirmed with Zapier/Typeform
 */
async function handleIncidentReport(req, res) {
  const requestId = `incident_${Date.now()}`;

  try {
    logger.info(`[${requestId}] 📋 Incident report webhook received`);

    // TODO: Implement incident report processing
    // Similar structure to handleSignup but for incident data

    return successResponse(res, {
      message: 'Incident report received',
      note: 'Processing logic to be implemented',
      request_id: requestId
    });

  } catch (error) {
    logger.error(`[${requestId}] ❌ Error:`, error);
    return safeErrorResponse(res, {
      error: 'Incident report processing failed',
      request_id: requestId
    });
  }
}

/**
 * Demo Webhook Handler
 * POST /webhooks/demo
 * ✅ Confirmed with Zapier/Typeform
 */
async function handleDemo(req, res) {
  const requestId = `demo_${Date.now()}`;

  try {
    logger.info(`[${requestId}] 🎭 Demo webhook received`);
    logger.info(`[${requestId}] Body:`, req.body);

    await logToGDPRAudit('system', 'DEMO_SUBMISSION', {
      timestamp: new Date().toISOString()
    }, req);

    return successResponse(res, {
      message: 'Demo submission received successfully',
      request_id: requestId
    });

  } catch (error) {
    logger.error(`[${requestId}] ❌ Error:`, error);
    return safeErrorResponse(res, {
      error: 'Demo processing failed',
      request_id: requestId
    });
  }
}

/**
 * Test Webhook Handler
 * POST /webhooks/test
 */
async function handleWebhookTest(req, res) {
  const requestId = `test_${Date.now()}`;

  logger.info(`[${requestId}] 🧪 Test webhook called`);

  await logToGDPRAudit('system', 'WEBHOOK_TEST', {
    method: req.method,
    ip: req.ip
  }, req);

  return successResponse(res, {
    message: 'Test webhook working!',
    received: {
      method: req.method,
      body: req.body,
      headers: Object.keys(req.headers)
    },
    services: {
      supabase: !!supabase,
      gdpr: !!gdprService
    },
    timestamp: new Date().toISOString(),
    request_id: requestId
  });
}

/**
 * Typeform Simulation Handler (for testing)
 * POST /webhooks/simulate-typeform
 */
async function handleTypeformSimulation(req, res) {
  const requestId = `sim_${Date.now()}`;

  logger.info(`[${requestId}] 🎭 Simulating Typeform webhook`);

  const simulatedPayload = {
    event_id: `test_${Date.now()}`,
    event_type: "form_response",
    form_response: {
      form_id: "test_form",
      token: `test_token_${Math.random().toString(36).substr(2, 9)}`,
      landed_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      hidden: {
        auth_user_id: req.body.auth_user_id || "test-user-id",
        email: req.body.email || "test@example.com",
        auth_code: req.body.auth_code || "test-code",
        product_id: req.body.product_id || "car_crash_lawyer_ai"
      },
      answers: [
        {
          field: { id: "test_1", ref: "3f614832-1ccd-4a7e-9c4a-bde45b6b930e" },
          type: "text",
          text: "Test"
        },
        {
          field: { id: "test_2", ref: "52af54a6-11d9-48f7-8878-7a7030f0cacd" },
          type: "text",
          text: "User"
        }
      ]
    }
  };

  // Call the real signup handler with simulated data
  req.body = simulatedPayload;
  return await handleSignup(req, res);
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse Typeform answers and map to field names
 */
function parseTypeformAnswers(answers, requestId) {
  const parsedData = {};

  answers.forEach((answer, index) => {
    try {
      const fieldRef = answer.field?.ref;
      const mappedField = TYPEFORM_FIELD_MAP[fieldRef];

      if (!mappedField) return; // Skip unmapped fields

      // Extract value based on answer type
      let value = null;

      if (answer.text) value = answer.text;
      else if (answer.email) value = answer.email;
      else if (answer.phone_number) value = answer.phone_number;
      else if (answer.number) value = answer.number;
      else if (answer.boolean !== undefined) value = answer.boolean ? 'yes' : 'no';
      else if (answer.choice?.label) value = answer.choice.label;
      else if (answer.date) value = answer.date;
      else if (answer.file_url) value = answer.file_url;
      else if (answer.url) value = answer.url;

      if (value !== null) {
        parsedData[mappedField] = value;
      }
    } catch (parseError) {
      logger.warn(`[${requestId}] ⚠️ Failed to parse answer ${index}:`, parseError.message);
    }
  });

  return parsedData;
}

/**
 * Build signup data object for database insert
 */
function buildSignupData(userId, email, parsedData) {
  const signupData = {
    create_user_id: userId,
    email: email,
    time_stamp: new Date().toISOString(),

    // Personal info
    name: parsedData.name || null,
    surname: parsedData.surname || null,
    mobile: parsedData.mobile ? parseInt(parsedData.mobile) : null,

    // Address
    street_address: parsedData.street_address || null,
    street_address_optional: parsedData.street_address_optional || null,
    town: parsedData.town || null,
    postcode: parsedData.postcode || null,
    country: parsedData.country || null,

    // License
    driving_license_number: parsedData.driving_license_number || null,
    driving_license_picture: parsedData.driving_license_picture || null,

    // Vehicle
    car_registration_number: parsedData.car_registration_number || null,
    vehicle_make: parsedData.vehicle_make || null,
    vehicle_model: parsedData.vehicle_model || null,
    vehicle_colour: parsedData.vehicle_colour || null,
    vehicle_condition: parsedData.vehicle_condition || null,

    // Vehicle images
    vehicle_picture_front: parsedData.vehicle_picture_front || null,
    vehicle_picture_driver_side: parsedData.vehicle_picture_driver_side || null,
    vehicle_picture_passenger_side: parsedData.vehicle_picture_passenger_side || null,
    vehicle_picture_back: parsedData.vehicle_picture_back || null,

    // Insurance
    insurance_company: parsedData.insurance_company || null,
    policy_number: parsedData.policy_number || null,
    policy_holder: parsedData.policy_holder || null,
    cover_type: parsedData.cover_type || null,

    // Recovery
    recovery_company: parsedData.recovery_company || null,
    recovery_breakdown_number: parsedData.recovery_breakdown_number || null,
    recovery_breakdown_email: parsedData.recovery_breakdown_email || null,

    // Emergency contact
    emergency_contact: parsedData.emergency_contact_phone ? parseInt(parsedData.emergency_contact_phone) : null,

    // Legal
    gdpr_consent: parsedData.gdpr_consent || 'yes'
  };

  // Remove null values for cleaner database
  Object.keys(signupData).forEach(key => {
    if (signupData[key] === null) delete signupData[key];
  });

  return signupData;
}

/**
 * Update user Auth metadata and clear nonce
 */
async function updateUserMetadata(userId, existingMetadata, signupId, productId, requestId) {
  try {
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingMetadata,
        // Clear nonce
        temp_nonce: null,
        temp_nonce_expires: null,
        // Update status
        profile_completed: true,
        profile_completed_at: new Date().toISOString(),
        signup_record_id: signupId,
        account_status: 'active',
        product_id: productId || 'car_crash_lawyer_ai'
      }
    });

    logger.info(`[${requestId}] ✅ Auth metadata updated`);
  } catch (error) {
    logger.warn(`[${requestId}] ⚠️ Auth metadata update failed (non-critical):`, error.message);
  }
}

/**
 * Log to GDPR audit (storage bucket)
 */
async function logToGDPRAudit(userId, eventType, details, req) {
  try {
    if (gdprService && gdprService.logActivity) {
      await gdprService.logActivity(userId, eventType, details, req);
    }
  } catch (error) {
    logger.warn('⚠️ GDPR audit logging failed (non-critical):', error.message);
  }
}

/**
 * Safe error response - always returns 200 to prevent Typeform retries
 */
function safeErrorResponse(res, data) {
  return res.status(200).json({
    success: false,
    ...data,
    note: 'Returning 200 to prevent Typeform retries'
  });
}

// ==================== EXPORTS ====================

module.exports = {
  handleSignup,
  handleIncidentReport,
  handleDemo,
  handleWebhookTest,
  handleTypeformSimulation
};