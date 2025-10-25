// src/controllers/webhook.controller.js - FIXED COMPLETE VERSION
const crypto = require('crypto');
const logger = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');
const { normalizeEmailFields } = require('../utils/emailNormalizer');

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
        // Normalize title: lowercase, remove punctuation, convert spaces to underscores
        const normalizedTitle = field.title.toLowerCase()
          .replace(/\(optional\)/gi, '_optional')  // Handle (optional) first
          .replace(/[:.;?!]/g, '')                  // Remove common punctuation
          .replace(/\s+/g, '_')                     // Replace spaces with underscore
          .replace(/_+/g, '_')                      // Replace multiple underscores with single
          .replace(/^_|_$/g, '')                    // Remove leading/trailing underscores
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
 * Get answer with boolean default handling
 * For boolean fields: returns false if answer not found (checkbox was shown but unchecked)
 * For other fields: returns null if answer not found
 *
 * @param {Array} answers - Typeform answers array
 * @param {string} ref - Field reference ID
 * @param {string} fieldType - Field type ('boolean', 'text', etc.)
 * @returns {*} The answer value, false for unchecked booleans, or null
 */
function getAnswerByRefWithDefault(answers, ref, fieldType = 'text') {
  const answer = answers.find(a => a.field?.ref === ref);
  const value = extractAnswerValue(answer);

  // For boolean fields, null means "unchecked" → return false
  // This ensures unchecked checkboxes are saved as false, not deleted as null
  if (fieldType === 'boolean' && value === null) {
    return false;
  }

  return value;
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
      // Use V2 if available, fallback to V1
      const imageProcessor = req.app.locals.imageProcessorV2 || req.app.locals.imageProcessor;
      processWebhookAsync(event_id, event_type, form_response, requestId, imageProcessor).catch(error => {
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
async function processWebhookAsync(eventId, eventType, formResponse, requestId, imageProcessor = null) {
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
      result = await processUserSignup(formResponse, requestId, imageProcessor);
    } else if (normalizedTitle?.includes('Incident Report') || formId === 'WvM2ejru') {
      processingType = 'INCIDENT REPORT';
      console.log(`\n🚀 Processing ${processingType}...`);
      result = await processIncidentReport(formResponse, requestId, imageProcessor);
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
 * ENHANCED: Better signup processing visibility + image processing
 */
async function processUserSignup(formResponse, requestId, imageProcessor = null) {
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

      // ✅ HIDDEN FIELDS (from URL parameters sent by signup-auth.html)
      form_id: formResponse.form_id,          // Form ID (critical for tracking which form)
      product_id: productId,                   // Product identifier
      auth_code: authCode,                     // Server-minted nonce for security

      // User Information
      name: getAnswerByTitle(answers, titleMap, 'name'),
      surname: getAnswerByTitle(answers, titleMap, 'surname'),
      mobile: getAnswerByTitle(answers, titleMap, 'mobile'),

      // Address
      street_address: getAnswerByTitle(answers, titleMap, 'street_address'),
      town: getAnswerByTitle(answers, titleMap, 'town'),
      street_address_optional: getAnswerByTitle(answers, titleMap, 'street_address_optional'),
      postcode: getAnswerByTitle(answers, titleMap, 'postcode'),
      country: getAnswerByTitle(answers, titleMap, 'country'),

      // Driving & Vehicle
      driving_license_number: getAnswerByTitle(answers, titleMap, 'driving_license_number'),
      car_registration_number: getAnswerByTitle(answers, titleMap, 'car_registration_number'),
      vehicle_make: getAnswerByTitle(answers, titleMap, 'vehicle_make'),
      vehicle_model: getAnswerByTitle(answers, titleMap, 'vehicle_model'),
      vehicle_colour: getAnswerByTitle(answers, titleMap, 'vehicle_colour'),
      vehicle_condition: getAnswerByTitle(answers, titleMap, 'vehicle_condition'),

      // Recovery & Emergency
      recovery_company: getAnswerByTitle(answers, titleMap, 'recovery_company'),
      recovery_breakdown_number: getAnswerByTitle(answers, titleMap, 'recovery_breakdown_number'),
      recovery_breakdown_email: getAnswerByTitle(answers, titleMap, 'recovery_breakdown_email'),
      emergency_contact: emergencyContactString,

      // Insurance
      insurance_company: getAnswerByTitle(answers, titleMap, 'insurance_company'),
      policy_number: getAnswerByTitle(answers, titleMap, 'policy_number'),
      policy_holder: getAnswerByTitle(answers, titleMap, 'policy_holder'),
      cover_type: getAnswerByTitle(answers, titleMap, 'cover_type'),

      // Legal & Images
      gdpr_consent: getAnswerByTitle(answers, titleMap, 'do_you_agree_to_share_this_data_for_legal_support'),
      driving_license_picture: getAnswerByTitle(answers, titleMap, 'please_upload_a_picture_of_your_driving_license'),
      vehicle_picture_front: getAnswerByTitle(answers, titleMap, 'front_image_of_your_vehicle'),
      vehicle_picture_driver_side: getAnswerByTitle(answers, titleMap, 'driver_side_image_of_your_vehicle'),
      vehicle_picture_passenger_side: getAnswerByTitle(answers, titleMap, 'passenger_side_image_of_your_vehicle'),
      vehicle_picture_back: getAnswerByTitle(answers, titleMap, 'back_image_of_your_vehicle'),

      // Metadata
      time_stamp: submitted_at || new Date().toISOString()
    };

    // 🔍 DEBUG: Show userData BEFORE null cleanup
    console.log(`\n🔍 DEBUG: userData object BEFORE null cleanup (${Object.keys(userData).length} keys):`);
    console.log(JSON.stringify(userData, null, 2));

    // ==================== IMAGE PROCESSING ====================
    // Process images: download from Typeform and upload to Supabase Storage
    if (imageProcessor) {
      console.log(`\n📸 IMAGE PROCESSING`);
      console.log('-'.repeat(60));

      const imageFields = {
        driving_license_picture: userData.driving_license_picture,
        vehicle_picture_front: userData.vehicle_picture_front,
        vehicle_picture_driver_side: userData.vehicle_picture_driver_side,
        vehicle_picture_passenger_side: userData.vehicle_picture_passenger_side,
        vehicle_picture_back: userData.vehicle_picture_back
      };

      // Filter out null/undefined URLs
      const validImageUrls = {};
      Object.entries(imageFields).forEach(([key, url]) => {
        if (url && url.startsWith('http')) {
          validImageUrls[key] = url;
        }
      });

      if (Object.keys(validImageUrls).length > 0) {
        console.log(`   Found ${Object.keys(validImageUrls).length} images to process`);
        console.log(`   User ID: ${authUserId || token}`);

        try {
          // imageProcessor parameter is already V2 with fallback to V1 (set in line 333)
          const processedImages = await imageProcessor.processMultipleImages(
            validImageUrls,
            authUserId || token,
            {
              documentCategory: 'user_signup',
              sourceId: formResponse.form_id,
              sourceField: 'user_signup_images'
            }
          );

          // Base URL for API (use env var or default to Replit URL)
          const baseUrl = process.env.APP_URL || process.env.BASE_URL || 'https://nodejs-1-ring120768.replit.app';

          // Replace Typeform URLs with permanent API download URLs
          Object.entries(processedImages).forEach(([key, result]) => {
            if (typeof result === 'string') {
              // V1 format - just use storage path (legacy compatibility)
              userData[key] = result;
            } else if (result.documentId) {
              // V2 format - construct permanent API URL
              const apiUrl = `${baseUrl}/api/user-documents/${result.documentId}/download`;
              console.log(`   ✅ ${key}: ${apiUrl}`);
              userData[key] = apiUrl;
            } else {
              // Fallback to storage path if no documentId
              userData[key] = result.storagePath;
            }
          });

          console.log(`   ✅ All images processed successfully`);
        } catch (error) {
          console.log(`   ⚠️  Image processing error (non-critical): ${error.message}`);
          logger.warn(`[${requestId}] Image processing failed (keeping original URLs)`, {
            error: error.message
          });
          // Keep original Typeform URLs as fallback
        }
      } else {
        console.log(`   No images to process`);
      }

      console.log('-'.repeat(60));
    } else {
      console.log(`\n⚠️  Image processor not available - storing Typeform URLs directly`);
    }

    // Remove null/undefined values
    Object.keys(userData).forEach(key => {
      if (userData[key] === null || userData[key] === undefined) {
        delete userData[key];
      }
    });

    // NORMALIZE ALL EMAIL FIELDS (case-insensitive per RFC 5321)
    const emailFields = ['email', 'recovery_breakdown_email'];
    const normalizedUserData = normalizeEmailFields(userData, emailFields);
    Object.assign(userData, normalizedUserData);

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

      // NEW: Update user_documents with association tracking for dual retention
      if (imageProcessor && data[0].id) {
        console.log(`\n🔗 DUAL RETENTION: Updating document associations...`);
        try {
          const { error: updateError } = await supabase
            .from('user_documents')
            .update({
              associated_with: 'user_signup',
              associated_id: data[0].id
            })
            .eq('create_user_id', authUserId || token)
            .eq('document_category', 'user_signup')
            .is('associated_with', null); // Only update records without association

          if (updateError) {
            console.log(`   ⚠️  Document association update failed: ${updateError.message}`);
            logger.warn(`[${requestId}] Could not update document associations (non-critical)`, {
              error: updateError.message
            });
          } else {
            console.log(`   ✅ Document associations updated (linked to user_signup record)`);
            logger.info(`[${requestId}] Document associations updated for user_signup`);
          }
        } catch (error) {
          console.log(`   ⚠️  Document association error: ${error.message}`);
        }
      }
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
      signup_id: data[0]?.id,
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
 * Process Incident Report Form + image processing
 */
async function processIncidentReport(formResponse, requestId, imageProcessor = null) {
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

      // Medical Symptoms (all boolean checkboxes - defaults to false if unchecked)
      medical_chest_pain: getAnswerByRefWithDefault(answers, 'medical_chest_pain', 'boolean'),
      medical_breathlessness: getAnswerByRefWithDefault(answers, 'medical_breathlessness', 'boolean'),
      medical_abdominal_bruising: getAnswerByRefWithDefault(answers, 'medical_abdominal_bruising', 'boolean'),
      medical_uncontrolled_bleeding: getAnswerByRefWithDefault(answers, 'medical_uncontrolled_bleeding', 'boolean'),
      medical_severe_headache: getAnswerByRefWithDefault(answers, 'medical_severe_headache', 'boolean'),
      medical_change_in_vision: getAnswerByRefWithDefault(answers, 'medical_change_in_vision', 'boolean'),
      medical_abdominal_pain: getAnswerByRefWithDefault(answers, 'medical_abdominal_pain', 'boolean'),
      medical_limb_pain: getAnswerByRefWithDefault(answers, 'medical_limb_pain', 'boolean'),
      medical_limb_weakness: getAnswerByRefWithDefault(answers, 'medical_limb_weakness', 'boolean'),
      medical_loss_of_consciousness: getAnswerByRefWithDefault(answers, 'medical_loss_of_consciousness', 'boolean'),
      medical_none_of_these: getAnswerByRefWithDefault(answers, 'medical_none_of_these', 'boolean'),

      // Accident Details
      when_did_the_accident_happen: getAnswerByRef(answers, 'when_did_the_accident_happen'),
      what_time_did_the_accident_happen: getAnswerByRef(answers, 'what_time_did_the_accident_happen'),
      where_exactly_did_this_happen: getAnswerByRef(answers, 'where_exactly_did_this_happen'),

      // Weather Conditions (all boolean checkboxes - defaults to false if unchecked)
      weather_conditions: getAnswerByRef(answers, 'weather_conditions'),
      weather_overcast: getAnswerByRefWithDefault(answers, 'weather_overcast', 'boolean'),
      weather_street_lights: getAnswerByRefWithDefault(answers, 'weather_street_lights', 'boolean'),
      weather_heavy_rain: getAnswerByRefWithDefault(answers, 'weather_heavy_rain', 'boolean'),
      weather_wet_road: getAnswerByRefWithDefault(answers, 'weather_wet_road', 'boolean'),
      weather_fog: getAnswerByRefWithDefault(answers, 'weather_fog', 'boolean'),
      weather_snow_on_road: getAnswerByRefWithDefault(answers, 'weather_snow_on_road', 'boolean'),
      weather_bright_daylight: getAnswerByRefWithDefault(answers, 'weather_bright_daylight', 'boolean'),
      weather_light_rain: getAnswerByRefWithDefault(answers, 'weather_light_rain', 'boolean'),
      weather_clear_and_dry: getAnswerByRefWithDefault(answers, 'weather_clear_and_dry', 'boolean'),
      weather_dusk: getAnswerByRefWithDefault(answers, 'weather_dusk', 'boolean'),
      weather_snow: getAnswerByRefWithDefault(answers, 'weather_snow', 'boolean'),

      // Vehicle Information
      wearing_seatbelts: getAnswerByRef(answers, 'wearing_seatbelts'),
      reason_no_seatbelts: getAnswerByRef(answers, 'reason_no_seatbelts'),
      airbags_deployed: getAnswerByRef(answers, 'airbags_deployed'),
      damage_to_your_vehicle: getAnswerByRef(answers, 'damage_to_your_vehicle'),

      // Road Information
      road_type: getAnswerByRef(answers, 'road_type'),
      speed_limit: getAnswerByRef(answers, 'speed_limit'),
      junction_information: getAnswerByRef(answers, 'junction_information'),
      // Junction types (all boolean checkboxes - defaults to false if unchecked)
      junction_information_roundabout: getAnswerByRefWithDefault(answers, 'junction_information_roundabout', 'boolean'),
      junction_information_t_junction: getAnswerByRefWithDefault(answers, 'junction_information_t_junction', 'boolean'),
      junction_information_traffic_lights: getAnswerByRefWithDefault(answers, 'junction_information_traffic_lights', 'boolean'),
      junction_information_crossroads: getAnswerByRefWithDefault(answers, 'junction_information_crossroads', 'boolean'),

      // Special Conditions (all boolean checkboxes - defaults to false if unchecked)
      special_conditions: getAnswerByRef(answers, 'special_conditions'),
      special_conditions_roadworks: getAnswerByRefWithDefault(answers, 'special_conditions_roadworks', 'boolean'),
      special_conditions_defective_road: getAnswerByRefWithDefault(answers, 'special_conditions_defective_road', 'boolean'),
      special_conditions_oil_spills: getAnswerByRefWithDefault(answers, 'special_conditions_oil_spills', 'boolean'),
      special_conditions_workman: getAnswerByRefWithDefault(answers, 'special_conditions_workman', 'boolean'),
      special_conditions_animals: getAnswerByRefWithDefault(answers, 'special_conditions_animals', 'boolean'),

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

    // ==================== IMAGE PROCESSING ====================
    // Process incident images: download from Typeform and upload to Supabase Storage
    if (imageProcessor) {
      console.log(`\n📸 IMAGE PROCESSING`);
      console.log('-'.repeat(60));

      const imageFields = {
        file_url_documents: incidentData.file_url_documents,
        file_url_documents_1: incidentData.file_url_documents_1,
        file_url_record_detailed_account_of_what_happened: incidentData.file_url_record_detailed_account_of_what_happened,
        file_url_what3words: incidentData.file_url_what3words,
        file_url_scene_overview: incidentData.file_url_scene_overview,
        file_url_scene_overview_1: incidentData.file_url_scene_overview_1,
        file_url_other_vehicle: incidentData.file_url_other_vehicle,
        file_url_other_vehicle_1: incidentData.file_url_other_vehicle_1,
        file_url_vehicle_damage: incidentData.file_url_vehicle_damage,
        file_url_vehicle_damage_1: incidentData.file_url_vehicle_damage_1,
        file_url_vehicle_damage_2: incidentData.file_url_vehicle_damage_2
      };

      // Filter out null/undefined URLs
      const validImageUrls = {};
      Object.entries(imageFields).forEach(([key, url]) => {
        if (url && url.startsWith('http')) {
          validImageUrls[key] = url;
        }
      });

      if (Object.keys(validImageUrls).length > 0) {
        console.log(`   Found ${Object.keys(validImageUrls).length} images to process`);
        console.log(`   User ID: ${userId || token}`);

        try {
          // imageProcessor parameter is already V2 with fallback to V1 (set in line 333)
          const processedImages = await imageProcessor.processMultipleImages(
            validImageUrls,
            userId || token,
            {
              documentCategory: 'incident_report',
              sourceId: formResponse.form_id,
              sourceField: 'incident_images'
            }
          );

          // Base URL for API (use env var or default to Replit URL)
          const baseUrl = process.env.APP_URL || process.env.BASE_URL || 'https://nodejs-1-ring120768.replit.app';

          // Replace Typeform URLs with permanent API download URLs
          Object.entries(processedImages).forEach(([key, result]) => {
            if (typeof result === 'string') {
              // V1 format - just use storage path (legacy compatibility)
              incidentData[key] = result;
            } else if (result.documentId) {
              // V2 format - construct permanent API URL
              const apiUrl = `${baseUrl}/api/user-documents/${result.documentId}/download`;
              console.log(`   ✅ ${key}: ${apiUrl}`);
              incidentData[key] = apiUrl;
            } else {
              // Fallback to storage path if no documentId
              incidentData[key] = result.storagePath;
            }
          });

          console.log(`   ✅ All images processed successfully`);
        } catch (error) {
          console.log(`   ⚠️  Image processing error (non-critical): ${error.message}`);
          logger.warn(`[${requestId}] Image processing failed (keeping original URLs)`, {
            error: error.message
          });
          // Keep original Typeform URLs as fallback
        }
      } else {
        console.log(`   No images to process`);
      }

      console.log('-'.repeat(60));
    } else {
      console.log(`\n⚠️  Image processor not available - storing Typeform URLs directly`);
    }

    // Remove null/undefined values BUT preserve boolean false and empty strings
    // CRITICAL: false is meaningful data (unchecked checkbox), don't delete it!
    Object.keys(incidentData).forEach(key => {
      const value = incidentData[key];

      // Keep boolean false values - they mean "checkbox was shown but unchecked"
      if (value === false) {
        return;  // Don't delete
      }

      // Keep empty strings - they mean "field was shown but not filled"
      if (value === '') {
        return;  // Don't delete
      }

      // Remove only null/undefined (field not in payload or genuinely missing)
      if (value === null || value === undefined) {
        delete incidentData[key];
      }
    });

    // Count boolean fields for debugging
    const booleanFields = Object.keys(incidentData).filter(key =>
      typeof incidentData[key] === 'boolean'
    );
    const trueCount = booleanFields.filter(key => incidentData[key] === true).length;
    const falseCount = booleanFields.filter(key => incidentData[key] === false).length;

    console.log(`\n📊 Incident data: ${Object.keys(incidentData).length} fields`);
    console.log(`   ✅ Boolean fields: ${booleanFields.length} (${trueCount} checked, ${falseCount} unchecked)`);

    logger.info(`[${requestId}] Inserting incident data with ${Object.keys(incidentData).length} fields`, {
      totalFields: Object.keys(incidentData).length,
      booleanFieldsTotal: booleanFields.length,
      booleanChecked: trueCount,
      booleanUnchecked: falseCount
    });

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

      // NEW: Update user_documents with association tracking for dual retention
      if (imageProcessor && data[0].id) {
        console.log(`\n🔗 DUAL RETENTION: Updating document associations...`);
        try {
          const { error: updateError } = await supabase
            .from('user_documents')
            .update({
              associated_with: 'incident_report',
              associated_id: data[0].id
            })
            .eq('create_user_id', userId || token)
            .eq('document_category', 'incident_report')
            .is('associated_with', null); // Only update records without association

          if (updateError) {
            console.log(`   ⚠️  Document association update failed: ${updateError.message}`);
            logger.warn(`[${requestId}] Could not update document associations (non-critical)`, {
              error: updateError.message
            });
          } else {
            console.log(`   ✅ Document associations updated (linked to incident_report)`);
            logger.info(`[${requestId}] Document associations updated for incident_report`);
          }
        } catch (error) {
          console.log(`   ⚠️  Document association error: ${error.message}`);
        }
      }
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