
// test-production.js
// Main production endpoint testing

const http = require('http');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration - matches your ACTUAL production endpoints
const ENDPOINTS = {
  health: '/health',
  webhook: '/api/webhook',  // Main user signup & incident data
  legalNarrative: '/api/generate-legal-narrative',
  whisperTranscribe: '/api/whisper/transcribe',
  gdprStatus: '/api/gdpr/status',
  gdprConsent: '/api/gdpr/consent'
};

// Color logging (reuse from test-transcription.js style)
console.log('🚀 Production Endpoint Tests');
console.log('============================');

// Test 1: User Signup via main webhook
async function testUserSignup() {
  console.log('\n📝 Testing User Signup (/api/webhook)...');

  const testData = JSON.parse(fs.readFileSync('./test/data/fixtures.json', 'utf8'));
  testData.create_user_id = `test_${Date.now()}`; // Unique ID

  return new Promise((resolve) => {
    const postData = JSON.stringify(testData);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: ENDPOINTS.webhook,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Api-Key': process.env.ZAPIER_SHARED_KEY || ''
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ User signup successful');
          console.log(`   User ID: ${testData.create_user_id}`);

          // Verify in database
          verifyUserInDatabase(testData.create_user_id);
          resolve(true);
        } else {
          console.log('❌ Signup failed:', res.statusCode);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Connection error:', e.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Verify user was created in database
async function verifyUserInDatabase(userId) {
  console.log('\n🔍 Verifying in database...');

  try {
    // Check user_signup table
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    if (userData) {
      console.log('✅ User found in user_signup table');
      console.log(`   Email: ${userData.email}`);
      console.log(`   Name: ${userData.full_name}`);
    }

    // Check incident_reports table
    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    if (incidentData) {
      console.log('✅ Incident report created');
      console.log(`   Location: ${incidentData.incident_location}`);
    }

    // Check GDPR consent
    const { data: gdprData, error: gdprError } = await supabase
      .from('gdpr_consent')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (gdprData) {
      console.log('✅ GDPR consent recorded');
      console.log(`   Consent: ${gdprData.consent_given}`);
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  await testUserSignup();
  // Add more endpoint tests as needed

  console.log('\n============================');
  console.log('✅ Tests complete');
}

runTests();
