
const https = require('https');
const crypto = require('crypto');

const BASE_URL = 'https://workspace.ring120768.repl.co';
const WEBHOOK_SECRET = '4SJem6FtyEUgLUATL8yQ4LGDDiBNybLXik6nV1N2S25Q';

// Simple test payload
const testPayload = {
  event_type: 'form_response',
  form_response: {
    form_id: 'test_form',
    hidden: {
      auth_user_id: 'test-user-123',
      email: 'test@example.com',
      auth_code: 'test-auth-code'
    },
    answers: [
      {
        field: { ref: '3f614832-1ccd-4a7e-9c4a-bde45b6b930e' },
        type: 'text',
        text: 'Test User'
      }
    ]
  }
};

function makeRequest(endpoint, payload = null) {
  return new Promise((resolve) => {
    const method = payload ? 'POST' : 'GET';
    const payloadString = payload ? JSON.stringify(payload) : '';
    
    let headers = {
      'User-Agent': 'Webhook-Test/1.0',
      'Accept': 'application/json'
    };

    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payloadString);
      
      // Generate Typeform signature
      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(payloadString)
        .digest('base64');
      headers['Typeform-Signature'] = `sha256=${signature}`;
    }

    const url = new URL(BASE_URL + endpoint);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: method,
      headers: headers,
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: parsed,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            success: false,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 0,
        success: false,
        error: 'Request timeout'
      });
    });

    if (payload) {
      req.write(payloadString);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Clean Webhook Implementation\n');
  console.log('='.repeat(50));

  const tests = [
    { name: 'Health Check', endpoint: '/webhooks/health', method: 'GET' },
    { name: 'Root Endpoint', endpoint: '/webhooks/', method: 'GET' },
    { name: 'Test Endpoint (GET)', endpoint: '/webhooks/test', method: 'GET' },
    { name: 'Test Endpoint (POST)', endpoint: '/webhooks/test', method: 'POST', payload: {} },
    { name: 'User Signup', endpoint: '/webhooks/user_signup', method: 'POST', payload: testPayload }
  ];

  for (const test of tests) {
    console.log(`\n📍 ${test.name}`);
    console.log(`   ${test.method} ${test.endpoint}`);
    
    const result = await makeRequest(test.endpoint, test.payload);
    
    if (result.success) {
      console.log(`   ✅ Status: ${result.status}`);
      if (result.data.message) {
        console.log(`   📄 Message: ${result.data.message}`);
      }
    } else {
      console.log(`   ❌ Status: ${result.status}`);
      console.log(`   📄 Error: ${result.error || result.data}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 Webhook URLs for Typeform Configuration:');
  console.log(`   User Signup: ${BASE_URL}/webhooks/user_signup`);
  console.log(`   Incident Reports: ${BASE_URL}/webhooks/incident_reports`);
  console.log(`   Demo: ${BASE_URL}/webhooks/demo`);
  console.log(`   Secret: ${WEBHOOK_SECRET}`);
}

runTests().catch(console.error);
