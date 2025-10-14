/**
 * Authorization Middleware
 * Checks if user has permission to access resources
 */

const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Check if user owns the resource or is admin
 */
function checkOwnership(req, res, next) {
  const requestId = req.requestId || 'unknown';
  const authenticatedUserId = req.user?.id;
  const targetUserId = req.params.userId || req.body.userId;

  if (!authenticatedUserId) {
    logger.warn('Unauthorized access attempt - no user ID', { targetUserId }, requestId);
    return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');
  }

  // Check if user is accessing their own data
  if (authenticatedUserId === targetUserId) {
    return next();
  }

  // Check if user is admin (if role exists)
  if (req.user?.role === 'admin' || req.user?.isAdmin) {
    logger.info('Admin access granted', { admin: authenticatedUserId, target: targetUserId }, requestId);
    return next();
  }

  // Access denied
  logger.warn('IDOR attempt blocked', { 
    authenticatedUser: authenticatedUserId,
    targetUser: targetUserId 
  }, requestId);
  
  return sendError(res, 403, 'Access denied', 'FORBIDDEN');
}

/**
 * Require specific role
 */
function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole || !roles.includes(userRole)) {
      return sendError(res, 403, 'Insufficient permissions', 'FORBIDDEN');
    }
    
    next();
  };
}

module.exports = {
  checkOwnership,
  requireRole
};
