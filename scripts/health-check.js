#!/usr/bin/env node

const http = require('http');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const options = {
  hostname: HOST,
  port: PORT,
  path: '/healthz',
  method: 'GET',
  timeout: 5000
};

console.log(`🏥 Checking health at http://${HOST}:${PORT}/healthz`);

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      const health = JSON.parse(data);
      console.log('✅ Health check passed');
      console.log(`📊 Status: ${health.status}`);
      console.log(`⚡ PID: ${health.pid}`);
      console.log(`⏰ Uptime: ${Math.floor(health.uptime)}s`);
      console.log(`🔌 Port: ${health.port}`);
      process.exit(0);
    } else {
      console.error(`❌ Health check failed: ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error(`❌ Health check error: ${error.message}`);
  console.error('💡 Make sure the server is running with: npm start');
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Health check timeout');
  req.destroy();
  process.exit(1);
});

req.end();
