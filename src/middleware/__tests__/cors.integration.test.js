/**
 * CORS Middleware Integration Tests
 * Tests CORS middleware with mock Express app
 */

const express = require('express');
const request = require('supertest');
const cors = require('cors');

// Mock logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('CORS Middleware Integration', () => {
  let app;
  const originalEnv = process.env;

  // Helper to create test app with CORS
  const createTestApp = () => {
    // Clear module cache to get fresh corsConfig with current env
    jest.resetModules();
    const { corsOptions } = require('../corsConfig');

    const testApp = express();
    testApp.use(cors(corsOptions));

    // Test endpoint
    testApp.get('/api/test', (req, res) => {
      res.json({ success: true, message: 'CORS test endpoint' });
    });

    // Session endpoint (like auth/session)
    testApp.get('/api/auth/session', (req, res) => {
      res.json({ authenticated: false });
    });

    return testApp;
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Same-Origin Requests', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = '';
      app = createTestApp();
    });

    it('should allow requests without Origin header (same-origin)', async () => {
      const response = await request(app)
        .get('/api/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Cross-Origin Requests - Allowed Origins', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';
      process.env.CORS_ALLOW_LOCALHOST = 'false';
      app = createTestApp();
    });

    it('should allow requests from whitelisted origin', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow requests from second whitelisted origin', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://app.example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
    });

    it('should allow Typeform origins (static whitelist)', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://typeform.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://typeform.com');
    });
  });

  describe('Cross-Origin Requests - Rejected Origins', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      process.env.CORS_ALLOW_LOCALHOST = 'false';
      process.env.CORS_ALLOW_REPLIT_SUBDOMAINS = 'false';
      app = createTestApp();
    });

    it('should reject requests from non-whitelisted origin', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://evil.com');

      // CORS middleware doesn't set headers, but request should still complete
      // (browser will block based on missing CORS headers)
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should reject subdomain if not explicitly whitelisted', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://subdomain.example.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should reject different protocol', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://example.com'); // HTTP instead of HTTPS

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Development Mode - Localhost', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOWED_ORIGINS = '';
      process.env.CORS_ALLOW_LOCALHOST = 'true';
      app = createTestApp();
    });

    it('should allow localhost:3000', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should allow localhost:5000', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://localhost:5000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5000');
    });

    it('should allow localhost:8080', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://localhost:8080');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8080');
    });

    it('should allow 127.0.0.1', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://127.0.0.1:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
    });
  });

  describe('Replit Subdomains', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOWED_ORIGINS = '';
      process.env.CORS_ALLOW_LOCALHOST = 'false';
      process.env.CORS_ALLOW_REPLIT_SUBDOMAINS = 'true';
      app = createTestApp();
    });

    it('should allow valid .replit.app subdomain', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://workspace.replit.app');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://workspace.replit.app');
    });

    it('should allow valid .replit.dev subdomain', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://myapp.replit.dev');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://myapp.replit.dev');
    });

    it('should reject HTTP replit subdomain (requires HTTPS)', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://myapp.replit.app');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Preflight Requests (OPTIONS)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      app = createTestApp();
    });

    it('should handle preflight OPTIONS request', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should include allowed methods in preflight', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'DELETE');

      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-methods']).toContain('PUT');
      expect(response.headers['access-control-allow-methods']).toContain('DELETE');
    });

    it('should include max-age for preflight caching', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-max-age']).toBe('86400'); // 24 hours
    });
  });

  describe('Credentials Support', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      app = createTestApp();
    });

    it('should include credentials header', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://example.com');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow cookies in cross-origin requests', async () => {
      const response = await request(app)
        .get('/api/auth/session')
        .set('Origin', 'https://example.com')
        .set('Cookie', 'access_token=test123');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Request Headers', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      app = createTestApp();
    });

    it('should allow custom headers in preflight', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'X-Api-Key,Authorization');

      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
      expect(response.headers['access-control-allow-headers']).toContain('X-Api-Key');
    });

    it('should expose X-Request-Id header', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://example.com');

      expect(response.headers['access-control-expose-headers']).toContain('X-Request-Id');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle frontend app calling API', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://myapp.com';
      app = createTestApp();

      const response = await request(app)
        .get('/api/auth/session')
        .set('Origin', 'https://myapp.com')
        .set('Cookie', 'session_token=abc123');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://myapp.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle development from localhost', async () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOW_LOCALHOST = 'true';
      app = createTestApp();

      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should handle Replit preview deployment', async () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOW_REPLIT_SUBDOMAINS = 'true';
      app = createTestApp();

      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://workspace-abc123.replit.app');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://workspace-abc123.replit.app');
    });
  });

  describe('Security Edge Cases', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      process.env.CORS_ALLOW_LOCALHOST = 'false';
      app = createTestApp();
    });

    it('should reject null origin', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'null');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should reject file:// protocol', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'file://');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
