/**
 * CORS Configuration Unit Tests
 * Tests for environment-based CORS validation and configuration
 */

const {
  isOriginAllowed,
  parseAllowedOrigins,
  getCorsConfigSummary
} = require('../corsConfig');

// Mock logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('CORS Configuration', () => {
  // Store original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('parseAllowedOrigins', () => {
    it('should parse comma-separated origins from environment', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com,https://app.example.com';

      const origins = parseAllowedOrigins();

      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('https://example.com');
      expect(origins).toContain('https://app.example.com');
    });

    it('should include static origins (Typeform)', () => {
      process.env.ALLOWED_ORIGINS = '';

      const origins = parseAllowedOrigins();

      expect(origins).toContain('https://form.typeform.com');
      expect(origins).toContain('https://typeform.com');
      expect(origins).toContain('https://api.typeform.com');
    });

    it('should handle missing ALLOWED_ORIGINS env var', () => {
      delete process.env.ALLOWED_ORIGINS;

      const origins = parseAllowedOrigins();

      // Should still have static origins
      expect(origins).toContain('https://typeform.com');
      expect(origins.length).toBeGreaterThan(0);
    });

    it('should deduplicate origins', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://typeform.com,https://example.com';

      const origins = parseAllowedOrigins();

      // Count occurrences of example.com
      const exampleCount = origins.filter(o => o === 'https://example.com').length;
      expect(exampleCount).toBe(1);
    });

    it('should trim whitespace from origins', () => {
      process.env.ALLOWED_ORIGINS = ' http://localhost:3000 , https://example.com ';

      const origins = parseAllowedOrigins();

      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('https://example.com');
    });
  });

  describe('isOriginAllowed - Exact Matches', () => {
    beforeEach(() => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOW_LOCALHOST = 'false';
      process.env.CORS_ALLOW_REPLIT_SUBDOMAINS = 'false';
    });

    it('should allow exact origin matches', () => {
      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(isOriginAllowed('https://example.com')).toBe(true);
    });

    it('should allow static Typeform origins', () => {
      expect(isOriginAllowed('https://typeform.com')).toBe(true);
      expect(isOriginAllowed('https://form.typeform.com')).toBe(true);
      expect(isOriginAllowed('https://api.typeform.com')).toBe(true);
    });

    it('should reject non-whitelisted origins', () => {
      expect(isOriginAllowed('http://evil.com')).toBe(false);
      expect(isOriginAllowed('https://hacker.com')).toBe(false);
    });

    it('should allow same-origin requests (no origin header)', () => {
      expect(isOriginAllowed(null)).toBe(true);
      expect(isOriginAllowed(undefined)).toBe(true);
      expect(isOriginAllowed('')).toBe(true);
    });

    it('should be case-sensitive for origin matching', () => {
      expect(isOriginAllowed('HTTPS://EXAMPLE.COM')).toBe(false);
      expect(isOriginAllowed('https://EXAMPLE.com')).toBe(false);
    });
  });

  describe('isOriginAllowed - Localhost Development Mode', () => {
    beforeEach(() => {
      process.env.ALLOWED_ORIGINS = '';
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOW_LOCALHOST = 'true';
      process.env.CORS_ALLOW_REPLIT_SUBDOMAINS = 'false';
    });

    it('should allow localhost with any port', () => {
      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(isOriginAllowed('http://localhost:5000')).toBe(true);
      expect(isOriginAllowed('http://localhost:8080')).toBe(true);
      expect(isOriginAllowed('http://localhost:9999')).toBe(true);
    });

    it('should allow localhost without port', () => {
      expect(isOriginAllowed('http://localhost')).toBe(true);
      expect(isOriginAllowed('https://localhost')).toBe(true);
    });

    it('should allow 127.0.0.1 with any port', () => {
      expect(isOriginAllowed('http://127.0.0.1:3000')).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:5000')).toBe(true);
      expect(isOriginAllowed('https://127.0.0.1:8080')).toBe(true);
    });

    it('should allow 127.0.0.1 without port', () => {
      expect(isOriginAllowed('http://127.0.0.1')).toBe(true);
      expect(isOriginAllowed('https://127.0.0.1')).toBe(true);
    });

    it('should NOT allow localhost in production mode', () => {
      process.env.NODE_ENV = 'production';
      expect(isOriginAllowed('http://localhost:3000')).toBe(false);
    });

    it('should NOT allow localhost when CORS_ALLOW_LOCALHOST is false', () => {
      process.env.CORS_ALLOW_LOCALHOST = 'false';
      expect(isOriginAllowed('http://localhost:3000')).toBe(false);
    });

    it('should reject localhost-like subdomains', () => {
      // Security: Prevent localhost.evil.com bypass
      expect(isOriginAllowed('http://localhost.evil.com')).toBe(false);
      expect(isOriginAllowed('http://evil.localhost.com')).toBe(false);
    });
  });

  describe('isOriginAllowed - Replit Subdomains', () => {
    beforeEach(() => {
      process.env.ALLOWED_ORIGINS = '';
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOW_LOCALHOST = 'false';
      process.env.CORS_ALLOW_REPLIT_SUBDOMAINS = 'true';
    });

    it('should allow valid .replit.app subdomains', () => {
      expect(isOriginAllowed('https://myapp.replit.app')).toBe(true);
      expect(isOriginAllowed('https://workspace.replit.app')).toBe(true);
      expect(isOriginAllowed('https://test-123.replit.app')).toBe(true);
    });

    it('should allow valid .replit.dev subdomains', () => {
      expect(isOriginAllowed('https://myapp.replit.dev')).toBe(true);
      expect(isOriginAllowed('https://workspace.replit.dev')).toBe(true);
    });

    it('should require HTTPS for Replit subdomains', () => {
      expect(isOriginAllowed('http://myapp.replit.app')).toBe(false);
      expect(isOriginAllowed('http://myapp.replit.dev')).toBe(false);
    });

    it('should reject invalid Replit subdomain patterns', () => {
      // No subdomain
      expect(isOriginAllowed('https://replit.app')).toBe(false);
      expect(isOriginAllowed('https://replit.dev')).toBe(false);

      // Invalid characters
      expect(isOriginAllowed('https://my_app.replit.app')).toBe(false);
      expect(isOriginAllowed('https://my.app.replit.app')).toBe(false);

      // Wrong TLD
      expect(isOriginAllowed('https://myapp.replit.com')).toBe(false);
    });

    it('should NOT allow Replit when flag is false', () => {
      process.env.CORS_ALLOW_REPLIT_SUBDOMAINS = 'false';
      expect(isOriginAllowed('https://myapp.replit.app')).toBe(false);
    });

    it('should reject Replit-like malicious domains', () => {
      // Security: Prevent replit.app.evil.com bypass
      expect(isOriginAllowed('https://replit.app.evil.com')).toBe(false);
      expect(isOriginAllowed('https://evil.replit.app.com')).toBe(false);
    });
  });

  describe('isOriginAllowed - Security Tests', () => {
    beforeEach(() => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOW_LOCALHOST = 'false';
      process.env.CORS_ALLOW_REPLIT_SUBDOMAINS = 'false';
    });

    it('should reject origins with different protocols', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      expect(isOriginAllowed('http://example.com')).toBe(false);
    });

    it('should reject origins with different ports', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com:443';
      expect(isOriginAllowed('https://example.com:8443')).toBe(false);
    });

    it('should reject subdomain bypass attempts', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      expect(isOriginAllowed('https://evil.example.com')).toBe(false);
      expect(isOriginAllowed('https://example.com.evil.com')).toBe(false);
    });

    it('should reject URL encoded bypass attempts', () => {
      expect(isOriginAllowed('https://example%2Ecom')).toBe(false);
      expect(isOriginAllowed('https%3A%2F%2Fexample.com')).toBe(false);
    });

    it('should reject null origin exploits', () => {
      expect(isOriginAllowed('null')).toBe(false);
    });

    it('should reject file:// protocol', () => {
      expect(isOriginAllowed('file:///etc/passwd')).toBe(false);
    });

    it('should reject data: protocol', () => {
      expect(isOriginAllowed('data:text/html,<script>alert(1)</script>')).toBe(false);
    });
  });

  describe('getCorsConfigSummary', () => {
    beforeEach(() => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOW_LOCALHOST = 'true';
      process.env.CORS_ALLOW_REPLIT_SUBDOMAINS = 'true';
    });

    it('should return configuration summary', () => {
      const summary = getCorsConfigSummary();

      expect(summary).toHaveProperty('allowedOrigins');
      expect(summary).toHaveProperty('development');
      expect(summary).toHaveProperty('security');
    });

    it('should include allowed origins in summary', () => {
      const summary = getCorsConfigSummary();

      expect(summary.allowedOrigins).toContain('http://localhost:3000');
      expect(summary.allowedOrigins).toContain('https://example.com');
    });

    it('should include development settings', () => {
      const summary = getCorsConfigSummary();

      expect(summary.development.nodeEnv).toBe('development');
      expect(summary.development.allowLocalhost).toBe(true);
      expect(summary.development.allowReplitSubdomains).toBe(true);
    });

    it('should include security settings', () => {
      const summary = getCorsConfigSummary();

      expect(summary.security).toHaveProperty('credentialsAllowed');
      expect(summary.security).toHaveProperty('maxAge');
      expect(summary.security).toHaveProperty('allowedMethods');
      expect(summary.security).toHaveProperty('allowedHeadersCount');
    });
  });

  describe('Environment Edge Cases', () => {
    it('should handle empty ALLOWED_ORIGINS string', () => {
      process.env.ALLOWED_ORIGINS = '';
      const origins = parseAllowedOrigins();

      // Should still have static Typeform origins
      expect(origins.length).toBeGreaterThan(0);
    });

    it('should handle malformed ALLOWED_ORIGINS', () => {
      process.env.ALLOWED_ORIGINS = ',,http://localhost:3000,,,';
      const origins = parseAllowedOrigins();

      // Should filter out empty strings
      expect(origins.every(o => o.length > 0)).toBe(true);
    });

    it('should handle undefined environment variables gracefully', () => {
      delete process.env.CORS_ALLOW_LOCALHOST;
      delete process.env.CORS_ALLOW_REPLIT_SUBDOMAINS;

      // Should not throw
      expect(() => isOriginAllowed('http://localhost:3000')).not.toThrow();
    });
  });

  describe('CORS Options Configuration', () => {
    it('should enable credentials', () => {
      const summary = getCorsConfigSummary();
      expect(summary.security.credentialsAllowed).toBe(true);
    });

    it('should set preflight cache maxAge', () => {
      const summary = getCorsConfigSummary();
      expect(summary.security.maxAge).toBe(86400); // 24 hours
    });

    it('should allow standard HTTP methods', () => {
      const summary = getCorsConfigSummary();
      expect(summary.security.allowedMethods).toContain('GET');
      expect(summary.security.allowedMethods).toContain('POST');
      expect(summary.security.allowedMethods).toContain('PUT');
      expect(summary.security.allowedMethods).toContain('DELETE');
      expect(summary.security.allowedMethods).toContain('OPTIONS');
    });
  });
});
