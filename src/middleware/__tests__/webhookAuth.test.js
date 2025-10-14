const crypto = require('crypto');
const { validateWebhookSignature } = require('../webhookAuth');

jest.mock('../../utils/logger');
jest.mock('../../utils/response', () => ({
  sendError: jest.fn()
}));

describe('Webhook Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      requestId: 'test-req-123',
      get: jest.fn(),
      rawBody: '{"test":"payload"}'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
    
    process.env.TYPEFORM_WEBHOOK_SECRET = 'test-typeform-secret';
    process.env.ZAPIER_SHARED_KEY = 'test-zapier-secret';
    process.env.GITHUB_WEBHOOK_SECRET = 'test-github-secret';
  });

  afterEach(() => {
    delete process.env.TYPEFORM_WEBHOOK_SECRET;
    delete process.env.ZAPIER_SHARED_KEY;
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  describe('Typeform Signature Validation', () => {
    it('should accept valid Typeform signature', () => {
      const secret = 'test-typeform-secret';
      const payload = '{"test":"payload"}';
      const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('base64');

      req.get.mockReturnValue(expectedSig);
      req.rawBody = payload;

      const middleware = validateWebhookSignature('typeform');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid Typeform signature', () => {
      const { sendError } = require('../../utils/response');
      req.get.mockReturnValue('sha256=invalid_signature');
      req.rawBody = '{"test":"payload"}';

      const middleware = validateWebhookSignature('typeform');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(sendError).toHaveBeenCalled();
    });
  });

  describe('Configuration Errors', () => {
    it('should return 500 when webhook secret not configured', () => {
      const { sendError } = require('../../utils/response');
      delete process.env.TYPEFORM_WEBHOOK_SECRET;
      delete process.env.WEBHOOK_API_KEY;

      const middleware = validateWebhookSignature('typeform');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(sendError).toHaveBeenCalledWith(
        res,
        500,
        'Webhook authentication not configured',
        'CONFIG_ERROR'
      );
    });
  });
});
