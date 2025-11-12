
/**
 * PDF Controller for Car Crash Lawyer AI
 * Handles PDF generation, status checking, and downloads
 */

const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const gdprService = require('../services/gdprService');
const { createClient } = require('@supabase/supabase-js');

// Import PDF generation modules with error handling
let fetchAllData, generatePDF, sendEmails;
try {
  fetchAllData = require('../../lib/data/dataFetcher').fetchAllData;
  generatePDF = require('../../lib/pdfGenerator').generatePDF; // Legacy fallback implementation
  sendEmails = require('../../lib/generators/emailService').sendEmails;
} catch (error) {
  logger.warn('PDF generation modules not found - PDF features will be disabled', error.message);
}

// Import Adobe REST API Form Filler Service (validated with 43-field whitelist)
const adobeRestFormFiller = require('../services/adobeRestFormFiller');

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
 * Prepare form data for Adobe REST API
 * Converts nested allData structure to flat key-value pairs
 */
function prepareFormDataForRestAPI(allData) {
  const formData = {};

  // Map user_signup data to PDF fields
  if (allData.user) {
    const user = allData.user;

    // Personal Details
    formData.name = user.name;
    formData.surname = user.surname;
    formData.email = user.driver_email || user.email;
    formData.mobile = user.mobile;
    formData.street = user.street_address;
    formData.town = user.town;
    formData.postcode = user.postcode;
    formData.country = user.country;
    formData.date_of_birth = user.date_of_birth;

    // Emergency Contact
    if (user.emergency_contact) {
      const parts = user.emergency_contact.split('|').map(p => p.trim());
      formData.emergency_contact_name = parts[0] || '';
      formData.emergency_contact_number = parts[1] || '';
    }

    // Vehicle Details
    formData.driving_license_number = user.driving_license_number;
    formData.car_registration_number = user.car_registration_number;
    formData.vehicle_make = user.vehicle_make;
    formData.vehicle_model = user.vehicle_model;
    formData.vehicle_colour = user.vehicle_colour;
    formData.vehicle_condition = user.vehicle_condition;

    // Recovery Details
    formData.recovery_company = user.recovery_company;
    formData.recovery_breakdown_number = user.recovery_breakdown_number;
    formData.recovery_breakdown_email = user.recovery_breakdown_email;

    // Insurance Details
    formData.insurance_company = user.insurance_company;
    formData.policy_number = user.policy_number;
    formData.policy_holder = user.policy_holder;
    formData.cover_type = user.cover_type;

    formData.time_stamp = new Date().toISOString();
  }

  // Map incident_reports data to PDF fields
  if (allData.incident) {
    const incident = allData.incident;

    // Medical Information
    formData.medical_attention_needed = incident.medical_attention_needed;
    formData.medical_symptom_chest_pain = incident.medical_symptom_chest_pain;
    formData.medical_symptom_breathlessness = incident.medical_symptom_breathlessness;
    formData.medical_symptom_severe_headache = incident.medical_symptom_severe_headache;
    formData.medical_symptom_limb_pain_mobility = incident.medical_symptom_limb_pain_mobility;
    formData.medical_symptom_loss_of_consciousness = incident.medical_symptom_loss_of_consciousness;
    formData.medical_symptom_uncontrolled_bleeding = incident.medical_symptom_uncontrolled_bleeding;
    formData.medical_symptom_limb_weakness = incident.medical_symptom_limb_weakness;
    formData.medical_symptom_dizziness = incident.medical_symptom_dizziness;
    formData.medical_symptom_change_in_vision = incident.medical_symptom_change_in_vision;
    formData.medical_symptom_abdominal_pain = incident.medical_symptom_abdominal_pain;
    formData.medical_symptom_abdominal_bruising = incident.medical_symptom_abdominal_bruising;

    // Accident Details
    formData.accident_date = incident.accident_date;
    formData.accident_time = incident.accident_time;
    formData.location = incident.location;
    formData.what3words = incident.what3words;
    formData.nearest_landmark = incident.nearest_landmark;

    // Weather Conditions
    formData.weather_clear = incident.weather_clear;
    formData.weather_bright_sunlight = incident.weather_bright_sunlight;
    formData.weather_cloudy = incident.weather_cloudy;
    formData.weather_raining = incident.weather_raining;
    formData.weather_heavy_rain = incident.weather_heavy_rain;
    formData.weather_drizzle = incident.weather_drizzle;
    formData.weather_fog = incident.weather_fog;
    formData.weather_snow = incident.weather_snow;
    formData.weather_ice = incident.weather_ice;
    formData.weather_windy = incident.weather_windy;
    formData.weather_hail = incident.weather_hail;
    formData.weather_thunder_lightning = incident.weather_thunder_lightning;

    // Road Conditions
    formData.road_condition_dry = incident.road_condition_dry;
    formData.road_condition_wet = incident.road_condition_wet;
    formData.road_condition_icy = incident.road_condition_icy;
    formData.road_condition_snow_covered = incident.road_condition_snow_covered;
    formData.road_condition_loose_surface = incident.road_condition_loose_surface;
    formData.road_condition_slush_on_road = incident.road_condition_slush_on_road;

    // Road Type
    formData.road_type_motorway = incident.road_type_motorway;
    formData.road_type_a_road = incident.road_type_a_road;
    formData.road_type_b_road = incident.road_type_b_road;
    formData.road_type_urban_street = incident.road_type_urban_street;
    formData.road_type_rural_road = incident.road_type_rural_road;
    formData.road_type_car_park = incident.road_type_car_park;
    formData.road_type_private_road = incident.road_type_private_road;

    // Speed and Traffic
    formData.speed_limit = incident.speed_limit;
    formData.your_speed = incident.your_speed;
    formData.traffic_conditions_heavy = incident.traffic_conditions_heavy;
    formData.traffic_conditions_moderate = incident.traffic_conditions_moderate;
    formData.traffic_conditions_light = incident.traffic_conditions_light;
    formData.traffic_conditions_no_traffic = incident.traffic_conditions_no_traffic;

    // Visibility
    formData.visibility_good = incident.visibility_good;
    formData.visibility_poor = incident.visibility_poor;
    formData.visibility_very_poor = incident.visibility_very_poor;
    formData.visibility_street_lights = incident.visibility_street_lights;
    formData.visibility_clear = incident.visibility_clear;
    formData.visibility_restricted_structure = incident.visibility_restricted_structure;
    formData.visibility_restricted_bend = incident.visibility_restricted_bend;
    formData.visibility_large_vehicle = incident.visibility_large_vehicle;
    formData.visibility_sun_glare = incident.visibility_sun_glare;

    // Junction Details
    formData.junction_type = incident.junction_type;
    formData.junction_control = incident.junction_control;
    formData.traffic_light_status = incident.traffic_light_status;
    formData.user_manoeuvre = incident.user_manoeuvre;

    // Special Conditions
    formData.special_condition_roadworks = incident.special_condition_roadworks;
    formData.special_condition_workmen = incident.special_condition_workmen;
    formData.special_condition_cyclists = incident.special_condition_cyclists;
    formData.special_condition_pedestrians = incident.special_condition_pedestrians;
    formData.special_condition_traffic_calming = incident.special_condition_traffic_calming;
    formData.special_condition_parked_vehicles = incident.special_condition_parked_vehicles;
    formData.special_condition_crossing = incident.special_condition_crossing;
    formData.special_condition_school_zone = incident.special_condition_school_zone;
    formData.special_condition_narrow_road = incident.special_condition_narrow_road;
    formData.special_condition_potholes = incident.special_condition_potholes;
    formData.special_condition_oil_spills = incident.special_condition_oil_spills;
    formData.special_condition_animals = incident.special_condition_animals;

    // Vehicle Damage
    formData.no_damage = incident.no_damage;
    formData.impact_point_front = incident.impact_point_front;
    formData.impact_point_front_driver = incident.impact_point_front_driver;
    formData.impact_point_front_passenger = incident.impact_point_front_passenger;
    formData.impact_point_driver_side = incident.impact_point_driver_side;
    formData.impact_point_passenger_side = incident.impact_point_passenger_side;
    formData.impact_point_rear_driver = incident.impact_point_rear_driver;
    formData.impact_point_rear_passenger = incident.impact_point_rear_passenger;
    formData.impact_point_rear = incident.impact_point_rear;
    formData.impact_point_roof = incident.impact_point_roof;
    formData.impact_point_undercarriage = incident.impact_point_undercarriage;
    formData.damage_to_your_vehicle = incident.damage_to_your_vehicle;
    formData.vehicle_driveable = incident.vehicle_driveable;

    // Other Vehicle
    formData.other_full_name = incident.other_full_name;
    formData.other_contact_number = incident.other_contact_number;
    formData.other_email_address = incident.other_email_address;
    formData.other_vehicle_registration = incident.other_vehicle_registration;
    formData.other_drivers_insurance_company = incident.other_drivers_insurance_company;
    formData.other_drivers_policy_number = incident.other_drivers_policy_number;
    formData.other_drivers_policy_holder_name = incident.other_drivers_policy_holder_name;
    formData.other_drivers_policy_cover_type = incident.other_drivers_policy_cover_type;
    formData.describe_damage_to_vehicle = incident.describe_damage_to_vehicle;
    formData.no_visible_damage = incident.no_visible_damage;

    // Witnesses
    formData.witnesses_present = incident.witnesses_present;
    formData.witness_name = incident.witness_name;
    formData.witness_mobile_number = incident.witness_mobile_number;
    formData.witness_email_address = incident.witness_email_address;
    formData.witness_statement = incident.witness_statement;

    // Police
    formData.police_attended = incident.police_attended;
    formData.accident_ref_number = incident.accident_ref_number;
    formData.police_force = incident.police_force;
    formData.officer_name = incident.officer_name;
    formData.officer_badge = incident.officer_badge;
    formData.user_breath_test = incident.user_breath_test;
    formData.other_breath_test = incident.other_breath_test;

    // Safety Equipment
    formData.airbags_deployed = incident.airbags_deployed;
    formData.seatbelts_worn = incident.seatbelts_worn;
    formData.seatbelt_reason = incident.seatbelt_reason;
  }

  return formData;
}

/**
 * Store completed form
 */
async function storeCompletedForm(createUserId, pdfBuffer, allData) {
  try {
    const pdfBase64 = pdfBuffer.toString('base64');
    const fileName = `completed_forms/${createUserId}/report_${Date.now()}.pdf`;

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
      logger.error('Error storing completed form', error);
    }

    return data || { id: `temp-${Date.now()}` };
  } catch (error) {
    logger.error('Error in storeCompletedForm', error);
    return { id: `error-${Date.now()}` };
  }
}

/**
 * Generate user PDF (shared function)
 */
async function generateUserPDF(create_user_id, source = 'direct') {
  logger.info(`Starting PDF generation (${source})`, { userId: create_user_id });

  const validation = validateUserId(create_user_id);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  await gdprService.logActivity(create_user_id, 'PDF_GENERATION', {
    type: 'complete_report',
    source: source
  });

  const allData = await fetchAllData(create_user_id);

  if (!allData.user || !allData.user.driver_email) {
    throw new Error('User not found or missing email');
  }

  const [
    { data: aiTranscription },
    { data: aiSummary }
  ] = await Promise.all([
    supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', create_user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('ai_summary')
      .select('*')
      .eq('create_user_id', create_user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
  ]);

  if (aiTranscription) allData.aiTranscription = aiTranscription;
  if (aiSummary) allData.aiSummary = aiSummary;

  // Try to use Adobe REST API Form Filler first (validated with 43-field whitelist)
  let pdfBuffer;
  if (adobeRestFormFiller.isReady()) {
    logger.info('📄 Using Adobe REST API Form Filler (validated with 43-field whitelist)');
    try {
      // Prepare flat form data for REST API
      const formData = prepareFormDataForRestAPI(allData);
      logger.info(`  Prepared ${Object.keys(formData).length} fields for Adobe REST API`);

      // Fill form using validated REST API service
      pdfBuffer = await adobeRestFormFiller.fillForm(formData);

      logger.success('✅ Adobe REST API form filled successfully (zero validation errors expected)');
    } catch (adobeError) {
      logger.error('Adobe REST API filling failed, falling back to legacy method:', adobeError);
      pdfBuffer = await generatePDF(allData);
    }
  } else {
    logger.info('📄 Adobe REST API not configured, using legacy PDF generation method');
    pdfBuffer = await generatePDF(allData);
  }

  const storedForm = await storeCompletedForm(create_user_id, pdfBuffer, allData);
  const emailResult = await sendEmails(allData.user.driver_email, pdfBuffer, create_user_id);

  if (storedForm.id && !storedForm.id.startsWith('temp-') && !storedForm.id.startsWith('error-')) {
    await supabase
      .from('completed_incident_forms')
      .update({
        sent_to_user: emailResult.success,
        sent_to_accounts: emailResult.success,
        email_status: emailResult
      })
      .eq('id', storedForm.id);
  }

  logger.success('PDF generation process completed');

  return {
    success: true,
    form_id: storedForm.id,
    create_user_id,
    email_sent: emailResult.success,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate PDF
 * POST /api/pdf/generate
 */
async function generatePdf(req, res) {
  const { create_user_id } = req.body;

  if (!create_user_id) {
    return sendError(res, 400, 'Missing create_user_id', 'MISSING_USER_ID');
  }

  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  if (!fetchAllData || !generatePDF || !sendEmails) {
    return sendError(res, 503, 'PDF generation modules not available', 'PDF_UNAVAILABLE');
  }

  try {
    const result = await generateUserPDF(create_user_id, 'direct');
    res.json(result);
  } catch (error) {
    logger.error('Error in PDF generation', error);
    sendError(res, 500, error.message, 'PDF_GENERATION_FAILED');
  }
}

/**
 * PDF status
 * GET /api/pdf/status/:userId
 */
async function getPdfStatus(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('completed_incident_forms')
      .select('id, generated_at, sent_to_user, email_status')
      .eq('create_user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.json({
        status: 'not_found',
        message: 'No PDF generation found for this user',
        requestId: req.requestId
      });
    }

    res.json({
      status: 'completed',
      generated_at: data.generated_at,
      sent: data.sent_to_user,
      email_status: data.email_status,
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error checking PDF status', error);
    sendError(res, 500, 'Failed to check status', 'STATUS_CHECK_FAILED');
  }
}

/**
 * Download PDF
 * GET /api/pdf/download/:userId
 */
async function downloadPdf(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('completed_incident_forms')
      .select('pdf_url, pdf_base64')
      .eq('create_user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return sendError(res, 404, 'PDF not found', 'PDF_NOT_FOUND');
    }

    await gdprService.logActivity(userId, 'PDF_DOWNLOADED', {}, req);

    if (data.pdf_url) {
      res.redirect(data.pdf_url);
    } else if (data.pdf_base64) {
      const buffer = Buffer.from(data.pdf_base64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report_${userId}.pdf"`);
      res.send(buffer);
    } else {
      sendError(res, 404, 'PDF data not available', 'PDF_DATA_MISSING');
    }
  } catch (error) {
    logger.error('Error downloading PDF', error);
    sendError(res, 500, 'Failed to download PDF', 'DOWNLOAD_FAILED');
  }
}

module.exports = {
  generatePdf,
  getPdfStatus,
  downloadPdf
};
