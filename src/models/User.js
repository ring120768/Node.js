/**
 * User Model - Car Crash Lawyer AI
 * Handles all user-related database operations with Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const logger = require('../utils/logger');
const { validateUserId } = require('../utils/validators');

// Initialize Supabase client for model operations
let supabase = null;
if (config.supabase.url && config.supabase.serviceKey) {
  supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  });
}

/**
 * Create a new user in the user_signup table
 * @param {Object} userData - User data to insert
 * @returns {Promise<Object>} Created user data or error
 */
async function createUser(userData) {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Validate required fields
    if (!userData.create_user_id) {
      throw new Error('create_user_id is required');
    }

    if (!userData.email) {
      throw new Error('email is required');
    }

    // Validate user ID format
    const validation = validateUserId(userData.create_user_id);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    logger.info('Creating new user', { userId: userData.create_user_id });

    // Prepare user data with defaults
    const userRecord = {
      ...userData,
      created_at: userData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      verified: userData.verified || false,
      source: userData.source || 'api_create'
    };

    const { data, error } = await supabase
      .from('user_signup')
      .insert(userRecord)
      .select()
      .single();

    if (error) {
      logger.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }

    logger.success('User created successfully', { userId: data.create_user_id });
    return {
      success: true,
      user: data
    };

  } catch (error) {
    logger.error('Error in createUser:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get user by ID from user_signup table
 * @param {string} userId - The create_user_id to lookup
 * @returns {Promise<Object>} User data or error
 */
async function getUserById(userId) {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Validate user ID
    const validation = validateUserId(userId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    logger.debug('Getting user by ID', { userId });

    const { data, error } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }
      logger.error('Error getting user:', error);
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return {
      success: true,
      user: data
    };

  } catch (error) {
    logger.error('Error in getUserById:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update user data in user_signup table
 * @param {string} userId - The create_user_id to update
 * @param {Object} updates - Data to update
 * @returns {Promise<Object>} Updated user data or error
 */
async function updateUser(userId, updates) {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Validate user ID
    const validation = validateUserId(userId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    logger.info('Updating user', { userId, updateFields: Object.keys(updates) });

    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Don't allow updating create_user_id
    delete updateData.create_user_id;

    const { data, error } = await supabase
      .from('user_signup')
      .update(updateData)
      .eq('create_user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }
      logger.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }

    logger.success('User updated successfully', { userId });
    return {
      success: true,
      user: data
    };

  } catch (error) {
    logger.error('Error in updateUser:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Batch fetch all user-related data across multiple tables
 * @param {string} userId - The create_user_id to fetch data for
 * @returns {Promise<Object>} All user data or error
 */
async function getUserDataBatch(userId) {
  try {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Validate user ID
    const validation = validateUserId(userId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    logger.info('Fetching user data batch', { userId });

    // Fetch all user-related data in parallel (excluding soft-deleted records)
    // Note: incident_reports checks all 3 user ID columns (auth_user_id, create_user_id, user_id)
    const [
      { data: user, error: userError },
      { data: incidents, error: incidentError },
      { data: transcriptions, error: transcriptionError },
      { data: summaries, error: summaryError },
      { data: images, error: imageError },
      { data: aiListeningTranscripts, error: aiListeningError },
      { data: emergencyCalls, error: emergencyCallError }
    ] = await Promise.all([
      supabase.from('user_signup').select('*').eq('create_user_id', userId).single(),
      supabase.from('incident_reports').select('*').or(`auth_user_id.eq.${userId},create_user_id.eq.${userId},user_id.eq.${userId}`).is('deleted_at', null),
      supabase.from('ai_transcription').select('*').eq('create_user_id', userId).is('deleted_at', null),
      supabase.from('ai_summary').select('*').eq('create_user_id', userId).is('deleted_at', null),
      supabase.from('incident_images').select('*').eq('create_user_id', userId).is('deleted_at', null),
      supabase.from('ai_listening_transcripts').select('*').eq('user_id', userId).is('deleted_at', null),
      supabase.from('emergency_call_logs').select('*').eq('user_id', userId).is('deleted_at', null)
    ]);

    // Check for critical user error
    if (userError) {
      if (userError.code === 'PGRST116') {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }
      throw new Error(`Failed to fetch user: ${userError.message}`);
    }

    // Log any non-critical errors but continue
    if (incidentError) logger.warn('Error fetching incidents:', incidentError);
    if (transcriptionError) logger.warn('Error fetching transcriptions:', transcriptionError);
    if (summaryError) logger.warn('Error fetching summaries:', summaryError);
    if (imageError) logger.warn('Error fetching images:', imageError);
    if (aiListeningError) logger.warn('Error fetching AI listening transcripts:', aiListeningError);
    if (emergencyCallError) logger.warn('Error fetching emergency calls:', emergencyCallError);

    const userData = {
      user,
      incidents: incidents || [],
      transcriptions: transcriptions || [],
      summaries: summaries || [],
      images: images || [],
      aiListeningTranscripts: aiListeningTranscripts || [],
      emergencyCalls: emergencyCalls || []
    };

    logger.success('User data batch fetched successfully', {
      userId,
      fullName: `${user?.name || ''} ${user?.surname || ''}`.trim() || 'N/A',
      incidents: userData.incidents.length,
      transcriptions: userData.transcriptions.length,
      summaries: userData.summaries.length,
      images: userData.images.length,
      aiListening: userData.aiListeningTranscripts.length,
      emergencyCalls: userData.emergencyCalls.length
    });

    return {
      success: true,
      data: userData
    };

  } catch (error) {
    logger.error('Error in getUserDataBatch:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  createUser,
  getUserById,
  updateUser,
  getUserDataBatch
};