function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

const validateUserId = (req, res, next) => {
  // Extract user ID from multiple sources
  const userId = 
    req.body?.create_user_id || 
    req.params?.userId || 
    req.query?.create_user_id ||
    req.headers['x-user-id'];

  if (userId) {
    // Reject temporary/test user IDs
    if (userId.startsWith('temp_') || 
        userId.startsWith('test_') || 
        userId.startsWith('dummy_') ||
        userId.includes('user_') ||
        !isValidUUID(userId)) {

      console.error(`Invalid user ID blocked: ${userId} from IP: ${req.ip}`);

      return res.status(403).json({
        success: false,
        error: 'Invalid user ID. Must be a valid UUID from Typeform.',
        details: 'Temporary or test user IDs are not allowed.'
      });
    }

    // Attach validated ID
    req.validatedUserId = userId;
  }

  next();
};

module.exports = { validateUserId, isValidUUID };
