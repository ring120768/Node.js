#!/usr/bin/env node

/**
 * Railway Deployment Verification Script
 * Tests if the deployed application is accessible and functioning
 *
 * Usage:
 *   node verify-railway-deployment.js https://your-app.up.railway.app
 */

const https = require('https');
const http = require('http');

const RAILWAY_URL = process.argv[2];

if (!RAILWAY_URL) {
  console.error('❌ Usage: node verify-railway-deployment.js https://your-app.up.railway.app');
  process.exit(1);
}

console.log('🔍 Railway Deployment Verification\n');
console.log(`Testing: ${RAILWAY_URL}\n`);

// Test endpoints
const endpoints = [
  { path: '/api/health', expected: 200, description: 'Basic health check' },
  { path: '/api/readyz', expected: 200, description: 'Readiness check (with DB)' },
  { path: '/signup-auth.html', expected: 200, description: 'Public signup page' },
  { path: '/dashboard.html', expected: 401, description: 'Protected dashboard (should require auth)' }
];

let passed = 0;
let failed = 0;

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.path, RAILWAY_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.get(url, (res) => {
      const success = res.statusCode === endpoint.expected;

      if (success) {
        console.log(`✅ ${endpoint.description}`);
        console.log(`   ${endpoint.path} → ${res.statusCode} (expected ${endpoint.expected})`);
        passed++;
      } else {
        console.log(`❌ ${endpoint.description}`);
        console.log(`   ${endpoint.path} → ${res.statusCode} (expected ${endpoint.expected})`);
        failed++;
      }
      console.log('');
      resolve(success);
    });

    req.on('error', (err) => {
      console.log(`❌ ${endpoint.description}`);
      console.log(`   ${endpoint.path} → ERROR: ${err.message}`);
      failed++;
      console.log('');
      resolve(false);
    });

    req.setTimeout(10000, () => {
      console.log(`❌ ${endpoint.description}`);
      console.log(`   ${endpoint.path} → TIMEOUT (10s)`);
      failed++;
      req.destroy();
      console.log('');
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('📋 Running endpoint tests...\n');

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }

  console.log('═══════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════\n');

  if (failed === 0) {
    console.log('🎉 All tests passed! Your Railway deployment is working correctly.');
    console.log('\n✅ Next steps:');
    console.log('   1. Test signup flow at: ' + RAILWAY_URL + '/signup-auth.html');
    console.log('   2. Complete incident report');
    console.log('   3. Test PDF generation');
  } else {
    console.log('⚠️ Some tests failed. Check the Railway logs for errors.');
    console.log('\n🔍 Debugging steps:');
    console.log('   1. Check Railway Dashboard → Deployments → Logs');
    console.log('   2. Verify environment variables are set');
    console.log('   3. Check if deployment shows as "Active"');
  }

  process.exit(failed === 0 ? 0 : 1);
}

runTests();
