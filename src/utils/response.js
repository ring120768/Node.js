
/**
 * Response utilities for Car Crash Lawyer AI
 * Standardized error responses and URL handling functions
 */

/**
 * Standardized error response helper
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error message
 * @param {string} code - Optional error code
 * @param {string} details - Optional error details
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
 * Redact sensitive information from URLs
 * @param {string} url - URL to redact
 * @returns {string} - Redacted URL
 */
function redactUrl(url) {
  if (!url) return 'no-url';
  try {
    const urlObj = new URL(url);
    urlObj.search = ''; // Remove query params
    return urlObj.toString();
  } catch {
    return url.split('?')[0]; // Simple fallback
  }
}

module.exports = {
  sendError,
  redactUrl
};
