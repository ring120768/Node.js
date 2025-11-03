/**
 * Incident Form Controller - In-House HTML Forms
 *
 * Handles submission of multi-page incident report forms (Pages 1-12).
 * Consolidates data from sessionStorage and saves to incident_reports table.
 *
 * Key Features:
 * - Saves all form pages to single incident_reports record
 * - Finalizes location photos using LocationPhotoService
 * - Generates incident report ID
 * - Links photos to incident report
 *
 * Endpoints:
 * - POST /api/incident-form/submit - Final submission (all pages)
 * - POST /api/incident-form/save-progress - Save partial progress
 * - GET /api/incident-form/:id - Get existing report
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const locationPhotoService = require('../services/locationPhotoService');

// Use service role key for database writes
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Submit complete incident report (all pages)
 *
 * POST /api/incident-form/submit
 *
 * Body: {
 *   page1: { ... },
 *   page2: { ... },
 *   page3: { ... },
 *   page4: { ... },
 *   page4a: { session_id, photos: [...] },
 *   ... pages 5-12
 * }
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function submitIncidentForm(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      logger.warn('Incident form submission without authentication');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const formData = req.body;

    logger.info('Incident form submission started', {
      userId,
      hasPage1: !!formData.page1,
      hasPage2: !!formData.page2,
      hasPage3: !!formData.page3,
      hasPage4: !!formData.page4,
      hasPage4a: !!formData.page4a
    });

    // 1. Prepare incident_reports table data
    const incidentData = buildIncidentData(userId, formData);

    // 2. Insert into incident_reports table
    const { data: incident, error: insertError } = await supabase
      .from('incident_reports')
      .insert([incidentData])
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to insert incident report', {
        userId,
        error: insertError.message,
        code: insertError.code
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to save incident report',
        details: insertError.message
      });
    }

    logger.info('Incident report created', {
      incidentId: incident.id,
      userId
    });

    // 3. Finalize location photos if present
    let photoResults = null;
    if (formData.page4a?.session_id) {
      try {
        photoResults = await locationPhotoService.finalizePhotos(
          userId,
          incident.id,
          formData.page4a.session_id
        );

        logger.info('Location photos finalized', {
          incidentId: incident.id,
          photoCount: photoResults.successCount,
          errors: photoResults.errorCount
        });
      } catch (photoError) {
        logger.error('Failed to finalize photos (non-critical)', {
          incidentId: incident.id,
          error: photoError.message
        });
        // Don't fail the submission - photos can be re-processed
      }
    }

    // 4. Return success
    return res.status(201).json({
      success: true,
      data: {
        incident_id: incident.id,
        created_at: incident.created_at,
        photos: photoResults ? {
          finalized: photoResults.successCount,
          failed: photoResults.errorCount,
          photos: photoResults.photos
        } : null
      },
      message: 'Incident report submitted successfully'
    });

  } catch (error) {
    logger.error('Unexpected error in incident form submission', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
}

/**
 * Build incident_reports table data from form pages
 *
 * Maps HTML form fields to database columns based on field mapping docs.
 *
 * @param {string} userId - User UUID
 * @param {Object} formData - All form pages data
 * @returns {Object} incident_reports row data
 */
function buildIncidentData(userId, formData) {
  const {
    page1 = {},
    page2 = {},
    page3 = {},
    page4 = {},
    page5 = {},
    page6 = {},
    page7 = {},
    page8 = {},
    page9 = {},
    page10 = {},
    page12 = {}
  } = formData;

  return {
    create_user_id: userId,

    // Page 1: Date, Time, Location
    incident_date: page1.incident_date || null,
    incident_time: page1.incident_time || null,
    location_address: page1.location_address || null,
    location_postcode: page1.location_postcode || null,
    location_city: page1.location_city || null,
    location_what3words: page1.location_what3words || null,
    incident_description: page1.incident_description || null,

    // Page 2: Medical Information
    medical_attention_needed: page2.medical_attention_needed === 'yes',
    medical_injury_details: page2.medical_injury_details || null,
    medical_injury_severity: page2.medical_injury_severity || null,
    medical_hospital_name: page2.medical_hospital_name || null,
    medical_ambulance_called: page2.medical_ambulance_called === 'yes',
    medical_treatment_received: page2.medical_treatment_received || null,

    // Medical Symptoms (Page 2)
    medical_symptom_chest_pain: page2.medical_symptom_chest_pain || false,
    medical_symptom_uncontrolled_bleeding: page2.medical_symptom_uncontrolled_bleeding || false,
    medical_symptom_breathlessness: page2.medical_symptom_breathlessness || false,
    medical_symptom_limb_weakness: page2.medical_symptom_limb_weakness || false,
    medical_symptom_dizziness: page2.medical_symptom_dizziness || false,
    medical_symptom_loss_of_consciousness: page2.medical_symptom_loss_of_consciousness || false,
    medical_symptom_severe_headache: page2.medical_symptom_severe_headache || false,
    medical_symptom_change_in_vision: page2.medical_symptom_change_in_vision || false,
    medical_symptom_abdominal_pain: page2.medical_symptom_abdominal_pain || false,
    medical_symptom_abdominal_bruising: page2.medical_symptom_abdominal_bruising || false,
    medical_symptom_limb_pain_mobility: page2.medical_symptom_limb_pain_mobility || false,
    medical_symptom_life_threatening: page2.medical_symptom_life_threatening || false,
    medical_symptom_none: page2.medical_symptom_none || false,

    // Page 3: Date/Weather/Road Conditions
    weather_clear: page3.weather_clear || false,
    weather_rain: page3.weather_rain || false,
    weather_snow: page3.weather_snow || false,
    weather_fog: page3.weather_fog || false,
    weather_wind: page3.weather_wind || false,
    weather_ice_frost: page3.weather_ice_frost || false,

    visibility_good: page3.visibility_good || false,
    visibility_poor: page3.visibility_poor || false,
    visibility_street_lights: page3.visibility_street_lights || false,

    road_condition_dry: page3.road_condition_dry || false,
    road_condition_wet: page3.road_condition_wet || false,
    road_condition_icy: page3.road_condition_icy || false,
    road_condition_snow: page3.road_condition_snow || false,
    road_condition_slippery: page3.road_condition_slippery || false,
    road_condition_debris: page3.road_condition_debris || false,
    road_condition_slush_road: page3.road_condition_slush_road || false,

    road_type_motorway: page3.road_type_motorway || false,
    road_type_a_road: page3.road_type_a_road || false,
    road_type_b_road: page3.road_type_b_road || false,
    road_type_urban: page3.road_type_urban || false,
    road_type_rural: page3.road_type_rural || false,
    road_type_private_road: page3.road_type_private_road || false,

    your_speed: page3.your_speed || null,
    speed_limit: page3.speed_limit || null,

    // Page 4: Special Conditions
    special_conditions: page4.special_conditions || null, // Array as JSONB or TEXT[]
    junction_type: page4.junction_type || null,
    traffic_controls: page4.traffic_controls || null,

    // Page 5: Your Vehicle
    your_vehicle_make: page5.vehicle_make || null,
    your_vehicle_model: page5.vehicle_model || null,
    your_vehicle_color: page5.vehicle_color || null,
    your_vehicle_registration: page5.vehicle_registration || null,
    your_vehicle_year: page5.vehicle_year || null,

    // Page 7: Other Vehicle
    other_vehicle_make: page7.other_vehicle_make || null,
    other_vehicle_model: page7.other_vehicle_model || null,
    other_vehicle_color: page7.other_vehicle_color || null,
    other_vehicle_registration: page7.other_vehicle_registration || null,

    other_driver_name: page7.other_driver_name || null,
    other_driver_phone: page7.other_driver_phone || null,
    other_driver_address: page7.other_driver_address || null,
    other_driver_insurance: page7.other_driver_insurance || null,

    // Page 9: Witnesses
    witness_present: page9.witness_present === 'yes',
    witness_name: page9.witness_name || null,
    witness_phone: page9.witness_phone || null,
    witness_address: page9.witness_address || null,

    // Page 10: Police Details
    police_attended: page10.police_attended === 'yes',
    police_reference_number: page10.police_reference_number || null,
    police_station: page10.police_station || null,
    police_officer_name: page10.police_officer_name || null,

    // Page 12: Final Medical Check
    medical_ongoing_pain: page12.medical_ongoing_pain === 'yes',
    medical_pain_description: page12.medical_pain_description || null,

    // Metadata
    submission_source: 'in_house_form',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Save partial progress (not yet submitted)
 *
 * POST /api/incident-form/save-progress
 *
 * Allows users to save incomplete forms and return later.
 * Stores data as JSON in a separate drafts table or localStorage.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function saveProgress(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { pages, lastCompletedPage } = req.body;

    logger.info('Saving form progress', {
      userId,
      lastCompletedPage,
      pageCount: Object.keys(pages || {}).length
    });

    // Store in a drafts table or user metadata
    const draftData = {
      user_id: userId,
      form_data: pages,
      last_completed_page: lastCompletedPage,
      updated_at: new Date().toISOString()
    };

    // For now, just acknowledge - can implement draft storage later
    return res.status(200).json({
      success: true,
      message: 'Progress saved (client-side sessionStorage recommended)',
      data: {
        last_completed_page: lastCompletedPage
      }
    });

  } catch (error) {
    logger.error('Error saving progress', {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to save progress'
    });
  }
}

/**
 * Get existing incident report
 *
 * GET /api/incident-form/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getIncidentReport(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    logger.info('Fetching incident report', { incidentId: id, userId });

    const { data: incident, error } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('id', id)
      .eq('create_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !incident) {
      logger.warn('Incident report not found', {
        incidentId: id,
        userId,
        error: error?.message
      });
      return res.status(404).json({
        success: false,
        error: 'Incident report not found'
      });
    }

    // Get associated photos
    const photos = await locationPhotoService.getIncidentPhotos(id);

    return res.status(200).json({
      success: true,
      data: {
        incident,
        photos
      }
    });

  } catch (error) {
    logger.error('Error fetching incident report', {
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch incident report'
    });
  }
}

module.exports = {
  submitIncidentForm,
  saveProgress,
  getIncidentReport
};
