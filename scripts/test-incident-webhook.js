#!/usr/bin/env node

/**
 * Incident Report Webhook Test Script
 * Tests webhook for Form ID: WvM2ejru
 */

const crypto = require('crypto');
const axios = require('axios');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5000/webhooks/typeform';
const WEBHOOK_SECRET = process.env.TYPEFORM_WEBHOOK_SECRET || 'test_secret';

// Test Incident Report Webhook Payload
const incidentPayload = {
  event_id: "test-incident-" + Date.now(),
  event_type: "form_response",
  form_response: {
    form_id: "WvM2ejru",
    token: "incident-token-" + Date.now(),
    landed_at: "2025-10-17T12:00:00Z",
    submitted_at: new Date().toISOString(),
    hidden: {
      user_id: "test-user-" + Date.now(),
      auth_user_id: "test-user-" + Date.now()
    },
    definition: {
      id: "WvM2ejru",
      title: "Car Crash Lawyer AI - Incident Report",
      fields: []
    },
    answers: [
      // Medical Information
      {
        type: "text",
        text: "Feeling shaken but conscious",
        field: { id: "f1", ref: "medical_how_are_you_feeling", type: "short_text" }
      },
      {
        type: "choice",
        choice: { label: "Yes" },
        field: { id: "f2", ref: "medical_attention", type: "multiple_choice" }
      },
      {
        type: "text",
        text: "Paramedics at scene",
        field: { id: "f3", ref: "medical_attention_from_who", type: "short_text" }
      },
      {
        type: "choice",
        choice: { label: "Yes" },
        field: { id: "f4", ref: "are_you_safe", type: "yes_no" }
      },

      // Medical Symptoms
      {
        type: "boolean",
        boolean: false,
        field: { id: "f5", ref: "medical_chest_pain", type: "yes_no" }
      },
      {
        type: "boolean",
        boolean: false,
        field: { id: "f6", ref: "medical_breathlessness", type: "yes_no" }
      },
      {
        type: "boolean",
        boolean: true,
        field: { id: "f7", ref: "medical_severe_headache", type: "yes_no" }
      },
      {
        type: "boolean",
        boolean: false,
        field: { id: "f8", ref: "medical_none_of_these", type: "yes_no" }
      },

      // Accident Details
      {
        type: "date",
        date: "2025-10-17",
        field: { id: "f9", ref: "when_did_the_accident_happen", type: "date" }
      },
      {
        type: "text",
        text: "14:30",
        field: { id: "f10", ref: "what_time_did_the_accident_happen", type: "short_text" }
      },
      {
        type: "text",
        text: "M25 Junction 15, near London",
        field: { id: "f11", ref: "where_exactly_did_this_happen", type: "short_text" }
      },
      {
        type: "text",
        text: "I was driving south on M25 when the other vehicle merged into my lane without signaling. Impact was on my driver side door. I attempted to brake but couldn't avoid collision.",
        field: { id: "f12", ref: "detailed_account_of_what_happened", type: "long_text" }
      },

      // Weather Conditions
      {
        type: "boolean",
        boolean: true,
        field: { id: "f13", ref: "weather_clear_and_dry", type: "yes_no" }
      },
      {
        type: "boolean",
        boolean: true,
        field: { id: "f14", ref: "weather_bright_daylight", type: "yes_no" }
      },
      {
        type: "boolean",
        boolean: false,
        field: { id: "f15", ref: "weather_heavy_rain", type: "yes_no" }
      },

      // Vehicle Information
      {
        type: "choice",
        choice: { label: "Yes" },
        field: { id: "f16", ref: "wearing_seatbelts", type: "yes_no" }
      },
      {
        type: "choice",
        choice: { label: "Yes" },
        field: { id: "f17", ref: "airbags_deployed", type: "yes_no" }
      },
      {
        type: "text",
        text: "Driver side door severely dented, wing mirror damaged",
        field: { id: "f18", ref: "damage_to_your_vehicle", type: "short_text" }
      },

      // Road Information
      {
        type: "choice",
        choice: { label: "Motorway" },
        field: { id: "f19", ref: "road_type", type: "multiple_choice" }
      },
      {
        type: "number",
        number: 70,
        field: { id: "f20", ref: "speed_limit", type: "number" }
      },

      // Your Vehicle Details
      {
        type: "text",
        text: "Toyota",
        field: { id: "f21", ref: "make_of_car", type: "short_text" }
      },
      {
        type: "text",
        text: "Corolla",
        field: { id: "f22", ref: "model_of_car", type: "short_text" }
      },
      {
        type: "text",
        text: "AB12 XYZ",
        field: { id: "f23", ref: "license_plate_number", type: "short_text" }
      },
      {
        type: "text",
        text: "Traveling south at approximately 65mph",
        field: { id: "f24", ref: "direction_and_speed", type: "short_text" }
      },
      {
        type: "text",
        text: "Impact on driver side door",
        field: { id: "f25", ref: "impact", type: "short_text" }
      },
      {
        type: "text",
        text: "Dented door, broken wing mirror, scratches along side panel",
        field: { id: "f26", ref: "damage_caused_by_accident", type: "short_text" }
      },
      {
        type: "choice",
        choice: { label: "No" },
        field: { id: "f27", ref: "any_damage_prior", type: "yes_no" }
      },

      // Other Driver Information
      {
        type: "text",
        text: "Jane Smith",
        field: { id: "f28", ref: "other_drivers_name", type: "short_text" }
      },
      {
        type: "phone_number",
        phone_number: "+447700123456",
        field: { id: "f29", ref: "other_drivers_number", type: "phone_number" }
      },
      {
        type: "text",
        text: "456 High Street, London, SW1A 2AA",
        field: { id: "f30", ref: "other_drivers_address", type: "short_text" }
      },
      {
        type: "text",
        text: "Ford",
        field: { id: "f31", ref: "other_make_of_vehicle", type: "short_text" }
      },
      {
        type: "text",
        text: "Focus",
        field: { id: "f32", ref: "other_model_of_vehicle", type: "short_text" }
      },
      {
        type: "text",
        text: "CD34 EFG",
        field: { id: "f33", ref: "vehicle_license_plate", type: "short_text" }
      },
      {
        type: "text",
        text: "ABC Insurance Ltd",
        field: { id: "f34", ref: "other_insurance_company", type: "short_text" }
      },
      {
        type: "text",
        text: "POL123456789",
        field: { id: "f35", ref: "other_policy_number", type: "short_text" }
      },
      {
        type: "text",
        text: "Front bumper damage, headlight broken",
        field: { id: "f36", ref: "other_damage_accident", type: "short_text" }
      },

      // Police Information
      {
        type: "choice",
        choice: { label: "Yes" },
        field: { id: "f37", ref: "did_police_attend", type: "yes_no" }
      },
      {
        type: "text",
        text: "REF-2025-10-17-1234",
        field: { id: "f38", ref: "accident_reference_number", type: "short_text" }
      },
      {
        type: "text",
        text: "PC12345",
        field: { id: "f39", ref: "police_officer_badge_number", type: "short_text" }
      },
      {
        type: "text",
        text: "Officer John Williams",
        field: { id: "f40", ref: "police_officers_name", type: "short_text" }
      },
      {
        type: "text",
        text: "Metropolitan Police",
        field: { id: "f41", ref: "police_force_details", type: "short_text" }
      },
      {
        type: "choice",
        choice: { label: "No" },
        field: { id: "f42", ref: "breath_test", type: "yes_no" }
      },

      // Witness Information
      {
        type: "choice",
        choice: { label: "Yes" },
        field: { id: "f43", ref: "any_witness", type: "yes_no" }
      },
      {
        type: "text",
        text: "Michael Brown, +447700999888, witness@email.com",
        field: { id: "f44", ref: "witness_contact_information", type: "long_text" }
      },

      // Additional Information
      {
        type: "text",
        text: "Traffic was moderate. Other driver admitted fault at scene.",
        field: { id: "f45", ref: "anything_else", type: "long_text" }
      },

      // File URLs (11 test image URLs)
      {
        type: "file_url",
        file_url: "https://images.typeform.com/images/test-document-1.jpg",
        field: { id: "f46", ref: "file_url_documents", type: "file_upload" }
      },
      {
        type: "file_url",
        file_url: "https://images.typeform.com/images/test-document-2.jpg",
        field: { id: "f47", ref: "file_url_documents_1", type: "file_upload" }
      },
      {
        type: "file_url",
        file_url: "https://images.typeform.com/images/test-what3words.png",
        field: { id: "f48", ref: "file_url_what3words", type: "file_upload" }
      },
      {
        type: "file_url",
        file_url: "https://images.typeform.com/images/test-scene-overview-1.jpg",
        field: { id: "f49", ref: "file_url_scene_overview", type: "file_upload" }
      },
      {
        type: "file_url",
        file_url: "https://images.typeform.com/images/test-scene-overview-2.jpg",
        field: { id: "f50", ref: "file_url_scene_overview_1", type: "file_upload" }
      },
      {
        type: "file_url",
        file_url: "https://images.typeform.com/images/test-other-vehicle-1.jpg",
        field: { id: "f51", ref: "file_url_other_vehicle", type: "file_upload" }
      },
      {
        type: "file_url",
        file_url: "https://images.typeform.com/images/test-other-vehicle-2.jpg",
        field: { id: "f52", ref: "file_url_other_vehicle_1", type: "file_upload" }
      },
      {
        type: "file_url",
        file_url: "https://images.typeform.com/images/test-vehicle-damage-1.jpg",
        field: { id: "f53", ref: "file_url_vehicle_damage", type: "file_upload" }
      },
      {
        type: "file_url",
        file_url: "https://images.typeform.com/images/test-vehicle-damage-2.jpg",
        field: { id: "f54", ref: "file_url_vehicle_damage_1", type: "file_upload" }
      },
      {
        type: "file_url",
        file_url: "https://images.typeform.com/images/test-vehicle-damage-3.jpg",
        field: { id: "f55", ref: "file_url_vehicle_damage_2", type: "file_upload" }
      }
    ]
  }
};

async function testIncidentWebhook() {
  const payload = JSON.stringify(incidentPayload);

  // Generate signature with BASE64 encoding (matches Typeform)
  const signature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('base64');

  console.log('🧪 Testing Incident Report Webhook (Form WvM2ejru)');
  console.log('═'.repeat(70));
  console.log('URL:', WEBHOOK_URL);
  console.log('Form:', incidentPayload.form_response.definition.title);
  console.log('Form ID:', incidentPayload.form_response.form_id);
  console.log('Event ID:', incidentPayload.event_id);
  console.log('User ID:', incidentPayload.form_response.hidden.user_id);
  console.log('Answers:', incidentPayload.form_response.answers.length, 'fields');
  console.log('Images:', incidentPayload.form_response.answers.filter(a => a.type === 'file_url').length, 'files');
  console.log('Signature (base64):', signature.substring(0, 40) + '...');
  console.log('Payload size:', payload.length, 'bytes');
  console.log('═'.repeat(70));

  try {
    const startTime = Date.now();
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Typeform-Signature': signature
      },
      timeout: 30000 // 30 second timeout for incident reports
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
    console.log('1. Check your Supabase incident_reports table for the test data');
    console.log('2. Check logs for: "Incident report processed successfully"');
    console.log('3. Check user_documents table for 11 image processing records');
    console.log('4. Verify images are being downloaded and uploaded to Supabase Storage');
    console.log('\n💡 Note: Image processing happens asynchronously');
    console.log('   Check user_documents.status for each image:');
    console.log('   - "pending" → "processing" → "completed" (or "failed")');

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
      } else if (error.response.status === 400) {
        console.log('\n💡 Invalid request format!');
        console.log('   Check payload structure');
      }
    } else {
      console.log('Error:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.log('\n💡 Server not running!');
        console.log('   Start server with: npm start');
      } else if (error.code === 'ECONNABORTED') {
        console.log('\n💡 Request timeout!');
        console.log('   This is normal for long image processing');
        console.log('   Check server logs and database for results');
      }
    }
    process.exit(1);
  }
}

// Test without signature (should fail if TYPEFORM_WEBHOOK_SECRET is set)
async function testWithoutSignature() {
  console.log('\n\n🧪 Testing Without Signature (Should Return 401 if secret is configured)');
  console.log('═'.repeat(70));

  if (!process.env.TYPEFORM_WEBHOOK_SECRET) {
    console.log('⏭️  SKIPPED: TYPEFORM_WEBHOOK_SECRET not set');
    return;
  }

  const payload = JSON.stringify(incidentPayload);

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

// Run tests
async function runTests() {
  console.log('\n🚀 Starting Incident Report Webhook Tests...\n');

  // Test 1: Valid incident report webhook
  await testIncidentWebhook();

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Without signature
  await testWithoutSignature();

  console.log('\n✅ All tests completed!\n');
}

runTests();
