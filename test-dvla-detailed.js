#!/usr/bin/env node
/**
 * Detailed DVLA API Test
 * Shows exact request/response for debugging 403 errors
 */

require('dotenv').config();
const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

async function testDVLADetailed() {
  console.log(colors.cyan, '\n🔍 Detailed DVLA API Test\n', colors.reset);

  // Get API key from environment
  const apiKey = process.env.DVLA_API_KEY;

  if (!apiKey) {
    console.log(colors.red, '❌ DVLA_API_KEY not found in environment');
    console.log('   Run: node check-env-vars.js --replit', colors.reset);
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   API Key: ${apiKey.substring(0, 15)}... (${apiKey.length} chars)`);
  console.log(`   Endpoint: https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles`);
  console.log('');

  // Test with a real UK registration
  const testReg = 'AB12ABC'; // Change to a real registration you have permission to look up

  console.log('🧪 Testing with registration:', testReg);
  console.log('');

  // Prepare request
  const requestBody = { registrationNumber: testReg };
  const requestHeaders = {
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  };

  console.log('📤 Request Details:');
  console.log('   Method: POST');
  console.log('   Headers:', JSON.stringify(requestHeaders, null, 2));
  console.log('   Body:', JSON.stringify(requestBody, null, 2));
  console.log('');

  try {
    console.log('⏳ Sending request to DVLA API...');
    console.log('');

    const response = await axios.post(
      'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
      requestBody,
      {
        headers: requestHeaders,
        timeout: 10000,
        validateStatus: () => true // Don't throw on any status code
      }
    );

    console.log('📥 Response Details:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log('   Headers:', JSON.stringify(response.headers, null, 2));
    console.log('');

    if (response.status === 200) {
      console.log(colors.green, '✅ SUCCESS! DVLA API is working!', colors.reset);
      console.log('');
      console.log('Vehicle Data:');
      console.log(JSON.stringify(response.data, null, 2));
      console.log('');

    } else if (response.status === 403) {
      console.log(colors.red, '❌ 403 FORBIDDEN - Authentication Error', colors.reset);
      console.log('');
      console.log('Response Body:', JSON.stringify(response.data, null, 2));
      console.log('');
      console.log(colors.yellow, '💡 Common causes of 403 errors:', colors.reset);
      console.log('');
      console.log('1. API Key Not Activated:');
      console.log('   - Go to https://developer-portal.driver-vehicle-licensing.api.gov.uk');
      console.log('   - Log in to your account');
      console.log('   - Check "My Applications" or "API Keys"');
      console.log('   - Verify subscription is ACTIVE');
      console.log('');
      console.log('2. Wrong API Key:');
      console.log('   - Ensure you\'re using the correct key (not test/sandbox key)');
      console.log('   - Generate a new key if needed');
      console.log('');
      console.log('3. Subscription Expired:');
      console.log('   - Check subscription status in DVLA portal');
      console.log('   - Renew if necessary');
      console.log('');
      console.log('4. API Key Permissions:');
      console.log('   - Ensure key has access to "Vehicle Enquiry Service"');
      console.log('   - Check API product subscriptions');
      console.log('');

    } else if (response.status === 404) {
      console.log(colors.yellow, '⚠️  404 NOT FOUND - Vehicle Not Found', colors.reset);
      console.log('   This is normal for invalid or non-existent registrations');
      console.log('   Try with a real UK registration you have permission to look up');
      console.log('');

    } else {
      console.log(colors.red, `❌ Unexpected Status: ${response.status}`, colors.reset);
      console.log('');
      console.log('Response Body:', JSON.stringify(response.data, null, 2));
      console.log('');
    }

  } catch (error) {
    console.log(colors.red, '❌ Request Failed:', colors.reset);
    console.log('   Error:', error.message);

    if (error.code === 'ENOTFOUND') {
      console.log('');
      console.log(colors.yellow, '💡 DNS Error - Cannot reach DVLA API', colors.reset);
      console.log('   Check your internet connection');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('');
      console.log(colors.yellow, '💡 Timeout - DVLA API not responding', colors.reset);
      console.log('   Try again in a few moments');
    }

    console.log('');
  }

  console.log(colors.cyan, '🎯 Test Complete!\n', colors.reset);
}

testDVLADetailed().catch(error => {
  console.error(colors.red, '\n❌ Fatal Error:', error.message, colors.reset);
  process.exit(1);
});
