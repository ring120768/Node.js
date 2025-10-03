
/**
 * Strict User ID Validation Module
 * Ensures ONLY valid Typeform UUIDs are accepted
 * NO EXCEPTIONS, NO FALLBACKS, NO DUMMY DATA
 */

class StrictUserValidation {
  static validateTypeformUUID(userId) {
    if (!userId) {
      throw new Error('User ID is required - no null or undefined values allowed');
    }

    // Block any temporary, test, or generated IDs
    const forbiddenPrefixes = [
      'temp_', 'test_', 'user_', 'dummy_', 'mock_', 'dev_', 
      'generated_', 'placeholder_', 'default_', 'sample_'
    ];
    
    const userIdStr = userId.toString().toLowerCase();
    for (const prefix of forbiddenPrefixes) {
      if (userIdStr.startsWith(prefix)) {
        throw new Error(`Forbidden user ID format: ${userId} - temporary/test IDs not allowed`);
      }
    }

    // Must be valid UUID v4 format from Typeform only
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error(`Invalid UUID format: ${userId} - must be valid Typeform UUID v4`);
    }

    return true;
  }

  static validateRequest(req, res, next) {
    const userId = req.body?.create_user_id || 
                   req.body?.userId ||
                   req.params?.userId || 
                   req.query?.userId || 
                   req.headers['x-user-id'];

    try {
      if (userId) {
        StrictUserValidation.validateTypeformUUID(userId);
        req.validatedUserId = userId;
      }
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: error.message,
        code: 'STRICT_VALIDATION_FAILED',
        requestId: req.requestId
      });
    }
  }

  static requireValidUserId(req, res, next) {
    const userId = req.validatedUserId || 
                   req.body?.create_user_id || 
                   req.body?.userId ||
                   req.params?.userId || 
                   req.query?.userId || 
                   req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required',
        message: 'A valid Typeform user ID is required for this operation',
        code: 'USER_ID_REQUIRED',
        requestId: req.requestId
      });
    }

    try {
      StrictUserValidation.validateTypeformUUID(userId);
      req.validatedUserId = userId;
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: error.message,
        code: 'STRICT_VALIDATION_FAILED',
        requestId: req.requestId
      });
    }
  }
}

module.exports = StrictUserValidation;
