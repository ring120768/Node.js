/**
 * Test Script for New Modules
 * Run with: node testModules.js
 */

const { CONSTANTS, ConstantHelpers } = require('./constants');
const ConsentManager = require('./consentManager');
const WebhookDebugger = require('./webhookDebugger');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'cyan');
  console.log('='.repeat(50));
}

// Test Constants Module
function testConstants() {
  logSection('Testing Constants Module');

  let passed = 0;
  let failed = 0;

  // Test 1: Constants structure
  try {
    if (CONSTANTS.WEBHOOK_PROVIDERS.TYPEFORM === 'typeform') {
      log('✓ Constants structure correct', 'green');
      passed++;
    } else {
      throw new Error('Constants structure incorrect');
    }
  } catch (error) {
    log('✗ Constants structure test failed: ' + error.message, 'red');
    failed++;
  }

  // Test 2: Consent detection helper
  try {
    const testCases = [
      { value: 'yes', expected: true },
      { value: 'no', expected: false },
      { value: true, expected: true },
      { value: false, expected: false },
      { value: 'agreed', expected: true },
      { value: 'declined', expected: false },
      { value: null, expected: null }
    ];

    let allPassed = true;
    for (const test of testCases) {
      const result = ConstantHelpers.isConsent(test.value);
      if (result !== test.expected) {
        allPassed = false;
        log(`  Consent detection failed for ${test.value}: got ${result}, expected ${test.expected}`, 'yellow');
      }
    }

    if (allPassed) {
      log('✓ Consent detection helper works correctly', 'green');
      passed++;
    } else {
      throw new Error('Some consent detection tests failed');
    }
  } catch (error) {
    log('✗ Consent detection test failed: ' + error.message, 'red');
    failed++;
  }

  // Test 3: Provider detection
  try {
    const mockReq = {
      headers: { 'x-typeform-signature': 'test123' },
      body: { form_response: { answers: [] } }
    };

    const provider = ConstantHelpers.detectWebhookProvider(mockReq);
    if (provider === CONSTANTS.WEBHOOK_PROVIDERS.TYPEFORM) {
      log('✓ Provider detection works', 'green');
      passed++;
    } else {
      throw new Error(`Expected TYPEFORM, got ${provider}`);
    }
  } catch (error) {
    log('✗ Provider detection test failed: ' + error.message, 'red');
    failed++;
  }

  // Test 4: Nested value extraction
  try {
    const testObj = {
      level1: {
        level2: {
          level3: 'found'
        }
      }
    };

    const value = ConstantHelpers.getNestedValue(testObj, 'level1.level2.level3');
    if (value === 'found') {
      log('✓ Nested value extraction works', 'green');
      passed++;
    } else {
      throw new Error(`Expected 'found', got ${value}`);
    }
  } catch (error) {
    log('✗ Nested value extraction test failed: ' + error.message, 'red');
    failed++;
  }

  log(`\nConstants Module: ${passed} passed, ${failed} failed`, 
      failed > 0 ? 'yellow' : 'green');

  return { passed, failed };
}

// Test Consent Manager Module
function testConsentManager() {
  logSection('Testing Consent Manager Module');

  let passed = 0;
  let failed = 0;

  const consentManager = new ConsentManager();

  // Test 1: Typeform consent extraction
  try {
    const typeformPayload = {
      form_response: {
        form_id: 'test123',
        token: 'token456',
        answers: [
          {
            field: { id: 'field1', ref: 'question_14', title: 'Do you agree to share data?' },
            type: 'boolean',
            boolean: true
          }
        ],
        submitted_at: '2024-01-01T00:00:00Z'
      },
      create_user_id: 'user123'
    };

    const result = consentManager.extractConsentFromWebhook(typeformPayload);

    if (result.hasConsent === true && result.consentFields['question_14']) {
      log('✓ Typeform consent extraction works', 'green');
      passed++;
    } else {
      throw new Error('Failed to extract Typeform consent');
    }
  } catch (error) {
    log('✗ Typeform consent extraction failed: ' + error.message, 'red');
    failed++;
  }

  // Test 2: Flat structure consent extraction
  try {
    const flatPayload = {
      create_user_id: 'user123',
      legal_support: 'Yes',
      gdpr_consent: true,
      email: 'test@example.com'
    };

    const result = consentManager.extractConsentFromWebhook(flatPayload);

    if (result.hasConsent === true && 
        result.consentFields['legal_support'] && 
        result.consentFields['gdpr_consent']) {
      log('✓ Flat structure consent extraction works', 'green');
      passed++;
    } else {
      throw new Error('Failed to extract flat structure consent');
    }
  } catch (error) {
    log('✗ Flat structure consent extraction failed: ' + error.message, 'red');
    failed++;
  }

  // Test 3: Mixed consent values
  try {
    const mixedPayload = {
      consent_given: 'no',
      legal_support: 'Yes',
      gdpr_consent: false
    };

    const result = consentManager.extractConsentFromWebhook(mixedPayload);

    if (result.hasConsent === false) {
      log('✓ Mixed consent detection works (denial takes precedence)', 'green');
      passed++;
    } else {
      throw new Error('Failed to handle mixed consent values');
    }
  } catch (error) {
    log('✗ Mixed consent test failed: ' + error.message, 'red');
    failed++;
  }

  // Test 4: Consent field pattern matching
  try {
    const fields = [
      'gdpr_consent',
      'legal-support',
      'consent_given',
      'question_14',
      'agree_to_share_data',
      'not_consent_field'
    ];

    let correctMatches = 0;
    for (const field of fields) {
      const isConsent = consentManager.isConsentField(field);
      if (field === 'not_consent_field' && !isConsent) {
        correctMatches++;
      } else if (field !== 'not_consent_field' && isConsent) {
        correctMatches++;
      }
    }

    if (correctMatches === fields.length) {
      log('✓ Consent field pattern matching works', 'green');
      passed++;
    } else {
      throw new Error(`Only ${correctMatches}/${fields.length} fields matched correctly`);
    }
  } catch (error) {
    log('✗ Field pattern matching failed: ' + error.message, 'red');
    failed++;
  }

  log(`\nConsent Manager Module: ${passed} passed, ${failed} failed`, 
      failed > 0 ? 'yellow' : 'green');

  return { passed, failed };
}

// Test Webhook Debugger Module
function testWebhookDebugger() {
  logSection('Testing Webhook Debugger Module');

  let passed = 0;
  let failed = 0;

  const webhookDebugger = new WebhookDebugger();

  // Test 1: Webhook analysis
  try {
    const mockReq = {
      headers: {
        'content-type': 'application/json',
        'x-typeform-signature': 'sig123',
        'user-agent': 'Typeform Webhooks'
      },
      body: {
        form_response: {
          form_id: 'form123',
          token: 'token456',
          answers: [],
          submitted_at: '2024-01-01T00:00:00Z'
        },
        event_type: 'form_response',
        create_user_id: 'user123'
      }
    };

    const analysis = webhookDebugger.analyzeWebhook(mockReq);

    if (analysis.provider === 'typeform' && 
        analysis.fields.userId === 'user123' &&
        analysis.structure.identified === true) {
      log('✓ Webhook analysis works', 'green');
      passed++;
    } else {
      throw new Error('Webhook analysis incomplete');
    }
  } catch (error) {
    log('✗ Webhook analysis failed: ' + error.message, 'red');
    failed++;
  }

  // Test 2: Webhook storage
  try {
    const mockReq = {
      headers: { 'content-type': 'application/json' },
      body: { test: 'data', create_user_id: 'user123' }
    };

    const analysis = webhookDebugger.analyzeWebhook(mockReq, { store: true });
    const stored = webhookDebugger.getWebhook(analysis.id);

    if (stored && stored.id === analysis.id) {
      log('✓ Webhook storage works', 'green');
      passed++;
    } else {
      throw new Error('Webhook not stored correctly');
    }
  } catch (error) {
    log('✗ Webhook storage failed: ' + error.message, 'red');
    failed++;
  }

  // Test 3: Provider-specific analysis
  try {
    const providers = {
      typeform: {
        headers: { 'x-typeform-signature': 'test' },
        body: { form_response: { form_id: 'test' } }
      },
      supabase: {
        headers: {},
        body: { type: 'INSERT', table: 'users', record: { id: 1 } }
      },
      zapier: {
        headers: { 'user-agent': 'Zapier' },
        body: { event: 'test', data: {} }
      }
    };

    let allCorrect = true;
    for (const [expectedProvider, mockData] of Object.entries(providers)) {
      const analysis = webhookDebugger.analyzeWebhook({
        headers: mockData.headers,
        body: mockData.body
      });

      if (analysis.provider !== expectedProvider) {
        allCorrect = false;
        log(`  Provider detection failed for ${expectedProvider}`, 'yellow');
      }
    }

    if (allCorrect) {
      log('✓ Provider-specific analysis works', 'green');
      passed++;
    } else {
      throw new Error('Some provider detections failed');
    }
  } catch (error) {
    log('✗ Provider-specific analysis failed: ' + error.message, 'red');
    failed++;
  }

  // Test 4: Recommendations generation
  try {
    const mockReq = {
      headers: { 'content-type': 'application/json' },
      body: {} // Empty body should trigger recommendations
    };

    const analysis = webhookDebugger.analyzeWebhook(mockReq);

    if (analysis.recommendations && analysis.recommendations.length > 0) {
      log('✓ Recommendations generation works', 'green');
      passed++;
    } else {
      throw new Error('No recommendations generated');
    }
  } catch (error) {
    log('✗ Recommendations generation failed: ' + error.message, 'red');
    failed++;
  }

  // Test 5: Search webhooks
  try {
    // Add some test webhooks
    for (let i = 0; i < 5; i++) {
      webhookDebugger.analyzeWebhook({
        headers: {},
        body: { 
          create_user_id: i < 3 ? 'user123' : 'user456',
          provider: 'test' 
        }
      }, { store: true });
    }

    const results = webhookDebugger.searchWebhooks({ userId: 'user123' });

    if (results.length === 3) {
      log('✓ Webhook search works', 'green');
      passed++;
    } else {
      throw new Error(`Expected 3 results, got ${results.length}`);
    }
  } catch (error) {
    log('✗ Webhook search failed: ' + error.message, 'red');
    failed++;
  }

  log(`\nWebhook Debugger Module: ${passed} passed, ${failed} failed`, 
      failed > 0 ? 'yellow' : 'green');

  return { passed, failed };
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(50));
  log('CAR CRASH LAWYER AI - MODULE TEST SUITE', 'blue');
  console.log('='.repeat(50));

  const results = {
    constants: { passed: 0, failed: 0 },
    consent: { passed: 0, failed: 0 },
    webhook: { passed: 0, failed: 0 }
  };

  try {
    results.constants = testConstants();
  } catch (error) {
    log('Constants module tests crashed: ' + error.message, 'red');
  }

  try {
    results.consent = testConsentManager();
  } catch (error) {
    log('Consent Manager tests crashed: ' + error.message, 'red');
  }

  try {
    results.webhook = testWebhookDebugger();
  } catch (error) {
    log('Webhook Debugger tests crashed: ' + error.message, 'red');
  }

  // Summary
  logSection('TEST SUMMARY');

  const totalPassed = results.constants.passed + results.consent.passed + results.webhook.passed;
  const totalFailed = results.constants.failed + results.consent.failed + results.webhook.failed;

  log(`Constants Module:     ${results.constants.passed} passed, ${results.constants.failed} failed`);
  log(`Consent Manager:      ${results.consent.passed} passed, ${results.consent.failed} failed`);
  log(`Webhook Debugger:     ${results.webhook.passed} passed, ${results.webhook.failed} failed`);
  log('-'.repeat(50));
  log(`TOTAL:                ${totalPassed} passed, ${totalFailed} failed`, 
      totalFailed > 0 ? 'red' : 'green');

  if (totalFailed === 0) {
    log('\n🎉 All tests passed! Modules are ready for integration.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', 'yellow');
  }

  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log('Fatal error running tests: ' + error.message, 'red');
  process.exit(1);
});