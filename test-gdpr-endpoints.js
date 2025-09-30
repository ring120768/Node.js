
const http = require('http');

function testEndpoint(path, description, method = 'GET', postData = null) {
  console.log(`\nTesting ${description}...`);
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: path,
    method: method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      try {
        const parsed = JSON.parse(data);
        console.log('Response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Error:', err.message);
  });

  if (postData) {
    req.write(JSON.stringify(postData));
  }
  
  req.end();
}

// Run tests with proper delays
console.log('🧪 Starting GDPR Endpoint Tests...');

testEndpoint('/health', 'Health Check');

setTimeout(() => {
  testEndpoint('/api/gdpr/status/test-user-123', 'GDPR Status');
}, 1000);

setTimeout(() => {
  testEndpoint('/api/gdpr/export/test-user-123', 'GDPR Export');
}, 2000);

setTimeout(() => {
  const webhookData = {
    form_response: {
      token: 'test-user-123',
      answers: [
        {
          field: {
            ref: 'consent_field',
            type: 'boolean'
          },
          boolean: true
        },
        {
          field: {
            type: 'email'
          },
          email: 'test@example.com'
        }
      ]
    }
  };
  testEndpoint('/webhook/signup', 'Webhook with Consent', 'POST', webhookData);
}, 3000);

console.log('Tests initiated. Results will appear above...');
