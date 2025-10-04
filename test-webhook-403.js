
#!/usr/bin/env node

const axios = require('axios');

async function testWebhookEndpoints() {
  console.log('🔍 TYPEFORM WEBHOOK 403 DEBUGGING - v4.4.0');
  console.log('='.repeat(60));

  // Get current Replit URL dynamically
  const serverUrl = process.env.REPL_URL || 'http://0.0.0.0:3000';
  const apiKey = process.env.API_KEY;

  console.log(`Testing server: ${serverUrl}`);
  console.log(`API Key configured: ${!!apiKey}`);

  // Test 1: Check server health
  console.log('\n1. Testing server health...');
  try {
    const health = await axios.get(`${serverUrl}/health`, { timeout: 10000 });
    console.log('✅ Server is healthy');
    console.log('   Version:', health.data.version);
    console.log('   Supabase:', health.data.services.supabase ? '✅' : '❌');
    console.log('   GDPR Status:', health.data.fixes.gdpr_removal || 'Not specified');
    console.log('   Webhook Auth:', health.data.fixes.webhook_endpoints || 'Not specified');
    console.log('   Rate Limiting:', health.data.fixes.rate_limiting || 'Not specified');
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    console.error('   Make sure your server is running on port 3000');
    return;
  }

  // Test 1.5: Test webhook configuration endpoint
  console.log('\n1.5. Testing webhook configuration...');
  try {
    const config = await axios.get(`${serverUrl}/webhook/config-test`, { timeout: 5000 });
    console.log('✅ Webhook configuration accessible');
    console.log('   Auth Required:', config.data.config.api_key_required);
    console.log('   Temp ID Blocking:', config.data.config.temp_id_blocking);
    console.log('   Webhook URL:', config.data.instructions.typeform_webhook_url);
  } catch (error) {
    console.error('❌ Webhook config test failed:', error.message);
  }

  // Test 2: Test webhook without auth (should work for Typeform)
  console.log('\n2. Testing incident report webhook without auth (Typeform simulation)...');
  const typeformPayload = {
    event_id: `test_${Date.now()}`,
    event_type: 'form_response',
    form_response: {
      form_id: 'WvM2ejru',
      token: `test_token_${Date.now()}`,
      landed_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      hidden: {
        create_user_id: `test-user-${Date.now()}`
      },
      answers: [
        {
          field: { id: 'field_1', ref: 'driver_name', type: 'short_text' },
          type: 'text',
          text: 'Test Driver'
        },
        {
          field: { id: 'field_2', ref: 'incident_location', type: 'short_text' },
          type: 'text',
          text: 'Test Location'
        }
      ]
    }
  };

  try {
    const response = await axios.post(
      `${serverUrl}/webhook/incident-report`,
      typeformPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Typeform/1.0'
        },
        timeout: 15000
      }
    );

    console.log('✅ Webhook without auth successful!');
    console.log('   Status:', response.status);
    console.log('   Response:', {
      success: response.data.success,
      report_id: response.data.report_id,
      message: response.data.message
    });

  } catch (error) {
    console.error('❌ Webhook without auth failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
  }

  // Test 3: Test with API key (should also work)
  if (apiKey) {
    console.log('\n3. Testing with API key...');
    try {
      const response = await axios.post(
        `${serverUrl}/webhook/incident-report`,
        typeformPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
            'User-Agent': 'Typeform/1.0'
          },
          timeout: 15000
        }
      );

      console.log('✅ Webhook with API key successful!');
      console.log('   Status:', response.status);
      console.log('   Report ID:', response.data.report_id);

    } catch (error) {
      console.error('❌ Webhook with API key failed:');
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Error:', error.response.data);
      } else {
        console.error('   Error:', error.message);
      }
    }
  } else {
    console.log('\n3. ⚠️ No API key configured - skipping authenticated test');
  }

  // Test 4: Check if data was saved
  if (apiKey) {
    console.log('\n4. Checking if data was saved to database...');
    try {
      const response = await axios.get(
        `${serverUrl}/api/debug/incident-reports?limit=3`,
        {
          headers: { 'X-Api-Key': apiKey },
          timeout: 10000
        }
      );

      console.log('✅ Database check successful');
      console.log('   Recent reports:', response.data.count);
      
      if (response.data.incident_reports && response.data.incident_reports.length > 0) {
        const latest = response.data.incident_reports[0];
        console.log('   Latest report:');
        console.log('     ID:', latest.id);
        console.log('     User:', latest.create_user_id?.substring(0, 15) + '...');
        console.log('     Created:', latest.created_at);
      }

      if (response.data.recent_failures && response.data.recent_failures.length > 0) {
        console.log('⚠️  Recent failures found:', response.data.recent_failures.length);
        response.data.recent_failures.forEach((failure, i) => {
          console.log(`     ${i+1}. ${failure.error_message}`);
        });
      }

    } catch (error) {
      console.error('❌ Database check failed:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 TROUBLESHOOTING GUIDE:');
  console.log('');
  console.log('For Typeform webhook configuration:');
  console.log(`1. Webhook URL: ${serverUrl}/webhook/incident-report`);
  console.log('2. Method: POST');
  console.log('3. Content-Type: application/json');
  console.log('4. No authentication headers needed (Typeform auto-detected)');
  console.log('');
  console.log('If you still get 403 errors:');
  console.log('- Check Typeform webhook logs for delivery status');
  console.log('- Verify your Replit is running and accessible');
  console.log('- Test the webhook URL manually in a browser');
  console.log('- Check Replit logs for any error messages');
}

// Run the test
if (require.main === module) {
  testWebhookEndpoints().catch(console.error);
}

module.exports = { testWebhookEndpoints };
