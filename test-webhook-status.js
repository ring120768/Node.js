
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Test configuration
const WEBHOOK_SECRET = process.env.TYPEFORM_WEBHOOK_SECRET || '4SJem6FtyEUgLUATL8yQ4LGDDiBNybLXik6nV1N2S25Q';
const BASE_URL = 'https://workspace.ring120768.repl.co';
const LOCAL_URL = 'http://localhost:5000';

console.log('🔍 Testing Typeform Webhook Integration\n');
console.log('='.repeat(50));

// Test payload similar to what Typeform sends
const testPayload = {
  "event_id": `test_${Date.now()}`,
  "event_type": "form_response",
  "form_response": {
    "form_id": "b03aFxEO",
    "token": "test_token_123",
    "landed_at": new Date().toISOString(),
    "submitted_at": new Date().toISOString(),
    "hidden": {
      "auth_code": "test_auth_code_123",
      "auth_user_id": "97694427-bf7b-4e17-a3cd-cdf09c7de5e6",
      "email": "test@example.com",
      "product_id": "car_crash_lawyer_ai"
    },
    "answers": [
      {
        "field": { "id": "name", "ref": "3f614832-1ccd-4a7e-9c4a-bde45b6b930e" },
        "type": "text",
        "text": "Test User"
      },
      {
        "field": { "id": "surname", "ref": "52af54a6-11d9-48f7-8878-7a7030f0cacd" },
        "type": "text", 
        "text": "Example"
      }
    ]
  }
};

// Generate signature
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload), 'utf8')
    .digest('base64');
}

// Test function
async function testWebhook(url, endpoint, payload) {
  return new Promise((resolve) => {
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payload, WEBHOOK_SECRET);
    
    const urlObj = new URL(url + endpoint);
    const isHttps = urlObj.protocol === 'https:';
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
        'Typeform-Signature': `sha256=${signature}`,
        'User-Agent': 'Typeform-Webhook-Test'
      }
    };

    const client = isHttps ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message,
        statusCode: 0
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        error: 'Timeout',
        statusCode: 0
      });
    });

    req.write(payloadString);
    req.end();
  });
}

// Run tests
async function runTests() {
  const endpoints = [
    '/webhooks/user_signup',
    '/webhooks/incident_reports', 
    '/webhooks/demo',
    '/webhooks/test',
    '/webhooks/health'
  ];

  console.log('🧪 Testing webhook endpoints...\n');

  // Test local server first
  console.log('📍 LOCAL SERVER TESTS (localhost:5000)');
  console.log('-'.repeat(30));
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting: ${endpoint}`);
    
    const result = await testWebhook(LOCAL_URL, endpoint, testPayload);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    } else {
      const status = result.statusCode;
      const success = status >= 200 && status < 300;
      const icon = success ? '✅' : '⚠️';
      
      console.log(`${icon} Status: ${status}`);
      
      try {
        const response = JSON.parse(result.body);
        console.log(`📄 Response: ${response.message || response.error || 'Success'}`);
      } catch (e) {
        console.log(`📄 Response: ${result.body.substring(0, 100)}...`);
      }
    }
  }

  // Test public URL
  console.log('\n\n📍 PUBLIC URL TESTS (Replit)');
  console.log('-'.repeat(30));
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting: ${endpoint}`);
    
    const result = await testWebhook(BASE_URL, endpoint, testPayload);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    } else {
      const status = result.statusCode;
      const success = status >= 200 && status < 300;
      const icon = success ? '✅' : '⚠️';
      
      console.log(`${icon} Status: ${status}`);
      
      try {
        const response = JSON.parse(result.body);
        console.log(`📄 Response: ${response.message || response.error || 'Success'}`);
      } catch (e) {
        console.log(`📄 Response: ${result.body.substring(0, 100)}...`);
      }
    }
  }

  // Configuration summary
  console.log('\n\n📋 TYPEFORM CONFIGURATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`🌐 Webhook URLs for Typeform:`);
  console.log(`   User Signup: ${BASE_URL}/webhooks/user_signup`);
  console.log(`   Incident Reports: ${BASE_URL}/webhooks/incident_reports`);
  console.log(`   Demo: ${BASE_URL}/webhooks/demo`);
  console.log(`\n🔐 Webhook Secret: ${WEBHOOK_SECRET ? 'Configured ✅' : 'Missing ❌'}`);
  console.log(`📡 Server Status: ${process.env.NODE_ENV || 'development'}`);
  
  // Check environment
  console.log('\n🔧 Environment Check:');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set ✅' : 'Missing ❌'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set ✅' : 'Missing ❌'}`);
  console.log(`   WEBHOOK_API_KEY: ${process.env.WEBHOOK_API_KEY ? 'Set ✅' : 'Missing ❌'}`);
}

// Run the tests
runTests().catch(console.error);
