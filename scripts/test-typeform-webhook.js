#!/usr/bin/env node

/**
 * Typeform Webhook Test Script - FIXED VERSION
 * Tests webhook with correct HEX signature encoding
 */

const crypto = require('crypto');
const axios = require('axios');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5000/webhooks/typeform';
const WEBHOOK_SECRET = process.env.TYPEFORM_WEBHOOK_SECRET || 'test_secret';

// Test User Signup Webhook
const signupPayload = {
  event_id: "test-signup-" + Date.now(),
  event_type: "form_response",
  form_response: {
    form_id: "b03aFxEO",
    token: "test-token-" + Date.now(),
    landed_at: "2025-10-13T12:00:00Z",
    submitted_at: new Date().toISOString(),
    hidden: {
      auth_code: "test_auth_code",
      auth_user_id: "test-user-" + Date.now(),
      email: "test@example.com",
      product_id: "premium"
    },
    definition: {
      id: "b03aFxEO",
      title: "Car Crash Lawyer AI sign up",
      fields: []
    },
    answers: [
      {
        type: "text",
        text: "John",
        field: { id: "field1", ref: "name", type: "short_text" }
      },
      {
        type: "text",
        text: "Doe",
        field: { id: "field2", ref: "surname", type: "short_text" }
      },
      {
        type: "email",
        email: "john.doe@example.com",
        field: { id: "field3", ref: "email", type: "email" }
      },
      {
        type: "phone_number",
        phone_number: "+447700900123",
        field: { id: "field4", ref: "mobile", type: "phone_number" }
      },
      {
        type: "text",
        text: "AB12 3CD",
        field: { id: "field5", ref: "car_registration_number", type: "short_text" }
      },
      {
        type: "text",
        text: "123 Main Street",
        field: { id: "field6", ref: "street_address", type: "short_text" }
      },
      {
        type: "text",
        text: "London",
        field: { id: "field7", ref: "town", type: "short_text" }
      },
      {
        type: "text",
        text: "SW1A 1AA",
        field: { id: "field8", ref: "postcode", type: "short_text" }
      },
      {
        type: "boolean",
        boolean: true,
        field: { id: "field9", ref: "gdpr_consent", type: "yes_no" }
      }
    ]
  }
};

async function testWebhook() {
  const payload = JSON.stringify(signupPayload);

  // CORRECTED: Generate signature with BASE64 encoding 
  // This matches what Typeform actually sends (contains /, +, = characters)
  const signature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('base64');  // ✅ CORRECTED: BASE64 is correct for Typeform

  console.log('🧪 Testing Typeform Webhook (BASE64 VERSION)');
  console.log('═'.repeat(60));
  console.log('URL:', WEBHOOK_URL);
  console.log('Form:', signupPayload.form_response.definition.title);
  console.log('Event ID:', signupPayload.event_id);
  console.log('User ID:', signupPayload.form_response.hidden.auth_user_id);
  console.log('Signature (base64):', signature.substring(0, 40) + '...');
  console.log('Payload size:', payload.length, 'bytes');
  console.log('═'.repeat(60));

  try {
    const startTime = Date.now();
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Typeform-Signature': signature
      },
      timeout: 10000
    });
    const responseTime = Date.now() - startTime;

    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response time:', responseTime + 'ms');
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.data.verification_time_ms) {
      console.log('Verification time:', response.data.verification_time_ms + 'ms');
    }

    console.log('\n📊 Next Steps:');
    console.log('1. Check your Supabase user_signup table for the test data');
    console.log('2. Check logs for: "User signup processed successfully"');
    console.log('3. Verify the signature was validated correctly');

  } catch (error) {
    console.log('\n❌ ERROR!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 403) {
        console.log('\n💡 Signature verification failed!');
        console.log('   Check that TYPEFORM_WEBHOOK_SECRET matches in:');
        console.log('   - Your .env file');
        console.log('   - Typeform webhook configuration');
      } else if (error.response.status === 401) {
        console.log('\n💡 Missing signature header!');
        console.log('   Signature is being sent correctly from test script');
      } else if (error.response.status === 400) {
        console.log('\n💡 Invalid request format!');
        console.log('   Check payload structure');
      }
    } else {
      console.log('Error:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.log('\n💡 Server not running!');
        console.log('   Start server with: npm start');
      }
    }
    process.exit(1);
  }
}

// Test invalid signature
async function testInvalidSignature() {
  console.log('\n\n🧪 Testing Invalid Signature (Should Return 403)');
  console.log('═'.repeat(60));

  const payload = JSON.stringify(signupPayload);
  const invalidSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Typeform-Signature': invalidSignature
      },
      timeout: 5000
    });

    console.log('❌ FAILED: Should have returned 403, got', response.status);

  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log('✅ SUCCESS: Invalid signature correctly rejected (403)');
    } else {
      console.log('❌ FAILED: Expected 403, got', error.response?.status || error.message);
    }
  }
}

// Test missing signature
async function testMissingSignature() {
  console.log('\n\n🧪 Testing Missing Signature (Should Return 401)');
  console.log('═'.repeat(60));

  const payload = JSON.stringify(signupPayload);

  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
        // No Typeform-Signature header
      },
      timeout: 5000
    });

    console.log('❌ FAILED: Should have returned 401, got', response.status);

  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ SUCCESS: Missing signature correctly rejected (401)');
    } else {
      console.log('❌ FAILED: Expected 401, got', error.response?.status || error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting Typeform Webhook Tests...\n');

  // Test 1: Valid webhook
  await testWebhook();

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Invalid signature (only if server is running and TYPEFORM_WEBHOOK_SECRET is set)
  if (process.env.TYPEFORM_WEBHOOK_SECRET) {
    await testInvalidSignature();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testMissingSignature();
  }

  console.log('\n✅ All tests completed!\n');
}

runAllTests();