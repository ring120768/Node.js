
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
let fetchAllData, sendEmails, sendTemplateEmail;
try {
  fetchAllData = require('../../lib/dataFetcher').fetchAllData;
  const emailService = require('../../lib/emailService');
  sendEmails = emailService.sendEmails;
  sendTemplateEmail = emailService.sendTemplateEmail;
} catch (error) {
  logger.warn('PDF generation modules not found - PDF features will be disabled', error.message);
}

// Import PDF Form Filler Service (uses pdf-lib, verified 213/213 field mappings)
const adobePdfFormFillerService = require('../services/adobePdfFormFillerService');

// Import Email Retry Service for reliable email delivery
const emailRetryService = require('../services/emailRetryService');

// Import PDF Queue Service for full regeneration retries
const pdfQueueService = require('../services/pdfQueueService');

// Initialize Supabase client
let supabase = null;
if (config.supabase.url && config.supabase.serviceKey) {
  supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Initialize email retry service with supabase client
  emailRetryService.initialize(supabase);
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
    formData.email = user.email;
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

  // ========================================
  // IMAGE URLS - Map from allData.imageUrls
  // ========================================
  // These were missing after migration to Adobe REST API
  // Original implementation in adobePdfFormFillerService.js lines 239-243, 467-478

  if (allData.imageUrls) {
    // Page 3 - Driver's License & Vehicle Photos
    // CRITICAL FIX (2025-12-05): Use correct PDF field names (matching test service)
    // PDF template expects: driving_license_picture, NOT driving_license_url
    formData.driving_license_picture = allData.imageUrls.driving_license || '';
    formData.vehicle_picture_front = allData.imageUrls.vehicle_front || '';
    formData.vehicle_picture_driver_side = allData.imageUrls.vehicle_driver_side || '';
    formData.vehicle_picture_passenger_side = allData.imageUrls.vehicle_passenger_side || '';
    formData.vehicle_picture_back = allData.imageUrls.vehicle_back || '';

    // Pages 11-12 - Evidence Collection URLs
    // CRITICAL FIX (2025-12-05): Use correct PDF field names (file_url_*, NOT shortened *_url)
    formData.file_url_documents = allData.imageUrls.document || incident?.file_url_documents || '';
    formData.file_url_documents_1 = allData.imageUrls.document_2 || incident?.file_url_documents_1 || '';
    formData.file_url_record_detailed_account_of_what_happened = allData.imageUrls.audio_account || incident?.file_url_record_detailed_account_of_what_happened || '';
    formData.file_url_what3words = allData.imageUrls.what3words_screenshot || allData.imageUrls.what3words || incident?.file_url_what3words || '';
    formData.file_url_scene_overview = allData.imageUrls.scene_overview || incident?.file_url_scene_overview || '';
    formData.file_url_scene_overview_1 = allData.imageUrls.scene_overview_2 || incident?.file_url_scene_overview_1 || '';
    formData.file_url_other_vehicle = allData.imageUrls.other_vehicle_photo || allData.imageUrls.other_vehicle || incident?.file_url_other_vehicle || '';
    formData.file_url_other_vehicle_1 = allData.imageUrls.other_vehicle_photo_2 || allData.imageUrls.other_vehicle_2 || incident?.file_url_other_vehicle_1 || '';
    formData.file_url_vehicle_damage = allData.imageUrls.vehicle_damage || incident?.file_url_vehicle_damage || '';
    formData.file_url_vehicle_damage_1 = allData.imageUrls.vehicle_damage_2 || incident?.file_url_vehicle_damage_1 || '';
    formData.file_url_vehicle_damage_2 = allData.imageUrls.vehicle_damage_3 || incident?.file_url_vehicle_damage_2 || '';
    formData.file_url_spare = incident?.file_url_spare || '';
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
    let storagePath = null;

    if (storageData && !storageError) {
      storagePath = fileName;
      // Generate initial signed URL (365 days) for immediate use
      const { data: urlData } = await supabase.storage
        .from('incident-images-secure')
        .createSignedUrl(fileName, 31536000);

      if (urlData) {
        pdfUrl = urlData.signedUrl;
      }
    } else if (storageError) {
      logger.error('PDF storage upload failed - retries will not have attachment', {
        error: storageError.message,
        userId: createUserId
      });
    }

    const { data, error } = await supabase
      .from('completed_incident_forms')
      .insert({
        create_user_id: createUserId,
        form_data: allData,
        pdf_base64: pdfBase64.substring(0, 1000000),
        pdf_url: pdfUrl,
        pdf_storage_path: storagePath, // Only set if upload succeeded
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

    // Return data with pdf_storage_path for email retry queue (null if upload failed)
    return data || { id: `temp-${Date.now()}`, pdf_storage_path: storagePath };
  } catch (error) {
    logger.error('Error in storeCompletedForm', error);
    return { id: `error-${Date.now()}`, pdf_storage_path: null };
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

  if (!allData.user || !allData.user.email) {
    throw new Error('User not found or missing email');
  }

  // CRITICAL FIX: DO NOT query ai_transcription or ai_summary tables separately
  // These tables don't have incident_id foreign keys and may return OLD data from previous incidents
  // All AI fields are already in allData.currentIncident from fetchAllData():
  //   - voice_transcription (Page 13)
  //   - ai_summary (Page 15)
  //   - closing_statement, final_review, quality_review (Pages 16-18)
  // fetchAllData() correctly uses incident_reports.voice_transcription from LATEST incident

  // Use Adobe PDF Form Filler Service (verified 213/213 field mappings)
  // Handles all fields including AI pages 13-18, witnesses, vehicles, DVLA data
  logger.info('📄 Generating PDF with adobePdfFormFillerService (213 fields)');
  let pdfBuffer = await adobePdfFormFillerService.fillPdfForm(allData);

  const storedForm = await storeCompletedForm(create_user_id, pdfBuffer, allData);
  const emailResult = await sendEmails(allData.user.email, pdfBuffer, create_user_id);

  // Track email status separately from PDF generation
  const isValidFormId = storedForm.id && !storedForm.id.startsWith('temp-') && !storedForm.id.startsWith('error-');
  const emailFailed = !emailResult.success;

  if (isValidFormId) {
    // Update with email status and tracking
    const updateData = {
      sent_to_user: emailResult.success,
      sent_to_accounts: emailResult.success,
      email_status: emailResult,
      email_attempts: 1
    };

    // If email failed, queue for retry
    if (emailFailed) {
      updateData.email_last_error = emailResult.error || 'Email send failed';

      // Only queue if we have a valid storage path (PDF was uploaded successfully)
      // Without the PDF in storage, retries would fail to attach it
      if (storedForm.pdf_storage_path) {
        // Queue email for retry with exponential backoff
        const queueResult = await emailRetryService.queueForRetry({
          createUserId: create_user_id,
          incidentId: allData.currentIncident?.id || null,
          completedFormId: storedForm.id,
          emailType: 'pdf_delivery',
          recipientEmail: allData.user.email,
          subject: `Traffic Accident Legal Report - ${new Date().toISOString().split('T')[0]}`,
          templateName: null, // Uses inline template in sendEmails
          templateData: null,
          pdfStoragePath: storedForm.pdf_storage_path, // Only use actual path, never fallback
          source: source,
          lastError: emailResult.error || 'Email send failed',
          priority: 5 // Higher priority for user PDF emails
        });

        // Only set email_retry_queued if queue insert actually succeeded
        if (queueResult) {
          updateData.email_retry_queued = true;
          logger.warn('📧 PDF email failed - queued for retry', {
            userId: create_user_id,
            formId: storedForm.id,
            queueId: queueResult.id,
            error: emailResult.error
          });
        } else {
          logger.error('📧 PDF email failed and could not queue for retry', {
            userId: create_user_id,
            formId: storedForm.id,
            error: emailResult.error
          });
        }
      } else {
        // CRITICAL: PDF storage failed AND email failed - this is a complete failure
        // We cannot queue a simple email retry because there's no PDF to attach
        // Queue a FULL PDF regeneration job instead
        logger.error('🚨 CRITICAL: PDF Storage Failed + Email Failed - Queuing full regeneration', {
          severity: 'HIGH',
          userId: create_user_id,
          formId: storedForm.id,
          emailError: emailResult.error,
          storageStatus: 'FAILED - pdf_storage_path is null',
          action: 'FULL_GENERATION_RETRY'
        });

        // Queue for full PDF regeneration (not just email retry)
        try {
          const regenerationResult = await pdfQueueService.enqueue(
            create_user_id,
            allData.currentIncident?.id || null,
            'storage-failure-regeneration'
          );

          if (regenerationResult) {
            logger.warn('📥 Queued full PDF regeneration after storage failure', {
              userId: create_user_id,
              queueId: regenerationResult.id
            });
            updateData.email_last_error = `Storage failed, email failed - queued for full regeneration (queue ID: ${regenerationResult.id})`;
          } else {
            logger.error('🚨 CRITICAL: Could not queue regeneration - PDF generation table may not exist', {
              userId: create_user_id
            });
            updateData.email_last_error = 'Storage failed, email failed, regeneration queue failed - MANUAL INTERVENTION REQUIRED';
          }
        } catch (queueError) {
          logger.error('🚨 CRITICAL: Exception queuing regeneration', {
            userId: create_user_id,
            error: queueError.message
          });
          updateData.email_last_error = `Storage failed, email failed, queue error: ${queueError.message}`;
        }
      }
    }

    // Also warn if storage failed but email succeeded - future retries will have issues
    if (!storedForm.pdf_storage_path && emailResult.success) {
      logger.warn('⚠️ PDF Storage Failed but email succeeded - future retries will not have PDF attachment', {
        userId: create_user_id,
        formId: storedForm.id,
        note: 'User received email this time, but PDF is not in storage for future access'
      });
      updateData.email_last_error = 'Email sent but PDF storage failed - PDF not available for re-download';
    }

    await supabase
      .from('completed_incident_forms')
      .update(updateData)
      .eq('id', storedForm.id);

    if (emailFailed) {
      // Surface failure so queue retries the whole job and alerts can fire
      throw new Error(`Email send failed: ${emailResult.error || 'unknown error'}`);
    }
  }

  // PDF generation is still a success even if email failed - it will be retried
  logger.success('PDF generation process completed', {
    emailSent: emailResult.success,
    emailQueued: !emailResult.success
  });

  return {
    success: true,
    form_id: storedForm.id,
    create_user_id,
    email_sent: emailResult.success,
    email_queued: !emailResult.success,
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

  if (!fetchAllData || !sendEmails || !adobePdfFormFillerService.isReady()) {
    return sendError(res, 503, 'PDF generation modules not available', 'PDF_UNAVAILABLE');
  }

  try {
    const result = await generateUserPDF(create_user_id, 'direct');
    res.json(result);
  } catch (error) {
    logger.error('Error in PDF generation', error);

    // Send failure notification to admin
    try {
      // Try to get user email for the notification
      let userEmail = 'Unknown';
      if (supabase && create_user_id) {
        const { data: userData } = await supabase
          .from('user_signup')
          .select('email')
          .eq('create_user_id', create_user_id)
          .single();
        if (userData?.email) {
          userEmail = userData.email;
        }
      }

      if (sendTemplateEmail) {
        await sendTemplateEmail(
          config.smtp.adminEmail,
          `PDF Generation Failed - User ${create_user_id}`,
          'pdf-generation-failed',
          {
            userId: create_user_id,
            userEmail: userEmail,
            trigger: 'direct API call',
            timestamp: new Date().toISOString(),
            errorMessage: error.message || 'Unknown error',
            currentYear: new Date().getFullYear()
          }
        );
        logger.info('PDF failure notification sent to admin', { userId: create_user_id });
      }
    } catch (notificationError) {
      logger.error('Failed to send PDF failure notification', notificationError);
    }

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
 * Calculate subscription-aware URL expiry in seconds
 * Logic: If within 2 months of renewal, give subscription end + 6 weeks (incentive to renew)
 *        Otherwise, give until subscription end date
 *        Minimum 6 weeks for expired/no subscription
 * @param {Date|string} subscriptionEndDate - User's subscription end date
 * @returns {number} - Expiry in seconds
 */
function calculateUrlExpiry(subscriptionEndDate) {
  const SIX_WEEKS_SECONDS = 42 * 24 * 60 * 60; // 42 days = 6 weeks
  const TWO_MONTHS_SECONDS = 60 * 24 * 60 * 60; // 60 days = ~2 months
  const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

  if (!subscriptionEndDate) {
    // No subscription date - default to 6 weeks
    return SIX_WEEKS_SECONDS;
  }

  const now = new Date();
  const endDate = new Date(subscriptionEndDate);
  const timeUntilExpiry = Math.floor((endDate.getTime() - now.getTime()) / 1000);

  // Subscription already expired - give 6 weeks minimum
  if (timeUntilExpiry <= 0) {
    return SIX_WEEKS_SECONDS;
  }

  // Within 2 months of renewal - give subscription end + 6 weeks (better value & renewal incentive)
  if (timeUntilExpiry <= TWO_MONTHS_SECONDS) {
    return Math.min(timeUntilExpiry + SIX_WEEKS_SECONDS, ONE_YEAR_SECONDS);
  }

  // More than 2 months remaining - give until subscription end
  return Math.min(timeUntilExpiry, ONE_YEAR_SECONDS);
}

/**
 * Download PDF
 * GET /api/pdf/download/:userId
 * Generates fresh signed URL with subscription-aware expiry
 */
async function downloadPdf(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;

    // Fetch PDF record and user's subscription info in parallel
    const [formResult, userResult] = await Promise.all([
      supabase
        .from('completed_incident_forms')
        .select('pdf_url, pdf_base64, pdf_storage_path')
        .eq('create_user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('user_signup')
        .select('subscription_end_date')
        .eq('create_user_id', userId)
        .single()
    ]);

    if (formResult.error || !formResult.data) {
      return sendError(res, 404, 'PDF not found', 'PDF_NOT_FOUND');
    }

    const pdfRecord = formResult.data;
    const subscriptionEndDate = userResult.data?.subscription_end_date;

    await gdprService.logActivity(userId, 'PDF_DOWNLOADED', {}, req);

    // Generate fresh signed URL if storage path is available
    if (pdfRecord.pdf_storage_path) {
      const expirySeconds = calculateUrlExpiry(subscriptionEndDate);
      const expiryDate = new Date(Date.now() + expirySeconds * 1000);

      logger.info('Generating fresh PDF signed URL', {
        userId,
        subscriptionEndDate,
        expirySeconds,
        expiryDate: expiryDate.toISOString()
      });

      const { data: urlData, error: urlError } = await supabase.storage
        .from('incident-images-secure')
        .createSignedUrl(pdfRecord.pdf_storage_path, expirySeconds);

      if (urlData && !urlError) {
        return res.redirect(urlData.signedUrl);
      } else {
        logger.warn('Failed to generate fresh signed URL, falling back to stored URL', { urlError });
      }
    }

    // Fallback: Use stored URL (may be expired)
    if (pdfRecord.pdf_url) {
      res.redirect(pdfRecord.pdf_url);
    } else if (pdfRecord.pdf_base64) {
      // Last resort: Use base64 (may be truncated for large PDFs)
      const buffer = Buffer.from(pdfRecord.pdf_base64, 'base64');
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

/**
 * Send Image Download Links Email
 * POST /api/pdf/send-image-links/:userId
 * Sends an email with all user's image download links (subscription-aware expiry)
 */
async function sendImageLinksEmail(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;

    // Get user info for email
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('email, name, surname')
      .eq('create_user_id', userId)
      .single();

    if (userError || !userData) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    const { sendImageDownloadLinks } = require('../../lib/emailService');
    const userName = [userData.name, userData.surname].filter(Boolean).join(' ') || 'Valued Customer';

    const result = await sendImageDownloadLinks(supabase, userId, userData.email, userName);

    if (result.success) {
      res.json({
        success: true,
        message: 'Image download links email sent successfully',
        email: userData.email,
        totalImages: result.totalImages,
        expiryDate: result.expiryDate,
        expiryDuration: result.expiryDuration,
        requestId: req.requestId
      });
    } else if (result.reason === 'no_images') {
      res.json({
        success: false,
        message: 'No images found for this user',
        requestId: req.requestId
      });
    } else {
      sendError(res, 500, 'Failed to send email: ' + result.error, 'EMAIL_SEND_FAILED');
    }
  } catch (error) {
    logger.error('Error sending image links email', error);
    sendError(res, 500, 'Failed to send image links email', 'EMAIL_SEND_FAILED');
  }
}

/**
 * Get Email Queue Stats
 * GET /api/pdf/email-queue/stats
 * Returns statistics about the email retry queue (admin endpoint)
 */
async function getEmailQueueStats(req, res) {
  try {
    const stats = await emailRetryService.getQueueStats();

    if (!stats) {
      return res.json({
        success: true,
        message: 'Email retry queue not available or table does not exist',
        stats: null,
        requestId: req.requestId
      });
    }

    res.json({
      success: true,
      stats,
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error getting email queue stats', error);
    sendError(res, 500, 'Failed to get queue stats', 'QUEUE_STATS_FAILED');
  }
}

/**
 * Manually Retry a Specific Email
 * POST /api/pdf/email-queue/retry/:queueId
 * Forces an immediate retry of a specific queued email (admin endpoint)
 */
async function retryQueuedEmail(req, res) {
  try {
    const { queueId } = req.params;

    if (!queueId) {
      return sendError(res, 400, 'Missing queueId parameter', 'MISSING_QUEUE_ID');
    }

    const result = await emailRetryService.retryEmailById(queueId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Email successfully resent',
        queueId,
        requestId: req.requestId
      });
    } else {
      sendError(res, 400, result.error || 'Retry failed', 'RETRY_FAILED');
    }
  } catch (error) {
    logger.error('Error retrying queued email', error);
    sendError(res, 500, 'Failed to retry email', 'RETRY_FAILED');
  }
}

/**
 * Process Email Queue
 * POST /api/pdf/email-queue/process
 * Manually triggers processing of the email retry queue (admin/cron endpoint)
 */
async function processEmailQueue(req, res) {
  try {
    const result = await emailRetryService.processQueue();

    res.json({
      success: true,
      message: `Processed ${result.processed} emails`,
      ...result,
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error processing email queue', error);
    sendError(res, 500, 'Failed to process queue', 'PROCESS_QUEUE_FAILED');
  }
}

module.exports = {
  generatePdf,
  getPdfStatus,
  downloadPdf,
  generateUserPDF,  // Required by incidentForm.controller for post-submission email
  sendImageLinksEmail, // NEW: Send image download links with subscription-aware expiry
  // Email queue management endpoints
  getEmailQueueStats,
  retryQueuedEmail,
  processEmailQueue
};
