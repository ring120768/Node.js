const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Map safety status selection to are_you_safe boolean
 * @param {string} safetyStatus - Selected safety status text
 * @returns {boolean} - TRUE if safe to proceed, FALSE if needs assistance
 */
function mapSafetyStatusToBoolean(safetyStatus) {
  const safeOptions = [
    'Yes, I\'m safe and can complete this form',
    'The Emergency services have been called'
  ];

  return safeOptions.includes(safetyStatus);
}

/**
 * Save safety status assessment
 * POST /api/update-safety-status
 */
async function updateSafetyStatus(req, res) {
  try {
    const {
      userId,
      safetyStatus,
      areYouSafe,
      timestamp,
      location,
      what3words,
      what3wordsStoragePath,
      address
    } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!safetyStatus) {
      return res.status(400).json({ error: 'safetyStatus is required' });
    }

    // Valid safety status options
    const validStatuses = [
      'Yes, I\'m safe and can complete this form',
      'The Emergency services have been called',
      'Call Emergency contact',
      'I\'m injured and need medical attention',
      'I\'m in danger and need immediate help',
      'I\'m not sure about my safety'
    ];

    if (!validStatuses.includes(safetyStatus)) {
      return res.status(400).json({ error: 'Invalid safety status' });
    }

    // Calculate correct are_you_safe value
    const correctAreYouSafe = mapSafetyStatusToBoolean(safetyStatus);

    // Warn if frontend sent incorrect value
    if (areYouSafe !== undefined && areYouSafe !== correctAreYouSafe) {
      logger.warn(`Safety status mismatch: safetyStatus="${safetyStatus}" but areYouSafe=${areYouSafe}, expected ${correctAreYouSafe}`);
    }

    // Update user_signup record
    const { data, error } = await supabase
      .from('user_signup')
      .update({
        are_you_safe: correctAreYouSafe,
        safety_status: safetyStatus,
        safety_status_timestamp: timestamp || new Date().toISOString(),
        safety_check_location_lat: location?.lat || null,
        safety_check_location_lng: location?.lng || null,
        safety_check_what3words: what3words || null,
        safety_check_what3words_storage_path: what3wordsStoragePath || null,
        safety_check_address: address || null,
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', userId);

    if (error) {
      logger.error('Supabase error saving safety status:', error);
      return res.status(500).json({ error: 'Failed to save safety status' });
    }

    // Log for audit trail
    logger.info(`Safety status updated for user ${userId}: are_you_safe=${correctAreYouSafe}, status="${safetyStatus}"`);

    res.status(200).json({
      success: true,
      message: 'Safety status saved successfully',
      data: {
        userId,
        areYouSafe: correctAreYouSafe,
        safetyStatus,
        timestamp: timestamp || new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error in updateSafetyStatus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get safety status for a user
 * GET /api/safety-status/:userId
 */
async function getSafetyStatus(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data, error } = await supabase
      .from('user_signup')
      .select('are_you_safe, safety_status, safety_status_timestamp')
      .eq('create_user_id', userId)
      .single();

    if (error) {
      logger.error('Supabase error fetching safety status:', error);
      return res.status(500).json({ error: 'Failed to fetch safety status' });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        userId,
        areYouSafe: data.are_you_safe,
        safetyStatus: data.safety_status,
        timestamp: data.safety_status_timestamp
      }
    });

  } catch (error) {
    logger.error('Error in getSafetyStatus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  updateSafetyStatus,
  getSafetyStatus,
  mapSafetyStatusToBoolean
};
