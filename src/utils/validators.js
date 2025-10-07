
/**
 * Validation utilities for Car Crash Lawyer AI
 * Centralized validation functions for user input, IDs, and data integrity
 */

/**
 * Validate user ID format
 * @param {string} userId - The user ID to validate
 * @returns {object} - { valid: boolean, error?: string }
 */
function validateUserId(userId) {
  if (!userId) {
    return { valid: false, error: 'User ID is required' };
  }

  // UUID format (Supabase auth format)
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

  // Custom format (alphanumeric, 8-64 chars)
  const customRegex = /^[a-zA-Z0-9]{8,64}$/;

  if (!uuidRegex.test(userId) && !customRegex.test(userId)) {
    return {
      valid: false,
      error: 'Invalid user ID format. Must be UUID or alphanumeric (8-64 chars)'
    };
  }

  return { valid: true };
}

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {object} - { valid: boolean, error?: string }
 */
function validateEmail(email) {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Validate phone number format (permissive for international formats)
 * @param {string} phone - The phone number to validate
 * @returns {object} - { valid: boolean, error?: string }
 */
function validatePhoneNumber(phone) {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Basic phone number validation (very permissive for international formats)
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Invalid phone number format' };
  }

  return { valid: true };
}

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {object} - { valid: boolean, error?: string, strength?: string }
 */
function validatePassword(password) {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  // Calculate strength
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[^a-zA-Z0-9]/)) strength++;

  let strengthLevel = 'weak';
  if (strength >= 3) strengthLevel = 'medium';
  if (strength >= 4) strengthLevel = 'strong';

  return { 
    valid: true, 
    strength: strengthLevel,
    score: strength 
  };
}

module.exports = {
  validateUserId,
  validateEmail,
  validatePhoneNumber,
  validatePassword
};
