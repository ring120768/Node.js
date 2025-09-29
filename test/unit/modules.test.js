
/**
 * Unit Tests for Enhanced Modules
 * Moved from testModules.js for better organization
 */

const { CONSTANTS, ConstantHelpers } = require('../../constants');
const ConsentManager = require('../../consentManager');
const WebhookDebugger = require('../../webhookDebugger');

describe('Enhanced Modules Unit Tests', () => {
  describe('Constants Module', () => {
    test('should have correct webhook providers', () => {
      expect(CONSTANTS.WEBHOOK_PROVIDERS.TYPEFORM).toBe('typeform');
      expect(CONSTANTS.WEBHOOK_PROVIDERS.SUPABASE).toBe('supabase');
    });

    test('should detect consent correctly', () => {
      expect(ConstantHelpers.isConsent('yes')).toBe(true);
      expect(ConstantHelpers.isConsent('no')).toBe(false);
      expect(ConstantHelpers.isConsent(true)).toBe(true);
      expect(ConstantHelpers.isConsent(false)).toBe(false);
      expect(ConstantHelpers.isConsent(null)).toBe(null);
    });
  });

  describe('Consent Manager', () => {
    let consentManager;

    beforeEach(() => {
      consentManager = new ConsentManager();
    });

    test('should extract Typeform consent', () => {
      const payload = {
        form_response: {
          answers: [{
            field: { ref: 'legal_support' },
            boolean: true
          }]
        }
      };

      const result = consentManager.extractConsentFromWebhook(payload);
      expect(result.hasConsent).toBe(true);
    });

    test('should detect consent fields', () => {
      expect(consentManager.isConsentField('gdpr_consent')).toBe(true);
      expect(consentManager.isConsentField('legal_support')).toBe(true);
      expect(consentManager.isConsentField('random_field')).toBe(false);
    });
  });

  describe('Webhook Debugger', () => {
    let webhookDebugger;

    beforeEach(() => {
      webhookDebugger = new WebhookDebugger();
    });

    test('should analyze webhook structure', () => {
      const mockReq = {
        headers: { 'content-type': 'application/json' },
        body: { form_response: { form_id: 'test123' } }
      };

      const analysis = webhookDebugger.analyzeWebhook(mockReq);
      expect(analysis.provider).toBe('typeform');
      expect(analysis.structure.identified).toBe(true);
    });

    test('should generate recommendations', () => {
      const mockReq = {
        headers: {},
        body: {}
      };

      const analysis = webhookDebugger.analyzeWebhook(mockReq);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });
});
