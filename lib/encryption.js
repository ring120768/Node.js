/**
 * Encryption utilities for temporary password storage
 *
 * Used by signup flow v2 to securely store passwords in user_signup
 * until payment completes and auth account can be created.
 *
 * Uses AES-256-GCM for authenticated encryption.
 */

const crypto = require('crypto');

// Get encryption key from environment or generate error
const getEncryptionKey = () => {
  const key = process.env.SIGNUP_ENCRYPTION_KEY;

  if (!key) {
    // In development, warn but use a derived key from another secret
    const fallbackSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY;
    if (fallbackSecret) {
      console.warn('[Encryption] SIGNUP_ENCRYPTION_KEY not set, deriving from existing secret');
      return crypto.createHash('sha256').update(fallbackSecret).digest();
    }
    throw new Error('SIGNUP_ENCRYPTION_KEY environment variable is required for production');
  }

  // Key should be 32 bytes (256 bits) - if it's a hex string, convert it
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }

  // If it's a regular string, hash it to get 32 bytes
  return crypto.createHash('sha256').update(key).digest();
};

/**
 * Encrypt a password for temporary storage
 *
 * @param {string} password - The plaintext password to encrypt
 * @returns {string} - Base64-encoded encrypted data (iv:authTag:ciphertext)
 */
function encryptPassword(password) {
  if (!password) {
    throw new Error('Password is required for encryption');
  }

  const key = getEncryptionKey();

  // Generate random IV (12 bytes for GCM)
  const iv = crypto.randomBytes(12);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // Encrypt
  let encrypted = cipher.update(password, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get auth tag (16 bytes)
  const authTag = cipher.getAuthTag();

  // Combine: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a password from temporary storage
 *
 * @param {string} encryptedData - Base64-encoded encrypted data (iv:authTag:ciphertext)
 * @returns {string} - The decrypted plaintext password
 */
function decryptPassword(encryptedData) {
  if (!encryptedData) {
    throw new Error('Encrypted data is required for decryption');
  }

  const key = getEncryptionKey();

  // Split the components
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivBase64, authTagBase64, ciphertext] = parts;

  // Convert from base64
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a new encryption key (for initial setup)
 * Run: node -e "console.log(require('./lib/encryption').generateKey())"
 *
 * @returns {string} - A 64-character hex string (256 bits)
 */
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  encryptPassword,
  decryptPassword,
  generateKey
};
