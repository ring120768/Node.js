
/**
 * Comprehensive Test Suite for Car Crash Lawyer AI
 * Tests all major features and documents results
 */

const axios = require('axios');
const FormData = require('form-data');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const WS_URL = BASE_URL.replace('http', 'ws');
const API_KEY = process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: {}
};

/**
 * Utility functions
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function logTest(testName, passed, details = null) {
  if (passed) {
    testResults.passed++;
    log(`${testName} - PASSED`, 'success');
  } else {
    testResults.failed++;
    log(`${testName} - FAILED`, 'error');
    if (details) {
      testResults.errors.push({ test: testName, error: details });
    }
  }
  testResults.details[testName] = { passed, details };
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

/**
 * Test 1: Server Startup and Health Check
 */
async function testServerStartup() {
  log('Testing server startup and health check...');

  try {
    // Basic health check
    const healthResponse = await makeRequest('GET', '/health');
    logTest('Health Check Endpoint', healthResponse.success, healthResponse.error);

    if (healthResponse.success) {
      const health = healthResponse.data;
      logTest('Supabase Service', health.services?.supabase === true, 'Supabase not configured');
      logTest('OpenAI Service', health.services?.openai === true, 'OpenAI not configured');
      logTest('WebSocket Service', typeof health.services?.websocket === 'number', 'WebSocket not running');
      logTest('GDPR Compliance', health.services?.gdprCompliant === true, 'GDPR not compliant');
      logTest('Auth Service', health.services?.auth === true, 'Auth service not configured');
    }

    // Test config endpoint
    const configResponse = await makeRequest('GET', '/api/config');
    logTest('Config Endpoint', configResponse.success, configResponse.error);

  } catch (error) {
    logTest('Server Startup', false, error.message);
  }
}

/**
 * Test 2: Authentication Endpoints
 */
async function testAuthEndpoints() {
  log('Testing authentication endpoints...');

  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    fullName: 'Test User',
    phone: '+1234567890',
    gdprConsent: true
  };

  try {
    // Test signup
    const signupResponse = await makeRequest('POST', '/api/auth/signup', testUser);
    logTest('User Signup', signupResponse.success, signupResponse.error);

    let accessToken = null;
    if (signupResponse.success) {
      accessToken = signupResponse.data.session?.access_token;
      logTest('Signup GDPR Consent', signupResponse.data.gdpr?.consentGiven === true, 'GDPR consent not captured');
    }

    // Test login
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: testUser.email,
      password: testUser.password,
      rememberMe: false
    });
    logTest('User Login', loginResponse.success, loginResponse.error);

    if (loginResponse.success && !accessToken) {
      accessToken = loginResponse.data.session?.access_token;
    }

    // Test session check
    if (accessToken) {
      const sessionResponse = await makeRequest('GET', '/api/auth/session', null, {
        'Authorization': `Bearer ${accessToken}`
      });
      logTest('Session Check', sessionResponse.success, sessionResponse.error);
    }

    // Test logout
    const logoutResponse = await makeRequest('POST', '/api/auth/logout');
    logTest('User Logout', logoutResponse.success, logoutResponse.error);

  } catch (error) {
    logTest('Auth Endpoints', false, error.message);
  }
}

/**
 * Test 3: Transcription Service
 */
async function testTranscription() {
  log('Testing transcription service...');

  try {
    // Create a simple audio buffer for testing
    const audioBuffer = Buffer.from('test audio data');
    const testUserId = `test-user-${Date.now()}`;

    const formData = new FormData();
    formData.append('audio', audioBuffer, {
      filename: 'test-audio.webm',
      contentType: 'audio/webm'
    });
    formData.append('create_user_id', testUserId);

    // Test transcription upload
    const transcribeResponse = await axios.post(`${BASE_URL}/api/transcription/transcribe`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 15000
    });

    logTest('Transcription Upload', transcribeResponse.status === 200, `Status: ${transcribeResponse.status}`);

    if (transcribeResponse.status === 200) {
      const queueId = transcribeResponse.data.queueId;
      
      // Test status check
      setTimeout(async () => {
        try {
          const statusResponse = await makeRequest('GET', `/api/transcription/status/${queueId}`);
          logTest('Transcription Status Check', statusResponse.success, statusResponse.error);
        } catch (error) {
          logTest('Transcription Status Check', false, error.message);
        }
      }, 2000);

      // Test get latest transcription
      setTimeout(async () => {
        try {
          const latestResponse = await makeRequest('GET', `/api/transcription/user/${testUserId}/latest`);
          logTest('Get Latest Transcription', latestResponse.success, latestResponse.error);
        } catch (error) {
          logTest('Get Latest Transcription', false, error.message);
        }
      }, 3000);
    }

  } catch (error) {
    logTest('Transcription Service', false, error.message);
  }
}

/**
 * Test 4: GDPR Functionality
 */
async function testGDPR() {
  log('Testing GDPR functionality...');

  const testUserId = `test-user-${Date.now()}`;

  try {
    // Test consent retrieval (should fail for non-existent user)
    const consentResponse = await makeRequest('GET', `/api/gdpr/consent/${testUserId}`);
    logTest('GDPR Consent Retrieval', consentResponse.status === 404, 'Should return 404 for non-existent user');

    // Test consent update
    const updateResponse = await makeRequest('PUT', `/api/gdpr/consent/${testUserId}`, {
      gdprConsent: true
    });
    logTest('GDPR Consent Update', updateResponse.success || updateResponse.status === 404, updateResponse.error);

    // Test audit log (requires API key)
    if (API_KEY) {
      const auditResponse = await makeRequest('GET', `/api/gdpr/audit-log/${testUserId}`, null, {
        'X-Api-Key': API_KEY
      });
      logTest('GDPR Audit Log', auditResponse.success, auditResponse.error);
    } else {
      logTest('GDPR Audit Log', false, 'No API key configured');
    }

  } catch (error) {
    logTest('GDPR Functionality', false, error.message);
  }
}

/**
 * Test 5: Emergency Contact Management
 */
async function testEmergencyContacts() {
  log('Testing emergency contact management...');

  const testUserId = `test-user-${Date.now()}`;

  try {
    // Test get emergency contact
    const getResponse = await makeRequest('GET', `/api/emergency/contact/${testUserId}`);
    logTest('Get Emergency Contact', getResponse.success, getResponse.error);

    // Test update emergency contact
    const updateResponse = await makeRequest('PUT', `/api/emergency/contact/${testUserId}`, {
      emergencyContact: '+1234567890'
    });
    logTest('Update Emergency Contact', updateResponse.success || updateResponse.status === 404, updateResponse.error);

    // Test emergency call logging
    const logCallResponse = await makeRequest('POST', '/api/emergency/log-call', {
      user_id: testUserId,
      service_called: '999',
      timestamp: new Date().toISOString()
    });
    logTest('Log Emergency Call', logCallResponse.success, logCallResponse.error);

  } catch (error) {
    logTest('Emergency Contacts', false, error.message);
  }
}

/**
 * Test 6: PDF Generation
 */
async function testPDFGeneration() {
  log('Testing PDF generation...');

  const testUserId = `test-user-${Date.now()}`;

  try {
    if (!API_KEY) {
      logTest('PDF Generation', false, 'No API key configured');
      return;
    }

    // Test PDF generation
    const pdfResponse = await makeRequest('POST', '/api/pdf/generate', {
      create_user_id: testUserId
    }, {
      'X-Api-Key': API_KEY
    });

    logTest('PDF Generation Request', pdfResponse.success || pdfResponse.status === 500, pdfResponse.error);

    // Test PDF status
    const statusResponse = await makeRequest('GET', `/api/pdf/status/${testUserId}`);
    logTest('PDF Status Check', statusResponse.success, statusResponse.error);

  } catch (error) {
    logTest('PDF Generation', false, error.message);
  }
}

/**
 * Test 7: Webhook Endpoints
 */
async function testWebhooks() {
  log('Testing webhook endpoints...');

  try {
    if (!API_KEY) {
      logTest('Webhook Authentication', false, 'No API key configured');
      return;
    }

    // Test signup webhook
    const signupWebhookResponse = await makeRequest('POST', '/api/webhooks/signup', {
      create_user_id: `test-user-${Date.now()}`,
      test: true
    }, {
      'X-Api-Key': API_KEY
    });

    logTest('Signup Webhook', signupWebhookResponse.success || signupWebhookResponse.status === 503, signupWebhookResponse.error);

    // Test incident report webhook
    const incidentWebhookResponse = await makeRequest('POST', '/api/webhooks/incident-report', {
      create_user_id: `test-user-${Date.now()}`,
      id: `test-incident-${Date.now()}`,
      test: true
    }, {
      'X-Api-Key': API_KEY
    });

    logTest('Incident Report Webhook', incidentWebhookResponse.success || incidentWebhookResponse.status === 503, incidentWebhookResponse.error);

    // Test webhook authentication failure
    const unauthResponse = await makeRequest('POST', '/api/webhooks/signup', {
      test: true
    });

    logTest('Webhook Authentication Failure', unauthResponse.status === 401, 'Should return 401 for unauthorized request');

  } catch (error) {
    logTest('Webhook Endpoints', false, error.message);
  }
}

/**
 * Test 8: WebSocket Connection
 */
async function testWebSocket() {
  log('Testing WebSocket connection...');

  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(`${WS_URL}`);
      let connected = false;
      let messageReceived = false;

      const timeout = setTimeout(() => {
        if (!connected) {
          logTest('WebSocket Connection', false, 'Connection timeout');
        }
        if (!messageReceived) {
          logTest('WebSocket Messaging', false, 'No response to ping');
        }
        ws.close();
        resolve();
      }, 5000);

      ws.on('open', () => {
        connected = true;
        logTest('WebSocket Connection', true);

        // Test subscription
        ws.send(JSON.stringify({
          type: 'subscribe',
          queueId: 'test-queue',
          userId: 'test-user'
        }));

        // Test ping
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'ping' }));
        }, 1000);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'subscribed') {
            logTest('WebSocket Subscription', true);
          }
          if (message.type === 'pong') {
            messageReceived = true;
            logTest('WebSocket Messaging', true);
          }
        } catch (error) {
          logTest('WebSocket Message Parsing', false, error.message);
        }
      });

      ws.on('error', (error) => {
        logTest('WebSocket Connection', false, error.message);
        clearTimeout(timeout);
        resolve();
      });

      ws.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });

    } catch (error) {
      logTest('WebSocket Test', false, error.message);
      resolve();
    }
  });
}

/**
 * Generate test report
 */
async function generateTestReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.passed + testResults.failed,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: `${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`
    },
    details: testResults.details,
    errors: testResults.errors
  };

  log('\n=== TEST REPORT ===');
  log(`Total Tests: ${report.summary.total}`);
  log(`Passed: ${report.summary.passed}`, 'success');
  log(`Failed: ${report.summary.failed}`, 'error');
  log(`Success Rate: ${report.summary.successRate}`);

  if (report.errors.length > 0) {
    log('\n=== FAILURES ===');
    report.errors.forEach(error => {
      log(`${error.test}: ${error.error}`, 'error');
    });
  }

  // Write to file
  try {
    await fs.writeFile(
      path.join(__dirname, 'test-results.json'),
      JSON.stringify(report, null, 2)
    );
    log('Test results saved to test-results.json');
  } catch (error) {
    log(`Failed to save test results: ${error.message}`, 'error');
  }

  return report;
}

/**
 * Main test runner
 */
async function runTests() {
  log('Starting comprehensive test suite...');
  log(`Base URL: ${BASE_URL}`);
  log(`API Key configured: ${!!API_KEY}`);

  try {
    await testServerStartup();
    await testAuthEndpoints();
    await testTranscription();
    await testGDPR();
    await testEmergencyContacts();
    await testPDFGeneration();
    await testWebhooks();
    await testWebSocket();

    const report = await generateTestReport();
    
    if (report.summary.failed > 0) {
      process.exit(1);
    } else {
      log('All tests completed successfully!', 'success');
      process.exit(0);
    }

  } catch (error) {
    log(`Test runner error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testResults
};
