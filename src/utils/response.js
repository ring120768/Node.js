/**
 * Response utilities for Car Crash Lawyer AI
 * Standardized success and error responses with consistent formatting
 */

/**
 * Standardized error response helper
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (e.g., 400, 404, 500)
 * @param {string} error - Error message
 * @param {string} code - Optional error code for categorization
 * @param {string} details - Optional additional error details
 * @returns {void}
 */
function sendError(res, statusCode, error, code = null, details = null) {
  const response = {
    success: false,
    error: error,
    timestamp: new Date().toISOString(),
    requestId: res.req?.requestId || 'unknown'
  };

  if (code) response.code = code;
  if (details) response.details = details;

  res.status(statusCode).json(response);
}

/**
 * Standardized success response helper
 * @param {object} res - Express response object
 * @param {object} data - Response data to send to client
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {void}
 */
function sendSuccess(res, data = {}, statusCode = 200) {
  const response = {
    success: true,
    ...data,
    timestamp: new Date().toISOString(),
    requestId: res.req?.requestId || 'unknown'
  };

  res.status(statusCode).json(response);
}

/**
 * Redact sensitive information from URLs
 * Removes query parameters and sensitive path segments
 * @param {string} url - URL to redact
 * @returns {string} - Redacted URL safe for logging
 */
function redactUrl(url) {
  if (!url) return 'no-url';

  try {
    const urlObj = new URL(url);
    urlObj.search = ''; // Remove query parameters
    return urlObj.toString();
  } catch {
    // Fallback for malformed URLs
    return url.split('?')[0];
  }
}

module.exports = {
  sendError,
  sendSuccess,
  redactUrl
};