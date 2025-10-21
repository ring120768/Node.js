/**
 * Test Emergency Contacts API
 * Tests the /api/contacts/:userId endpoint to see what data is returned
 */

const axios = require('axios');

// Test user ID - replace with a real user ID from your database
const TEST_USER_ID = process.argv[2];

if (!TEST_USER_ID) {
  console.log('Usage: node test-emergency-contacts.js <user_id>');
  console.log('Example: node test-emergency-contacts.js 550e8400-e29b-41d4-a716-446655440000');
  process.exit(1);
}

async function testEmergencyContacts() {
  try {
    console.log('\n🧪 Testing Emergency Contacts API');
    console.log('================================\n');
    console.log(`User ID: ${TEST_USER_ID}\n`);

    // Test the API endpoint
    const url = `http://localhost:5000/api/contacts/${TEST_USER_ID}`;
    console.log(`🔗 Testing: ${url}\n`);

    const response = await axios.get(url);

    console.log('✅ API Response Status:', response.status);
    console.log('\n📋 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n📊 Field Analysis:');
    console.log('  emergency_contact:', response.data.emergency_contact || '❌ NOT SET');
    console.log('  recovery_breakdown_number:', response.data.recovery_breakdown_number || '❌ NOT SET');
    console.log('  emergency_services_number:', response.data.emergency_services_number || '❌ NOT SET');

    console.log('\n🔍 Diagnosis:');
    if (!response.data.emergency_contact && !response.data.recovery_breakdown_number) {
      console.log('❌ ISSUE FOUND: Both emergency_contact and recovery_breakdown_number are missing');
      console.log('   This is why the buttons show "no number available"');
      console.log('\n💡 Solution: User needs to update their profile with:');
      console.log('   - Emergency contact phone number');
      console.log('   - Recovery/breakdown service number');
    } else {
      console.log('✅ Emergency contact data is present');
    }

  } catch (error) {
    console.error('\n❌ API Error:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Data:', error.response?.data);
    console.error('\nFull Error:', error.message);
  }
}

testEmergencyContacts();
