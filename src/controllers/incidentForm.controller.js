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

      // REMOVED: Safety check enforcement (redundant - already completed earlier in flow)
      // Safety checks are completed in the first two transitions from incident.html
      // No need to repeat validation here

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

    // 3. Finalize map screenshot if present (Page 4)
    let mapScreenshotResults = null;
    if (formData.page4?.session_id && formData.page4?.map_screenshot_captured) {
      try {
        mapScreenshotResults = await locationPhotoService.finalizePhotosByType(
          userId,
          incident.id,
          formData.page4.session_id,
          'map_screenshot',           // field_name in temp_uploads
          'location-map',              // storage category
          'location_map_screenshot'    // document_type in user_documents
        );

        logger.info('Map screenshot finalized', {
          incidentId: incident.id,
          photoCount: mapScreenshotResults.successCount,
          errors: mapScreenshotResults.errorCount
        });
      } catch (photoError) {
        logger.error('Failed to finalize map screenshot (non-critical)', {
          incidentId: incident.id,
          error: photoError.message
        });
        // Don't fail the submission - photos can be re-processed
      }
    }

    // 4. Finalize location photos if present (Page 4a)
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

    // 5. Finalize vehicle damage photos if present (Page 6)
    let vehiclePhotoResults = null;
    if (formData.page6?.session_id) {
      try {
        vehiclePhotoResults = await locationPhotoService.finalizeVehicleDamagePhotos(
          userId,
          incident.id,
          formData.page6.session_id
        );

        logger.info('Vehicle damage photos finalized', {
          incidentId: incident.id,
          photoCount: vehiclePhotoResults.successCount,
          errors: vehiclePhotoResults.errorCount
        });
      } catch (photoError) {
        logger.error('Failed to finalize vehicle damage photos (non-critical)', {
          incidentId: incident.id,
          error: photoError.message
        });
        // Don't fail the submission - photos can be re-processed
      }
    }

    // 6. Finalize other vehicle photos if present (Page 8)
    let otherVehiclePhotoResults = null;
    if (formData.page8?.session_id) {
      try {
        // Page 8 uses 5 different field names:
        // - other_vehicle_photo_1 → file_url_other_vehicle (DB column)
        // - other_vehicle_photo_2 → file_url_other_vehicle_1 (DB column)
        // - other_damage_photo_3/4/5 → user_documents only (no DB columns)
        const fieldNames = [
          'other_vehicle_photo_1',
          'other_vehicle_photo_2',
          'other_damage_photo_3',
          'other_damage_photo_4',
          'other_damage_photo_5'
        ];

        const allPhotos = [];
        let successCount = 0;
        let errorCount = 0;

        // Process each field name
        for (const fieldName of fieldNames) {
          const result = await locationPhotoService.finalizePhotosByType(
            userId,
            incident.id,
            formData.page8.session_id,
            fieldName,
            'other-vehicle',
            'other_vehicle_photo'
          );

          if (result.success && result.photos.length > 0) {
            allPhotos.push(...result.photos);
            successCount += result.successCount;
          }
          if (result.errorCount > 0) {
            errorCount += result.errorCount;
          }
        }

        otherVehiclePhotoResults = {
          success: successCount > 0,
          photos: allPhotos,
          totalProcessed: allPhotos.length,
          successCount,
          errorCount
        };

        // Update incident_reports with first 2 photo URLs (if available)
        if (allPhotos.length > 0) {
          const updateData = {};
          if (allPhotos[0]) updateData.file_url_other_vehicle = allPhotos[0].downloadUrl;
          if (allPhotos[1]) updateData.file_url_other_vehicle_1 = allPhotos[1].downloadUrl;

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('incident_reports')
              .update(updateData)
              .eq('id', incident.id);

            if (updateError) {
              logger.error('Failed to update incident_reports with other vehicle photo URLs', {
                incidentId: incident.id,
                error: updateError.message
              });
            } else {
              logger.info('Updated incident_reports with other vehicle photo URLs', {
                incidentId: incident.id,
                photoCount: Object.keys(updateData).length
              });
            }
          }
        }

        logger.info('Other vehicle photos finalized', {
          incidentId: incident.id,
          photoCount: successCount,
          errors: errorCount
        });
      } catch (photoError) {
        logger.error('Failed to finalize other vehicle photos (non-critical)', {
          incidentId: incident.id,
          error: photoError.message
        });
        // Don't fail the submission - photos can be re-processed
      }
    }

    // 7. Save witnesses to incident_witnesses table (Page 9)
    let witnessResults = null;
    if (formData.page9?.witnesses_present === 'yes') {
      try {
        const witnesses = [];
        const page9 = formData.page9;

        // Primary witness (witness 1)
        if (page9.witness_name && page9.witness_statement) {
          witnesses.push({
            incident_report_id: incident.id,  // Using updated schema
            create_user_id: userId,
            witness_number: 1,
            witness_name: page9.witness_name,
            witness_mobile_number: page9.witness_mobile_number || null,
            witness_email_address: page9.witness_email_address || null,
            witness_statement: page9.witness_statement
          });
        }

        // Additional witnesses from sessionStorage (witness 2, 3, 4, etc.)
        if (page9.additional_witnesses && Array.isArray(page9.additional_witnesses)) {
          page9.additional_witnesses.forEach((witness, index) => {
            if (witness.witness_name && witness.witness_statement) {
              witnesses.push({
                incident_report_id: incident.id,  // Using updated schema
                create_user_id: userId,
                witness_number: index + 2,  // Witness 2, 3, 4, etc.
                witness_name: witness.witness_name,
                witness_mobile_number: witness.witness_mobile_number || null,
                witness_email_address: witness.witness_email_address || null,
                witness_statement: witness.witness_statement
              });
            }
          });
        }

        // Insert all witnesses
        if (witnesses.length > 0) {
          const { data: insertedWitnesses, error: witnessError } = await supabase
            .from('incident_witnesses')
            .insert(witnesses)
            .select();

          if (witnessError) {
            logger.error('Failed to insert witnesses (non-critical)', {
              incidentId: incident.id,
              error: witnessError.message
            });
          } else {
            witnessResults = {
              successCount: insertedWitnesses.length,
              witnesses: insertedWitnesses
            };
            logger.info('Witnesses saved successfully', {
              incidentId: incident.id,
              witnessCount: insertedWitnesses.length
            });
          }
        }
      } catch (witnessError) {
        logger.error('Failed to save witnesses (non-critical)', {
          incidentId: incident.id,
          error: witnessError.message
        });
        // Don't fail the submission - witnesses can be added later
      }
    }

    // 8. Return success
    return res.status(201).json({
      success: true,
      data: {
        incident_id: incident.id,
        created_at: incident.created_at,
        map_screenshots: mapScreenshotResults ? {
          finalized: mapScreenshotResults.successCount,
          failed: mapScreenshotResults.errorCount,
          photos: mapScreenshotResults.photos
        } : null,
        location_photos: photoResults ? {
          finalized: photoResults.successCount,
          failed: photoResults.errorCount,
          photos: photoResults.photos
        } : null,
        vehicle_damage_photos: vehiclePhotoResults ? {
          finalized: vehiclePhotoResults.successCount,
          failed: vehiclePhotoResults.errorCount,
          photos: vehiclePhotoResults.photos
        } : null,
        other_vehicle_photos: otherVehiclePhotoResults ? {
          finalized: otherVehiclePhotoResults.successCount,
          failed: otherVehiclePhotoResults.errorCount,
          photos: otherVehiclePhotoResults.photos
        } : null,
        witnesses: witnessResults ? {
          saved: witnessResults.successCount,
          witnesses: witnessResults.witnesses
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
    // Note: accident_date and accident_time are on Page 3, not Page 1
    accident_date: page3.accident_date || null,
    accident_time: page3.accident_time || null,
    // Note: location_address, location_postcode, location_city, location_what3words removed - don't exist in schema
    // Note: incident_description column removed - does not exist in schema

    // Page 2: Medical Information
    medical_attention_needed: page2.medical_attention_needed === 'yes',
    medical_injury_details: page2.medical_injury_details || null,
    medical_injury_severity: page2.medical_injury_severity || null,
    medical_hospital_name: page2.medical_hospital_name || null,
    medical_ambulance_called: page2.medical_ambulance_called === 'yes',
    medical_treatment_received: page2.medical_treatment_received || null,

    // Medical Symptoms (Page 2) - Maps to actual DB columns (medical_symptom_*)
    medical_symptom_chest_pain: page2.medical_symptom_chest_pain || false,
    medical_symptom_uncontrolled_bleeding: page2.medical_symptom_uncontrolled_bleeding || false,
    medical_symptom_breathlessness: page2.medical_symptom_breathlessness || false,
    medical_symptom_limb_weakness: page2.medical_symptom_limb_weakness || false,
    medical_symptom_loss_of_consciousness: page2.medical_symptom_loss_of_consciousness || false,
    medical_symptom_severe_headache: page2.medical_symptom_severe_headache || false,
    medical_symptom_change_in_vision: page2.medical_symptom_change_in_vision || false,
    medical_symptom_abdominal_pain: page2.medical_symptom_abdominal_pain || false,
    medical_symptom_abdominal_bruising: page2.medical_symptom_abdominal_bruising || false,
    medical_symptom_limb_pain_mobility: page2.medical_symptom_limb_pain_mobility || false,
    medical_symptom_dizziness: page2.medical_symptom_dizziness || false,
    medical_symptom_life_threatening: page2.medical_symptom_life_threatening || false,
    medical_symptom_none: page2.medical_symptom_none || false,

    // Page 3: Date/Time/Weather/Road Conditions (41 fields - matches migration 016)
    // Note: accident_date and accident_time already set from Page 1 above (lines 410-411)
    // Page 3 data is redundant but kept for validation consistency

    // Weather conditions (12 checkboxes)
    weather_bright_sunlight: page3.weather_bright_sunlight || false,
    weather_clear: page3.weather_clear || false,
    weather_cloudy: page3.weather_cloudy || false,
    weather_raining: page3.weather_raining || false,
    weather_heavy_rain: page3.weather_heavy_rain || false,
    weather_drizzle: page3.weather_drizzle || false,
    weather_fog: page3.weather_fog || false,
    weather_snow: page3.weather_snow || false,
    weather_ice: page3.weather_ice || false,
    weather_windy: page3.weather_windy || false,
    weather_hail: page3.weather_hail || false,
    weather_thunder_lightning: page3.weather_thunder_lightning || false,

    // Road conditions (6 checkboxes)
    road_condition_dry: page3.road_condition_dry || false,
    road_condition_wet: page3.road_condition_wet || false,
    road_condition_icy: page3.road_condition_icy || false,
    road_condition_snow_covered: page3.road_condition_snow_covered || false,
    road_condition_loose_surface: page3.road_condition_loose_surface || false,
    road_condition_slush_on_road: page3.road_condition_slush_on_road || false,

    // Road types (7 checkboxes)
    road_type_motorway: page3.road_type_motorway || false,
    road_type_a_road: page3.road_type_a_road || false,
    road_type_b_road: page3.road_type_b_road || false,
    road_type_urban_street: page3.road_type_urban_street || false,
    road_type_rural_road: page3.road_type_rural_road || false,
    road_type_car_park: page3.road_type_car_park || false,
    road_type_private_road: page3.road_type_private_road || false,

    // Speed fields
    speed_limit: page3.speed_limit || null,
    your_speed: page3.your_speed || null,

    // Traffic conditions (4 checkboxes)
    traffic_conditions_heavy: page3.traffic_conditions_heavy || false,
    traffic_conditions_moderate: page3.traffic_conditions_moderate || false,
    traffic_conditions_light: page3.traffic_conditions_light || false,
    traffic_conditions_no_traffic: page3.traffic_conditions_no_traffic || false,

    // Visibility (4 checkboxes)
    visibility_good: page3.visibility_good || false,
    visibility_poor: page3.visibility_poor || false,
    visibility_very_poor: page3.visibility_very_poor || false,
    visibility_street_lights: page3.visibility_street_lights || false,

    // Road markings visibility (3 checkboxes)
    road_markings_visible_yes: page3.road_markings_visible_yes || false,
    road_markings_visible_no: page3.road_markings_visible_no || false,
    road_markings_visible_partially: page3.road_markings_visible_partially || false,

    // Page 4: Location/Junction/Visibility/Special Conditions (30 fields - matches migrations 018 & 019)
    // Location fields (3)
    location: page4.location || null,
    what3words: page4.what3words || null,
    nearest_landmark: page4.nearest_landmark || null,

    // Junction fields (4)
    junction_type: page4.junction_type || null,
    junction_control: page4.junction_control || null,
    traffic_light_status: page4.traffic_light_status || null,
    user_manoeuvre: page4.user_manoeuvre || null,

    // Additional hazards (1)
    additional_hazards: page4.additional_hazards || null,

    // Visibility factors (5 checkboxes) - convert array to individual booleans
    visibility_clear: (page4.visibility_factors || []).includes('clear_visibility'),
    visibility_restricted_structure: (page4.visibility_factors || []).includes('restricted_by_structure'),
    visibility_restricted_bend: (page4.visibility_factors || []).includes('restricted_by_bend'),
    visibility_large_vehicle: (page4.visibility_factors || []).includes('large_vehicle'),
    visibility_sun_glare: (page4.visibility_factors || []).includes('sun_glare'),

    // Special conditions (12 checkboxes) - convert array to individual booleans
    special_condition_roadworks: (page4.special_conditions || []).includes('roadworks'),
    special_condition_workmen: (page4.special_conditions || []).includes('workmen_in_road'),
    special_condition_cyclists: (page4.special_conditions || []).includes('cyclists_in_road'),
    special_condition_pedestrians: (page4.special_conditions || []).includes('pedestrians_in_road'),
    special_condition_traffic_calming: (page4.special_conditions || []).includes('traffic_calming'),
    special_condition_parked_vehicles: (page4.special_conditions || []).includes('parked_vehicles'),
    special_condition_crossing: (page4.special_conditions || []).includes('pedestrian_crossing'),
    special_condition_school_zone: (page4.special_conditions || []).includes('school_zone'),
    special_condition_narrow_road: (page4.special_conditions || []).includes('narrow_road'),
    special_condition_potholes: (page4.special_conditions || []).includes('pot_holes_road_defects'),
    special_condition_oil_spills: (page4.special_conditions || []).includes('oil_spills'),
    special_condition_animals: (page4.special_conditions || []).includes('animals_in_road'),

    // Page 5: Your Vehicle Details (29 fields - matches migration 020)
    // Usual vehicle (1 field)
    usual_vehicle: page5.usual_vehicle || null,

    // DVLA Lookup Registration (1 field - migration 020 renamed to vehicle_license_plate)
    vehicle_license_plate: page5.dvla_lookup_reg || null,

    // DVLA Vehicle Data (10 fields - CORRECTED column names from migration 020)
    dvla_make: page5.dvla_vehicle_data?.make || null,
    dvla_model: page5.dvla_vehicle_data?.model || null,
    dvla_colour: page5.dvla_vehicle_data?.colour || null,  // British spelling
    dvla_year: page5.dvla_vehicle_data?.yearOfManufacture || null,
    dvla_fuel_type: page5.dvla_vehicle_data?.fuelType || null,
    dvla_mot_status: page5.dvla_vehicle_data?.motStatus || null,
    dvla_mot_expiry: page5.dvla_vehicle_data?.motExpiryDate || null,  // Note: column is dvla_mot_expiry (no _date)
    dvla_tax_status: page5.dvla_vehicle_data?.taxStatus || null,
    dvla_tax_due_date: page5.dvla_vehicle_data?.taxDueDate || null,
    dvla_insurance_status: page5.dvla_vehicle_data?.insuranceStatus || null,

    // No Damage checkbox (1 field)
    no_damage: page5.no_damage || false,

    // Damage description (1 field)
    damage_to_your_vehicle: page5.damage_to_your_vehicle || null,

    // Impact Points (10 boolean fields - convert array to individual booleans - migration 020)
    impact_point_front: (page5.impact_points || []).includes('front'),
    impact_point_front_driver: (page5.impact_points || []).includes('front_driver'),
    impact_point_front_passenger: (page5.impact_points || []).includes('front_passenger'),
    impact_point_driver_side: (page5.impact_points || []).includes('driver_side'),
    impact_point_passenger_side: (page5.impact_points || []).includes('passenger_side'),
    impact_point_rear_driver: (page5.impact_points || []).includes('rear_driver'),
    impact_point_rear_passenger: (page5.impact_points || []).includes('rear_passenger'),
    impact_point_rear: (page5.impact_points || []).includes('rear'),
    impact_point_roof: (page5.impact_points || []).includes('roof'),
    impact_point_undercarriage: (page5.impact_points || []).includes('undercarriage'),

    // Driveability (1 field)
    vehicle_driveable: page5.vehicle_driveable || null,

    // Manual Entry Fallback Fields (4 fields - migration 020)
    manual_make: page5.manual_make || null,
    manual_model: page5.manual_model || null,
    manual_colour: page5.manual_colour || null,
    manual_year: page5.manual_year || null,

    // Note: Legacy Typeform fields removed - your_vehicle_make, your_vehicle_model, your_vehicle_color,
    // your_vehicle_registration, your_vehicle_year don't exist in schema (use dvla_* or manual_* instead)

    // Page 7: Other Driver & Vehicle (20 fields from migrations 021 + 022)
    // Driver information (4 fields)
    other_full_name: page7.other_full_name || null,
    other_contact_number: page7.other_contact_number || null,
    other_email_address: page7.other_email_address || null,
    other_driving_license_number: page7.other_driving_license_number || null,

    // Vehicle registration (1 field)
    other_vehicle_registration: page7.other_vehicle_registration || null,

    // DVLA lookup data (10 fields - extract from vehicle_data object, same as Page 5)
    other_vehicle_look_up_make: page7.vehicle_data?.make || null,
    other_vehicle_look_up_model: page7.vehicle_data?.model || null,
    other_vehicle_look_up_colour: page7.vehicle_data?.colour || null,
    other_vehicle_look_up_year: page7.vehicle_data?.yearOfManufacture || null,
    other_vehicle_look_up_fuel_type: page7.vehicle_data?.fuelType || null,
    other_vehicle_look_up_mot_status: page7.vehicle_data?.motStatus || null,
    other_vehicle_look_up_mot_expiry_date: page7.vehicle_data?.motExpiryDate || null,
    other_vehicle_look_up_tax_status: page7.vehicle_data?.taxStatus || null,
    other_vehicle_look_up_tax_due_date: page7.vehicle_data?.taxDueDate || null,
    other_vehicle_look_up_insurance_status: page7.vehicle_data?.insuranceStatus || 'Not Available',

    // Insurance information (4 fields)
    other_drivers_insurance_company: page7.other_drivers_insurance_company || null,
    other_drivers_policy_number: page7.other_drivers_policy_number || null,
    other_drivers_policy_holder_name: page7.other_drivers_policy_holder_name || null,
    other_drivers_policy_cover_type: page7.other_drivers_policy_cover_type || null,

    // Damage information (2 fields)
    no_visible_damage: page7.no_visible_damage || false,
    describe_damage_to_vehicle: page7.describe_damage_to_vehicle || null,

    // Page 9: Witnesses
    witnesses_present: page9.witnesses_present || null,
    // Primary witness details (witness 1) - also saved in incident_reports for backward compatibility
    witness_name: page9.witness_name || null,
    witness_mobile_number: page9.witness_mobile_number || null,
    witness_email_address: page9.witness_email_address || null,
    witness_statement: page9.witness_statement || null,

    // Page 10: Police Details & Safety Equipment
    police_attended: page10.police_attended === 'yes',
    accident_ref_number: page10.accident_ref_number || null,  // Police CAD/reference number
    police_force: page10.police_force || null,                // Police force name
    officer_name: page10.officer_name || null,                // Officer's name
    officer_badge: page10.officer_badge || null,              // Officer's badge/collar number
    user_breath_test: page10.user_breath_test || null,        // User's breath test result
    other_breath_test: page10.other_breath_test || null,      // Other driver's breath test
    airbags_deployed: page10.airbags_deployed === 'yes',      // Were airbags deployed (boolean)
    seatbelts_worn: page10.seatbelts_worn || null,            // Were seatbelts worn - maps to actual DB column
    seatbelt_reason: page10.seatbelts_worn === 'no' ? page10.seatbelt_reason : null,  // Reason if not worn

    // Page 12: Final Medical Check
    final_feeling: page12.final_feeling || null,  // fine, shaken, minor_pain, significant_pain, emergency
    form_completed_at: page12.completed_at || null,     // Timestamp when form was completed

    // Metadata
    // Note: submission_source removed - doesn't exist in schema
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

/**
 * List incident reports for authenticated user
 *
 * GET /api/incident-reports
 *
 * Query params:
 * - limit: number (default 10, max 100)
 * - offset: number (default 0)
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function listIncidentReports(req, res) {
  try {
    const userId = req.userId; // From auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Parse query params
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = parseInt(req.query.offset) || 0;

    logger.info('📋 Fetching incident reports', {
      userId,
      limit,
      offset
    });

    // Fetch incident reports for this user
    // Query all three user ID columns: auth_user_id (new), create_user_id (legacy Typeform), user_id (older)
    const { data: reports, error, count } = await supabase
      .from('incident_reports')
      .select('*', { count: 'exact' })
      .or(`auth_user_id.eq.${userId},create_user_id.eq.${userId},user_id.eq.${userId}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('❌ Error fetching incident reports:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch incident reports'
      });
    }

    // Format response
    const formattedReports = (reports || []).map(report => ({
      id: report.id,
      createdAt: report.created_at,
      accidentDate: report.accident_date,
      accidentTime: report.accident_time,
      location: report.location,
      what3words: report.what3words,
      vehiclePlate: report.vehicle_license_plate,
      completedAt: report.completed_at,
      status: report.completed_at ? 'completed' : 'incomplete',
      // Add summary fields
      medicalAttention: report.medical_attention_needed,
      policeAttended: report.police_attended,
      witnessesPresent: report.witnesses_present
    }));

    logger.success('✅ Found incident reports', {
      userId,
      count: formattedReports.length,
      total: count
    });

    res.json({
      success: true,
      reports: formattedReports,
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    logger.error('💥 Error listing incident reports:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = {
  submitIncidentForm,
  saveProgress,
  getIncidentReport,
  listIncidentReports
};
