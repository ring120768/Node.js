
const axios = require('axios');

async function testIncidentWebhook() {
  const testData = {
    event_id: 'test_' + Date.now(),
    event_type: 'form_response',
    form_response: {
      form_id: 'test_incident_form',
      token: 'test_token_' + Date.now(),
      landed_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      hidden: {
        create_user_id: 'ianring_120768' // Use the legitimate user ID
      },
      calculated: {
        score: 0
      },
      answers: [
        {
          field: { id: 'field_1', ref: 'driver_name', type: 'short_text' },
          type: 'text',
          text: 'Ian Ring'
        },
        {
          field: { id: 'field_2', ref: 'incident_location', type: 'short_text' },
          type: 'text',
          text: 'Old Church Hill, Basildon'
        },
        {
          field: { id: 'field_3', ref: 'incident_description', type: 'long_text' },
          type: 'text',
          text: 'Test incident report for debugging database saving issue'
        },
        {
          field: { id: 'field_4', ref: 'email', type: 'email' },
          type: 'email',
          text: 'test@example.com'
        }
      ]
    }
  };

  try {
    console.log('🧪 Testing incident webhook...');
    console.log('📤 Sending test data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post('http://localhost:5000/webhook/incident-report', testData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.ZAPIER_SHARED_KEY
      }
    });

    console.log('✅ Webhook response:', response.data);
    console.log('📊 Status:', response.status);
    
    // Check if data was saved
    const debugResponse = await axios.get(`http://localhost:5000/api/debug/incident-reports?userId=${testData.form_response.hidden.create_user_id}`, {
      headers: {
        'X-Api-Key': process.env.ZAPIER_SHARED_KEY
      }
    });
    
    console.log('🔍 Debug response:', debugResponse.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('📊 Status:', error.response.status);
    }
  }
}

testIncidentWebhook().catch(console.error);
