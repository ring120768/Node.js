/**
 * Email Normalization Utility
 *
 * Ensures all emails are stored and compared in a consistent format.
 * Per RFC 5321, email addresses are case-insensitive.
 */

/**
 * Normalize an email address to lowercase
 * @param {string} email - The email address to normalize
 * @returns {string} - Lowercase email, or null if invalid input
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  return email.trim().toLowerCase();
}

/**
 * Normalize multiple email addresses
 * @param {Array<string>} emails - Array of email addresses
 * @returns {Array<string>} - Array of normalized emails (nulls filtered out)
 */
function normalizeEmails(emails) {
  if (!Array.isArray(emails)) {
    return [];
  }

  return emails
    .map(email => normalizeEmail(email))
    .filter(email => email !== null);
}

/**
 * Normalize all email fields in an object
 * Useful for normalizing form data or API payloads
 *
 * @param {Object} data - Object containing email fields
 * @param {Array<string>} emailFields - Array of field names that contain emails
 * @returns {Object} - New object with normalized emails
 */
function normalizeEmailFields(data, emailFields = ['email', 'driver_email', 'other_driver_email']) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const normalized = { ...data };

  for (const field of emailFields) {
    if (normalized[field]) {
      normalized[field] = normalizeEmail(normalized[field]);
    }
  }

  return normalized;
}

/**
 * Compare two email addresses (case-insensitive)
 * @param {string} email1
 * @param {string} email2
 * @returns {boolean} - True if emails match (case-insensitive)
 */
function emailsMatch(email1, email2) {
  const normalized1 = normalizeEmail(email1);
  const normalized2 = normalizeEmail(email2);

  if (!normalized1 || !normalized2) {
    return false;
  }

  return normalized1 === normalized2;
}

module.exports = {
  normalizeEmail,
  normalizeEmails,
  normalizeEmailFields,
  emailsMatch
};
