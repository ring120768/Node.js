
const axios = require('axios');

// Test script to verify Typeform webhook for incident reports
async function testTypeformWebhook() {
  console.log('🧪 Testing Typeform Webhook for Incident Reports');
  console.log('='.repeat(60));

  const serverUrl = 'http://localhost:5000';
  const apiKey = process.env.API_KEY || 'your-api-key-here';

  if (!apiKey || apiKey === 'your-api-key-here') {
    console.error('❌ API_KEY not found in environment variables');
    process.exit(1);
  }

  // Test 1: Check webhook endpoint accessibility
  console.log('\n1. Testing webhook endpoint accessibility...');
  try {
    const response = await axios.get(`${serverUrl}/webhook/check`);
    console.log('✅ Webhook endpoints are accessible');
    console.log('   Base URL:', response.data.baseUrl);
    console.log('   Incident Report URL:', response.data.endpoints.incident_report);
  } catch (error) {
    console.error('❌ Failed to access webhook endpoints:', error.message);
    return;
  }

  // Test 2: Test incident report webhook with mock Typeform data
  console.log('\n2. Testing incident report webhook with mock data...');
  
  const mockTypeformData = {
    event_id: `test_${Date.now()}`,
    event_type: 'form_response',
    form_response: {
      form_id: 'WvM2ejru', // Your incident form ID
      token: `test_token_${Date.now()}`,
      landed_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      hidden: {
        create_user_id: `test-user-${Date.now()}` // Test user ID
      },
      calculated: {
        score: 0
      },
      answers: [
        {
          field: { id: 'field_1', ref: 'driver_name', type: 'short_text', title: 'Full Name' },
          type: 'text',
          text: 'Test Driver Name'
        },
        {
          field: { id: 'field_2', ref: 'email', type: 'email', title: 'Email Address' },
          type: 'email',
          email: 'test@example.com'
        },
        {
          field: { id: 'field_3', ref: 'incident_location', type: 'short_text', title: 'Incident Location' },
          type: 'text',
          text: 'Test Location, Test City, AB12 3CD'
        },
        {
          field: { id: 'field_4', ref: 'incident_date', type: 'date', title: 'Incident Date' },
          type: 'date',
          date: new Date().toISOString().split('T')[0]
        },
        {
          field: { id: 'field_5', ref: 'incident_description', type: 'long_text', title: 'What happened?' },
          type: 'text',
          text: 'This is a test incident report created to verify webhook functionality. The incident involved two vehicles at a junction.'
        },
        {
          field: { id: 'field_6', ref: 'vehicle_registration', type: 'short_text', title: 'Your Vehicle Registration' },
          type: 'text',
          text: 'AB12 XYZ'
        },
        {
          field: { id: 'field_7', ref: 'gdpr_consent', type: 'yes_no', title: 'GDPR Consent' },
          type: 'boolean',
          boolean: true
        }
      ]
    }
  };

  try {
    const response = await axios.post(
      `${serverUrl}/webhook/incident-report`,
      mockTypeformData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'User-Agent': 'Typeform/1.0'
        },
        timeout: 10000
      }
    );

    console.log('✅ Incident report webhook test successful!');
    console.log('   Status:', response.status);
    console.log('   Response:', {
      success: response.data.success,
      user_id: response.data.user_id,
      report_id: response.data.report_id,
      fields_saved: response.data.fields_saved
    });

    if (response.data.report_id) {
      console.log('✅ Incident report was saved to database with ID:', response.data.report_id);
    }

  } catch (error) {
    console.error('❌ Incident report webhook test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
  }

  // Test 3: Check if data was saved correctly
  console.log('\n3. Checking if incident data was saved...');
  try {
    const debugResponse = await axios.get(
      `${serverUrl}/api/debug/incident-reports?limit=1`,
      {
        headers: {
          'X-Api-Key': apiKey
        }
      }
    );

    const reports = debugResponse.data.incident_reports;
    if (reports && reports.length > 0) {
      const latestReport = reports[0];
      console.log('✅ Latest incident report found:');
      console.log('   ID:', latestReport.id);
      console.log('   User ID:', latestReport.create_user_id || latestReport.user_id);
      console.log('   Driver Name:', latestReport.driver_name);
      console.log('   Location:', latestReport.incident_location);
      console.log('   Created:', latestReport.created_at);
    } else {
      console.log('⚠️  No incident reports found in database');
    }
  } catch (error) {
    console.error('❌ Failed to check saved data:', error.message);
  }

  // Test 4: Test webhook validation and error handling
  console.log('\n4. Testing webhook validation...');
  
  // Test with missing form_response
  try {
    await axios.post(
      `${serverUrl}/webhook/incident-report`,
      { invalid: 'data' },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey
        }
      }
    );
    console.log('⚠️  Validation test: Should have failed but didn\'t');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Validation working: Invalid data properly rejected');
    } else {
      console.log('⚠️  Unexpected validation response:', error.response?.status);
    }
  }

  // Test 5: Check webhook with no authentication
  console.log('\n5. Testing authentication...');
  try {
    await axios.post(
      `${serverUrl}/webhook/incident-report`,
      mockTypeformData,
      {
        headers: {
          'Content-Type': 'application/json'
          // No API key
        }
      }
    );
    console.log('⚠️  Authentication test: Should have failed but didn\'t');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Authentication working: Unauthorized requests properly rejected');
    } else {
      console.log('⚠️  Unexpected authentication response:', error.response?.status);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Webhook testing complete!');
  console.log('\nNext steps:');
  console.log('1. Configure your Typeform to send webhooks to:');
  console.log(`   ${serverUrl.replace('localhost:5000', 'your-replit-url')}/webhook/incident-report`);
  console.log('2. Add your API key as a header: X-Api-Key');
  console.log('3. Test with a real form submission');
}

// Run the test
testTypeformWebhook().catch(console.error);
