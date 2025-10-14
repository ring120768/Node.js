const { errorHandler, asyncHandler, ERROR_CODES } = require('../errorHandler');

jest.mock('../../utils/logger');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      requestId: 'test-123',
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    process.env.NODE_ENV = 'production';
    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    it('should hide stack traces in production', () => {
      const error = new Error('Database connection failed');
      error.statusCode = 500;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ERROR_CODES.SERVER_ERROR,
            message: 'Internal server error',
            requestId: 'test-123'
          })
        })
      );
      
      // Stack should NOT be included
      const response = res.json.mock.calls[0][0];
      expect(response.error.stack).toBeUndefined();
    });

    it('should show detailed errors in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed error message');
      error.statusCode = 400;

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.error.message).toBe('Detailed error message');
      expect(response.error.stack).toBeDefined();
    });

    it('should handle validation errors', () => {
      const error = new Error('Invalid email format');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid request data'
          })
        })
      );
    });

    it('should handle auth errors', () => {
      const error = new Error('Token expired');
      error.statusCode = 401;
      error.code = 'AUTH_REQUIRED';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ERROR_CODES.AUTH_ERROR
          })
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('should catch async errors and pass to next', async () => {
      const asyncFn = async () => {
        throw new Error('Async error');
      };

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Async error');
    });

    it('should pass through successful responses', async () => {
      const asyncFn = async (req, res) => {
        res.json({ success: true });
      };

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });
  });
});
