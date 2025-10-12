
const crypto = require('crypto');
const https = require('https');

// Your Typeform webhook secret
const SECRET = process.env.TYPEFORM_WEBHOOK_SECRET || '4SJem6FtyEUgLUATL8yQ4LGDDiBNybLXik6nV1N2S25Q';

// Sample Typeform payload (similar to what you'd receive)
const payload = {
  "event_id": "test_" + Date.now(),
  "event_type": "form_response",
  "form_response": {
    "form_id": "b03aFxEO",
    "token": "test123",
    "landed_at": new Date().toISOString(),
    "submitted_at": new Date().toISOString(),
    "hidden": {
      "auth_code": "test_auth_code_123",
      "auth_user_id": "97694427-bf7b-4e17-a3cd-cdf09c7de5e6",
      "create_user_id": "97694427-bf7b-4e17-a3cd-cdf09c7de5e6",
      "email": "Ian.ring@sky.com",
      "product_id": "car_crash_lawyer_ai"
    },
    "answers": [
      {
        "field": { "id": "test1", "ref": "3f614832-1ccd-4a7e-9c4a-bde45b6b930e", "type": "short_text" },
        "type": "text",
        "text": "Test User"
      }
    ]
  }
};

// Convert payload to string
const payloadString = JSON.stringify(payload);

// Generate HMAC-SHA256 signature
const signature = crypto
  .createHmac('sha256', SECRET)
  .update(payloadString, 'utf8')
  .digest('base64');

console.log('🔐 Generated Signature:', signature);
console.log('📦 Payload size:', payloadString.length, 'bytes');
console.log('\n🧪 Testing webhook with signature validation...\n');

// Test both localhost and external URL
const tests = [
  {
    name: 'Local Server Test',
    options: {
      hostname: 'localhost',
      port: 5000,
      path: '/api/webhooks/signup',
      method: 'POST'
    }
  },
  {
    name: 'Public URL Test',
    options: {
      hostname: 'workspace.ring120768.repl.co',
      port: 443,
      path: '/api/webhooks/signup',
      method: 'POST'
    }
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n=== ${test.name} ===`);
    
    const postData = payloadString;
    const options = {
      ...test.options,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Typeform-Signature': `sha256=${signature}`,
        'User-Agent': 'Typeform-Webhook-Test'
      }
    };

    const requestModule = test.options.port === 443 ? require('https') : require('http');
    
    const req = requestModule.request(options, (res) => {
      console.log('📊 Status Code:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('📤 Response:');
        try {
          console.log(JSON.stringify(JSON.parse(data), null, 2));
        } catch (e) {
          console.log(data);
        }

        if (res.statusCode === 200) {
          console.log('✅ SUCCESS! Webhook working!');
        } else if (res.statusCode === 401) {
          console.log('❌ FAILED: Signature validation rejected');
        } else if (res.statusCode === 404) {
          console.log('❌ FAILED: Endpoint not found');
        } else {
          console.log(`⚠️  Status: ${res.statusCode}`);
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('💥 Request error:', error.message);
      resolve();
    });

    req.setTimeout(10000, () => {
      console.error('⏰ Request timeout');
      req.destroy();
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

// Run tests sequentially
async function runAllTests() {
  for (const test of tests) {
    await runTest(test);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('📝 To check if Typeform has reached your webhook:');
  console.log('1. Check your server logs in the Console tab');
  console.log('2. Look for webhook requests with "Typeform-Signature" headers');
  console.log('3. Configure Typeform webhook URL: https://workspace.ring120768.repl.co/api/webhooks/signup');
  console.log('4. Use webhook secret: 4SJem6FtyEUgLUATL8yQ4LGDDiBNybLXik6nV1N2S25Q');
}

runAllTests().catch(console.error);
