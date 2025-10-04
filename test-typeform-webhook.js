
const axios = require('axios');
const crypto = require('crypto');

async function testTypeformIncidentWebhook() {
  console.log('🧪 TESTING TYPEFORM INCIDENT WEBHOOK');
  console.log('====================================');

  // Test data that matches the WvM2ejru incident form structure
  const testData = {
    event_id: 'test_' + Date.now(),
    event_type: 'form_response',
    form_response: {
      form_id: 'WvM2ejru', // CORRECT incident report form ID
      token: 'test_token_' + Date.now(),
      landed_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      hidden: {
        create_user_id: crypto.randomUUID() // Generate a real UUID for testing
      },
      calculated: {
        score: 0
      },
      answers: [
        {
          field: { id: 'field_1', ref: 'driver_name', type: 'short_text' },
          type: 'text',
          text: 'Test Driver Name'
        },
        {
          field: { id: 'field_2', ref: 'incident_location', type: 'short_text' },
          type: 'text',
          text: 'Test Location, Test City'
        },
        {
          field: { id: 'field_3', ref: 'incident_description', type: 'long_text' },
          type: 'text',
          text: 'Test incident report for webhook validation'
        },
        {
          field: { id: 'field_4', ref: 'email', type: 'email' },
          type: 'email',
          email: 'test@example.com'
        },
        {
          field: { id: 'field_5', ref: 'phone', type: 'phone_number' },
          type: 'phone_number',
          phone_number: '+447123456789'
        },
        {
          field: { id: 'field_6', ref: 'incident_date', type: 'date' },
          type: 'date',
          date: '2024-10-04'
        },
        {
          field: { id: 'field_7', ref: 'vehicle_registration', type: 'short_text' },
          type: 'text',
          text: 'AB12 CDE'
        },
        {
          field: { id: 'field_8', ref: 'gdpr_consent', type: 'boolean' },
          type: 'boolean',
          boolean: true
        }
      ]
    }
  };

  const testUserId = testData.form_response.hidden.create_user_id;

  try {
    console.log('📤 Sending test webhook to /webhook/incident-report');
    console.log('📋 Test User ID:', testUserId);
    console.log('📋 Form ID:', testData.form_response.form_id);
    
    // Send webhook
    const response = await axios.post('http://localhost:5000/webhook/incident-report', testData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.API_KEY
      },
      timeout: 10000
    });

    console.log('✅ Webhook Response Status:', response.status);
    console.log('✅ Webhook Response:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 && response.data.success) {
      console.log('✅ SUCCESS: Webhook accepted and processed');
      
      // Wait a moment for database write
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify data was saved
      console.log('\n🔍 Verifying data was saved to database...');
      
      const debugResponse = await axios.get(`http://localhost:5000/api/debug/incident-reports?userId=${testUserId}`, {
        headers: {
          'X-Api-Key': process.env.API_KEY
        }
      });
      
      console.log('📊 Database Check Response:', debugResponse.status);
      
      if (debugResponse.data && debugResponse.data.incident_reports) {
        const reports = debugResponse.data.incident_reports;
        console.log(`✅ Found ${reports.length} incident report(s) in database`);
        
        if (reports.length > 0) {
          const report = reports[0];
          console.log('📋 Saved Report Details:');
          console.log('   - Report ID:', report.id);
          console.log('   - User ID:', report.create_user_id);
          console.log('   - Driver Name:', report.driver_name);
          console.log('   - Location:', report.incident_location);
          console.log('   - Email:', report.email);
          console.log('   - Form ID:', report.typeform_form_id);
          console.log('   - Submitted:', report.submitted_at);
          console.log('   - GDPR Consent:', report.gdpr_consent);
          
          console.log('\n✅ WEBHOOK TEST PASSED - Data saved correctly!');
          return { success: true, reportId: report.id, userId: testUserId };
        } else {
          console.log('❌ WEBHOOK TEST FAILED - No data found in database');
          return { success: false, error: 'No data saved to database' };
        }
      } else {
        console.log('❌ Database verification failed - could not check saved data');
        return { success: false, error: 'Could not verify database save' };
      }
      
    } else {
      console.log('❌ WEBHOOK TEST FAILED - Webhook rejected request');
      return { success: false, error: response.data };
    }

  } catch (error) {
    console.error('❌ WEBHOOK TEST ERROR:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
    
    console.log('\n🔍 Checking for webhook failures in database...');
    try {
      const failuresResponse = await axios.get('http://localhost:5000/api/debug/incident-reports', {
        headers: {
          'X-Api-Key': process.env.API_KEY
        }
      });
      
      if (failuresResponse.data && failuresResponse.data.recent_failures) {
        console.log('📊 Recent Webhook Failures:', failuresResponse.data.recent_failures.length);
        failuresResponse.data.recent_failures.forEach((failure, i) => {
          console.log(`   ${i + 1}. ${failure.error_message} at ${failure.created_at}`);
        });
      }
    } catch (debugError) {
      console.error('Could not check webhook failures:', debugError.message);
    }
    
    return { success: false, error: error.message };
  }
}

// Test webhook endpoints availability
async function testWebhookEndpoints() {
  console.log('\n🔍 CHECKING WEBHOOK ENDPOINTS');
  console.log('==============================');

  const endpoints = [
    '/webhook/incident-report',
    '/webhook/signup', 
    '/webhook/debug',
    '/api/debug/incident-reports',
    '/health'
  ];

  for (const endpoint of endpoints) {
    try {
      const method = endpoint.includes('debug') || endpoint === '/health' ? 'GET' : 'POST';
      
      let response;
      if (method === 'GET') {
        response = await axios.get(`http://localhost:5000${endpoint}`, {
          headers: endpoint.includes('debug') ? { 'X-Api-Key': process.env.API_KEY } : {},
          timeout: 5000
        });
      } else {
        response = await axios.post(`http://localhost:5000${endpoint}`, {}, {
          headers: { 'X-Api-Key': process.env.API_KEY },
          timeout: 5000
        });
      }
      
      console.log(`✅ ${endpoint}: ${response.status} - Available`);
    } catch (error) {
      if (error.response) {
        console.log(`⚠️ ${endpoint}: ${error.response.status} - ${error.response.statusText}`);
      } else {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
  }
}

// Main test function
async function runWebhookTests() {
  console.log('🚀 STARTING TYPEFORM WEBHOOK TESTS\n');
  
  // Check if server is running
  try {
    const healthCheck = await axios.get('http://localhost:5000/health', { timeout: 5000 });
    console.log('✅ Server is running and healthy');
    console.log('📊 Server Version:', healthCheck.data.version);
    console.log('📊 Critical Fixes:', healthCheck.data.fixes?.incident_report_saving);
  } catch (error) {
    console.error('❌ Server is not running or not accessible');
    console.error('   Please ensure the server is running on port 5000');
    return;
  }

  // Test endpoints
  await testWebhookEndpoints();

  // Test incident webhook
  const result = await testTypeformIncidentWebhook();
  
  console.log('\n📋 TEST SUMMARY');
  console.log('================');
  if (result.success) {
    console.log('✅ Typeform incident webhook is working correctly');
    console.log('✅ Data is being saved to the database');
    console.log('📋 Test Report ID:', result.reportId);
    console.log('👤 Test User ID:', result.userId);
  } else {
    console.log('❌ Typeform incident webhook test failed');
    console.log('❌ Error:', result.error);
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Check server logs for detailed error messages');
    console.log('2. Verify API_KEY is set correctly in .env');
    console.log('3. Ensure Supabase connection is working');
    console.log('4. Check incident_reports table exists in database');
  }
}

// Run tests if called directly
if (require.main === module) {
  runWebhookTests().catch(console.error);
}

module.exports = { testTypeformIncidentWebhook, testWebhookEndpoints, runWebhookTests };
