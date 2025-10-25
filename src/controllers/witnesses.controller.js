/**
 * Witnesses Controller for Car Crash Lawyer AI
 * Handles CRUD operations for incident witnesses
 *
 * Features:
 * - Add witnesses to incidents
 * - List witnesses for an incident
 * - Update witness information
 * - Delete witnesses (soft delete)
 * - GDPR compliance logging
 */

const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const gdprService = require('../services/gdprService');
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
 * Create a new witness for an incident
 * POST /api/witnesses
 * Body: { incident_id, create_user_id, witness_name, witness_phone, witness_email, witness_address, witness_statement }
 */
async function createWitness(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const {
      incident_id,
      create_user_id,
      witness_name,
      witness_phone,
      witness_email,
      witness_address,
      witness_statement
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

    if (!witness_name || witness_name.trim() === '') {
      return sendError(res, 400, 'Witness name required', 'MISSING_WITNESS_NAME');
    }

    logger.info('Creating witness record', { incident_id, create_user_id });

    // Insert witness record
    const { data, error } = await supabase
      .from('incident_witnesses')
      .insert({
        incident_id,
        create_user_id,
        witness_name: witness_name.trim(),
        witness_phone: witness_phone || null,
        witness_email: witness_email || null,
        witness_address: witness_address || null,
        witness_statement: witness_statement || null,
        gdpr_consent: true,  // User is inputting this data for legal purposes
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating witness:', error);
      return sendError(res, 500, 'Failed to create witness record', 'CREATE_FAILED');
    }

    // Log GDPR activity
    await gdprService.logActivity(create_user_id, 'WITNESS_ADDED', {
      incident_id,
      witness_id: data.id,
      witness_name
    }, req);

    logger.success('Witness created successfully', { witness_id: data.id });

    res.status(201).json({
      success: true,
      message: 'Witness added successfully',
      witness: data,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error in createWitness:', error);
    sendError(res, 500, 'Failed to create witness', 'INTERNAL_ERROR');
  }
}

/**
 * Get all witnesses for an incident
 * GET /api/witnesses/:incident_id
 */
async function getWitnessesByIncident(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { incident_id } = req.params;

    if (!incident_id) {
      return sendError(res, 400, 'Incident ID required', 'MISSING_INCIDENT_ID');
    }

    logger.info('Fetching witnesses for incident', { incident_id });

    // Get all witnesses for this incident (excluding soft deleted)
    const { data, error } = await supabase
      .from('incident_witnesses')
      .select('*')
      .eq('incident_id', incident_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching witnesses:', error);
      return sendError(res, 500, 'Failed to fetch witnesses', 'FETCH_FAILED');
    }

    logger.info('Witnesses retrieved successfully', { incident_id, count: data.length });

    res.json({
      success: true,
      witnesses: data || [],
      count: data?.length || 0,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error in getWitnessesByIncident:', error);
    sendError(res, 500, 'Failed to fetch witnesses', 'INTERNAL_ERROR');
  }
}

/**
 * Update a witness record
 * PUT /api/witnesses/:witness_id
 * Body: { witness_name, witness_phone, witness_email, witness_address, witness_statement }
 */
async function updateWitness(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { witness_id } = req.params;
    const {
      witness_name,
      witness_phone,
      witness_email,
      witness_address,
      witness_statement
    } = req.body;

    if (!witness_id) {
      return sendError(res, 400, 'Witness ID required', 'MISSING_WITNESS_ID');
    }

    logger.info('Updating witness record', { witness_id });

    // Build update object with only provided fields
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (witness_name !== undefined) updateData.witness_name = witness_name.trim();
    if (witness_phone !== undefined) updateData.witness_phone = witness_phone;
    if (witness_email !== undefined) updateData.witness_email = witness_email;
    if (witness_address !== undefined) updateData.witness_address = witness_address;
    if (witness_statement !== undefined) updateData.witness_statement = witness_statement;

    const { data, error } = await supabase
      .from('incident_witnesses')
      .update(updateData)
      .eq('id', witness_id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error('Error updating witness:', error);
      return sendError(res, 500, 'Failed to update witness', 'UPDATE_FAILED');
    }

    if (!data) {
      return sendError(res, 404, 'Witness not found', 'WITNESS_NOT_FOUND');
    }

    // Log GDPR activity
    await gdprService.logActivity(data.create_user_id, 'WITNESS_UPDATED', {
      witness_id: data.id,
      incident_id: data.incident_id
    }, req);

    logger.success('Witness updated successfully', { witness_id });

    res.json({
      success: true,
      message: 'Witness updated successfully',
      witness: data,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error in updateWitness:', error);
    sendError(res, 500, 'Failed to update witness', 'INTERNAL_ERROR');
  }
}

/**
 * Delete a witness record (soft delete)
 * DELETE /api/witnesses/:witness_id
 */
async function deleteWitness(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { witness_id } = req.params;

    if (!witness_id) {
      return sendError(res, 400, 'Witness ID required', 'MISSING_WITNESS_ID');
    }

    logger.info('Deleting witness record', { witness_id });

    // Soft delete by setting deleted_at timestamp
    const { data, error } = await supabase
      .from('incident_witnesses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', witness_id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error('Error deleting witness:', error);
      return sendError(res, 500, 'Failed to delete witness', 'DELETE_FAILED');
    }

    if (!data) {
      return sendError(res, 404, 'Witness not found', 'WITNESS_NOT_FOUND');
    }

    // Log GDPR activity
    await gdprService.logActivity(data.create_user_id, 'WITNESS_DELETED', {
      witness_id: data.id,
      incident_id: data.incident_id
    }, req);

    logger.success('Witness deleted successfully', { witness_id });

    res.json({
      success: true,
      message: 'Witness deleted successfully',
      witness_id: witness_id,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error in deleteWitness:', error);
    sendError(res, 500, 'Failed to delete witness', 'INTERNAL_ERROR');
  }
}

/**
 * Generate PDF for a specific witness
 * POST /api/witnesses/:witness_id/generate-pdf
 */
async function generateWitnessPdf(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { witness_id } = req.params;

    if (!witness_id) {
      return sendError(res, 400, 'Witness ID required', 'MISSING_WITNESS_ID');
    }

    logger.info('Generating PDF for witness', { witness_id });

    // Fetch witness data from database
    const { data: witness, error } = await supabase
      .from('incident_witnesses')
      .select('*')
      .eq('id', witness_id)
      .is('deleted_at', null)
      .single();

    if (error || !witness) {
      logger.error('Witness not found:', error);
      return sendError(res, 404, 'Witness not found', 'WITNESS_NOT_FOUND');
    }

    // Generate PDF using service
    const pdfBuffer = await witnessVehiclePdfService.generateWitnessPdf(
      witness,
      witness.create_user_id
    );

    // Store PDF in Supabase Storage (optional - for now just return it)
    const fileName = `witness-${witness_id}-${Date.now()}.pdf`;

    // TODO: Upload to Supabase Storage if needed
    // For now, just send the PDF directly to the client

    // Log GDPR activity
    await gdprService.logActivity(witness.create_user_id, 'WITNESS_PDF_GENERATED', {
      witness_id,
      incident_id: witness.incident_id
    }, req);

    logger.success('Witness PDF generated successfully', { witness_id, size: pdfBuffer.length });

    // Set headers to download PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    logger.error('Error generating witness PDF:', error);
    sendError(res, 500, 'Failed to generate witness PDF', 'PDF_GENERATION_FAILED');
  }
}

module.exports = {
  createWitness,
  getWitnessesByIncident,
  updateWitness,
  deleteWitness,
  generateWitnessPdf
};
