/**
 * CORS Diagnostic Endpoint Tests
 * Tests for GET /api/debug/cors endpoint
 */

const express = require('express');
const request = require('supertest');

// Mock logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('CORS Diagnostic Endpoint', () => {
  let app;
  const originalEnv = process.env;

  const createTestApp = () => {
    jest.resetModules();

    const testApp = express();
    const debugRoutes = require('../debug.routes');

    testApp.use('/api/debug', debugRoutes);

    return testApp;
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('GET /api/debug/cors', () => {
    it('should return CORS configuration summary', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOW_LOCALHOST = 'true';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.cors).toBeDefined();
    });

    it('should include configuration in response', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';
      process.env.NODE_ENV = 'production';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors');

      expect(response.body.cors.configuration).toBeDefined();
      expect(response.body.cors.configuration.allowedOrigins).toContain('https://example.com');
      expect(response.body.cors.configuration.allowedOrigins).toContain('https://app.example.com');
    });

    it('should include development settings', async () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOW_LOCALHOST = 'true';
      process.env.CORS_ALLOW_REPLIT_SUBDOMAINS = 'true';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors');

      const devSettings = response.body.cors.configuration.development;
      expect(devSettings.nodeEnv).toBe('development');
      expect(devSettings.allowLocalhost).toBe(true);
      expect(devSettings.allowReplitSubdomains).toBe(true);
    });

    it('should include security settings', async () => {
      process.env.NODE_ENV = 'production';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors');

      const security = response.body.cors.configuration.security;
      expect(security.credentialsAllowed).toBe(true);
      expect(security.maxAge).toBe(86400);
      expect(security.allowedMethods).toContain('GET');
      expect(security.allowedMethods).toContain('POST');
    });

    it('should include current request information', async () => {
      process.env.NODE_ENV = 'development';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors')
        .set('Origin', 'http://localhost:3000')
        .set('User-Agent', 'Mozilla/5.0 Test Browser');

      const currentRequest = response.body.cors.currentRequest;
      expect(currentRequest.origin).toBe('http://localhost:3000');
      expect(currentRequest.userAgent).toContain('Mozilla');
    });

    it('should show origin validation status', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOW_LOCALHOST = 'false';
      app = createTestApp();

      // Test allowed origin
      const allowedResponse = await request(app)
        .get('/api/debug/cors')
        .set('Origin', 'https://example.com');

      expect(allowedResponse.body.cors.currentRequest.isAllowed).toBe(true);

      // Test rejected origin
      const rejectedResponse = await request(app)
        .get('/api/debug/cors')
        .set('Origin', 'https://evil.com');

      expect(rejectedResponse.body.cors.currentRequest.isAllowed).toBe(false);
    });

    it('should handle same-origin requests (no Origin header)', async () => {
      process.env.NODE_ENV = 'production';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors');
        // No Origin header set

      expect(response.status).toBe(200);
      expect(response.body.cors.currentRequest.origin).toContain('same-origin');
      expect(response.body.cors.currentRequest.isAllowed).toBe(true);
    });

    it('should include timestamp', async () => {
      process.env.NODE_ENV = 'development';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors');

      expect(response.body.cors.timestamp).toBeDefined();
      // Timestamp should be valid ISO 8601 date
      expect(new Date(response.body.cors.timestamp).toISOString()).toBe(response.body.cors.timestamp);
    });

    it('should show referer information when present', async () => {
      process.env.NODE_ENV = 'development';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors')
        .set('Referer', 'https://example.com/previous-page');

      expect(response.body.cors.currentRequest.referer).toBe('https://example.com/previous-page');
    });

    it('should handle missing referer gracefully', async () => {
      process.env.NODE_ENV = 'development';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors');

      expect(response.body.cors.currentRequest.referer).toBe('none');
    });
  });

  describe('CORS Diagnostic - Use Cases', () => {
    it('should help developers debug localhost issues', async () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOW_LOCALHOST = 'false'; // Misconfigured
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors')
        .set('Origin', 'http://localhost:3000');

      // Developer can see:
      // 1. Their origin is localhost:3000
      expect(response.body.cors.currentRequest.origin).toBe('http://localhost:3000');

      // 2. Localhost is not allowed
      expect(response.body.cors.configuration.development.allowLocalhost).toBe(false);

      // 3. Request would be rejected
      expect(response.body.cors.currentRequest.isAllowed).toBe(false);

      // Now they know to set CORS_ALLOW_LOCALHOST=true
    });

    it('should help identify missing origins in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com'; // Frontend is on www subdomain
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors')
        .set('Origin', 'https://www.example.com'); // Different subdomain!

      // Shows the problem:
      expect(response.body.cors.currentRequest.origin).toBe('https://www.example.com');
      expect(response.body.cors.currentRequest.isAllowed).toBe(false);
      expect(response.body.cors.configuration.allowedOrigins).not.toContain('https://www.example.com');

      // Solution: Add to ALLOWED_ORIGINS
    });

    it('should verify Replit configuration', async () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOW_REPLIT_SUBDOMAINS = 'true';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors')
        .set('Origin', 'https://workspace.replit.app');

      expect(response.body.cors.configuration.development.allowReplitSubdomains).toBe(true);
      expect(response.body.cors.currentRequest.isAllowed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should not crash with malformed headers', async () => {
      process.env.NODE_ENV = 'development';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors')
        .set('Origin', 'not-a-valid-url!!!');

      // Should still return 200 with diagnostic info
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle missing environment variables', async () => {
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.CORS_ALLOW_LOCALHOST;
      delete process.env.CORS_ALLOW_REPLIT_SUBDOMAINS;
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Response Format', () => {
    it('should return well-structured JSON', async () => {
      process.env.NODE_ENV = 'development';
      app = createTestApp();

      const response = await request(app)
        .get('/api/debug/cors');

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('cors');
      expect(response.body.cors).toHaveProperty('configuration');
      expect(response.body.cors).toHaveProperty('currentRequest');
      expect(response.body.cors).toHaveProperty('timestamp');
    });
  });
});
