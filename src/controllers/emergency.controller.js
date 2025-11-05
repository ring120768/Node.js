
/**
 * Emergency Controller for Car Crash Lawyer AI
 * Handles emergency contact management and emergency call logging
 */

const { validateUserId } = require('../utils/validators');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const gdprService = require('../services/gdprService');
const { createClient } = require('@supabase/supabase-js');

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
 * Get Emergency Contact Number (singular)
 * GET /api/emergency/contact/:userId
 */
async function getEmergencyContact(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;

    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    logger.info('Fetching emergency contact', { userId });

    const { data, error } = await supabase
      .from('user_signup')
      .select('emergency_contact_number, emergency_contact, first_name, last_name')
      .eq('create_user_id', userId)
      .single();

    if (error) {
      logger.error('Error fetching emergency contact:', error);
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    if (!data) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    // Parse emergency_contact if it's in pipe-delimited format
    let contactNumber = data.emergency_contact_number;
    if (!contactNumber && data.emergency_contact) {
      // Parse pipe-delimited format: "Name | Phone | Email | Company"
      if (data.emergency_contact.includes('|')) {
        const parts = data.emergency_contact.split('|').map(part => part.trim());
        contactNumber = parts.length >= 2 && parts[1] ? parts[1] : data.emergency_contact;
      } else {
        contactNumber = data.emergency_contact;
      }
    }

    const userName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User';

    await gdprService.logActivity(userId, 'EMERGENCY_CONTACT_ACCESSED', {
      has_contact: !!contactNumber,
      source: 'emergency_feature'
    }, req);

    if (!contactNumber) {
      logger.warn('No emergency contact found for user', { userId });
      return res.json({
        success: true,
        hasEmergencyContact: false,
        emergencyContact: null,
        message: 'No emergency contact configured',
        userName: userName,
        requestId: req.requestId
      });
    }

    logger.info('Emergency contact retrieved successfully', { userId, hasContact: true });

    res.json({
      success: true,
      hasEmergencyContact: true,
      emergencyContact: contactNumber,
      userName: userName,
      message: 'Emergency contact retrieved',
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error in emergency contact endpoint:', error);
    sendError(res, 500, 'Failed to fetch emergency contact', 'INTERNAL_ERROR');
  }
}

/**
 * Update Emergency Contact Number
 * PUT /api/emergency/contact/:userId
 */
async function updateEmergencyContact(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;
    const { emergencyContact } = req.body;

    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    if (!emergencyContact) {
      return sendError(res, 400, 'Emergency contact number required', 'MISSING_CONTACT');
    }

    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(emergencyContact)) {
      return sendError(res, 400, 'Invalid phone number format', 'INVALID_PHONE');
    }

    logger.info('Updating emergency contact', { userId });

    const { data, error } = await supabase
      .from('user_signup')
      .update({
        emergency_contact_number: emergencyContact,
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating emergency contact:', error);
      return sendError(res, 500, 'Failed to update emergency contact', 'UPDATE_FAILED');
    }

    if (!data) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    await gdprService.logActivity(userId, 'DATA_UPDATE', {
      type: 'emergency_contact',
      action: 'updated'
    }, req);

    logger.success('Emergency contact updated successfully', { userId });

    res.json({
      success: true,
      message: 'Emergency contact updated successfully',
      emergencyContact: emergencyContact,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error updating emergency contact:', error);
    sendError(res, 500, 'Failed to update emergency contact', 'INTERNAL_ERROR');
  }
}

/**
 * Parse pipe-delimited emergency_contact field
 * Format: "Name | Phone | Email | Company"
 * Returns just the phone number (index 1)
 */
function parseEmergencyContact(emergencyContactString) {
  if (!emergencyContactString) return null;

  // Check if it's pipe-delimited format
  if (emergencyContactString.includes('|')) {
    const parts = emergencyContactString.split('|').map(part => part.trim());
    // Phone number is typically the second part (index 1)
    if (parts.length >= 2 && parts[1]) {
      return parts[1];
    }
  }

  // If not pipe-delimited or can't parse, return as-is
  return emergencyContactString;
}

/**
 * Get emergency contacts (plural - for backward compatibility)
 * GET /api/emergency/contacts/:userId
 */
async function getEmergencyContacts(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_signup')
      .select('emergency_contact, emergency_contact_number, recovery_breakdown_number')
      .eq('create_user_id', userId)
      .single();

    if (error) {
      logger.error('Supabase error', error);
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    // Parse emergency_contact if it's in pipe-delimited format
    let emergencyContactNumber = data.emergency_contact_number;
    if (!emergencyContactNumber && data.emergency_contact) {
      emergencyContactNumber = parseEmergencyContact(data.emergency_contact);
      logger.info('Parsed emergency contact from pipe-delimited format', {
        original: data.emergency_contact,
        parsed: emergencyContactNumber
      });
    }

    res.json({
      emergency_contact: emergencyContactNumber || null,
      recovery_breakdown_number: data.recovery_breakdown_number || null,
      emergency_services_number: '999',
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error fetching emergency contacts', error);
    sendError(res, 500, 'Failed to fetch contacts', 'FETCH_FAILED');
  }
}

/**
 * Log emergency call
 * POST /api/emergency/log-call
 */
async function logEmergencyCall(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { user_id, service_called, timestamp, incident_id } = req.body;

    if (!user_id) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID');
    }

    const { data, error } = await supabase
      .from('emergency_call_logs')
      .insert({
        user_id,
        service_called,
        incident_id: incident_id || null,
        timestamp,
        created_at: new Date().toISOString()
      });

    if (error) {
      logger.error('Failed to log emergency call', error);
      return res.json({
        success: false,
        logged: false,
        requestId: req.requestId
      });
    }

    await gdprService.logActivity(user_id, 'EMERGENCY_CALL_LOGGED', {
      service: service_called
    }, req);

    res.json({
      success: true,
      logged: true,
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error logging emergency call', error);
    sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
  }
}

/**
 * Save Emergency Audio Recording (AI Eavesdropper)
 * POST /api/emergency/audio
 * Body: { userId, incidentId, audioFile, transcriptionText, recordedAt }
 */
async function saveEmergencyAudio(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId, incidentId, audioUrl, transcriptionText, recordedAt } = req.body;

    if (!userId) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID');
    }

    if (!transcriptionText) {
      return sendError(res, 400, 'Transcription text required', 'MISSING_TRANSCRIPTION');
    }

    logger.info('Saving emergency audio recording', {
      userId,
      incidentId,
      hasTranscription: !!transcriptionText,
      recordedAt
    });

    // Save to ai_listening_transcripts table
    const { data, error } = await supabase
      .from('ai_listening_transcripts')
      .insert({
        create_user_id: userId,
        incident_id: incidentId || null,
        audio_url: audioUrl || null,
        transcription_text: transcriptionText,
        recorded_at: recordedAt || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to save emergency audio', error);
      return sendError(res, 500, 'Failed to save emergency recording', 'SAVE_FAILED');
    }

    // Log GDPR activity
    await gdprService.logActivity(userId, 'EMERGENCY_AUDIO_SAVED', {
      recording_id: data.id,
      incident_id: incidentId,
      has_audio_file: !!audioUrl
    }, req);

    logger.success('Emergency audio saved successfully', {
      recordingId: data.id,
      userId
    });

    res.json({
      success: true,
      message: 'Emergency recording saved successfully',
      recordingId: data.id,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error saving emergency audio', error);
    sendError(res, 500, 'Failed to save emergency recording', 'INTERNAL_ERROR');
  }
}

/**
 * Get Emergency Audio Recordings
 * GET /api/emergency/audio/:userId
 */
async function getEmergencyAudio(req, res) {
  if (!supabase) {
    return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
  }

  try {
    const { userId } = req.params;
    const { incidentId } = req.query;

    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    logger.info('Fetching emergency audio recordings', { userId, incidentId });

    let query = supabase
      .from('ai_listening_transcripts')
      .select('*')
      .eq('create_user_id', userId)
      .order('recorded_at', { ascending: false });

    // Filter by incident if provided
    if (incidentId) {
      query = query.eq('incident_id', incidentId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching emergency audio', error);
      return sendError(res, 500, 'Failed to fetch recordings', 'FETCH_FAILED');
    }

    // Generate fresh signed URLs for audio files
    const recordingsWithUrls = await Promise.all(
      (data || []).map(async (recording) => {
        if (recording.audio_storage_path) {
          const { data: signedData, error: signedError } = await supabase.storage
            .from('incident-audio')
            .createSignedUrl(recording.audio_storage_path, 31536000); // 365 days

          if (signedData && !signedError) {
            recording.audio_url = signedData.signedUrl;
          }
        }
        return recording;
      })
    );

    await gdprService.logActivity(userId, 'EMERGENCY_AUDIO_ACCESSED', {
      count: recordingsWithUrls.length,
      incident_id: incidentId
    }, req);

    logger.info('Emergency audio recordings retrieved', {
      userId,
      count: recordingsWithUrls.length
    });

    res.json({
      success: true,
      recordings: recordingsWithUrls,
      count: recordingsWithUrls.length,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error in get emergency audio endpoint', error);
    sendError(res, 500, 'Failed to fetch recordings', 'INTERNAL_ERROR');
  }
}

module.exports = {
  getEmergencyContact,
  updateEmergencyContact,
  getEmergencyContacts,
  logEmergencyCall,
  saveEmergencyAudio,
  getEmergencyAudio
};
