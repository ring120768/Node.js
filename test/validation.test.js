
const { Validator } = require('../index');

describe('Input Validation', () => {
  describe('Email Validation', () => {
    test('should validate correct email addresses', () => {
      expect(Validator.isValidEmail('test@example.com')).toBe(true);
      expect(Validator.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(Validator.isValidEmail('user+tag@example.org')).toBe(true);
      expect(Validator.isValidEmail('firstname.lastname@company.com')).toBe(true);
      expect(Validator.isValidEmail('test123@test-domain.com')).toBe(true);
    });

    test('should reject invalid email addresses', () => {
      expect(Validator.isValidEmail('invalid-email')).toBe(false);
      expect(Validator.isValidEmail('@example.com')).toBe(false);
      expect(Validator.isValidEmail('user@')).toBe(false);
      expect(Validator.isValidEmail('user@@domain.com')).toBe(false);
      expect(Validator.isValidEmail('')).toBe(false);
      expect(Validator.isValidEmail(null)).toBe(false);
      expect(Validator.isValidEmail(undefined)).toBe(false);
      expect(Validator.isValidEmail('user@domain')).toBe(false);
      expect(Validator.isValidEmail('user.domain.com')).toBe(false);
    });
  });

  describe('User ID Validation', () => {
    test('should validate correct user IDs', () => {
      expect(Validator.isValidUserId('user123')).toBe(true);
      expect(Validator.isValidUserId('user-123_abc')).toBe(true);
      expect(Validator.isValidUserId('ABC123')).toBe(true);
      expect(Validator.isValidUserId('user_id_123')).toBe(true);
      expect(Validator.isValidUserId('test-user-2024')).toBe(true);
      expect(Validator.isValidUserId('a'.repeat(64))).toBe(true); // Maximum length
    });

    test('should reject invalid user IDs', () => {
      expect(Validator.isValidUserId('ab')).toBe(false); // too short
      expect(Validator.isValidUserId('')).toBe(false);
      expect(Validator.isValidUserId(null)).toBe(false);
      expect(Validator.isValidUserId(undefined)).toBe(false);
      expect(Validator.isValidUserId('a'.repeat(65))).toBe(false); // too long
      expect(Validator.isValidUserId('user@domain')).toBe(false); // invalid character
      expect(Validator.isValidUserId('user.id')).toBe(false); // invalid character
      expect(Validator.isValidUserId('user id')).toBe(false); // space not allowed
      expect(Validator.isValidUserId('user#123')).toBe(false); // invalid character
    });
  });

  describe('Phone Number Validation', () => {
    test('should validate UK phone numbers', () => {
      expect(Validator.isValidPhone('+447123456789')).toBe(true);
      expect(Validator.isValidPhone('07123456789')).toBe(true);
      expect(Validator.isValidPhone('01234567890')).toBe(true);
      expect(Validator.isValidPhone('+44 7123 456789')).toBe(true); // with spaces
      expect(Validator.isValidPhone('0 7123 456789')).toBe(true); // with spaces
    });

    test('should reject invalid phone numbers', () => {
      expect(Validator.isValidPhone('123')).toBe(false); // too short
      expect(Validator.isValidPhone('')).toBe(false);
      expect(Validator.isValidPhone(null)).toBe(false);
      expect(Validator.isValidPhone(undefined)).toBe(false);
      expect(Validator.isValidPhone('abc123def')).toBe(false); // non-numeric
      expect(Validator.isValidPhone('+1234567890')).toBe(false); // wrong country code
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize dangerous input', () => {
      expect(Validator.sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
      expect(Validator.sanitizeInput('<div>content</div>')).toBe('divcontent/div');
      expect(Validator.sanitizeInput('text with > and < symbols')).toBe('text with  and  symbols');
    });

    test('should trim whitespace', () => {
      expect(Validator.sanitizeInput('  normal text  ')).toBe('normal text');
      expect(Validator.sanitizeInput('\n\ttest\n\t')).toBe('test');
    });

    test('should handle edge cases', () => {
      expect(Validator.sanitizeInput('')).toBe('');
      expect(Validator.sanitizeInput(null)).toBe('');
      expect(Validator.sanitizeInput(undefined)).toBe('');
      expect(Validator.sanitizeInput(123)).toBe('123'); // number to string conversion
    });
  });

  describe('Incident ID Validation', () => {
    test('should validate UUIDs as incident IDs', () => {
      expect(Validator.isValidIncidentId('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(Validator.isValidIncidentId('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(true);
    });

    test('should validate numeric IDs', () => {
      expect(Validator.isValidIncidentId('123')).toBe(true);
      expect(Validator.isValidIncidentId('456789')).toBe(true);
      expect(Validator.isValidIncidentId('0')).toBe(true);
    });

    test('should reject invalid incident IDs', () => {
      expect(Validator.isValidIncidentId('')).toBe(false);
      expect(Validator.isValidIncidentId(null)).toBe(false);
      expect(Validator.isValidIncidentId(undefined)).toBe(false);
      expect(Validator.isValidIncidentId('abc123')).toBe(false); // mixed alphanumeric but not UUID
      expect(Validator.isValidIncidentId('123e4567-e89b-12d3-a456')).toBe(false); // incomplete UUID
    });
  });

  describe('File Type Validation', () => {
    test('should validate audio file types', () => {
      expect(Validator.isValidFileType('audio/webm', 'audio')).toBe(true);
      expect(Validator.isValidFileType('audio/mp3', 'audio')).toBe(true);
      expect(Validator.isValidFileType('audio/mpeg', 'audio')).toBe(true);
      expect(Validator.isValidFileType('audio/wav', 'audio')).toBe(true);
      expect(Validator.isValidFileType('audio/ogg', 'audio')).toBe(true);
      expect(Validator.isValidFileType('audio/mp4', 'audio')).toBe(true);
      expect(Validator.isValidFileType('audio/m4a', 'audio')).toBe(true);
      expect(Validator.isValidFileType('audio/aac', 'audio')).toBe(true);
    });

    test('should validate image file types', () => {
      expect(Validator.isValidFileType('image/jpeg', 'image')).toBe(true);
      expect(Validator.isValidFileType('image/png', 'image')).toBe(true);
      expect(Validator.isValidFileType('image/webp', 'image')).toBe(true);
      expect(Validator.isValidFileType('image/heic', 'image')).toBe(true);
      expect(Validator.isValidFileType('image/heif', 'image')).toBe(true);
    });

    test('should validate video file types', () => {
      expect(Validator.isValidFileType('video/mp4', 'video')).toBe(true);
      expect(Validator.isValidFileType('video/webm', 'video')).toBe(true);
      expect(Validator.isValidFileType('video/quicktime', 'video')).toBe(true);
    });

    test('should reject invalid file types', () => {
      expect(Validator.isValidFileType('text/plain', 'audio')).toBe(false);
      expect(Validator.isValidFileType('image/gif', 'image')).toBe(false); // not in allowed list
      expect(Validator.isValidFileType('audio/mp3', 'image')).toBe(false); // wrong category
      expect(Validator.isValidFileType('', 'audio')).toBe(false);
      expect(Validator.isValidFileType(null, 'audio')).toBe(false);
      expect(Validator.isValidFileType('audio/mp3', 'unknown')).toBe(false); // unknown category
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined inputs gracefully', () => {
      expect(Validator.isValidEmail(null)).toBe(false);
      expect(Validator.isValidEmail(undefined)).toBe(false);
      expect(Validator.isValidUserId(null)).toBe(false);
      expect(Validator.isValidUserId(undefined)).toBe(false);
      expect(Validator.isValidPhone(null)).toBe(false);
      expect(Validator.isValidPhone(undefined)).toBe(false);
      expect(Validator.isValidIncidentId(null)).toBe(false);
      expect(Validator.isValidIncidentId(undefined)).toBe(false);
    });

    test('should handle empty strings', () => {
      expect(Validator.isValidEmail('')).toBe(false);
      expect(Validator.isValidUserId('')).toBe(false);
      expect(Validator.isValidPhone('')).toBe(false);
      expect(Validator.isValidIncidentId('')).toBe(false);
    });

    test('should handle non-string inputs', () => {
      expect(Validator.isValidEmail(123)).toBe(false);
      expect(Validator.isValidUserId(123)).toBe(false);
      expect(Validator.isValidPhone(123)).toBe(false);
      expect(Validator.sanitizeInput(123)).toBe('123'); // converts to string
    });
  });
});
