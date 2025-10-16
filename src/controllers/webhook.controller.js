// src/controllers/webhook.controller.js - FIXED COMPLETE VERSION
const crypto = require('crypto');
const logger = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Verify Typeform webhook signature
 * FIXED: Proper base64 comparison using timingSafeEqual
 */
function verifyTypeformSignature(signature, payload, secret) {
  if (!signature || !secret) {
    logger.warn('Missing signature or secret for Typeform webhook verification');
    return false;
  }

  try {
    // ✅ FIX: Generate HMAC digest as Buffer (not base64 string)
    const expectedBuffer = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest();  // Returns Buffer, not string

    const cleanSignature = signature.replace(/^sha256=/, '');

    // Decode received signature from base64 to Buffer
    const receivedBuffer = Buffer.from(cleanSignature, 'base64');

    // Length check for security
    if (receivedBuffer.length !== expectedBuffer.length) {
      logger.warn('Signature length mismatch', {
        expected: expectedBuffer.length,
        received: receivedBuffer.length
      });
      return false;
    }

    // ✅ FIX: Compare buffers directly (no double encoding)
    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);

  } catch (error) {
    logger.error('Error verifying Typeform signature:', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Build a mapping of field ref -> field title from form definition
 */
function buildFieldTitleMap(definition) {
  const map = new Map();
  if (definition && definition.fields) {
    definition.fields.forEach(field => {
      if (field.ref && field.title) {
        // Normalize title: lowercase, remove colons/punctuation, trim
        const normalizedTitle = field.title.toLowerCase()
          .replace(/:/g, '')
          .replace(/\(optional\)/g, '_optional')
          .replace(/\s+/g, '_')
          .trim();
        map.set(field.ref, normalizedTitle);
      }
    });
  }
  return map;
}

/**
 * Extract answer value from answer object
 */
function extractAnswerValue(answer) {
  if (!answer) return null;

  // Handle different answer types
  if (answer.type === 'text' || answer.type === 'email' || answer.type === 'phone_number') {
    return answer.text || answer.email || answer.phone_number;
  } else if (answer.type === 'number') {
    return answer.number;
  } else if (answer.type === 'boolean') {
    return answer.boolean;
  } else if (answer.type === 'choice') {
    return answer.choice?.label;
  } else if (answer.type === 'choices') {
    return answer.choices?.labels?.join(', ');
  } else if (answer.type === 'date') {
    return answer.date;
  } else if (answer.type === 'file_url') {
    return answer.file_url;
  }

  return null;
}

/**
 * Extract answer by field reference (legacy function - now enhanced)
 */
function getAnswerByRef(answers, ref) {
  const answer = answers.find(a => a.field?.ref === ref);
  return extractAnswerValue(answer);
}

/**
 * Get answer by field title using the title map
 * Matches normalized titles against expected field names
 */
function getAnswerByTitle(answers, titleMap, expectedFieldName) {
  // Find answer where the normalized title matches expectedFieldName
  const answer = answers.find(a => {
    const ref = a.field?.ref;
    if (!ref) return false;
    const normalizedTitle = titleMap.get(ref);
    return normalizedTitle === expectedFieldName;
  });

  return extractAnswerValue(answer);
}

/**
 * Handle Typeform webhook - Main Entry Point
 * ✅ ENHANCED: Better error handling and validation
 */
async function handleTypeformWebhook(req, res) {
  const requestId = req.id || crypto.randomBytes(8).toString('hex');
  const startTime = Date.now();

  // Enhanced initial logging with better structure
  console.log('\n' + '='.repeat(80));
  console.log(`🎯 TYPEFORM WEBHOOK [${requestId.slice(-8)}]`);
  console.log('='.repeat(80));

  try {
    const bodyLength = req.rawBody ? req.rawBody.length : 0;
    const hasSignature = !!req.get('typeform-signature');
    const contentType = req.get('content-type');

    console.log(`📥 Incoming: ${contentType} | ${bodyLength} bytes | Signature: ${hasSignature ? '✅' : '❌'}`);
    console.log(`🕐 Timestamp: ${new Date().toISOString()}`);

    logger.info(`[${requestId}] Typeform webhook received`, {
      contentType,
      hasSignature,
      hasRawBody: !!req.rawBody,
      bodyLength
    });

    // ==================== VALIDATION ====================

    console.log('\n🔍 VALIDATION PHASE');
    console.log('-'.repeat(40));

    // 1. Check raw body exists
    const rawBody = req.rawBody;
    if (!rawBody) {
      console.log('❌ Raw body missing');
      logger.warn(`[${requestId}] Missing raw body`);
      return res.status(400).json({
        success: false,
        error: 'Missing request body',
        code: 'MISSING_BODY',
        requestId
      });
    }
    console.log('✅ Raw body present');

    // ✅ FIX #1: Validate req.body is an object before destructuring
    if (!req.body || typeof req.body !== 'object') {
      console.log('❌ Invalid body format - expected JSON object');
      logger.warn(`[${requestId}] Invalid body format`, { 
        bodyType: typeof req.body,
        contentType: req.get('content-type')
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid request body format - expected JSON',
        code: 'INVALID_BODY_FORMAT',
        requestId
      });
    }
    console.log('✅ Body is valid JSON object');

    // 2. Get signature header
    const signature = req.get('typeform-signature');

    // 3. Verify signature if secret is configured
    if (process.env.TYPEFORM_WEBHOOK_SECRET) {
      console.log('🔐 Signature verification required');

      if (!signature) {
        console.log('❌ Signature missing (required)');
        logger.warn(`[${requestId}] TYPEFORM_WEBHOOK_SECRET set but no signature provided`);
        return res.status(401).json({
          success: false,
          error: 'Missing Typeform-Signature header',
          code: 'MISSING_SIGNATURE',
          requestId
        });
      }

      console.log(`🔑 Signature received: ${signature.substring(0, 30)}...`);

      const isValid = verifyTypeformSignature(
        signature,
        rawBody,
        process.env.TYPEFORM_WEBHOOK_SECRET
      );

      if (!isValid) {
        console.log('❌ Signature verification FAILED');
        console.log(`   Expected encoding: BASE64`);
        console.log(`   Signature format: sha256=<base64_digest>`);
        logger.warn(`[${requestId}] Invalid Typeform signature`, {
          signatureLength: signature.length,
          signaturePreview: signature.substring(0, 30) + '...',
          bodyChecksum: crypto.createHash('sha256').update(rawBody).digest('hex').substring(0, 8)
        });
        return res.status(403).json({
          success: false,
          error: 'Invalid signature',
          code: 'INVALID_SIGNATURE',
          requestId
        });
      }

      console.log('✅ Signature verified successfully');
      logger.info(`[${requestId}] Signature verified successfully`);
    } else {
      console.log('⚠️  Signature verification skipped (no secret configured)');
      logger.info(`[${requestId}] Signature verification skipped (TYPEFORM_WEBHOOK_SECRET not set)`);
    }

    // 4. Parse JSON payload (req.body is already parsed by Express)
    const { event_id, event_type, form_response } = req.body;

    // 5. Validate required fields
    if (!event_id || !event_type) {
      console.log('❌ Missing required fields');
      logger.warn(`[${requestId}] Missing required webhook fields`, {
        hasEventId: !!event_id,
        hasEventType: !!event_type
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: event_id or event_type',
        code: 'MISSING_REQUIRED_FIELDS',
        requestId
      });
    }
    console.log(`✅ Event ID: ${event_id}`);
    console.log(`✅ Event Type: ${event_type}`);

    // 6. Check event type
    if (event_type !== 'form_response') {
      console.log(`⚠️  Ignoring event type: ${event_type} (not form_response)`);
      logger.info(`[${requestId}] Ignoring event type: ${event_type}`);
      return res.status(200).json({
        success: true,
        message: 'Event type not processed',
        event_type
      });
    }

    // 7. Validate form_response
    if (!form_response) {
      console.log('❌ Missing form_response data');
      logger.warn(`[${requestId}] Missing form_response data`);
      return res.status(400).json({
        success: false,
        error: 'Missing form_response data',
        code: 'MISSING_FORM_RESPONSE',
        requestId
      });
    }
    console.log('✅ Form response data present');

    // ==================== FORM DETAILS ====================

    const formId = form_response.form_id;
    const formTitle = form_response.definition?.title;
    const userId = form_response.hidden?.auth_user_id || form_response.token;
    const userEmail = form_response.hidden?.email;

    console.log('\n📝 FORM DETAILS');
    console.log('-'.repeat(40));
    console.log(`📋 Form ID: ${formId}`);
    console.log(`📄 Form Title: ${formTitle}`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`📧 Email: ${userEmail || 'Not provided'}`);
    console.log(`📊 Answers: ${form_response.answers?.length || 0} fields`);

    // ==================== RESPOND IMMEDIATELY ====================

    // Log processing time up to this point
    const verificationTime = Date.now() - startTime;

    console.log('\n⚡ PROCESSING');
    console.log('-'.repeat(40));
    console.log(`🕐 Validation completed in: ${verificationTime}ms`);
    console.log('🚀 Sending 200 OK response (processing continues async)');

    logger.info(`[${requestId}] Webhook validated in ${verificationTime}ms`, {
      eventId: event_id,
      formId: form_response.form_id,
      formTitle: form_response.definition?.title
    });

    // Send 200 response immediately (processing happens async)
    res.status(200).json({
      success: true,
      message: 'Webhook accepted',
      event_id,
      requestId,
      processing: 'async',
      verification_time_ms: verificationTime
    });

    // ==================== ASYNC PROCESSING ====================

    console.log('⏳ Starting async processing...');
    console.log('='.repeat(80) + '\n');

    // Process webhook asynchronously (don't await)
    setImmediate(() => {
      processWebhookAsync(event_id, event_type, form_response, requestId).catch(error => {
        console.log('\n' + '!'.repeat(80));
        console.log(`❌ ASYNC PROCESSING FAILED [${requestId.slice(-8)}]`);
        console.log('!'.repeat(80));
        console.log(`Error: ${error.message}`);
        console.log('!'.repeat(80) + '\n');

        logger.error(`[${requestId}] Async webhook processing failed`, {
          error: error.message,
          stack: error.stack,
          eventId: event_id
        });
      });
    });

  } catch (error) {
    console.log('\n' + '!'.repeat(80));
    console.log(`❌ WEBHOOK ERROR [${requestId.slice(-8)}]`);
    console.log('!'.repeat(80));
    console.log(`Error: ${error.message}`);
    console.log(`Stack: ${error.stack ? error.stack.split('\n')[0] : 'N/A'}`);
    console.log('!'.repeat(80) + '\n');

    logger.error(`[${requestId}] Typeform webhook handler error`, {
      error: error.message,
      stack: error.stack
    });

    // Return 500 only for unexpected server errors
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId
      });
    }
  }
}

/**
 * Process webhook asynchronously (after 200 response sent)
 * ENHANCED: Better async processing visibility
 */
async function processWebhookAsync(eventId, eventType, formResponse, requestId) {
  const startTime = Date.now();

  console.log('\n' + '⚡'.repeat(80));
  console.log(`🔄 ASYNC PROCESSING [${requestId.slice(-8)}]`);
  console.log('⚡'.repeat(80));

  try {
    const formId = formResponse.form_id;
    const formTitle = formResponse.definition?.title;

    console.log(`📝 Processing: ${formTitle}`);
    console.log(`🆔 Event ID: ${eventId}`);
    console.log(`📋 Form ID: ${formId}`);

    logger.info(`[${requestId}] Starting async processing`, {
      eventId,
      formId: formResponse.form_id
    });

    // Route to appropriate handler based on form
    let result;
    let processingType = '';

    // Normalize title (trim spaces)
    const normalizedTitle = formTitle?.trim() || '';

    if (normalizedTitle === 'Car Crash Lawyer AI sign up' || formId === 'b03aFxEO') {
      processingType = 'USER SIGNUP';
      console.log(`\n🚀 Processing ${processingType}...`);
      result = await processUserSignup(formResponse, requestId);
    } else if (normalizedTitle?.includes('Incident Report') || formId === 'WvM2ejru') {
      processingType = 'INCIDENT REPORT';
      console.log(`\n🚀 Processing ${processingType}...`);
      result = await processIncidentReport(formResponse, requestId);
    } else {
      processingType = 'UNKNOWN FORM';
      console.log(`\n⚠️  ${processingType} - Skipping processing`);
      console.log(`Form Title: ${formTitle}`);
      console.log(`Form ID: ${formId}`);

      logger.warn(`[${requestId}] Unknown form`, {
        formTitle,
        formId
      });
      return {
        success: true,
        message: 'Form not recognized',
        formId,
        formTitle
      };
    }

    console.log(`✅ ${processingType} completed successfully`);

    // Store raw webhook for audit trail
    console.log('📁 Storing audit trail...');
    await storeWebhookAudit(eventId, eventType, formResponse, requestId);

    const processingTime = Date.now() - startTime;

    console.log(`\n🎉 ASYNC PROCESSING COMPLETE`);
    console.log('-'.repeat(40));
    console.log(`⏱️  Total time: ${processingTime}ms`);
    console.log(`📊 Result: ${result?.status || 'success'}`);
    console.log(`🗃️  Table: ${result?.table || 'N/A'}`);
    console.log(`👤 User: ${result?.user_id || 'N/A'}`);
    console.log('⚡'.repeat(80) + '\n');

    logger.info(`[${requestId}] Async processing completed in ${processingTime}ms`, {
      eventId,
      result
    });

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.log('\n' + '💥'.repeat(80));
    console.log(`❌ ASYNC PROCESSING ERROR [${requestId.slice(-8)}]`);
    console.log('💥'.repeat(80));
    console.log(`⏱️  Failed after: ${processingTime}ms`);
    console.log(`🔥 Error: ${error.message}`);
    console.log(`📍 Event ID: ${eventId}`);
    if (error.stack) {
      console.log(`📚 Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
    console.log('💥'.repeat(80) + '\n');

    logger.error(`[${requestId}] Async processing error`, {
      error: error.message,
      stack: error.stack,
      eventId
    });
    // Don't throw - response already sent
  }
}

/**
 * Process User Signup Form
 * ENHANCED: Better signup processing visibility
 */
async function processUserSignup(formResponse, requestId) {
  try {
    const { token, hidden, answers, submitted_at } = formResponse;

    // Extract hidden fields
    const authCode = hidden?.auth_code;
    const authUserId = hidden?.auth_user_id;
    const userEmail = hidden?.email;
    const productId = hidden?.product_id;

    console.log(`👤 User: ${authUserId || token}`);
    console.log(`📧 Email: ${userEmail || 'Not provided'}`);
    console.log(`🏷️  Product: ${productId || 'Not specified'}`);

    logger.info(`[${requestId}] Processing signup for user: ${authUserId || token}`);

    // Build field title map from form definition
    const titleMap = buildFieldTitleMap(formResponse.definition);

    // 🔍 DEBUG: Show what Typeform is actually sending
    console.log(`\n🔍 DEBUG: Typeform Answers Received (${answers?.length || 0} total)`);
    console.log('-'.repeat(60));
    if (answers && answers.length > 0) {
      answers.forEach((answer, index) => {
        const ref = answer.field?.ref || 'NO_REF';
        const title = answer.field?.title || 'NO_TITLE';
        const normalizedTitle = titleMap.get(ref) || 'NO_NORMALIZED_TITLE';
        const type = answer.type;
        let value = answer.text || answer.email || answer.phone_number || answer.number || answer.boolean || answer.date || 'NO_VALUE';

        console.log(`[${index}] Type: ${type}, Ref: ${ref}`);
        console.log(`    Title: ${title}`);
        console.log(`    Normalized: ${normalizedTitle}`);
        console.log(`    Value: ${JSON.stringify(value).substring(0, 80)}`);
      });
    }
    console.log('-'.repeat(60));

    // Build emergency contact string from separate fields
    const emergencyFirstName = getAnswerByTitle(answers, titleMap, 'first_name');
    const emergencyLastName = getAnswerByTitle(answers, titleMap, 'last_name');
    const emergencyPhone = getAnswerByTitle(answers, titleMap, 'phone_number');
    const emergencyEmail = getAnswerByTitle(answers, titleMap, 'email');
    const emergencyCompany = getAnswerByTitle(answers, titleMap, 'company');

    let emergencyContactString = null;
    if (emergencyFirstName || emergencyLastName || emergencyPhone) {
      const parts = [];
      if (emergencyFirstName || emergencyLastName) {
        parts.push(`${emergencyFirstName || ''} ${emergencyLastName || ''}`.trim());
      }
      if (emergencyPhone) parts.push(emergencyPhone);
      if (emergencyEmail) parts.push(emergencyEmail);
      if (emergencyCompany) parts.push(emergencyCompany);
      emergencyContactString = parts.join(' | ');
    }

    // Map Typeform answers to user_signup table fields using normalized titles
    const userData = {
      create_user_id: authUserId || token,
      email: userEmail,
      name: getAnswerByTitle(answers, titleMap, 'name'),
      surname: getAnswerByTitle(answers, titleMap, 'surname'),
      mobile: getAnswerByTitle(answers, titleMap, 'mobile'),
      street_address: getAnswerByTitle(answers, titleMap, 'street_address'),
      town: getAnswerByTitle(answers, titleMap, 'town'),
      street_address_optional: getAnswerByTitle(answers, titleMap, 'street_address_optional'),
      postcode: getAnswerByTitle(answers, titleMap, 'postcode'),
      country: getAnswerByTitle(answers, titleMap, 'country'),
      driving_license_number: getAnswerByTitle(answers, titleMap, 'driving_license_number'),
      car_registration_number: getAnswerByTitle(answers, titleMap, 'car_registration_number'),
      vehicle_make: getAnswerByTitle(answers, titleMap, 'vehicle_make'),
      vehicle_model: getAnswerByTitle(answers, titleMap, 'vehicle_model'),
      vehicle_colour: getAnswerByTitle(answers, titleMap, 'vehicle_colour'),
      vehicle_condition: getAnswerByTitle(answers, titleMap, 'vehicle_condition'),
      recovery_company: getAnswerByTitle(answers, titleMap, 'recovery_company'),
      recovery_breakdown_number: getAnswerByTitle(answers, titleMap, 'recovery_breakdown_number'),
      recovery_breakdown_email: getAnswerByTitle(answers, titleMap, 'recovery_breakdown_email'),
      emergency_contact: emergencyContactString,
      insurance_company: getAnswerByTitle(answers, titleMap, 'insurance_company'),
      policy_number: getAnswerByTitle(answers, titleMap, 'policy_number'),
      policy_holder: getAnswerByTitle(answers, titleMap, 'policy_holder'),
      cover_type: getAnswerByTitle(answers, titleMap, 'cover_type'),
      gdpr_consent: getAnswerByTitle(answers, titleMap, 'do_you_agree_to_share_this_data_for_legal_support'),
      driving_license_picture: getAnswerByTitle(answers, titleMap, 'please_upload_a_picture_of_your_driving_license'),
      vehicle_picture_front: getAnswerByTitle(answers, titleMap, 'front_image_of_your_vehicle'),
      vehicle_picture_driver_side: getAnswerByTitle(answers, titleMap, 'driver_side_image_of_your_vehicle'),
      vehicle_picture_passenger_side: getAnswerByTitle(answers, titleMap, 'passenger_side_image_of_your_vehicle'),
      vehicle_picture_back: getAnswerByTitle(answers, titleMap, 'back_image_of_your_vehicle'),
      time_stamp: submitted_at || new Date().toISOString()
    };

    // 🔍 DEBUG: Show userData BEFORE null cleanup
    console.log(`\n🔍 DEBUG: userData object BEFORE null cleanup (${Object.keys(userData).length} keys):`);
    console.log(JSON.stringify(userData, null, 2));

    // Remove null/undefined values
    Object.keys(userData).forEach(key => {
      if (userData[key] === null || userData[key] === undefined) {
        delete userData[key];
      }
    });

    // 🔍 DEBUG: Show userData AFTER null cleanup
    console.log(`\n🔍 DEBUG: userData object AFTER null cleanup (${Object.keys(userData).length} keys):`);
    console.log(JSON.stringify(userData, null, 2));

    // Show key data fields
    console.log(`\n📊 Data mapping completed:`);
    console.log(`   👤 Name: ${userData.name} ${userData.surname || ''}`);
    console.log(`   📱 Mobile: ${userData.mobile || 'Not provided'}`);
    console.log(`   🏠 Address: ${userData.street_address || 'Not provided'}`);
    console.log(`   🚗 Vehicle: ${userData.vehicle_make} ${userData.vehicle_model || ''}`);
    console.log(`   🆔 License: ${userData.driving_license_number || 'Not provided'}`);
    console.log(`   📋 Fields: ${Object.keys(userData).length} total`);

    logger.info(`[${requestId}] Inserting user data with ${Object.keys(userData).length} fields`);

    console.log(`\n💾 Inserting into Supabase user_signup table...`);

    // Insert to user_signup table
    const { data, error } = await supabase
      .from('user_signup')
      .insert([userData])
      .select();

    if (error) {
      console.log(`❌ Database insertion failed:`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Message: ${error.message}`);
      console.log(`   Details: ${error.details || 'None'}`);
      console.log(`   Hint: ${error.hint || 'None'}`);

      logger.error(`[${requestId}] Error inserting user_signup`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log(`✅ User record inserted successfully`);
    if (data && data[0]) {
      console.log(`   🆔 Database ID: ${data[0].id || 'N/A'}`);
      console.log(`   📅 Created: ${data[0].created_at || 'N/A'}`);
    }

    logger.info(`[${requestId}] User signup processed successfully`);

    // Update account status if needed
    if (authUserId) {
      console.log(`🔄 Updating account status...`);
      await updateAccountStatus(authUserId, 'active', requestId);
    }

    return {
      table: 'user_signup',
      user_id: authUserId || token,
      token: token,
      status: 'success'
    };

  } catch (error) {
    console.log(`❌ User signup processing failed:`);
    console.log(`   Error: ${error.message}`);
    if (error.code) console.log(`   Code: ${error.code}`);

    logger.error(`[${requestId}] Error processing user signup`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Process Incident Report Form
 */
async function processIncidentReport(formResponse, requestId) {
  try {
    const { token, hidden, answers, submitted_at } = formResponse;

    const userId = hidden?.user_id || hidden?.auth_user_id;

    console.log(`👤 Processing incident for user: ${userId || token}`);

    logger.info(`[${requestId}] Processing incident report for user: ${userId || token}`);

    // Map to incident_reports table (keeping your existing mapping)
    const incidentData = {
      create_user_id: userId || token,
      date: submitted_at || new Date().toISOString(),
      form_id: formResponse.form_id,

      // Medical Information
      medical_how_are_you_feeling: getAnswerByRef(answers, 'medical_how_are_you_feeling'),
      medical_attention: getAnswerByRef(answers, 'medical_attention'),
      medical_attention_from_who: getAnswerByRef(answers, 'medical_attention_from_who'),
      further_medical_attention: getAnswerByRef(answers, 'further_medical_attention'),
      are_you_safe: getAnswerByRef(answers, 'are_you_safe'),
      six_point_safety_check: getAnswerByRef(answers, 'six_point_safety_check'),

      // Medical Symptoms
      medical_chest_pain: getAnswerByRef(answers, 'medical_chest_pain'),
      medical_breathlessness: getAnswerByRef(answers, 'medical_breathlessness'),
      medical_abdominal_bruising: getAnswerByRef(answers, 'medical_abdominal_bruising'),
      medical_uncontrolled_bleeding: getAnswerByRef(answers, 'medical_uncontrolled_bleeding'),
      medical_severe_headache: getAnswerByRef(answers, 'medical_severe_headache'),
      medical_change_in_vision: getAnswerByRef(answers, 'medical_change_in_vision'),
      medical_abdominal_pain: getAnswerByRef(answers, 'medical_abdominal_pain'),
      medical_limb_pain: getAnswerByRef(answers, 'medical_limb_pain'),
      medical_limb_weakness: getAnswerByRef(answers, 'medical_limb_weakness'),
      medical_loss_of_consciousness: getAnswerByRef(answers, 'medical_loss_of_consciousness'),
      medical_none_of_these: getAnswerByRef(answers, 'medical_none_of_these'),

      // Accident Details
      when_did_the_accident_happen: getAnswerByRef(answers, 'when_did_the_accident_happen'),
      what_time_did_the_accident_happen: getAnswerByRef(answers, 'what_time_did_the_accident_happen'),
      where_exactly_did_this_happen: getAnswerByRef(answers, 'where_exactly_did_this_happen'),

      // Weather Conditions
      weather_conditions: getAnswerByRef(answers, 'weather_conditions'),
      weather_overcast: getAnswerByRef(answers, 'weather_overcast'),
      weather_street_lights: getAnswerByRef(answers, 'weather_street_lights'),
      weather_heavy_rain: getAnswerByRef(answers, 'weather_heavy_rain'),
      weather_wet_road: getAnswerByRef(answers, 'weather_wet_road'),
      weather_fog: getAnswerByRef(answers, 'weather_fog'),
      weather_snow_on_road: getAnswerByRef(answers, 'weather_snow_on_road'),
      weather_bright_daylight: getAnswerByRef(answers, 'weather_bright_daylight'),
      weather_light_rain: getAnswerByRef(answers, 'weather_light_rain'),
      weather_clear_and_dry: getAnswerByRef(answers, 'weather_clear_and_dry'),
      weather_dusk: getAnswerByRef(answers, 'weather_dusk'),
      weather_snow: getAnswerByRef(answers, 'weather_snow'),

      // Vehicle Information
      wearing_seatbelts: getAnswerByRef(answers, 'wearing_seatbelts'),
      reason_no_seatbelts: getAnswerByRef(answers, 'reason_no_seatbelts'),
      airbags_deployed: getAnswerByRef(answers, 'airbags_deployed'),
      damage_to_your_vehicle: getAnswerByRef(answers, 'damage_to_your_vehicle'),

      // Road Information
      road_type: getAnswerByRef(answers, 'road_type'),
      speed_limit: getAnswerByRef(answers, 'speed_limit'),
      junction_information: getAnswerByRef(answers, 'junction_information'),
      junction_information_roundabout: getAnswerByRef(answers, 'junction_information_roundabout'),
      junction_information_t_junction: getAnswerByRef(answers, 'junction_information_t_junction'),
      junction_information_traffic_lights: getAnswerByRef(answers, 'junction_information_traffic_lights'),
      junction_information_crossroads: getAnswerByRef(answers, 'junction_information_crossroads'),

      // Special Conditions
      special_conditions: getAnswerByRef(answers, 'special_conditions'),
      special_conditions_roadworks: getAnswerByRef(answers, 'special_conditions_roadworks'),
      special_conditions_defective_road: getAnswerByRef(answers, 'special_conditions_defective_road'),
      special_conditions_oil_spills: getAnswerByRef(answers, 'special_conditions_oil_spills'),
      special_conditions_workman: getAnswerByRef(answers, 'special_conditions_workman'),

      // Detailed Account
      detailed_account_of_what_happened: getAnswerByRef(answers, 'detailed_account_of_what_happened'),

      // Your Vehicle Details
      make_of_car: getAnswerByRef(answers, 'make_of_car'),
      model_of_car: getAnswerByRef(answers, 'model_of_car'),
      license_plate_number: getAnswerByRef(answers, 'license_plate_number'),
      direction_and_speed: getAnswerByRef(answers, 'direction_and_speed'),
      impact: getAnswerByRef(answers, 'impact'),
      damage_caused_by_accident: getAnswerByRef(answers, 'damage_caused_by_accident'),
      any_damage_prior: getAnswerByRef(answers, 'any_damage_prior'),

      // Other Driver Information
      other_drivers_name: getAnswerByRef(answers, 'other_drivers_name'),
      other_drivers_number: getAnswerByRef(answers, 'other_drivers_number'),
      other_drivers_address: getAnswerByRef(answers, 'other_drivers_address'),
      other_make_of_vehicle: getAnswerByRef(answers, 'other_make_of_vehicle'),
      other_model_of_vehicle: getAnswerByRef(answers, 'other_model_of_vehicle'),
      vehicle_license_plate: getAnswerByRef(answers, 'vehicle_license_plate'),
      other_policy_number: getAnswerByRef(answers, 'other_policy_number'),
      other_insurance_company: getAnswerByRef(answers, 'other_insurance_company'),
      other_policy_cover: getAnswerByRef(answers, 'other_policy_cover'),
      other_policy_holder: getAnswerByRef(answers, 'other_policy_holder'),
      other_damage_accident: getAnswerByRef(answers, 'other_damage_accident'),
      other_damage_prior: getAnswerByRef(answers, 'other_damage_prior'),

      // Police Information
      did_police_attend: getAnswerByRef(answers, 'did_police_attend'),
      accident_reference_number: getAnswerByRef(answers, 'accident_reference_number'),
      police_officer_badge_number: getAnswerByRef(answers, 'police_officer_badge_number'),
      police_officers_name: getAnswerByRef(answers, 'police_officers_name'),
      police_force_details: getAnswerByRef(answers, 'police_force_details'),
      breath_test: getAnswerByRef(answers, 'breath_test'),
      other_breath_test: getAnswerByRef(answers, 'other_breath_test'),

      // Witness Information
      any_witness: getAnswerByRef(answers, 'any_witness'),
      witness_contact_information: getAnswerByRef(answers, 'witness_contact_information'),

      // Additional Information
      anything_else: getAnswerByRef(answers, 'anything_else'),
      call_recovery: getAnswerByRef(answers, 'call_recovery'),
      upgrade_to_premium: getAnswerByRef(answers, 'upgrade_to_premium'),

      // File URLs
      file_url_documents: getAnswerByRef(answers, 'file_url_documents'),
      file_url_documents_1: getAnswerByRef(answers, 'file_url_documents_1'),
      file_url_record_detailed_account_of_what_happened: getAnswerByRef(answers, 'file_url_record_detailed_account_of_what_happened'),
      file_url_what3words: getAnswerByRef(answers, 'file_url_what3words'),
      file_url_scene_overview: getAnswerByRef(answers, 'file_url_scene_overview'),
      file_url_scene_overview_1: getAnswerByRef(answers, 'file_url_scene_overview_1'),
      file_url_other_vehicle: getAnswerByRef(answers, 'file_url_other_vehicle'),
      file_url_other_vehicle_1: getAnswerByRef(answers, 'file_url_other_vehicle_1'),
      file_url_vehicle_damage: getAnswerByRef(answers, 'file_url_vehicle_damage'),
      file_url_vehicle_damage_1: getAnswerByRef(answers, 'file_url_vehicle_damage_1'),
      file_url_vehicle_damage_2: getAnswerByRef(answers, 'file_url_vehicle_damage_2')
    };

    // Remove null/undefined values
    Object.keys(incidentData).forEach(key => {
      if (incidentData[key] === null || incidentData[key] === undefined) {
        delete incidentData[key];
      }
    });

    console.log(`\n📊 Incident data: ${Object.keys(incidentData).length} fields`);

    logger.info(`[${requestId}] Inserting incident data with ${Object.keys(incidentData).length} fields`);

    console.log(`💾 Inserting into Supabase incident_reports table...`);

    // Insert into incident_reports table
    const { data, error } = await supabase
      .from('incident_reports')
      .insert([incidentData])
      .select();

    if (error) {
      console.log(`❌ Database insertion failed:`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Message: ${error.message}`);

      logger.error(`[${requestId}] Error inserting incident_reports`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log(`✅ Incident report inserted successfully`);
    if (data && data[0]) {
      console.log(`   🆔 Report ID: ${data[0].id || 'N/A'}`);
    }

    logger.info(`[${requestId}] Incident report processed successfully`);

    return {
      table: 'incident_reports',
      user_id: userId || token,
      report_id: data[0]?.id,
      status: 'success'
    };

  } catch (error) {
    console.log(`❌ Incident report processing failed:`);
    console.log(`   Error: ${error.message}`);

    logger.error(`[${requestId}] Error processing incident report`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Update account status
 * ENHANCED: Better status update logging
 */
async function updateAccountStatus(userId, status, requestId) {
  try {
    console.log(`   Setting status to: ${status}`);

    const { error } = await supabase
      .from('user_signup')
      .update({
        account_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', userId);

    if (error) {
      console.log(`   ⚠️  Status update failed: ${error.message}`);

      // Check if it's a column missing error (non-critical)
      if (error.message.includes('account_status')) {
        console.log(`   💡 Note: account_status column may not exist (non-critical)`);
      }

      logger.warn(`[${requestId}] Error updating account status (non-critical)`, {
        error: error.message
      });
    } else {
      console.log(`   ✅ Account status updated to: ${status}`);
      logger.info(`[${requestId}] Account status updated to: ${status}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Status update exception: ${error.message}`);
    logger.warn(`[${requestId}] Error in updateAccountStatus (non-critical)`, {
      error: error.message
    });
  }
}

/**
 * Store webhook audit trail
 * ENHANCED: Better audit logging visibility
 */
async function storeWebhookAudit(eventId, eventType, formResponse, requestId) {
  try {
    const auditData = {
      event_type: 'typeform_webhook',
      event_id: eventId,
      user_id: formResponse.hidden?.auth_user_id || formResponse.token,
      action: eventType,
      details: {
        form_id: formResponse.form_id,
        form_title: formResponse.definition?.title,
        submitted_at: formResponse.submitted_at
      },
      metadata: formResponse,
      created_at: new Date().toISOString()
    };

    console.log(`   Event: ${eventId}`);
    console.log(`   User: ${auditData.user_id}`);

    // Store in audit_logs table for GDPR compliance
    const { error } = await supabase
      .from('audit_logs')
      .insert([auditData]);

    if (error) {
      // Don't fail webhook if audit log fails (non-critical)
      console.log(`   ⚠️  Audit log failed: ${error.message}`);

      // Check if it's a table missing error
      if (error.message.includes('audit_logs')) {
        console.log(`   💡 Note: audit_logs table may not exist (non-critical)`);
      }

      logger.warn(`[${requestId}] Could not store audit log (non-critical)`, {
        error: error.message
      });
    } else {
      console.log(`   ✅ Audit log stored successfully`);
      logger.info(`[${requestId}] Audit log stored successfully`);
    }
  } catch (error) {
    console.log(`   ⚠️  Audit storage exception: ${error.message}`);
    logger.warn(`[${requestId}] Error storing audit (non-critical)`, {
      error: error.message
    });
  }
}

/**
 * Test webhook endpoint
 */
async function testWebhook(req, res) {
  const requestId = req.id || crypto.randomBytes(8).toString('hex');

  console.log('\n🧪 Test webhook endpoint called');
  logger.info(`[${requestId}] Test webhook called`);

  return res.status(200).json({
    success: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
    requestId,
    raw_body_capture: !!req.rawBody,
    signature_encoding: 'base64',
    configuration: {
      supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      webhook_secret_configured: !!process.env.TYPEFORM_WEBHOOK_SECRET
    }
  });
}

module.exports = {
  handleTypeformWebhook,
  testWebhook,
  verifyTypeformSignature,
  processUserSignup,
  processIncidentReport
};