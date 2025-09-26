// PDF Validation Utilities
// Add this file to your utils/ directory

/**
 * Validates UUID format for user IDs
 * @param {string} userId - The user ID to validate
 * @returns {boolean} - True if valid UUID format
 */
function isValidUUID(userId) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(userId);
}

/**
 * Sanitizes and validates request parameters for PDF endpoints
 * @param {Object} params - Request parameters
 * @param {string} clientIP - Client IP address
 * @returns {Object} - Validation result with success status and errors
 */
function validatePDFRequest(params, clientIP) {
  const errors = [];
  const { userId } = params;

  // Validate user ID
  if (!userId) {
    errors.push({
      field: 'userId',
      message: 'User ID is required',
      code: 'MISSING_USER_ID'
    });
  } else if (!isValidUUID(userId)) {
    errors.push({
      field: 'userId',
      message: 'Invalid user ID format',
      code: 'INVALID_UUID'
    });
  }

  // Validate IP address (basic check)
  if (!clientIP || clientIP === 'unknown') {
    errors.push({
      field: 'clientIP',
      message: 'Cannot determine client IP for audit logging',
      code: 'MISSING_IP'
    });
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    sanitizedParams: {
      userId: userId?.trim(),
      clientIP: clientIP
    }
  };
}

/**
 * Generates possible PDF filename variations for a user
 * @param {string} userId - User ID
 * @param {string} incidentId - Optional incident ID
 * @returns {Array} - Array of possible filenames
 */
function generatePossibleFilenames(userId, incidentId = null) {
  const filenames = [
    `${userId}.pdf`,
    `accident-report-${userId}.pdf`,
    `report-${userId}.pdf`
  ];

  if (incidentId) {
    filenames.push(`incident-${incidentId}.pdf`);
  }

  return filenames;
}

module.exports = {
  isValidUUID,
  validatePDFRequest,
  generatePossibleFilenames
};
