const http = require('http');
const fs = require('fs');

// Read test data
const testData = JSON.parse(fs.readFileSync('./test-simple.json', 'utf8'));

console.log('=================================');
console.log('Testing /webhook/signup endpoint');
console.log('=================================');
console.log('User:', testData.full_name);
console.log('Email:', testData.email);

const API_KEY = process.env.ZAPIER_SHARED_KEY || 'test123';
console.log('API Key:', API_KEY ? 'Found' : 'Missing');

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/webhook/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'X-Api-Key': API_KEY
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nStatus Code:', res.statusCode);
    
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ SUCCESS! Webhook accepted the data');
      try {
        const parsed = JSON.parse(data);
        console.log('Response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Response:', data);
      }
    } else if (res.statusCode === 401) {
      console.log('❌ FAILED: Authentication required');
      console.log('Fix: Set ZAPIER_SHARED_KEY environment variable');
    } else if (res.statusCode === 503) {
      console.log('❌ FAILED: Service not configured');
      console.log('Response:', data);
    } else {
      console.log('❌ FAILED with status:', res.statusCode);
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.log('Is your server running?');
});

req.write(postData);
req.end();
