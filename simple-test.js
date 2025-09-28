const http = require('http');
const fs = require('fs');
const testData = JSON.parse(fs.readFileSync('./test-simple.json', 'utf8'));
const API_KEY = process.env.ZAPIER_SHARED_KEY;

const options = {
  hostname: 'localhost',
  port: 5000,  // Use port 5000 for Replit
  path: '/webhook/signup-simple',  // Use the simple endpoint for testing
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': API_KEY
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(JSON.stringify(testData));
req.end();