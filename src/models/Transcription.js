
/**
 * Transcription Model
 * Handles all transcription-related database operations
 */

const logger = require('../utils/logger');
const config = require('../config');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for the model
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
 * Save transcription data
 * @param {Object} data - Transcription data
 * @param {string} data.create_user_id - User ID
 * @param {string} data.transcription_text - Transcription text
 * @param {string} data.audio_url - Audio URL (optional)
 * @param {string} data.incident_report_id - Incident report ID (optional)
 * @param {Object} data.metadata - Additional metadata (optional)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function saveTranscription(data) {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Database not configured'
      };
    }

    if (!data.create_user_id || !data.transcription_text) {
      return {
        success: false,
        error: 'Missing required fields: create_user_id and transcription_text'
      };
    }

    logger.info('Saving transcription', { 
      userId: data.create_user_id,
      textLength: data.transcription_text.length 
    });

    // Check if transcription already exists for this user and incident
    const { data: existing } = await supabase
      .from('ai_transcription')
      .select('id, audio_url')
      .eq('create_user_id', data.create_user_id)
      .eq('incident_report_id', data.incident_report_id || null)
      .single();

    let result;

    if (existing) {
      // Update existing transcription
      const updateData = {
        transcription_text: data.transcription_text,
        audio_url: data.audio_url || existing.audio_url,
        updated_at: new Date().toISOString()
      };

      if (data.metadata) {
        updateData.metadata = data.metadata;
      }

      const { data: updated, error } = await supabase
        .from('ai_transcription')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = updated;
      logger.success('Transcription updated', { id: existing.id });
    } else {
      // Insert new transcription
      const insertData = {
        create_user_id: data.create_user_id,
        incident_report_id: data.incident_report_id || null,
        transcription_text: data.transcription_text,
        audio_url: data.audio_url || '',
        created_at: new Date().toISOString(),
        metadata: data.metadata || {}
      };

      const { data: inserted, error } = await supabase
        .from('ai_transcription')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      result = inserted;
      logger.success('Transcription saved', { id: inserted.id });
    }

    // Update incident report if incident_report_id is provided
    if (data.incident_report_id) {
      await supabase
        .from('incident_reports')
        .update({
          witness_statement_text: data.transcription_text,
          witness_statement_audio: data.audio_url || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.incident_report_id)
        .eq('create_user_id', data.create_user_id);
    }

    return {
      success: true,
      data: result
    };

  } catch (error) {
    logger.error('Error saving transcription', error);
    return {
      success: false,
      error: error.message || 'Failed to save transcription'
    };
  }
}

/**
 * Get transcriptions by user ID
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Limit results (default: 10)
 * @param {number} options.offset - Offset results (default: 0)
 * @param {boolean} options.includeSummary - Include AI summary (default: true)
 * @returns {Promise<{success: boolean, data?: Array, pagination?: Object, error?: string}>}
 */
async function getTranscriptionByUserId(userId, options = {}) {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Database not configured'
      };
    }

    if (!userId) {
      return {
        success: false,
        error: 'User ID is required'
      };
    }

    const { limit = 10, offset = 0, includeSummary = true } = options;

    logger.info('Getting transcriptions', { userId, limit, offset });

    // Get transcriptions with count
    const { data: transcriptions, error, count } = await supabase
      .from('ai_transcription')
      .select('*', { count: 'exact' })
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    let enrichedTranscriptions = transcriptions || [];

    // Include AI summaries if requested
    if (includeSummary && transcriptions && transcriptions.length > 0) {
      const transcriptionIds = transcriptions.map(t => t.id);
      
      const { data: summaries } = await supabase
        .from('ai_summary')
        .select('*')
        .in('incident_id', transcriptionIds);

      // Map summaries to transcriptions
      enrichedTranscriptions = transcriptions.map(transcription => {
        const summary = summaries?.find(s => s.incident_id === transcription.id);
        return {
          ...transcription,
          ai_summary: summary || null
        };
      });
    }

    logger.success('Transcriptions retrieved', { 
      userId, 
      count: enrichedTranscriptions.length 
    });

    return {
      success: true,
      data: enrichedTranscriptions,
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (count || 0) > (parseInt(offset) + parseInt(limit))
      }
    };

  } catch (error) {
    logger.error('Error getting transcriptions', error);
    return {
      success: false,
      error: error.message || 'Failed to get transcriptions'
    };
  }
}

/**
 * Update transcription by ID
 * @param {string|number} id - Transcription ID
 * @param {Object} data - Update data
 * @param {string} data.transcription_text - Updated transcription text (optional)
 * @param {string} data.audio_url - Updated audio URL (optional)
 * @param {Object} data.metadata - Updated metadata (optional)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function updateTranscription(id, data) {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Database not configured'
      };
    }

    if (!id) {
      return {
        success: false,
        error: 'Transcription ID is required'
      };
    }

    if (!data || Object.keys(data).length === 0) {
      return {
        success: false,
        error: 'Update data is required'
      };
    }

    logger.info('Updating transcription', { id });

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (data.transcription_text) {
      updateData.transcription_text = data.transcription_text;
    }

    if (data.audio_url !== undefined) {
      updateData.audio_url = data.audio_url;
    }

    if (data.metadata) {
      updateData.metadata = data.metadata;
    }

    // Update the transcription
    const { data: updated, error } = await supabase
      .from('ai_transcription')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!updated) {
      return {
        success: false,
        error: 'Transcription not found'
      };
    }

    logger.success('Transcription updated', { id });

    return {
      success: true,
      data: updated
    };

  } catch (error) {
    logger.error('Error updating transcription', error);
    return {
      success: false,
      error: error.message || 'Failed to update transcription'
    };
  }
}

/**
 * Get latest transcription for a user
 * @param {string} userId - User ID
 * @param {boolean} includeSummary - Include AI summary (default: true)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function getLatestTranscription(userId, includeSummary = true) {
  try {
    const result = await getTranscriptionByUserId(userId, { 
      limit: 1, 
      offset: 0, 
      includeSummary 
    });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data && result.data.length > 0 ? result.data[0] : null
    };

  } catch (error) {
    logger.error('Error getting latest transcription', error);
    return {
      success: false,
      error: error.message || 'Failed to get latest transcription'
    };
  }
}

/**
 * Delete transcription by ID
 * @param {string|number} id - Transcription ID
 * @param {string} userId - User ID for verification
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteTranscription(id, userId) {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Database not configured'
      };
    }

    if (!id || !userId) {
      return {
        success: false,
        error: 'Transcription ID and User ID are required'
      };
    }

    logger.info('Deleting transcription', { id, userId });

    // Verify ownership and delete
    const { error } = await supabase
      .from('ai_transcription')
      .delete()
      .eq('id', id)
      .eq('create_user_id', userId);

    if (error) throw error;

    logger.success('Transcription deleted', { id });

    return {
      success: true
    };

  } catch (error) {
    logger.error('Error deleting transcription', error);
    return {
      success: false,
      error: error.message || 'Failed to delete transcription'
    };
  }
}

module.exports = {
  saveTranscription,
  getTranscriptionByUserId,
  updateTranscription,
  getLatestTranscription,
  deleteTranscription
};
