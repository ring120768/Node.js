
const axios = require('axios');

async function diagnoseTypeformWebhook() {
  console.log('🔍 TYPEFORM WEBHOOK DIAGNOSTICS');
  console.log('='.repeat(50));

  const serverUrl = 'http://localhost:5000';
  const apiKey = process.env.API_KEY;

  // Test 1: Check server health
  console.log('\n1. Testing server health...');
  try {
    const health = await axios.get(`${serverUrl}/health`);
    console.log('✅ Server is healthy');
    console.log('   Version:', health.data.version);
    console.log('   GDPR Manager:', health.data.services.gdpr_compliance.module);
    console.log('   Temp ID Blocking:', health.data.fixes.temp_id_blocking);
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    return;
  }

  // Test 2: Check webhook endpoints
  console.log('\n2. Testing webhook endpoint accessibility...');
  try {
    const endpoints = await axios.get(`${serverUrl}/webhook/check`);
    console.log('✅ Webhook endpoints accessible');
    console.log('   Incident Report:', endpoints.data.endpoints.incident_report);
    console.log('   Signup:', endpoints.data.endpoints.signup);
    console.log('   Test:', endpoints.data.endpoints.test);
  } catch (error) {
    console.error('❌ Webhook endpoints check failed:', error.message);
  }

  // Test 3: Test webhook with debug data
  console.log('\n3. Testing webhook with debug payload...');
  const debugPayload = {
    event_id: `debug_${Date.now()}`,
    event_type: 'form_response',
    form_response: {
      form_id: 'WvM2ejru', // Your incident form ID
      token: `debug_token_${Date.now()}`,
      landed_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      hidden: {
        create_user_id: `debug-user-${Date.now()}` // Debug user ID
      },
      answers: [
        {
          field: { id: 'test1', ref: 'driver_name', type: 'short_text' },
          type: 'text',
          text: 'Debug Test Driver'
        },
        {
          field: { id: 'test2', ref: 'incident_location', type: 'short_text' },
          type: 'text',
          text: 'Debug Location for Testing'
        }
      ]
    }
  };

  try {
    const response = await axios.post(
      `${serverUrl}/webhook/debug`,
      debugPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Typeform-Debug/1.0'
        },
        timeout: 10000
      }
    );

    console.log('✅ Debug webhook successful');
    console.log('   Status:', response.status);
    console.log('   Response:', response.data);

  } catch (error) {
    console.error('❌ Debug webhook failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
  }

  // Test 4: Test with authentication
  if (apiKey && apiKey !== 'your-api-key-here') {
    console.log('\n4. Testing with authentication...');
    try {
      const response = await axios.post(
        `${serverUrl}/webhook/incident-report`,
        debugPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
            'User-Agent': 'Typeform-Debug/1.0'
          },
          timeout: 10000
        }
      );

      console.log('✅ Authenticated webhook successful');
      console.log('   Report ID:', response.data.report_id);
      console.log('   Fields Saved:', response.data.fields_saved);

    } catch (error) {
      console.error('❌ Authenticated webhook failed:');
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Error:', error.response.data);
      }
    }
  } else {
    console.log('\n4. ⚠️ No API key configured - skipping authenticated test');
  }

  // Test 5: Check recent webhook logs
  console.log('\n5. Checking recent webhook activity...');
  if (apiKey) {
    try {
      const logs = await axios.get(
        `${serverUrl}/api/debug/incident-reports?limit=3`,
        {
          headers: { 'X-Api-Key': apiKey }
        }
      );

      console.log('✅ Recent webhook activity:');
      if (logs.data.incident_reports && logs.data.incident_reports.length > 0) {
        logs.data.incident_reports.forEach((report, i) => {
          console.log(`   ${i+1}. ID: ${report.id}, User: ${report.create_user_id?.substring(0, 10)}..., Created: ${report.created_at}`);
        });
      } else {
        console.log('   No recent incident reports found');
      }

      if (logs.data.recent_failures && logs.data.recent_failures.length > 0) {
        console.log('⚠️ Recent failures:');
        logs.data.recent_failures.forEach((failure, i) => {
          console.log(`   ${i+1}. Error: ${failure.error_message}`);
        });
      }

    } catch (error) {
      console.error('❌ Failed to check webhook logs:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📋 DIAGNOSTIC SUMMARY:');
  console.log('1. Your webhook URL should be: https://your-replit-url/webhook/incident-report');
  console.log('2. Add header: X-Api-Key with your API key');
  console.log('3. Content-Type: application/json');
  console.log('4. Check Typeform webhook logs for any delivery failures');
  console.log('\n💡 Next steps:');
  console.log('- Copy your Replit URL from the webview');
  console.log('- Update Typeform webhook URL');
  console.log('- Test with a real form submission');
}

// Run diagnostics
if (require.main === module) {
  diagnoseTypeformWebhook().catch(console.error);
}

module.exports = { diagnoseTypeformWebhook };
