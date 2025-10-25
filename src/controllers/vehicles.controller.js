/**
 * Vehicles Controller for Car Crash Lawyer AI
 * Handles CRUD operations for other vehicles involved in incidents
 *
 * Features:
 * - Add other vehicles with DVLA auto-lookup
 * - List vehicles for an incident
 * - Update vehicle information
 * - Delete vehicles (soft delete)
 * - GDPR compliance logging
 */

const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const gdprService = require('../services/gdprService');
const dvlaService = require('../services/dvlaService');
const witnessVehiclePdfService = require('../services/witnessVehiclePdfService');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role
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
 * Create a new other vehicle for an incident with DVLA lookup
 * POST /api/other-vehicles
 * Body: {
 *   incident_id, create_user_id, vehicle_license_plate,
 *   driver_name, driver_phone, driver_address,
 *   insurance_company, policy_number, policy_cover, policy_holder,
 *   damage_description
 * }
 */
async function createVehicle(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const {
      incident_id,
      create_user_id,
      vehicle_license_plate,
      driver_name,
      driver_phone,
      driver_address,
      insurance_company,
      policy_number,
      policy_cover,
      policy_holder,
      last_v5c_issued,
      damage_description
    } = req.body;

    // Validate required fields
    if (!incident_id) {
      return sendError(res, 400, 'Incident ID required', 'MISSING_INCIDENT_ID');
    }

    if (!create_user_id) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID');
    }

    const userValidation = validateUserId(create_user_id);
    if (!userValidation.valid) {
      return sendError(res, 400, userValidation.error, 'INVALID_USER_ID');
    }

    if (!vehicle_license_plate || vehicle_license_plate.trim() === '') {
      return sendError(res, 400, 'Vehicle license plate required', 'MISSING_LICENSE_PLATE');
    }

    logger.info('Creating other vehicle record', {
      incident_id,
      create_user_id,
      vehicle_license_plate
    });

    // Lookup vehicle details from DVLA API
    const dvlaResult = await dvlaService.lookupVehicle(vehicle_license_plate);

    let vehicleData = {
      incident_id,
      create_user_id,
      vehicle_license_plate: vehicle_license_plate.trim().toUpperCase(),
      driver_name: driver_name || null,
      driver_phone: driver_phone || null,
      driver_address: driver_address || null,
      insurance_company: insurance_company || null,
      policy_number: policy_number || null,
      policy_cover: policy_cover || null,
      policy_holder: policy_holder || null,
      last_v5c_issued: last_v5c_issued || null,
      damage_description: damage_description || null,
      gdpr_consent: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // If DVLA lookup succeeded, populate vehicle details
    if (dvlaResult.success) {
      vehicleData.vehicle_make = dvlaResult.data.make;
      vehicleData.vehicle_model = dvlaResult.data.model;
      vehicleData.vehicle_color = dvlaResult.data.color;
      vehicleData.vehicle_year_of_manufacture = dvlaResult.data.year_of_manufacture;
      vehicleData.dvla_lookup_successful = true;
      vehicleData.dvla_lookup_timestamp = new Date().toISOString();

      // If last_v5c_issued not provided, use DVLA data
      if (!last_v5c_issued && dvlaResult.data.date_of_last_v5c_issued) {
        vehicleData.last_v5c_issued = dvlaResult.data.date_of_last_v5c_issued;
      }

      logger.success('DVLA lookup successful, vehicle details populated', {
        registration: vehicle_license_plate,
        make: dvlaResult.data.make,
        model: dvlaResult.data.model
      });
    } else {
      // DVLA lookup failed - still create record but flag error
      vehicleData.dvla_lookup_successful = false;
      vehicleData.dvla_error_message = dvlaResult.error;

      logger.warn('DVLA lookup failed, creating record without vehicle details', {
        registration: vehicle_license_plate,
        error: dvlaResult.error,
        errorCode: dvlaResult.errorCode
      });
    }

    // Insert vehicle record
    const { data, error } = await supabase
      .from('incident_other_vehicles')
      .insert(vehicleData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating vehicle:', error);
      return sendError(res, 500, 'Failed to create vehicle record', 'CREATE_FAILED');
    }

    // Log GDPR activity
    await gdprService.logActivity(create_user_id, 'OTHER_VEHICLE_ADDED', {
      incident_id,
      vehicle_id: data.id,
      license_plate: vehicle_license_plate,
      dvla_lookup_successful: dvlaResult.success
    }, req);

    logger.success('Vehicle created successfully', {
      vehicle_id: data.id,
      dvla_lookup_successful: dvlaResult.success
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      vehicle: data,
      dvla_lookup: {
        successful: dvlaResult.success,
        error: dvlaResult.success ? null : dvlaResult.error
      },
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error in createVehicle:', error);
    sendError(res, 500, 'Failed to create vehicle', 'INTERNAL_ERROR');
  }
}

/**
 * Get all vehicles for an incident
 * GET /api/other-vehicles/:incident_id
 */
async function getVehiclesByIncident(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { incident_id } = req.params;

    if (!incident_id) {
      return sendError(res, 400, 'Incident ID required', 'MISSING_INCIDENT_ID');
    }

    logger.info('Fetching vehicles for incident', { incident_id });

    // Get all vehicles for this incident (excluding soft deleted)
    const { data, error } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .eq('incident_id', incident_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching vehicles:', error);
      return sendError(res, 500, 'Failed to fetch vehicles', 'FETCH_FAILED');
    }

    logger.info('Vehicles retrieved successfully', {
      incident_id,
      count: data.length
    });

    res.json({
      success: true,
      vehicles: data || [],
      count: data?.length || 0,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error in getVehiclesByIncident:', error);
    sendError(res, 500, 'Failed to fetch vehicles', 'INTERNAL_ERROR');
  }
}

/**
 * Update a vehicle record
 * PUT /api/other-vehicles/:vehicle_id
 * Body: { driver_name, driver_phone, etc. }
 */
async function updateVehicle(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { vehicle_id } = req.params;
    const {
      driver_name,
      driver_phone,
      driver_address,
      insurance_company,
      policy_number,
      policy_cover,
      policy_holder,
      last_v5c_issued,
      damage_description
    } = req.body;

    if (!vehicle_id) {
      return sendError(res, 400, 'Vehicle ID required', 'MISSING_VEHICLE_ID');
    }

    logger.info('Updating vehicle record', { vehicle_id });

    // Build update object with only provided fields
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (driver_name !== undefined) updateData.driver_name = driver_name;
    if (driver_phone !== undefined) updateData.driver_phone = driver_phone;
    if (driver_address !== undefined) updateData.driver_address = driver_address;
    if (insurance_company !== undefined) updateData.insurance_company = insurance_company;
    if (policy_number !== undefined) updateData.policy_number = policy_number;
    if (policy_cover !== undefined) updateData.policy_cover = policy_cover;
    if (policy_holder !== undefined) updateData.policy_holder = policy_holder;
    if (last_v5c_issued !== undefined) updateData.last_v5c_issued = last_v5c_issued;
    if (damage_description !== undefined) updateData.damage_description = damage_description;

    const { data, error } = await supabase
      .from('incident_other_vehicles')
      .update(updateData)
      .eq('id', vehicle_id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error('Error updating vehicle:', error);
      return sendError(res, 500, 'Failed to update vehicle', 'UPDATE_FAILED');
    }

    if (!data) {
      return sendError(res, 404, 'Vehicle not found', 'VEHICLE_NOT_FOUND');
    }

    // Log GDPR activity
    await gdprService.logActivity(data.create_user_id, 'OTHER_VEHICLE_UPDATED', {
      vehicle_id: data.id,
      incident_id: data.incident_id
    }, req);

    logger.success('Vehicle updated successfully', { vehicle_id });

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      vehicle: data,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error in updateVehicle:', error);
    sendError(res, 500, 'Failed to update vehicle', 'INTERNAL_ERROR');
  }
}

/**
 * Delete a vehicle record (soft delete)
 * DELETE /api/other-vehicles/:vehicle_id
 */
async function deleteVehicle(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { vehicle_id } = req.params;

    if (!vehicle_id) {
      return sendError(res, 400, 'Vehicle ID required', 'MISSING_VEHICLE_ID');
    }

    logger.info('Deleting vehicle record', { vehicle_id });

    // Soft delete by setting deleted_at timestamp
    const { data, error } = await supabase
      .from('incident_other_vehicles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', vehicle_id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error('Error deleting vehicle:', error);
      return sendError(res, 500, 'Failed to delete vehicle', 'DELETE_FAILED');
    }

    if (!data) {
      return sendError(res, 404, 'Vehicle not found', 'VEHICLE_NOT_FOUND');
    }

    // Log GDPR activity
    await gdprService.logActivity(data.create_user_id, 'OTHER_VEHICLE_DELETED', {
      vehicle_id: data.id,
      incident_id: data.incident_id
    }, req);

    logger.success('Vehicle deleted successfully', { vehicle_id });

    res.json({
      success: true,
      message: 'Vehicle deleted successfully',
      vehicle_id: vehicle_id,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error in deleteVehicle:', error);
    sendError(res, 500, 'Failed to delete vehicle', 'INTERNAL_ERROR');
  }
}

/**
 * Lookup vehicle details via DVLA (standalone endpoint for frontend use)
 * POST /api/other-vehicles/dvla-lookup
 * Body: { vehicle_license_plate }
 */
async function dvlaLookup(req, res) {
  try {
    const { vehicle_license_plate } = req.body;

    if (!vehicle_license_plate) {
      return sendError(res, 400, 'Vehicle license plate required', 'MISSING_LICENSE_PLATE');
    }

    logger.info('DVLA lookup requested', { vehicle_license_plate });

    const dvlaResult = await dvlaService.lookupVehicle(vehicle_license_plate);

    if (dvlaResult.success) {
      logger.success('DVLA lookup successful', {
        registration: vehicle_license_plate,
        make: dvlaResult.data.make
      });

      res.json({
        success: true,
        vehicle: dvlaResult.data,
        requestId: req.requestId
      });
    } else {
      logger.warn('DVLA lookup failed', {
        registration: vehicle_license_plate,
        error: dvlaResult.error
      });

      res.json({
        success: false,
        error: dvlaResult.error,
        errorCode: dvlaResult.errorCode,
        requestId: req.requestId
      });
    }

  } catch (error) {
    logger.error('Error in dvlaLookup:', error);
    sendError(res, 500, 'Failed to lookup vehicle', 'INTERNAL_ERROR');
  }
}

/**
 * Generate PDF for a specific vehicle
 * POST /api/other-vehicles/:vehicle_id/generate-pdf
 */
async function generateVehiclePdf(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { vehicle_id } = req.params;

    if (!vehicle_id) {
      return sendError(res, 400, 'Vehicle ID required', 'MISSING_VEHICLE_ID');
    }

    logger.info('Generating PDF for vehicle', { vehicle_id });

    // Fetch vehicle data from database
    const { data: vehicle, error } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .eq('id', vehicle_id)
      .is('deleted_at', null)
      .single();

    if (error || !vehicle) {
      logger.error('Vehicle not found:', error);
      return sendError(res, 404, 'Vehicle not found', 'VEHICLE_NOT_FOUND');
    }

    // Generate PDF using service
    const pdfBuffer = await witnessVehiclePdfService.generateVehiclePdf(
      vehicle,
      vehicle.create_user_id
    );

    // Store PDF in Supabase Storage (optional - for now just return it)
    const fileName = `vehicle-${vehicle_id}-${Date.now()}.pdf`;

    // TODO: Upload to Supabase Storage if needed
    // For now, just send the PDF directly to the client

    // Log GDPR activity
    await gdprService.logActivity(vehicle.create_user_id, 'VEHICLE_PDF_GENERATED', {
      vehicle_id,
      incident_id: vehicle.incident_id
    }, req);

    logger.success('Vehicle PDF generated successfully', { vehicle_id, size: pdfBuffer.length });

    // Set headers to download PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    logger.error('Error generating vehicle PDF:', error);
    sendError(res, 500, 'Failed to generate vehicle PDF', 'PDF_GENERATION_FAILED');
  }
}

module.exports = {
  createVehicle,
  getVehiclesByIncident,
  updateVehicle,
  deleteVehicle,
  dvlaLookup,
  generateVehiclePdf
};
