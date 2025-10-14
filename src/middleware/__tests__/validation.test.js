const { validateWebhookPayload, validateUUID, validateUrl } = require('../validation');

jest.mock('../../utils/logger');
jest.mock('../../utils/response', () => ({
  sendError: jest.fn()
}));

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      requestId: 'test-123',
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateUUID', () => {
    it('should accept valid UUIDv4', () => {
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUID', () => {
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID('12345')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(validateUrl('https://example.com/image.jpg', 'imageUrl')).toBeNull();
    });

    it('should reject file:// URLs (SSRF)', () => {
      const error = validateUrl('file:///etc/passwd', 'fileUrl');
      expect(error).toContain('Unsupported protocol');
    });

    it('should reject localhost URLs (SSRF)', () => {
      const error = validateUrl('http://localhost/api', 'apiUrl');
      expect(error).toContain('Cannot access localhost');
    });

    it('should reject private IP URLs (SSRF)', () => {
      const error = validateUrl('http://192.168.1.1/config', 'configUrl');
      expect(error).toContain('Cannot access private IP');
    });

    it('should reject cloud metadata service (SSRF)', () => {
      const error = validateUrl('http://169.254.169.254/latest/meta-data/', 'metadataUrl');
      // 169.254.169.254 is link-local, correctly blocked as private IP
      expect(error).toContain('Cannot access private IP');
    });
  });

  describe('validateWebhookPayload', () => {
    it('should pass valid payload', () => {
      req.body = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        imageUrl: 'https://example.com/image.jpg',
        name: 'Test User'
      };

      validateWebhookPayload(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject payload with invalid URL', () => {
      const { sendError } = require('../../utils/response');
      req.body = {
        imageUrl: 'file:///etc/passwd'
      };

      validateWebhookPayload(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(sendError).toHaveBeenCalled();
    });

    it('should reject oversized fields', () => {
      const { sendError } = require('../../utils/response');
      req.body = {
        name: 'x'.repeat(100) // Exceeds NAME_FIELD limit of 50
      };

      validateWebhookPayload(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(sendError).toHaveBeenCalled();
    });
  });
});
