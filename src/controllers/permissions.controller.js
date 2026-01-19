/**
 * Permissions Controller
 *
 * Handles server-side tracking of user permission states
 * for camera, microphone, and location access.
 *
 * This complements the client-side PermissionsService by persisting
 * permission states in the database for analytics and user experience.
 */

const logger = require('../utils/logger');

/**
 * Get current user's permission status
 * GET /api/permissions/status
 *
 * Returns the stored permission states for the authenticated user.
 * Creates a default record if one doesn't exist.
 */
async function getPermissionStatus(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await req.supabaseClient
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = Not found (OK)
      throw error;
    }

    // Create default record if doesn't exist
    if (!data) {
      const defaultPermissions = {
        user_id: userId,
        camera_permission: 'not-requested',
        microphone_permission: 'not-requested',
        location_permission: 'not-requested',
        created_at: new Date().toISOString()
      };

      const { data: newData, error: insertError } = await req.supabaseClient
        .from('user_permissions')
        .insert(defaultPermissions)
        .select()
        .single();

      if (insertError) {
        // Table might not exist yet - return defaults without persisting
        logger.warn('user_permissions table may not exist:', insertError.message);
        return res.json(defaultPermissions);
      }
      return res.json(newData);
    }

    res.json(data);
  } catch (error) {
    logger.error('Error fetching permission status:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
}

/**
 * Update permission status
 * POST /api/permissions/update
 * Body: { permission: 'camera|microphone|location', status: 'granted|denied|prompt' }
 *
 * Updates a specific permission state for the authenticated user.
 * Also records the timestamp of when the permission was granted/denied.
 */
async function updatePermissionStatus(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { permission, status } = req.body;

    // Validate permission type
    if (!['camera', 'microphone', 'location'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid permission type. Must be: camera, microphone, or location' });
    }

    // Validate status
    if (!['granted', 'denied', 'prompt', 'not-requested'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: granted, denied, prompt, or not-requested' });
    }

    const now = new Date().toISOString();
    const updateData = {
      user_id: userId,
      [`${permission}_permission`]: status,
      updated_at: now
    };

    // Add timestamp for granted/denied states
    if (status === 'granted') {
      updateData[`${permission}_granted_at`] = now;
    } else if (status === 'denied') {
      updateData[`${permission}_denied_at`] = now;
    }

    const { data, error } = await req.supabaseClient
      .from('user_permissions')
      .upsert(updateData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      // Table might not exist - log and return success anyway
      logger.warn('Could not persist permission update:', error.message);
      return res.json({ success: true, persisted: false, ...updateData });
    }

    logger.info(`Permission updated: ${permission} = ${status} for user ${userId}`);
    res.json(data);
  } catch (error) {
    logger.error('Error updating permission:', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
}

/**
 * Log permission request attempt
 * POST /api/permissions/log-request
 * Body: { permission: 'camera|microphone|location' }
 *
 * Records when a permission was requested (for analytics).
 * Useful for understanding permission request patterns.
 */
async function logPermissionRequest(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { permission } = req.body;

    // Validate permission type
    if (!['camera', 'microphone', 'location'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid permission type. Must be: camera, microphone, or location' });
    }

    const now = new Date().toISOString();
    const updateData = {
      user_id: userId,
      [`${permission}_last_requested_at`]: now,
      updated_at: now
    };

    const { error } = await req.supabaseClient
      .from('user_permissions')
      .upsert(updateData, { onConflict: 'user_id' });

    if (error) {
      // Table might not exist - log and return success anyway
      logger.warn('Could not persist permission request log:', error.message);
      return res.json({ success: true, persisted: false });
    }

    logger.info(`Permission requested: ${permission} for user ${userId}`);
    res.json({ success: true, persisted: true });
  } catch (error) {
    logger.error('Error logging permission request:', error);
    res.status(500).json({ error: 'Failed to log request' });
  }
}

module.exports = {
  getPermissionStatus,
  updatePermissionStatus,
  logPermissionRequest
};
