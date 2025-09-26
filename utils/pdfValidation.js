
// PDF Validation Utilities
// Enhanced validation for PDF-related operations with security features

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
 * Validates email format
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Validates UK postcode format
 * @param {string} postcode - The postcode to validate
 * @returns {boolean} - True if valid UK postcode format
 */
function isValidUKPostcode(postcode) {
  const postcodePattern = /^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][ABD-HJLNP-UW-Z]{2}$/i;
  return postcodePattern.test(postcode);
}

/**
 * Validates phone number format (UK and international)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid phone format
 */
function isValidPhoneNumber(phone) {
  const phonePattern = /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$|^\+?[1-9]\d{1,14}$/;
  return phonePattern.test(phone.replace(/\s/g, ''));
}

/**
 * Validates vehicle registration number format
 * @param {string} registration - The registration to validate
 * @returns {boolean} - True if valid registration format
 */
function isValidVehicleRegistration(registration) {
  // UK registration patterns
  const ukPatterns = [
    /^[A-Z]{2}[0-9]{2}\s?[A-Z]{3}$/, // Current format (AB12 CDE)
    /^[A-Z][0-9]{1,3}\s?[A-Z]{3}$/, // Prefix format (A123 BCD)
    /^[A-Z]{3}\s?[0-9]{1,3}[A-Z]$/, // Suffix format (ABC 123D)
    /^[0-9]{1,4}\s?[A-Z]{1,3}$/      // Dateless format (1234 AB)
  ];
  
  return ukPatterns.some(pattern => pattern.test(registration.toUpperCase()));
}

/**
 * Sanitizes and validates request parameters for PDF endpoints
 * @param {Object} params - Request parameters
 * @param {string} clientIP - Client IP address
 * @returns {Object} - Validation result with success status and errors
 */
function validatePDFRequest(params, clientIP) {
  const errors = [];
  const warnings = [];
  const { userId, email, postcode, phone, registration } = params;

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
      message: 'Invalid user ID format - must be valid UUID',
      code: 'INVALID_UUID'
    });
  }

  // Validate email if provided
  if (email && !isValidEmail(email)) {
    errors.push({
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_EMAIL'
    });
  }

  // Validate postcode if provided
  if (postcode && !isValidUKPostcode(postcode)) {
    warnings.push({
      field: 'postcode',
      message: 'Postcode format may not be valid UK format',
      code: 'INVALID_POSTCODE'
    });
  }

  // Validate phone if provided
  if (phone && !isValidPhoneNumber(phone)) {
    warnings.push({
      field: 'phone',
      message: 'Phone number format may not be valid',
      code: 'INVALID_PHONE'
    });
  }

  // Validate vehicle registration if provided
  if (registration && !isValidVehicleRegistration(registration)) {
    warnings.push({
      field: 'registration',
      message: 'Vehicle registration format may not be valid UK format',
      code: 'INVALID_REGISTRATION'
    });
  }

  // Validate IP address (basic check)
  if (!clientIP || clientIP === 'unknown') {
    warnings.push({
      field: 'clientIP',
      message: 'Cannot determine client IP for audit logging',
      code: 'MISSING_IP'
    });
  }

  return {
    isValid: errors.length === 0,
    hasWarnings: warnings.length > 0,
    errors: errors,
    warnings: warnings,
    sanitizedParams: {
      userId: userId?.trim(),
      email: email?.trim().toLowerCase(),
      postcode: postcode?.trim().toUpperCase(),
      phone: phone?.trim(),
      registration: registration?.trim().toUpperCase(),
      clientIP: clientIP
    }
  };
}

/**
 * Validates PDF generation data completeness
 * @param {Object} data - The data object from dataFetcher
 * @returns {Object} - Validation result with completeness score
 */
function validatePDFDataCompleteness(data) {
  const requiredFields = {
    user: ['driver_name', 'driver_email', 'driver_mobile'],
    incident: ['when_did_the_accident_happen', 'where_exactly_did_the_accident_happen'],
    vehicle: ['license_plate', 'vehicle_make', 'vehicle_model']
  };

  const optionalFields = {
    user: ['driver_surname', 'driver_street', 'driver_town', 'driver_postcode'],
    incident: ['what_time_did_the_accident_happen', 'describe_what_happened'],
    vehicle: ['vehicle_colour', 'vehicle_condition']
  };

  const missing = [];
  const incomplete = [];
  let totalFields = 0;
  let completedFields = 0;

  // Check required fields
  Object.entries(requiredFields).forEach(([section, fields]) => {
    const sectionData = data[section] || {};
    fields.forEach(field => {
      totalFields++;
      if (!sectionData[field] || sectionData[field].trim() === '') {
        missing.push(`${section}.${field}`);
      } else {
        completedFields++;
      }
    });
  });

  // Check optional fields
  Object.entries(optionalFields).forEach(([section, fields]) => {
    const sectionData = data[section] || {};
    fields.forEach(field => {
      totalFields++;
      if (!sectionData[field] || sectionData[field].trim() === '') {
        incomplete.push(`${section}.${field}`);
      } else {
        completedFields++;
      }
    });
  });

  const completeness = Math.round((completedFields / totalFields) * 100);

  return {
    isComplete: missing.length === 0,
    completeness: completeness,
    missingRequired: missing,
    missingOptional: incomplete,
    canGeneratePDF: missing.length === 0,
    recommendations: generateCompletionRecommendations(missing, incomplete)
  };
}

/**
 * Generates recommendations for improving data completeness
 * @param {Array} missing - Missing required fields
 * @param {Array} incomplete - Missing optional fields
 * @returns {Array} - Array of recommendation strings
 */
function generateCompletionRecommendations(missing, incomplete) {
  const recommendations = [];

  if (missing.length > 0) {
    recommendations.push(`Complete required fields: ${missing.join(', ')}`);
  }

  if (incomplete.length > 0) {
    recommendations.push(`Consider completing optional fields for better report: ${incomplete.slice(0, 3).join(', ')}`);
  }

  if (missing.length === 0 && incomplete.length === 0) {
    recommendations.push('All data complete - ready for PDF generation');
  }

  return recommendations;
}

/**
 * Generates possible PDF filename variations for a user
 * @param {string} userId - User ID
 * @param {string} incidentId - Optional incident ID
 * @param {Object} options - Optional naming options
 * @returns {Array} - Array of possible filenames
 */
function generatePossibleFilenames(userId, incidentId = null, options = {}) {
  const {
    prefix = 'report',
    includeTimestamp = true,
    includeUserInitials = false,
    userInitials = '',
    format = 'pdf'
  } = options;

  const timestamp = includeTimestamp ? `_${Date.now()}` : '';
  const initials = includeUserInitials && userInitials ? `_${userInitials}` : '';
  
  const filenames = [
    `${prefix}-${userId}${timestamp}.${format}`,
    `accident-report-${userId}${initials}${timestamp}.${format}`,
    `incident-${userId}${timestamp}.${format}`,
    `${prefix}_${userId.replace(/-/g, '_')}${timestamp}.${format}`
  ];

  if (incidentId) {
    filenames.push(`incident-${incidentId}${timestamp}.${format}`);
    filenames.push(`${prefix}-${incidentId}-${userId}${timestamp}.${format}`);
  }

  return filenames;
}

/**
 * Validates file path for security (prevents directory traversal)
 * @param {string} filePath - The file path to validate
 * @returns {boolean} - True if path is safe
 */
function isSecureFilePath(filePath) {
  // Check for directory traversal attempts
  const dangerousPatterns = [
    /\.\./,           // Parent directory
    /\/\//,           // Double slashes
    /\\/,             // Backslashes (Windows paths)
    /[<>:"|?*]/,      // Invalid filename characters
    /^\/|^\w+:/       // Absolute paths or drive letters
  ];

  return !dangerousPatterns.some(pattern => pattern.test(filePath));
}

/**
 * Sanitizes filename for safe storage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace unsafe characters
    .replace(/_+/g, '_')               // Collapse multiple underscores
    .replace(/^_|_$/g, '')             // Remove leading/trailing underscores
    .toLowerCase()                     // Convert to lowercase
    .substring(0, 100);                // Limit length
}

/**
 * Validates PDF generation request with comprehensive checks
 * @param {Object} request - Complete request object
 * @returns {Object} - Comprehensive validation result
 */
function validateComprehensivePDFRequest(request) {
  const { params, data, clientIP, userAgent } = request;
  
  const paramValidation = validatePDFRequest(params, clientIP);
  const dataValidation = validatePDFDataCompleteness(data);
  
  const securityChecks = {
    hasValidIP: clientIP && clientIP !== 'unknown',
    hasUserAgent: !!userAgent,
    riskLevel: calculateRiskLevel(clientIP, userAgent, params)
  };

  return {
    params: paramValidation,
    data: dataValidation,
    security: securityChecks,
    overallValid: paramValidation.isValid && dataValidation.canGeneratePDF,
    recommendations: [
      ...paramValidation.errors.map(e => e.message),
      ...dataValidation.recommendations,
      ...(securityChecks.riskLevel === 'high' ? ['Request flagged for security review'] : [])
    ]
  };
}

/**
 * Calculates risk level for request
 * @param {string} clientIP - Client IP
 * @param {string} userAgent - User agent string
 * @param {Object} params - Request parameters
 * @returns {string} - Risk level: 'low', 'medium', 'high'
 */
function calculateRiskLevel(clientIP, userAgent, params) {
  let riskScore = 0;

  // IP-based risk factors
  if (!clientIP || clientIP === 'unknown') riskScore += 2;
  if (clientIP && clientIP.startsWith('10.') || clientIP.startsWith('192.168.')) riskScore += 1; // Local network

  // User agent risk factors
  if (!userAgent) riskScore += 2;
  if (userAgent && userAgent.includes('curl') || userAgent.includes('wget')) riskScore += 1; // Automated tools

  // Parameter risk factors
  if (!params.userId) riskScore += 3;
  if (params.userId && !isValidUUID(params.userId)) riskScore += 2;

  if (riskScore >= 5) return 'high';
  if (riskScore >= 3) return 'medium';
  return 'low';
}

module.exports = {
  isValidUUID,
  isValidEmail,
  isValidUKPostcode,
  isValidPhoneNumber,
  isValidVehicleRegistration,
  validatePDFRequest,
  validatePDFDataCompleteness,
  generatePossibleFilenames,
  isSecureFilePath,
  sanitizeFilename,
  validateComprehensivePDFRequest,
  calculateRiskLevel,
  generateCompletionRecommendations
};
