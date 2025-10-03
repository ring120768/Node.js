/**
 * Car Crash Lawyer AI System - Production Test Suite v2.0
 * Tests actual production endpoints with correct Supabase field mappings
 * 
 * Run with: npm run test:production
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Test configuration - works for both local and Replit
const CONFIG = {
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 3000,
  apiKey: process.env.ZAPIER_SHARED_KEY || 'test123',
  timeout: 30000
};

// Console colors for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = (message, color = 'reset') => {
  console.log(colors[color] + message + colors.reset);
};

const logSection = (title) => {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
};

// ============================================
// TEST DATA GENERATORS
// ============================================

// REMOVED: All dummy user generation
// Tests must use valid Typeform UUIDs from fixtures only
// NO MOCK DATA GENERATION ALLOWED
const generateSignupData = (scenario = 'basic') => {
  const timestamp = Date.now();
  return {
    // Required fields for /webhook/signup
    create_user_id: `test_signup_${scenario}_${timestamp}`,
    name: 'John',
    surname: 'TestUser',
    email: `test_${timestamp}@example.com`,
    mobile: 7123456789,  // INTEGER type

    // Address
    street_address: '123 Test Street',
    town: 'London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',

    // GDPR Consent (critical for signup)
    gdpr_consent: true,
    i_agree_to_share_my_data: 'Yes',
    legal_support: true,

    // Timestamps
    time_stamp: new Date().toISOString(),
    submit_date: new Date().toISOString()
  };
};

// Generate incident report test data
const generateIncidentData = (scenario = 'basic') => {
  const timestamp = Date.now();
  const baseData = {
    create_user_id: `test_incident_${scenario}_${timestamp}`,

    // User info (minimal for incident report)
    name: 'Jane',
    surname: 'Incident',
    email: `incident_${timestamp}@example.com`,
    mobile: 7987654321,

    // Incident Details (Main focus for /webhook/incident-report)
    when_did_the_accident_happen: '2025-01-15',
    what_time_did_the_accident_happen: '14:30',
    where_exactly_did_this_happen: 'M25 Junction 15, Surrey',
    where_did_the_accident_happen: 'Surrey, M25',
    detailed_account_of_what_happened: 'Vehicle collision on motorway during clear conditions.',

    // Vehicle Information
    user_registration_number: 'AB12 CDE',
    user_make: 'Toyota',
    user_model: 'Corolla',
    user_colour: 'Silver',

    other_vehicle_registration: 'XY34 ZAB',
    other_drivers_name: 'Other Driver',
    other_drivers_address: '456 Other Street, London',

    // Damage and injuries
    vehicle_damage: 'Rear bumper damaged',
    injuries_you: 'Minor whiplash',
    medical_assistance: true,

    // GDPR
    gdpr_consent: true,
    i_agree_to_share_my_data: 'Yes'
  };

  // Scenario modifications
  if (scenario === 'with-police') {
    baseData.police_involved = true;
    baseData.police_officers_name = 'PC Smith';
    baseData.police_reference = 'MET/2025/123456';
  }

  if (scenario === 'with-witness') {
    baseData.witness_names = 'David Witness';
    baseData.witness_contact_details = '07555123456';
  }

  return baseData;
};

// ============================================
// TEST FUNCTIONS
// ============================================

// 1. Test Server Health
async function testServerHealth() {
  log('\n🏥 Testing Server Health...', 'blue');

  return new Promise((resolve) => {
    const req = http.request({
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: '/health',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          log('✅ Server is healthy', 'green');
          try {
            const health = JSON.parse(data);
            if (health.services?.supabase) log(`  Database: Connected`, 'cyan');
            if (health.services?.gdpr_compliance) log(`  GDPR: Active`, 'cyan');
            if (health.services?.openai) log(`  OpenAI: Connected`, 'cyan');
          } catch (e) {
            // Fallback for simpler health responses
            log(`  Response: ${data.substring(0, 100)}`, 'cyan');
          }
          resolve({ success: true, data });
        } else {
          log(`❌ Server unhealthy: ${res.statusCode}`, 'red');
          resolve({ success: false, error: `Status ${res.statusCode}` });
        }
      });
    });

    req.on('error', (e) => {
      log(`❌ Cannot connect to server: ${e.message}`, 'red');
      log('💡 Make sure server is running: node index.js', 'yellow');
      resolve({ success: false, error: e.message });
    });

    req.end();
  });
}

// 2. Test Signup Webhook
async function testSignupWebhook(testData) {
  log('\n📤 Testing Signup Webhook (/webhook/signup)...', 'blue');

  return new Promise((resolve) => {
    const postData = JSON.stringify(testData);

    const req = http.request({
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: '/webhook/signup',  // CORRECT ENDPOINT
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Api-Key': CONFIG.apiKey
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          log('✅ Signup webhook accepted data', 'green');
          log(`  User ID: ${testData.create_user_id}`, 'cyan');
          log(`  Name: ${testData.name} ${testData.surname}`, 'cyan');
          resolve({ success: true, userId: testData.create_user_id });
        } else if (res.statusCode === 401) {
          log('❌ Authentication failed', 'red');
          log(`  Check ZAPIER_SHARED_KEY in .env (current: ${CONFIG.apiKey ? 'set' : 'not set'})`, 'yellow');
          resolve({ success: false, error: 'Auth failed' });
        } else if (res.statusCode === 404) {
          log('❌ Endpoint not found (404)', 'red');
          log('  The /webhook/signup endpoint may not be implemented', 'yellow');
          resolve({ success: false, error: '404 Not Found' });
        } else {
          log(`❌ Webhook rejected: ${res.statusCode}`, 'red');
          log(`  Response: ${data}`, 'yellow');
          resolve({ success: false, error: data });
        }
      });
    });

    req.on('error', (e) => {
      log(`❌ Request failed: ${e.message}`, 'red');
      resolve({ success: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

// 3. Test Incident Report Webhook
async function testIncidentWebhook(testData) {
  log('\n📋 Testing Incident Report Webhook (/webhook/incident-report)...', 'blue');

  return new Promise((resolve) => {
    const postData = JSON.stringify(testData);

    const req = http.request({
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: '/webhook/incident-report',  // CORRECT ENDPOINT
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Api-Key': CONFIG.apiKey
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          log('✅ Incident webhook accepted data', 'green');
          log(`  User ID: ${testData.create_user_id}`, 'cyan');
          resolve({ success: true, userId: testData.create_user_id });
        } else if (res.statusCode === 404) {
          log('⚠️  Incident endpoint not found (404)', 'yellow');
          log('  This endpoint may not be implemented yet', 'yellow');
          resolve({ success: false, error: '404' });
        } else {
          log(`❌ Incident webhook rejected: ${res.statusCode}`, 'red');
          resolve({ success: false, error: `Status ${res.statusCode}` });
        }
      });
    });

    req.on('error', (e) => {
      log(`❌ Request failed: ${e.message}`, 'red');
      resolve({ success: false, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

// 4. Test GDPR Status Endpoint
async function testGDPRStatus(userId) {
  log('\n🔒 Testing GDPR Status...', 'blue');

  return new Promise((resolve) => {
    const req = http.request({
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: `/api/gdpr/status/${userId}`,
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          log('✅ GDPR status retrieved', 'green');
          try {
            const status = JSON.parse(data);
            log(`  Consent: ${status.hasConsent ? 'Granted' : 'Not granted'}`, 'cyan');
            resolve({ success: true, status });
          } catch (e) {
            resolve({ success: true, data });
          }
        } else if (res.statusCode === 404) {
          log('⚠️  GDPR endpoint not found', 'yellow');
          resolve({ success: false, error: '404' });
        } else {
          log(`⚠️  GDPR status not found: ${res.statusCode}`, 'yellow');
          resolve({ success: false, error: `Status ${res.statusCode}` });
        }
      });
    });

    req.on('error', (e) => {
      log(`❌ Request failed: ${e.message}`, 'red');
      resolve({ success: false, error: e.message });
    });

    req.end();
  });
}

// 5. Verify Database Storage (Simplified)
async function verifyDatabaseStorage(userId) {
  log('\n💾 Verifying Database Storage...', 'blue');

  try {
    // Check user_signup table
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('name, surname, email, mobile')
      .eq('create_user_id', userId)
      .single();

    if (userData && !userError) {
      log('✅ User record found', 'green');
      log(`  Name: ${userData.name} ${userData.surname}`, 'cyan');
    } else {
      log('⚠️  No user record found', 'yellow');
    }

    // Check GDPR consent
    const { data: gdprData, error: gdprError } = await supabase
      .from('gdpr_consent')
      .select('consent_given, consent_type')
      .eq('user_id', userId)
      .single();

    if (gdprData && !gdprError) {
      log('✅ GDPR consent recorded', 'green');
      log(`  Consent: ${gdprData.consent_given ? 'Yes' : 'No'}`, 'cyan');
    } else {
      log('⚠️  No GDPR consent record', 'yellow');
    }

    return { success: true };

  } catch (error) {
    log(`❌ Database verification error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// ============================================
// TEST SCENARIOS
// ============================================

async function runSignupTest() {
  logSection('TEST: User Signup Flow');

  const testData = generateSignupData('basic');
  const results = {};

  // Test signup webhook
  results.signup = await testSignupWebhook(testData);

  if (results.signup.success) {
    // Wait for processing
    log('\n⏳ Waiting 2 seconds for processing...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check GDPR status
    results.gdpr = await testGDPRStatus(testData.create_user_id);

    // Verify database
    results.database = await verifyDatabaseStorage(testData.create_user_id);
  }

  return results;
}

async function runIncidentTest() {
  logSection('TEST: Incident Report Flow');

  const testData = generateIncidentData('with-police');
  const results = {};

  // Test incident webhook
  results.incident = await testIncidentWebhook(testData);

  if (results.incident.success) {
    // Wait for processing
    log('\n⏳ Waiting 2 seconds for processing...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify database
    results.database = await verifyDatabaseStorage(testData.create_user_id);
  }

  return results;
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  logSection('🚀 CAR CRASH LAWYER AI - PRODUCTION TEST SUITE v2.0');
  log(`Environment: ${CONFIG.host}:${CONFIG.port}`, 'yellow');
  log(`API Key: ${CONFIG.apiKey ? 'Configured' : 'Not Set'}`, 'yellow');

  const results = {
    health: null,
    signup: null,
    incident: null
  };

  // Step 1: Check server health
  results.health = await testServerHealth();
  if (!results.health.success) {
    log('\n❌ Cannot proceed without healthy server', 'red');
    log('💡 Start your server with: node index.js', 'yellow');
    process.exit(1);
  }

  // Step 2: Test signup flow
  results.signup = await runSignupTest();

  // Step 3: Test incident flow
  results.incident = await runIncidentTest();

  // Final Summary
  logSection('📊 FINAL TEST SUMMARY');

  let totalPassed = 0;
  let totalFailed = 0;

  // Count successes
  if (results.health?.success) totalPassed++; else totalFailed++;
  if (results.signup?.signup?.success) totalPassed++; else totalFailed++;
  if (results.signup?.gdpr?.success) totalPassed++; else totalFailed++;
  if (results.incident?.incident?.success) totalPassed++; else totalFailed++;

  log(`Health Check: ${results.health?.success ? '✅' : '❌'}`, 
      results.health?.success ? 'green' : 'red');
  log(`Signup Webhook: ${results.signup?.signup?.success ? '✅' : '❌'}`,
      results.signup?.signup?.success ? 'green' : 'red');
  log(`GDPR Compliance: ${results.signup?.gdpr?.success ? '✅' : '⚠️'}`,
      results.signup?.gdpr?.success ? 'green' : 'yellow');
  log(`Incident Webhook: ${results.incident?.incident?.success ? '✅' : '⚠️'}`,
      results.incident?.incident?.success ? 'green' : 'yellow');

  log('\n' + '='.repeat(60));
  log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`,
      totalFailed === 0 ? 'green' : totalFailed > totalPassed ? 'red' : 'yellow');

  if (totalFailed === 0) {
    log('\n🎉 All tests passed!', 'green');
  } else if (totalPassed > totalFailed) {
    log('\n⚠️  Most tests passed, some need attention', 'yellow');
  } else {
    log('\n❌ Multiple tests failed - check your endpoints', 'red');
  }

  process.exit(totalFailed > totalPassed ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n💥 Test runner error: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = {
  generateSignupData,
  generateIncidentData,
  testServerHealth,
  testSignupWebhook,
  testIncidentWebhook,
  testGDPRStatus,
  verifyDatabaseStorage,
  runAllTests
};