const http = require('http');
const fs = require('fs');

// Read our test data
const testData = JSON.parse(fs.readFileSync('./test-simple.json', 'utf8'));

console.log('Starting PDF test...');
console.log('Test user:', testData.full_name);

// Prepare the request
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(testData))
  }
};

// Make the request
const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Status:', res.statusCode);
    console.log('Response:', data);
    
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('\n✓ Test passed! Data was accepted.');
    } else {
      console.log('\n✗ Test failed. Check the response above.');
    }
  });
});

req.on('error', (error) => {
  console.error('✗ Error connecting to server:', error.message);
  console.log('\nMake sure your server is running (node index.js)');
});

// Send the test data
req.write(JSON.stringify(testData));
req.end();
