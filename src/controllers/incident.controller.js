/**
 * Incident Controller - Car Crash Lawyer AI
 * Handles incident reporting and management
 * ✅ NO DIRECT TABLE WRITES - Uses storage and Auth metadata only
 */

const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with ANON key (for storage only)
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

/**
 * Create new incident report
 * POST /api/incident/report
 */
async function createIncidentReport(req, res) {
  try {
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, 'User not authenticated', 'UNAUTHORIZED');
    }

    const incidentData = req.body;

    logger.info('Creating incident report', {
      userId,
      hasLocation: !!incidentData.location,
      hasDateTime: !!incidentData.dateTime
    });

    // Validate required fields
    if (!incidentData.dateTime) {
      return sendError(res, 400, 'Incident date and time required', 'MISSING_DATETIME');
    }

    // Generate unique incident ID
    const incidentId = `INC_${Date.now()}_${userId.substring(0, 8)}`;

    // Prepare incident data structure
    const incident = {
      incidentId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending_processing',

      // Incident details
      dateTime: incidentData.dateTime,
      location: incidentData.location || {},
      description: incidentData.description || '',

      // Vehicle information
      vehicleInfo: incidentData.vehicleInfo || {},

      // Other party information
      otherParties: incidentData.otherParties || [],

      // Witness information
      witnesses: incidentData.witnesses || [],

      // Damage assessment
      damages: incidentData.damages || {},

      // Police/Emergency services
      policeInvolved: incidentData.policeInvolved || false,
      policeReferenceNumber: incidentData.policeReferenceNumber || '',

      // Insurance
      insuranceNotified: incidentData.insuranceNotified || false,
      insuranceReferenceNumber: incidentData.insuranceReferenceNumber || '',

      // Additional notes
      additionalNotes: incidentData.additionalNotes || '',

      // Processing flags
      transcriptionCompleted: false,
      aiSummaryGenerated: false,
      pdfGenerated: false,
      emailSent: false
    };

    // ✅ Store incident as JSON file in storage (not in table)
    const incidentFileName = `${userId}/incidents/${incidentId}.json`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('incident-reports')
      .upload(incidentFileName, JSON.stringify(incident, null, 2), {
        contentType: 'application/json',
        upsert: false
      });

    if (uploadError) {
      logger.error('Failed to store incident report', {
        userId,
        incidentId,
        error: uploadError.message
      });
      return sendError(res, 500, 'Failed to save incident report', 'STORAGE_ERROR');
    }

    logger.success('Incident report created', {
      userId,
      incidentId,
      storagePath: uploadData.path
    });

    // ✅ Update user metadata with incident count
    try {
      const currentIncidentCount = req.user.user_metadata?.total_incidents || 0;
      const lastIncidentDate = new Date().toISOString();

      await supabase.auth.updateUser({
        data: {
          total_incidents: currentIncidentCount + 1,
          last_incident_date: lastIncidentDate,
          last_incident_id: incidentId
        }
      });

      logger.info('User metadata updated with incident info', { userId, incidentId });
    } catch (metadataError) {
      logger.warn('Failed to update user metadata (non-critical)', {
        userId,
        error: metadataError.message
      });
    }

    res.json({
      success: true,
      incident: {
        incidentId,
        createdAt: incident.createdAt,
        status: incident.status,
        storagePath: uploadData.path
      }
    });

  } catch (error) {
    logger.error('Incident creation error', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Failed to create incident', 'INCIDENT_ERROR');
  }
}

/**
 * Get all incidents for user
 * Lists from storage bucket instead of database
 * GET /api/incident/list
 */
async function listIncidents(req, res) {
  try {
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, 'User not authenticated', 'UNAUTHORIZED');
    }

    logger.info('Listing incidents for user', { userId });

    // List incident files from storage
    const { data: files, error } = await supabase
      .storage
      .from('incident-reports')
      .list(`${userId}/incidents`, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      logger.error('Failed to list incidents', {
        userId,
        error: error.message
      });
      return sendError(res, 500, 'Failed to retrieve incidents', 'LIST_ERROR');
    }

    // Download and parse each incident file
    const incidents = await Promise.all(
      files
        .filter(file => file.name.endsWith('.json'))
        .map(async (file) => {
          try {
            const { data: fileData } = await supabase
              .storage
              .from('incident-reports')
              .download(`${userId}/incidents/${file.name}`);

            const incidentText = await fileData.text();
            const incident = JSON.parse(incidentText);

            // Return summary data (not full incident)
            return {
              incidentId: incident.incidentId,
              createdAt: incident.createdAt,
              dateTime: incident.dateTime,
              location: incident.location,
              status: incident.status,
              policeInvolved: incident.policeInvolved,
              transcriptionCompleted: incident.transcriptionCompleted,
              pdfGenerated: incident.pdfGenerated
            };
          } catch (parseError) {
            logger.warn('Failed to parse incident file', {
              userId,
              fileName: file.name,
              error: parseError.message
            });
            return null;
          }
        })
    );

    // Filter out any failed parses
    const validIncidents = incidents.filter(inc => inc !== null);

    logger.success('Incidents listed', {
      userId,
      count: validIncidents.length
    });

    res.json({
      success: true,
      incidents: validIncidents,
      total: validIncidents.length
    });

  } catch (error) {
    logger.error('List incidents error', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Failed to list incidents', 'LIST_ERROR');
  }
}

/**
 * Get specific incident by ID
 * GET /api/incident/:incidentId
 */
async function getIncident(req, res) {
  try {
    const userId = req.userId;
    const { incidentId } = req.params;

    if (!userId) {
      return sendError(res, 401, 'User not authenticated', 'UNAUTHORIZED');
    }

    logger.info('Getting incident', { userId, incidentId });

    // Download incident JSON from storage
    const { data, error } = await supabase
      .storage
      .from('incident-reports')
      .download(`${userId}/incidents/${incidentId}.json`);

    if (error) {
      logger.error('Failed to download incident', {
        userId,
        incidentId,
        error: error.message
      });
      return sendError(res, 404, 'Incident not found', 'NOT_FOUND');
    }

    // Parse JSON data
    const incidentText = await data.text();
    const incident = JSON.parse(incidentText);

    // Verify ownership
    if (incident.userId !== userId) {
      logger.warn('Unauthorized incident access attempt', {
        userId,
        incidentId,
        actualOwner: incident.userId
      });
      return sendError(res, 403, 'Access denied', 'FORBIDDEN');
    }

    res.json({
      success: true,
      incident
    });

  } catch (error) {
    logger.error('Get incident error', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Failed to get incident', 'GET_ERROR');
  }
}

/**
 * Update incident status/data
 * PUT /api/incident/:incidentId
 */
async function updateIncident(req, res) {
  try {
    const userId = req.userId;
    const { incidentId } = req.params;
    const updates = req.body;

    if (!userId) {
      return sendError(res, 401, 'User not authenticated', 'UNAUTHORIZED');
    }

    logger.info('Updating incident', { userId, incidentId });

    // Download existing incident
    const { data: existingData, error: downloadError } = await supabase
      .storage
      .from('incident-reports')
      .download(`${userId}/incidents/${incidentId}.json`);

    if (downloadError) {
      return sendError(res, 404, 'Incident not found', 'NOT_FOUND');
    }

    // Parse and verify ownership
    const existingIncidentText = await existingData.text();
    const existingIncident = JSON.parse(existingIncidentText);

    if (existingIncident.userId !== userId) {
      return sendError(res, 403, 'Access denied', 'FORBIDDEN');
    }

    // Merge updates
    const updatedIncident = {
      ...existingIncident,
      ...updates,
      updatedAt: new Date().toISOString(),
      // Prevent changing these fields
      incidentId: existingIncident.incidentId,
      userId: existingIncident.userId,
      createdAt: existingIncident.createdAt
    };

    // Upload updated incident (overwrite)
    const { error: uploadError } = await supabase
      .storage
      .from('incident-reports')
      .update(
        `${userId}/incidents/${incidentId}.json`,
        JSON.stringify(updatedIncident, null, 2),
        {
          contentType: 'application/json',
          upsert: true
        }
      );

    if (uploadError) {
      logger.error('Failed to update incident', {
        userId,
        incidentId,
        error: uploadError.message
      });
      return sendError(res, 500, 'Failed to update incident', 'UPDATE_ERROR');
    }

    logger.success('Incident updated', { userId, incidentId });

    res.json({
      success: true,
      incident: updatedIncident
    });

  } catch (error) {
    logger.error('Update incident error', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Failed to update incident', 'UPDATE_ERROR');
  }
}

/**
 * Delete incident
 * DELETE /api/incident/:incidentId
 */
async function deleteIncident(req, res) {
  try {
    const userId = req.userId;
    const { incidentId } = req.params;

    if (!userId) {
      return sendError(res, 401, 'User not authenticated', 'UNAUTHORIZED');
    }

    logger.info('Deleting incident', { userId, incidentId });

    // First, verify ownership by downloading
    const { data: existingData, error: downloadError } = await supabase
      .storage
      .from('incident-reports')
      .download(`${userId}/incidents/${incidentId}.json`);

    if (downloadError) {
      return sendError(res, 404, 'Incident not found', 'NOT_FOUND');
    }

    const incidentText = await existingData.text();
    const incident = JSON.parse(incidentText);

    if (incident.userId !== userId) {
      return sendError(res, 403, 'Access denied', 'FORBIDDEN');
    }

    // Delete the incident file
    const { error: deleteError } = await supabase
      .storage
      .from('incident-reports')
      .remove([`${userId}/incidents/${incidentId}.json`]);

    if (deleteError) {
      logger.error('Failed to delete incident', {
        userId,
        incidentId,
        error: deleteError.message
      });
      return sendError(res, 500, 'Failed to delete incident', 'DELETE_ERROR');
    }

    // Also delete associated media files if they exist
    try {
      await supabase
        .storage
        .from('incident-media')
        .remove([`${userId}/${incidentId}/`]);
    } catch (mediaError) {
      logger.warn('No media files to delete or deletion failed', {
        userId,
        incidentId
      });
    }

    logger.success('Incident deleted', { userId, incidentId });

    res.json({
      success: true,
      message: 'Incident deleted successfully'
    });

  } catch (error) {
    logger.error('Delete incident error', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Failed to delete incident', 'DELETE_ERROR');
  }
}

/**
 * Upload incident photos
 * POST /api/incident/:incidentId/photos
 */
async function uploadIncidentPhotos(req, res) {
  try {
    const userId = req.userId;
    const { incidentId } = req.params;

    if (!userId) {
      return sendError(res, 401, 'User not authenticated', 'UNAUTHORIZED');
    }

    if (!req.files || req.files.length === 0) {
      return sendError(res, 400, 'No photos provided', 'MISSING_FILES');
    }

    logger.info('Uploading incident photos', {
      userId,
      incidentId,
      photoCount: req.files.length
    });

    // Upload each photo to storage
    const uploadPromises = req.files.map(async (file, index) => {
      const fileName = `${userId}/${incidentId}/photos/${Date.now()}_${index}_${file.originalname}`;

      const { data, error } = await supabase
        .storage
        .from('incident-media')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        logger.error('Photo upload failed', {
          userId,
          incidentId,
          fileName,
          error: error.message
        });
        return { success: false, fileName, error: error.message };
      }

      return { success: true, fileName, path: data.path };
    });

    const results = await Promise.all(uploadPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    logger.success('Photos uploaded', {
      userId,
      incidentId,
      successful: successful.length,
      failed: failed.length
    });

    res.json({
      success: true,
      uploaded: successful.length,
      failed: failed.length,
      photos: successful
    });

  } catch (error) {
    logger.error('Photo upload error', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Failed to upload photos', 'UPLOAD_ERROR');
  }
}

module.exports = {
  createIncidentReport,
  listIncidents,
  getIncident,
  updateIncident,
  deleteIncident,
  uploadIncidentPhotos
};