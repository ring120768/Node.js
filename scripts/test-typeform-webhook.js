#!/usr/bin/env node
/**
 * Typeform Webhook Simulator & Tester
 *
 * This script simulates Typeform webhook payloads to test the complete flow:
 * 1. Webhook reception and signature validation
 * 2. Data extraction and mapping
 * 3. Image processing (download from Typeform, upload to Supabase)
 * 4. Database insertion (incident_reports or user_signup)
 *
 * Usage:
 *   node scripts/test-typeform-webhook.js --type incident
 *   node scripts/test-typeform-webhook.js --type signup
 *   node scripts/test-typeform-webhook.js --type incident --no-signature
 */

require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(80) + '\n');
}

function section(title) {
  console.log('\n' + '-'.repeat(60));
  log(title, colors.yellow);
  console.log('-'.repeat(60));
}

/**
 * Generate HMAC-SHA256 signature for Typeform webhook
 * @param {string} payload - JSON string payload
 * @param {string} secret - Webhook secret
 * @returns {string} - Signature in format "sha256=<base64_digest>"
 */
function generateTypeformSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const signature = hmac.digest('base64');
  return `sha256=${signature}`;
}

/**
 * Create a mock incident report payload
 */
function createIncidentReportPayload() {
  const userId = process.env.TEST_USER_ID || '199d9251-b2e0-40a5-80bf-fc1529d9bf6c';

  return {
    event_id: `event_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    event_type: 'form_response',
    form_response: {
      form_id: 'WvM2ejru',
      token: `token_${crypto.randomBytes(8).toString('hex')}`,
      landed_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      hidden: {
        user_id: userId,
        auth_user_id: userId,
        email: 'test@example.com'
      },
      definition: {
        id: 'WvM2ejru',
        title: 'Car Crash Lawyer AI - Incident Report',
        fields: [
          { id: 'field_1', ref: 'are_you_safe', type: 'yes_no', title: 'Are you safe?' },
          { id: 'field_2', ref: 'when_did_the_accident_happen', type: 'date', title: 'When did the accident happen?' },
          { id: 'field_3', ref: 'where_exactly_did_this_happen', type: 'short_text', title: 'Where exactly did this happen?' },
          { id: 'field_4', ref: 'make_of_car', type: 'short_text', title: 'Make of car' },
          { id: 'field_5', ref: 'model_of_car', type: 'short_text', title: 'Model of car' }
        ]
      },
      answers: [
        {
          type: 'boolean',
          boolean: true,
          field: {
            id: 'field_1',
            ref: 'are_you_safe',
            type: 'yes_no'
          }
        },
        {
          type: 'date',
          date: new Date().toISOString().split('T')[0],
          field: {
            id: 'field_2',
            ref: 'when_did_the_accident_happen',
            type: 'date'
          }
        },
        {
          type: 'text',
          text: 'Junction of Main Street and High Road, London',
          field: {
            id: 'field_3',
            ref: 'where_exactly_did_this_happen',
            type: 'short_text'
          }
        },
        {
          type: 'text',
          text: 'Mercedes',
          field: {
            id: 'field_4',
            ref: 'make_of_car',
            type: 'short_text'
          }
        },
        {
          type: 'text',
          text: 'Marco Polo',
          field: {
            id: 'field_5',
            ref: 'model_of_car',
            type: 'short_text'
          }
        },
        // Medical fields
        {
          type: 'boolean',
          boolean: false,
          field: {
            ref: 'medical_chest_pain',
            type: 'yes_no'
          }
        },
        {
          type: 'boolean',
          boolean: false,
          field: {
            ref: 'medical_none_of_these',
            type: 'yes_no'
          }
        },
        // Weather fields
        {
          type: 'boolean',
          boolean: true,
          field: {
            ref: 'weather_clear_and_dry',
            type: 'yes_no'
          }
        },
        {
          type: 'boolean',
          boolean: true,
          field: {
            ref: 'wearing_seatbelts',
            type: 'yes_no'
          }
        }
      ]
    }
  };
}

/**
 * Create a mock user signup payload
 */
function createUserSignupPayload() {
  const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  return {
    event_id: `event_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    event_type: 'form_response',
    form_response: {
      form_id: 'b03aFxEO',
      token: `token_${crypto.randomBytes(8).toString('hex')}`,
      landed_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      hidden: {
        auth_user_id: userId,
        auth_code: 'TEST123',
        email: 'test.user@example.com',
        product_id: 'car_crash_lawyer_ai'
      },
      definition: {
        id: 'b03aFxEO',
        title: 'Car Crash Lawyer AI sign up',
        fields: [
          { id: 'field_1', ref: 'name', type: 'short_text', title: 'Name' },
          { id: 'field_2', ref: 'surname', type: 'short_text', title: 'Surname' },
          { id: 'field_3', ref: 'mobile', type: 'phone_number', title: 'Mobile' },
          { id: 'field_4', ref: 'street_address', type: 'short_text', title: 'Street address' },
          { id: 'field_5', ref: 'town', type: 'short_text', title: 'Town' },
          { id: 'field_6', ref: 'postcode', type: 'short_text', title: 'Postcode' },
          { id: 'field_7', ref: 'vehicle_make', type: 'short_text', title: 'Vehicle Make' },
          { id: 'field_8', ref: 'vehicle_model', type: 'short_text', title: 'Vehicle Model' }
        ]
      },
      answers: [
        {
          type: 'text',
          text: 'Test',
          field: { ref: 'name', type: 'short_text' }
        },
        {
          type: 'text',
          text: 'User',
          field: { ref: 'surname', type: 'short_text' }
        },
        {
          type: 'phone_number',
          phone_number: '+447411005390',
          field: { ref: 'mobile', type: 'phone_number' }
        },
        {
          type: 'text',
          text: '123 Test Street',
          field: { ref: 'street_address', type: 'short_text' }
        },
        {
          type: 'text',
          text: 'London',
          field: { ref: 'town', type: 'short_text' }
        },
        {
          type: 'text',
          text: 'SW1A 1AA',
          field: { ref: 'postcode', type: 'short_text' }
        },
        {
          type: 'text',
          text: 'Toyota',
          field: { ref: 'vehicle_make', type: 'short_text' }
        },
        {
          type: 'text',
          text: 'Corolla',
          field: { ref: 'vehicle_model', type: 'short_text' }
        }
      ]
    }
  };
}

/**
 * Send test webhook to local server
 */
async function sendTestWebhook(payload, options = {}) {
  const {
    withSignature = true,
    endpoint = '/api/webhook/typeform',
    serverUrl = 'http://localhost:5000'
  } = options;

  try {
    const payloadString = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Typeform-Webhook-Simulator/1.0'
    };

    // Add signature if requested
    if (withSignature && process.env.TYPEFORM_WEBHOOK_SECRET) {
      const signature = generateTypeformSignature(payloadString, process.env.TYPEFORM_WEBHOOK_SECRET);
      headers['Typeform-Signature'] = signature;
      log(`🔐 Generated signature: ${signature.substring(0, 40)}...`, colors.blue);
    } else if (withSignature && !process.env.TYPEFORM_WEBHOOK_SECRET) {
      log('⚠️  TYPEFORM_WEBHOOK_SECRET not configured - sending without signature', colors.yellow);
    } else {
      log('📡 Sending without signature (using test endpoint)', colors.yellow);
      endpoint = '/api/webhook/typeform-test';
    }

    const url = `${serverUrl}${endpoint}`;
    log(`\n🚀 Sending POST request to: ${url}`, colors.cyan);
    log(`📦 Payload size: ${payloadString.length} bytes`, colors.blue);

    const startTime = Date.now();
    const response = await axios.post(url, payload, {
      headers,
      timeout: 10000,
      validateStatus: null // Don't throw on any status
    });
    const duration = Date.now() - startTime;

    log(`\n⏱️  Response time: ${duration}ms`, colors.blue);
    log(`📊 Status: ${response.status} ${response.statusText}`,
      response.status === 200 ? colors.green : colors.red);

    if (response.data) {
      log('\n📄 Response body:', colors.cyan);
      console.log(JSON.stringify(response.data, null, 2));
    }

    return {
      success: response.status === 200,
      status: response.status,
      data: response.data,
      duration
    };

  } catch (error) {
    log(`\n❌ Error sending webhook:`, colors.red);
    if (error.response) {
      log(`   Status: ${error.response.status}`, colors.red);
      log(`   Data: ${JSON.stringify(error.response.data)}`, colors.red);
    } else if (error.code === 'ECONNREFUSED') {
      log('   Connection refused - is the server running on localhost:5000?', colors.red);
      log('   Start the server with: npm start', colors.yellow);
    } else {
      log(`   ${error.message}`, colors.red);
    }

    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Check server health before testing
 */
async function checkServerHealth(serverUrl = 'http://localhost:5000') {
  try {
    log('🏥 Checking server health...', colors.cyan);
    const response = await axios.get(`${serverUrl}/api/health`, { timeout: 5000 });

    if (response.status === 200) {
      log('✅ Server is running and healthy', colors.green);
      if (response.data) {
        log(`   Version: ${response.data.version || 'Unknown'}`, colors.blue);
        log(`   Environment: ${response.data.env || 'Unknown'}`, colors.blue);
      }
      return true;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('❌ Server is not running on localhost:5000', colors.red);
      log('   Start the server with: npm start', colors.yellow);
    } else {
      log(`⚠️  Health check failed: ${error.message}`, colors.yellow);
    }
    return false;
  }
}

/**
 * Verify database connection and check for test data
 */
async function verifyDatabaseAfterTest(testType, userId) {
  try {
    const db = require('../src/utils/db');

    section('Verifying Database Changes');

    if (testType === 'incident') {
      log('📊 Checking incident_reports table...', colors.cyan);

      const result = await db.query(`
        SELECT
          id,
          create_user_id,
          where_exactly_did_this_happen,
          make_of_car,
          model_of_car,
          created_at
        FROM incident_reports
        WHERE create_user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      if (result.rows.length > 0) {
        log('✅ Incident report found in database!', colors.green);
        console.table(result.rows);
      } else {
        log('⚠️  No incident report found (may still be processing)', colors.yellow);
      }

    } else if (testType === 'signup') {
      log('📊 Checking user_signup table...', colors.cyan);

      const result = await db.query(`
        SELECT
          id,
          create_user_id,
          name,
          surname,
          mobile,
          vehicle_make,
          vehicle_model,
          created_at
        FROM user_signup
        WHERE create_user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      if (result.rows.length > 0) {
        log('✅ User signup found in database!', colors.green);
        console.table(result.rows);
      } else {
        log('⚠️  No user signup found (may still be processing)', colors.yellow);
      }
    }

    // Check user_documents table for images
    log('\n📸 Checking user_documents table...', colors.cyan);
    const docsResult = await db.query(`
      SELECT
        id,
        document_type,
        status,
        file_size,
        created_at,
        processing_duration_ms
      FROM user_documents
      WHERE create_user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    if (docsResult.rows.length > 0) {
      log(`✅ Found ${docsResult.rows.length} document(s)`, colors.green);
      console.table(docsResult.rows);
    } else {
      log('📝 No documents found (images may not have been included in test)', colors.blue);
    }

    await db.close();

  } catch (error) {
    log(`\n❌ Database verification failed: ${error.message}`, colors.red);
  }
}

/**
 * Main test runner
 */
async function main() {
  header('🧪 TYPEFORM WEBHOOK SIMULATOR & TESTER');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const testType = args.find(arg => arg === 'incident' || arg === 'signup') ||
                   (args.includes('--type') ? args[args.indexOf('--type') + 1] : 'incident');
  const withSignature = !args.includes('--no-signature');
  const serverUrl = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:5000';

  log(`📋 Test Type: ${testType}`, colors.cyan);
  log(`🔐 Signature: ${withSignature ? 'Enabled' : 'Disabled'}`, colors.cyan);
  log(`🌐 Server URL: ${serverUrl}`, colors.cyan);

  // Check environment variables
  section('Environment Configuration');
  log(`TYPEFORM_WEBHOOK_SECRET: ${process.env.TYPEFORM_WEBHOOK_SECRET ? '✅ Configured' : '❌ Missing'}`,
    process.env.TYPEFORM_WEBHOOK_SECRET ? colors.green : colors.red);
  log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Configured' : '❌ Missing'}`,
    process.env.SUPABASE_URL ? colors.green : colors.red);
  log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing'}`,
    process.env.DATABASE_URL ? colors.green : colors.red);

  // Check server health
  const serverHealthy = await checkServerHealth(serverUrl);
  if (!serverHealthy) {
    log('\n❌ Server health check failed - aborting test', colors.red);
    process.exit(1);
  }

  // Create test payload
  section('Creating Test Payload');
  let payload;
  if (testType === 'incident') {
    payload = createIncidentReportPayload();
    log('✅ Created incident report payload', colors.green);
  } else if (testType === 'signup') {
    payload = createUserSignupPayload();
    log('✅ Created user signup payload', colors.green);
  } else {
    log(`❌ Invalid test type: ${testType}`, colors.red);
    log('   Valid types: incident, signup', colors.yellow);
    process.exit(1);
  }

  const userId = payload.form_response.hidden?.user_id ||
                 payload.form_response.hidden?.auth_user_id ||
                 payload.form_response.token;
  log(`👤 Test User ID: ${userId}`, colors.blue);
  log(`📋 Form ID: ${payload.form_response.form_id}`, colors.blue);
  log(`📊 Answers: ${payload.form_response.answers.length} fields`, colors.blue);

  // Send webhook
  section('Sending Test Webhook');
  const result = await sendTestWebhook(payload, { withSignature, serverUrl });

  // Wait for async processing (webhook responds immediately)
  if (result.success) {
    log('\n⏳ Waiting 3 seconds for async processing...', colors.yellow);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify database changes
    await verifyDatabaseAfterTest(testType, userId);
  }

  // Summary
  header('TEST SUMMARY');
  if (result.success) {
    log('✅ Webhook test PASSED', colors.green);
    log(`   Response time: ${result.duration}ms`, colors.blue);
    log(`   Status: ${result.status}`, colors.blue);
  } else {
    log('❌ Webhook test FAILED', colors.red);
    if (result.error) {
      log(`   Error: ${result.error}`, colors.red);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// Run the test
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
