const crypto = require('crypto');
const logger = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Verify Typeform webhook signature
 */
function verifyTypeformSignature(signature, payload, secret) {
  if (!signature || !secret) {
    logger.warn('Missing signature or secret for Typeform webhook verification');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');

    const cleanSignature = signature.replace('sha256=', '');

    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature),
      Buffer.from(expectedSignature)
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
 */
async function handleTypeformWebhook(req, res) {
  const requestId = req.id || crypto.randomBytes(8).toString('hex');

  try {
    logger.info(`[${requestId}] Typeform webhook received`);

    // CRITICAL FIX: Use raw body from Express verify function
    // req.body is already parsed JSON, req.rawBody is the raw string
    const rawBody = req.rawBody;
    const signature = req.headers['typeform-signature'];

    // Verify signature if configured
    if (process.env.TYPEFORM_WEBHOOK_SECRET && signature) {
      const isValid = verifyTypeformSignature(
        signature,
        rawBody,
        process.env.TYPEFORM_WEBHOOK_SECRET
      );

      if (!isValid) {
        logger.warn(`[${requestId}] Invalid Typeform signature`);
        return res.status(401).json({
          success: false,
          error: 'Invalid signature'
        });
      }
      logger.info(`[${requestId}] Signature verified successfully`);
    } else if (process.env.TYPEFORM_WEBHOOK_SECRET && !signature) {
      logger.warn(`[${requestId}] TYPEFORM_WEBHOOK_SECRET set but no signature provided`);
    } else {
      logger.info(`[${requestId}] Signature verification skipped (TYPEFORM_WEBHOOK_SECRET not set)`);
    }

    // Extract webhook data - req.body is already parsed
    const { event_id, event_type, form_response } = req.body;

    if (!event_id || !event_type) {
      logger.warn(`[${requestId}] Missing required webhook fields`);
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: event_id or event_type'
      });
    }

    if (event_type !== 'form_response') {
      logger.info(`[${requestId}] Ignoring event type: ${event_type}`);
      return res.status(200).json({
        success: true,
        message: 'Event type not processed'
      });
    }

    if (!form_response) {
      logger.warn(`[${requestId}] Missing form_response data`);
      return res.status(400).json({
        success: false,
        error: 'Missing form_response data'
      });
    }

    logger.info(`[${requestId}] Processing form: ${form_response.form_id}`);

    // Route to appropriate handler based on form
    let result;
    const formId = form_response.form_id;
    const formTitle = form_response.definition?.title;

    if (formTitle === 'Car Crash Lawyer AI sign up' || formId === 'b83aFxE0') {
      result = await processUserSignup(form_response, requestId);
    } else if (formTitle?.includes('Incident Report')) {
      result = await processIncidentReport(form_response, requestId);
    } else {
      logger.warn(`[${requestId}] Unknown form: ${formTitle} (${formId})`);
      return res.status(200).json({
        success: true,
        message: 'Form not recognized, webhook ignored',
        form_id: formId,
        form_title: formTitle
      });
    }

    // Store raw webhook for audit trail
    await storeWebhookAudit(event_id, event_type, form_response, requestId);

    logger.info(`[${requestId}] Webhook processed successfully`);

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      event_id,
      result
    });

  } catch (error) {
    logger.error(`[${requestId}] Typeform webhook error:`, {
      message: error.message,
      stack: error.stack
    });

    // Always return 200 to prevent Typeform retry storms
    return res.status(200).json({
      success: false,
      error: 'Internal server error',
      message: 'Webhook received but processing failed',
      requestId
    });
  }
}

/**
 * Process User Signup Form
 */
async function processUserSignup(formResponse, requestId) {
  try {
    const { token, hidden, answers, submitted_at } = formResponse;

    // Extract hidden fields
    const authCode = hidden?.auth_code;
    const authUserId = hidden?.auth_user_id;
    const userEmail = hidden?.email;
    const productId = hidden?.product_id;

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

    logger.info(`[${requestId}] Inserting user data with ${Object.keys(userData).length} fields`);

    // Insert to user_signup table
    const { data, error } = await supabase
      .from('user_signup')
      .insert([userData])
      .select();

    if (error) {
      logger.error(`[${requestId}] Error upserting user_signup:`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    logger.info(`[${requestId}] User signup processed successfully`);

    // Update account status if needed
    if (authUserId) {
      await updateAccountStatus(authUserId, 'active', requestId);
    }

    return {
      table: 'user_signup',
      user_id: authUserId || token,
      token: token,
      status: 'success'
    };

  } catch (error) {
    logger.error(`[${requestId}] Error processing user signup:`, error);
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

    // Map to incident_reports table
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
      file_url_vehicle_damage_2: getAnswerByRef(answers, 'file_url_vehicle_damage_2'),
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
      logger.error(`[${requestId}] Error inserting incident_reports:`, {
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
    logger.error(`[${requestId}] Error processing incident report:`, error);
    throw error;
  }
}

/**
 * Update account status
 */
async function updateAccountStatus(userId, status, requestId) {
  try {
    const { error } = await supabase
      .from('user_signup')
      .update({
        account_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', userId);

    if (error) {
      logger.error(`[${requestId}] Error updating account status:`, error);
    } else {
      logger.info(`[${requestId}] Account status updated to: ${status}`);
    }
  } catch (error) {
    logger.error(`[${requestId}] Error in updateAccountStatus:`, error);
  }
}

/**
 * Store webhook audit trail
 */
async function storeWebhookAudit(eventId, eventType, formResponse, requestId) {
  try {
    // Store in audit_logs table for GDPR compliance
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
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
      }]);

    if (error) {
      // Don't fail webhook if audit log fails
      logger.warn(`[${requestId}] Could not store audit log:`, error.message);
    } else {
      logger.info(`[${requestId}] Audit log stored successfully`);
    }
  } catch (error) {
    logger.warn(`[${requestId}] Error storing audit:`, error.message);
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
    supabase_url: process.env.SUPABASE_URL,
    webhook_secret_configured: !!process.env.TYPEFORM_WEBHOOK_SECRET
  });
}

module.exports = {
  handleTypeformWebhook,
  testWebhook,
  verifyTypeformSignature,
  processUserSignup,
  processIncidentReport
};