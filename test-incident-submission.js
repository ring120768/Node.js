/**
 * Test Incident Form Submission
 * Reproduces the 500 error to see actual database error message
 */

const fetch = require('node-fetch');

async function testSubmission() {
  try {
    // Login first to get auth token
    console.log('🔐 Logging in...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ian.ring@sky.com',
        password: 'Spurs2024!'
      })
    });

    const loginData = await loginRes.json();

    if (!loginRes.ok) {
      console.error('❌ Login failed:', loginData);
      return;
    }

    // Extract cookies from Set-Cookie header
    const cookies = loginRes.headers.raw()['set-cookie'];
    const cookieString = cookies.join('; ');

    console.log('✅ Logged in successfully');
    console.log('🍪 Cookies:', cookieString.substring(0, 100) + '...');

    // Minimal test data for incident submission
    const testData = {
      page1: {},
      page2: {
        medical_attention_needed: 'no'
      },
      page3: {
        accident_date: '2025-11-15',
        accident_time: '14:30'
      },
      page4: {
        location: 'Test Location'
      },
      page5: {
        vehicle_driveable: 'yes'  // ← The field we care about
      },
      page12: {
        final_feeling: 'fine',
        completed_at: new Date().toISOString()
      }
    };

    console.log('\n📤 Submitting incident form...');
    const submitRes = await fetch('http://localhost:3000/api/incident-form/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString
      },
      body: JSON.stringify(testData)
    });

    const submitData = await submitRes.json();

    console.log('\n📥 Response Status:', submitRes.status);
    console.log('📦 Response Data:', JSON.stringify(submitData, null, 2));

    if (!submitRes.ok) {
      console.error('\n❌ SUBMISSION FAILED');
      console.error('Error:', submitData.error);
      console.error('Details:', submitData.details);
    } else {
      console.log('\n✅ SUBMISSION SUCCESSFUL');
      console.log('Incident ID:', submitData.data?.incident_id);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error.stack);
  }
}

testSubmission();
