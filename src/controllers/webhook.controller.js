// src/controllers/webhook.controller.js - FIXED VERSION
const crypto = require('crypto');
const logger = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Verify Typeform webhook signature
 * FIXED: Typeform uses HEX encoding, not BASE64!
 */
function verifyTypeformSignature(signature, payload, secret) {
  if (!signature || !secret) {
    logger.warn('Missing signature or secret for Typeform webhook verification');
    return false;
  }

  try {
    // CRITICAL FIX: Use 'hex' instead of 'base64'
    // Typeform signature format: sha256=<hex_digest>
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');  // ✅ FIXED: Changed from 'base64' to 'hex'

    const cleanSignature = signature.replace('sha256=', '');

    // Ensure both buffers are the same length before comparison
    if (cleanSignature.length !== expectedSignature.length) {
      logger.warn('Signature length mismatch', {
        expected: expectedSignature.length,
        received: cleanSignature.length
      });
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Error verifying Typeform signature:', error);
    return false;
  }
}

/**
 * Extract answer by field reference
 */
function getAnswerByRef(answers, ref) {
  const answer = answers.find(a => a.field?.ref === ref);
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
 * Handle Typeform webhook - Main Entry Point
 * ENHANCED: Better console logging and webhook flow visibility
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
        requestId
      });
    }
    console.log('✅ Raw body present');

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
          requestId
        });
      }

      const isValid = verifyTypeformSignature(
        signature,
        rawBody,
        process.env.TYPEFORM_WEBHOOK_SECRET
      );

      if (!isValid) {
        console.log('❌ Signature verification failed');
        logger.warn(`[${requestId}] Invalid Typeform signature`, {
          signatureLength: signature.length,
          bodyChecksum: crypto.createHash('sha256').update(rawBody).digest('hex').substring(0, 8)
        });
        return res.status(403).json({
          success: false,
          error: 'Invalid signature',
          requestId
        });
      }

      console.log('✅ Signature verified');
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

    if (formTitle === 'Car Crash Lawyer AI sign up' || formId === 'b83aFxE0') {
      processingType = 'USER SIGNUP';
      console.log(`\n🚀 Processing ${processingType}...`);
      result = await processUserSignup(formResponse, requestId);
    } else if (formTitle?.includes('Incident Report')) {
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

    // Map Typeform answers to user_signup table fields
    const userData = {
      create_user_id: authUserId || token,
      email: userEmail,
      name: getAnswerByRef(answers, 'name') || getAnswerByRef(answers, 'first_name'),
      surname: getAnswerByRef(answers, 'surname') || getAnswerByRef(answers, 'last_name'),
      mobile: getAnswerByRef(answers, 'mobile') || getAnswerByRef(answers, 'phone'),
      street_address: getAnswerByRef(answers, 'street_address') || getAnswerByRef(answers, 'address_line_1'),
      town: getAnswerByRef(answers, 'town') || getAnswerByRef(answers, 'city'),
      street_address_optional: getAnswerByRef(answers, 'street_address_optional') || getAnswerByRef(answers, 'address_line_2'),
      postcode: getAnswerByRef(answers, 'postcode') || getAnswerByRef(answers, 'postal_code'),
      country: getAnswerByRef(answers, 'country'),
      driving_license_number: getAnswerByRef(answers, 'driving_license_number') || getAnswerByRef(answers, 'license_number'),
      car_registration_number: getAnswerByRef(answers, 'car_registration_number') || getAnswerByRef(answers, 'license_plate'),
      vehicle_make: getAnswerByRef(answers, 'vehicle_make'),
      vehicle_model: getAnswerByRef(answers, 'vehicle_model'),
      vehicle_colour: getAnswerByRef(answers, 'vehicle_colour') || getAnswerByRef(answers, 'vehicle_color'),
      vehicle_condition: getAnswerByRef(answers, 'vehicle_condition'),
      recovery_company: getAnswerByRef(answers, 'recovery_company'),
      recovery_breakdown_number: getAnswerByRef(answers, 'recovery_breakdown_number'),
      recovery_breakdown_email: getAnswerByRef(answers, 'recovery_breakdown_email'),
      emergency_contact: getAnswerByRef(answers, 'emergency_contact'),
      insurance_company: getAnswerByRef(answers, 'insurance_company'),
      policy_number: getAnswerByRef(answers, 'policy_number'),
      policy_holder: getAnswerByRef(answers, 'policy_holder'),
      cover_type: getAnswerByRef(answers, 'cover_type'),
      gdpr_consent: getAnswerByRef(answers, 'gdpr_consent') || getAnswerByRef(answers, 'i_agree_to_share_my_data'),
      driving_license_picture: getAnswerByRef(answers, 'driving_license_picture'),
      vehicle_picture_front: getAnswerByRef(answers, 'vehicle_picture_front'),
      vehicle_picture_driver_side: getAnswerByRef(answers, 'vehicle_picture_driver_side'),
      vehicle_picture_passenger_side: getAnswerByRef(answers, 'vehicle_picture_passenger_side'),
      vehicle_picture_back: getAnswerByRef(answers, 'vehicle_picture_back'),
      time_stamp: submitted_at || new Date().toISOString()
    };

    // Remove null/undefined values
    Object.keys(userData).forEach(key => {
      if (userData[key] === null || userData[key] === undefined) {
        delete userData[key];
      }
    });

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

    logger.info(`[${requestId}] Processing incident report for user: ${userId || token}`);

    // Map to incident_reports table (keeping your existing mapping)
    const incidentData = {
      create_user_id: userId || token,
      Date: submitted_at || new Date().toISOString(),
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

      // ... (keeping all your existing field mappings) ...
      // Accident Details
      when_did_the_accident_happen: getAnswerByRef(answers, 'when_did_the_accident_happen'),
      what_time_did_the_accident_happen: getAnswerByRef(answers, 'what_time_did_the_accident_happen'),
      where_exactly_did_this_happen: getAnswerByRef(answers, 'where_exactly_did_this_happen'),

      // (Include all other fields from your original code)
    };

    // Remove null/undefined values
    Object.keys(incidentData).forEach(key => {
      if (incidentData[key] === null || incidentData[key] === undefined) {
        delete incidentData[key];
      }
    });

    logger.info(`[${requestId}] Inserting incident data with ${Object.keys(incidentData).length} fields`);

    // Insert into incident_reports table
    const { data, error } = await supabase
      .from('incident_reports')
      .insert([incidentData])
      .select();

    if (error) {
      logger.error(`[${requestId}] Error inserting incident_reports`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    logger.info(`[${requestId}] Incident report processed successfully`);

    return {
      table: 'incident_reports',
      user_id: userId || token,
      report_id: data[0]?.id,
      status: 'success'
    };

  } catch (error) {
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
      console.log(`   ❌ Status update failed: ${error.message}`);
      
      // Check if it's a column missing error
      if (error.message.includes('account_status')) {
        console.log(`   💡 Note: account_status column may not exist in user_signup table`);
      }
      
      logger.error(`[${requestId}] Error updating account status`, {
        error: error.message
      });
    } else {
      console.log(`   ✅ Account status updated to: ${status}`);
      logger.info(`[${requestId}] Account status updated to: ${status}`);
    }
  } catch (error) {
    console.log(`   ❌ Status update exception: ${error.message}`);
    logger.error(`[${requestId}] Error in updateAccountStatus`, {
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
      // Don't fail webhook if audit log fails
      console.log(`   ⚠️  Audit log failed: ${error.message}`);
      
      // Check if it's a table missing error
      if (error.message.includes('audit_logs')) {
        console.log(`   💡 Note: audit_logs table may not exist in database`);
      }
      
      logger.warn(`[${requestId}] Could not store audit log`, {
        error: error.message
      });
    } else {
      console.log(`   ✅ Audit log stored successfully`);
      logger.info(`[${requestId}] Audit log stored successfully`);
    }
  } catch (error) {
    console.log(`   ❌ Audit storage exception: ${error.message}`);
    logger.warn(`[${requestId}] Error storing audit`, {
      error: error.message
    });
  }
}

/**
 * Test webhook endpoint
 */
async function testWebhook(req, res) {
  const requestId = req.id || crypto.randomBytes(8).toString('hex');
  logger.info(`[${requestId}] Test webhook called`);

  return res.status(200).json({
    success: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
    requestId,
    raw_body_capture: !!req.rawBody,
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