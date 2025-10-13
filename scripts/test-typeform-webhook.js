const crypto = require('crypto');
const axios = require('axios');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5000/webhooks/typeform';
const WEBHOOK_SECRET = process.env.TYPEFORM_WEBHOOK_SECRET || 'test_secret';

// Test User Signup Webhook
const signupPayload = {
  event_id: "test-signup-" + Date.now(),
  event_type: "form_response",
  form_response: {
    form_id: "b83aFxE0",
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
      id: "b83aFxE0",
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

  // Generate signature
  const signature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('base64');

  console.log('🧪 Testing Typeform Webhook');
  console.log('═'.repeat(60));
  console.log('URL:', WEBHOOK_URL);
  console.log('Form:', signupPayload.form_response.definition.title);
  console.log('Event ID:', signupPayload.event_id);
  console.log('User ID:', signupPayload.form_response.hidden.auth_user_id);
  console.log('Signature:', signature.substring(0, 30) + '...');
  console.log('═'.repeat(60));

  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Typeform-Signature': signature
      },
      timeout: 10000
    });

    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n📊 Check your Supabase user_signup table for the test data!');

  } catch (error) {
    console.log('\n❌ ERROR!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
    process.exit(1);
  }
}

testWebhook();