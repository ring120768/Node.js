
#!/usr/bin/env node

/**
 * GitHub Webhook Test Script
 * Tests webhook endpoint with proper HMAC signature
 */

const crypto = require('crypto');
const http = require('http');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret-change-in-production';

// Sample GitHub payload
const payload = {
  zen: 'Non-blocking is better than blocking.',
  hook_id: 12345678,
  hook: {
    type: 'Repository',
    id: 12345678,
    name: 'web',
    active: true,
    events: ['push', 'pull_request'],
    config: {
      content_type: 'json',
      insecure_ssl: '0',
      url: 'https://example.com/webhook'
    }
  },
  repository: {
    id: 123456789,
    name: 'car-crash-lawyer-ai',
    full_name: 'user/car-crash-lawyer-ai',
    private: false
  }
};

const payloadString = JSON.stringify(payload);
const signature = crypto
  .createHmac('sha256', SECRET)
  .update(payloadString)
  .digest('hex');

const deliveryId = `test-delivery-${Date.now()}`;

console.log('🧪 Testing GitHub webhook...');
console.log(`📦 Payload size: ${payloadString.length} bytes`);
console.log(`🔐 Signature: sha256=${signature}`);
console.log(`📋 Delivery ID: ${deliveryId}`);

const options = {
  hostname: HOST,
  port: PORT,
  path: '/webhooks/github',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadString),
    'X-Hub-Signature-256': `sha256=${signature}`,
    'X-GitHub-Delivery': deliveryId,
    'X-GitHub-Event': 'ping',
    'User-Agent': 'GitHub-Hookshot/test'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📊 Status: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
      console.log('✅ GitHub webhook test passed!');
      try {
        const response = JSON.parse(data);
        console.log(`📝 Response:`, response);
      } catch (e) {
        console.log(`📝 Response: ${data}`);
      }
    } else {
      console.log('❌ GitHub webhook test failed');
      console.log(`📝 Response: ${data}`);
    }
  });
});

req.on('error', (error) => {
  console.error(`❌ Request error: ${error.message}`);
});

req.write(payloadString);
req.end();
