/**
 * Test Emergency Contact API Endpoint
 * Tests if the /api/contacts/:userId endpoint is working
 */

const fetch = require('node-fetch');

// Get user ID from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('Usage: node test-emergency-api.js <user-id>');
  console.error('Example: node test-emergency-api.js 199d9251-b2e0-40a5-80bf-fc1529d9bf6c');
  process.exit(1);
}

async function testEmergencyAPI() {
  console.log('🧪 Testing Emergency Contact API...\n');
  console.log(`User ID: ${userId}\n`);

  try {
    // Test the API endpoint
    const url = `http://localhost:5000/api/contacts/${userId}`;
    console.log(`📡 Fetching: ${url}\n`);

    const response = await fetch(url);

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers: ${JSON.stringify(Object.fromEntries(response.headers), null, 2)}\n`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n📋 Emergency Contacts:');
      console.log(`- Emergency Contact: ${data.emergency_contact || 'NOT SET'}`);
      console.log(`- Recovery/Breakdown: ${data.recovery_breakdown_number || 'NOT SET'}`);
      console.log(`- Emergency Services: ${data.emergency_services_number || '999'}`);

      // Check phone number format
      if (data.emergency_contact) {
        console.log(`\n📞 Emergency Contact Format:`);
        console.log(`  Original: ${data.emergency_contact}`);
        console.log(`  Tel Link: tel:${data.emergency_contact}`);
        console.log(`  Starts with +44: ${data.emergency_contact.startsWith('+44')}`);
        console.log(`  Starts with 0: ${data.emergency_contact.startsWith('0')}`);
      }

      if (data.recovery_breakdown_number) {
        console.log(`\n🚗 Recovery Number Format:`);
        console.log(`  Original: ${data.recovery_breakdown_number}`);
        console.log(`  Tel Link: tel:${data.recovery_breakdown_number}`);
        console.log(`  Starts with +44: ${data.recovery_breakdown_number.startsWith('+44')}`);
        console.log(`  Starts with 0: ${data.recovery_breakdown_number.startsWith('0')}`);
      }

    } else {
      console.error('❌ API Error:');
      const errorText = await response.text();
      console.error(errorText);
    }

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error('\nMake sure the server is running:');
    console.error('  npm run dev');
  }
}

testEmergencyAPI();
