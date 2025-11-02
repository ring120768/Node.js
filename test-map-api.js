/**
 * Test script to verify map URL is returned by location API
 */

const config = require('./src/config');

// Test coordinates (London)
const testLat = 51.5074;
const testLng = -0.1278;

async function testMapAPI() {
  console.log('🧪 Testing Location API with Map URL');
  console.log('=====================================\n');

  const url = `http://localhost:3000/api/location/convert?lat=${testLat}&lng=${testLng}`;
  console.log('📍 Test coordinates:', { lat: testLat, lng: testLng });
  console.log('🌐 API URL:', url);
  console.log('');

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('✅ Response status:', response.status);
    console.log('📦 Response data:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (data.success && data.map) {
      console.log('✅ SUCCESS: Map URL is present!');
      console.log('🗺️  Map URL:', data.map);
      console.log('');
      console.log('🎯 what3words:', data.words);
    } else {
      console.log('❌ FAIL: No map URL in response');
      if (!data.success) {
        console.log('   Error:', data.error);
      }
    }

  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
}

// Run the test
testMapAPI();
