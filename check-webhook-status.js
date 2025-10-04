
const axios = require('axios');

async function checkWebhookStatus() {
  console.log('🔍 CHECKING CURRENT WEBHOOK STATUS');
  console.log('===================================');

  try {
    // Check server health
    const health = await axios.get('http://localhost:5000/health');
    console.log('✅ Server Status:', health.data.status);
    console.log('📊 Version:', health.data.version);
    
    // Check recent incident reports
    const reports = await axios.get('http://localhost:5000/api/debug/incident-reports?limit=5', {
      headers: { 'X-Api-Key': process.env.API_KEY }
    });
    
    console.log('\n📋 RECENT INCIDENT REPORTS:');
    console.log('Count:', reports.data.count);
    
    if (reports.data.incident_reports && reports.data.incident_reports.length > 0) {
      reports.data.incident_reports.forEach((report, i) => {
        console.log(`\n${i + 1}. Report ID: ${report.id}`);
        console.log(`   User ID: ${report.create_user_id}`);
        console.log(`   Form ID: ${report.typeform_form_id || 'Not specified'}`);
        console.log(`   Driver: ${report.driver_name || 'Not provided'}`);
        console.log(`   Location: ${report.incident_location || 'Not provided'}`);
        console.log(`   Created: ${report.created_at}`);
      });
    } else {
      console.log('📝 No incident reports found in database');
    }

    // Check webhook failures
    console.log('\n⚠️ RECENT WEBHOOK FAILURES:');
    console.log('Count:', reports.data.failure_count);
    
    if (reports.data.recent_failures && reports.data.recent_failures.length > 0) {
      reports.data.recent_failures.forEach((failure, i) => {
        console.log(`\n${i + 1}. ${failure.error_message}`);
        console.log(`   Endpoint: ${failure.endpoint}`);
        console.log(`   Time: ${failure.created_at}`);
      });
    } else {
      console.log('✅ No recent webhook failures');
    }

    // Test a simple webhook debug endpoint
    console.log('\n🧪 TESTING DEBUG WEBHOOK:');
    try {
      const debugTest = await axios.post('http://localhost:5000/webhook/debug', {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Status check test'
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('✅ Debug webhook response:', debugTest.status);
      console.log('📋 Response data:', debugTest.data);
    } catch (debugError) {
      console.log('❌ Debug webhook failed:', debugError.message);
    }

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

checkWebhookStatus().catch(console.error);
