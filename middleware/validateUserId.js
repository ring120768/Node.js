
/**
 * User ID Validation Middleware
 * Ensures ONLY valid Typeform UUIDs are accepted throughout the application
 * Prevents temporary IDs, test IDs, and invalid formats from being processed
 */

const Logger = {
  info: (message, data) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${new Date().toISOString()} ${message}`, data || '');
    }
  },
  error: (message, error) => {
    const errorMessage = error?.message || error || '';
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, errorMessage);
  },
  warn: (message, data) => {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`, data || '');
  },
  critical: (message, data) => {
    console.error(`[🔴 CRITICAL] ${new Date().toISOString()} ${message}`, data || '');
  }
};

// UUID validation utility
const UUIDUtils = {
  // Check if string is valid UUID v4 format
  isValidUUID: (str) => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  },

  // Validate Typeform UUID (stricter validation)
  validateTypeformUUID: (userId) => {
    if (!userId) return false;
    
    // Block any temporary, test, or generated IDs
    const forbiddenPrefixes = [
      'temp_', 'test_', 'user_', 'dummy_', 'mock_', 'dev_', 
      'generated_', 'placeholder_', 'default_', 'sample_'
    ];
    
    const userIdStr = userId.toString().toLowerCase();
    for (const prefix of forbiddenPrefixes) {
      if (userIdStr.startsWith(prefix)) {
        return false;
      }
    }

    // Must be valid UUID v4 format from Typeform only
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(userId);
  }
};

class UserIdValidator {
  /**
   * Extract user ID from various request locations
   */
  static extractUserId(req) {
    return req.body?.create_user_id || 
           req.body?.userId ||
           req.params?.userId || 
           req.query?.userId || 
           req.headers['x-user-id'];
  }

  /**
   * Validate Typeform user ID format
   */
  static validateTypeformUserId(userId) {
    if (!userId) return false;

    // Block any temporary, test, or generated IDs
    const forbiddenPrefixes = [
      'temp_', 'test_', 'user_', 'dummy_', 'mock_', 'dev_', 
      'generated_', 'placeholder_', 'default_', 'sample_',
      'demo_', 'fake_', 'auto_', 'system_'
    ];
    
    const userIdStr = userId.toString().toLowerCase();
    for (const prefix of forbiddenPrefixes) {
      if (userIdStr.startsWith(prefix)) {
        Logger.critical(`Blocked forbidden user ID prefix: ${userId}`);
        return false;
      }
    }

    // Must be valid UUID v4 format from Typeform
    return UUIDUtils.validateTypeformUUID(userId);
  }

  /**
   * Middleware: Optional user ID validation (validates if present, doesn't require)
   */
  static validateOptional(req, res, next) {
    const userId = UserIdValidator.extractUserId(req);

    if (userId) {
      if (!UserIdValidator.validateTypeformUserId(userId)) {
        Logger.critical(`Invalid user ID format rejected: ${userId}`);
        return res.status(400).json({
          error: 'Invalid user ID format',
          message: 'Only valid Typeform UUIDs are permitted. Temporary and test IDs are not allowed.',
          code: 'INVALID_USER_ID_FORMAT',
          requestId: req.requestId
        });
      }
      
      // Store validated user ID for downstream use
      req.validatedUserId = userId;
      Logger.info(`Valid user ID accepted: ${userId}`);
    }

    next();
  }

  /**
   * Middleware: Required user ID validation (must be present and valid)
   */
  static validateRequired(req, res, next) {
    const userId = UserIdValidator.extractUserId(req);

    if (!userId) {
      Logger.critical('Missing required user ID in request');
      return res.status(400).json({
        error: 'User ID required',
        message: 'A valid Typeform user ID is required for this operation',
        code: 'USER_ID_REQUIRED',
        requestId: req.requestId
      });
    }

    if (!UserIdValidator.validateTypeformUserId(userId)) {
      Logger.critical(`Invalid required user ID rejected: ${userId}`);
      return res.status(400).json({
        error: 'Invalid user ID format',
        message: 'Only valid Typeform UUIDs are permitted. Temporary and test IDs are not allowed.',
        code: 'INVALID_USER_ID_FORMAT',
        requestId: req.requestId
      });
    }

    // Store validated user ID for downstream use
    req.validatedUserId = userId;
    Logger.info(`Valid required user ID accepted: ${userId}`);
    next();
  }

  /**
   * Middleware: Block temporary IDs globally (configurable)
   */
  static blockTemporaryIds(req, res, next) {
    // Check environment configuration
    const blockTempIds = process.env.BLOCK_TEMP_IDS === 'true' || 
                         process.env.NODE_ENV === 'production';

    if (!blockTempIds) {
      return next(); // Skip validation if not enabled
    }

    const userId = UserIdValidator.extractUserId(req);

    if (userId) {
      // Check for temporary ID patterns
      const tempPatterns = [
        /^temp_/i,
        /^test_/i,
        /^user_\d+$/i,
        /^dummy/i,
        /^mock/i,
        /^placeholder/i,
        /^generated_/i,
        /^\d{13}$/, // timestamp-based IDs
      ];

      const isTempId = tempPatterns.some(pattern => pattern.test(userId));

      if (isTempId || !UUIDUtils.validateTypeformUUID(userId)) {
        Logger.critical(`SECURITY BLOCK: Temporary/invalid user ID detected: ${userId}`);
        
        return res.status(400).json({
          error: 'Invalid user ID',
          message: 'Temporary or invalid user IDs are not permitted. Please use a valid Typeform user ID.',
          code: 'TEMPORARY_ID_BLOCKED',
          requestId: req.requestId,
          securityLevel: 'CRITICAL'
        });
      }
    }

    next();
  }

  /**
   * Middleware: Comprehensive user ID corruption detection
   */
  static detectCorruption(req, res, next) {
    const userId = UserIdValidator.extractUserId(req);

    if (userId) {
      // Detect various corruption patterns
      const corruptionIndicators = [
        { pattern: /^temp_/, type: 'temporary_id' },
        { pattern: /^user_\d+$/, type: 'generated_numeric' },
        { pattern: /^test/, type: 'test_data' },
        { pattern: /^\d{13}$/, type: 'timestamp_id' },
        { pattern: /^[a-f0-9]{8}$/, type: 'truncated_uuid' },
        { pattern: /^dummy|mock|fake/, type: 'dummy_data' },
        { pattern: /^placeholder/, type: 'placeholder_data' }
      ];

      for (const indicator of corruptionIndicators) {
        if (indicator.pattern.test(userId)) {
          Logger.critical(`Data corruption detected: ${indicator.type} - ID: ${userId}`);
          
          // Log to corruption tracking if available
          if (req.supabase) {
            req.supabase
              .from('data_issues')
              .insert({
                issue_type: 'user_id_corruption',
                corruption_type: indicator.type,
                corrupted_value: userId,
                endpoint: req.path,
                request_id: req.requestId,
                created_at: new Date().toISOString()
              })
              .then(() => Logger.info('Corruption logged to database'))
              .catch(err => Logger.error('Failed to log corruption:', err));
          }

          return res.status(400).json({
            error: 'Data integrity violation',
            message: `Corrupted user ID detected (${indicator.type}). Only valid Typeform UUIDs are allowed.`,
            code: 'DATA_CORRUPTION_DETECTED',
            corruptionType: indicator.type,
            requestId: req.requestId
          });
        }
      }

      // Additional validation for proper UUID format
      if (!UUIDUtils.validateTypeformUUID(userId)) {
        Logger.critical(`Invalid UUID format detected: ${userId}`);
        
        return res.status(400).json({
          error: 'Invalid UUID format',
          message: 'User ID must be a valid Typeform UUID v4 format.',
          code: 'INVALID_UUID_FORMAT',
          requestId: req.requestId
        });
      }
    }

    next();
  }

  /**
   * Middleware: Production-safe user ID validation (strictest)
   */
  static productionSafe(req, res, next) {
    if (process.env.NODE_ENV !== 'production') {
      return next(); // Only apply in production
    }

    const userId = UserIdValidator.extractUserId(req);

    if (userId) {
      // Production requires the strictest validation
      if (!UUIDUtils.validateTypeformUUID(userId)) {
        Logger.critical(`PRODUCTION SECURITY: Invalid user ID blocked: ${userId}`);
        
        return res.status(403).json({
          error: 'Security validation failed',
          message: 'Invalid user credentials detected. Access denied.',
          code: 'PRODUCTION_SECURITY_BLOCK',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      }

      // Additional production checks
      const suspiciousPatterns = [
        /admin/i,
        /system/i,
        /root/i,
        /service/i,
        /.{100,}/, // overly long IDs
        /[^a-f0-9\-]/i // non-hex characters outside of hyphens
      ];

      const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userId));

      if (isSuspicious) {
        Logger.critical(`PRODUCTION SECURITY: Suspicious user ID pattern: ${userId}`);
        
        return res.status(403).json({
          error: 'Security validation failed',
          message: 'Suspicious user credentials detected. Access denied.',
          code: 'SUSPICIOUS_PATTERN_DETECTED',
          requestId: req.requestId
        });
      }
    }

    next();
  }
}

module.exports = {
  UserIdValidator,
  UUIDUtils,
  validateOptional: UserIdValidator.validateOptional,
  validateRequired: UserIdValidator.validateRequired,
  blockTemporaryIds: UserIdValidator.blockTemporaryIds,
  detectCorruption: UserIdValidator.detectCorruption,
  productionSafe: UserIdValidator.productionSafe
};
