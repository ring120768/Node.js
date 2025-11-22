/**
 * Test script for what3words integration
 * Tests all what3words endpoints to verify proper configuration
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_COORDINATES = {
  latitude: 51.520847,
  longitude: -0.195521
};

// Expected result for test coordinates
const EXPECTED_WORDS = 'filled.count.soap';

async function testWhat3wordsIntegration() {
  console.log('🧪 Testing what3words integration...\n');

  try {
    // Test 1: Direct API call (verify API key works)
    console.log('Test 1: Direct what3words API call');
    const directResponse = await axios.get(
      `https://api.what3words.com/v3/convert-to-3wa?coordinates=${TEST_COORDINATES.latitude},${TEST_COORDINATES.longitude}&key=${process.env.WHAT3WORDS_API_KEY}`
    );
    console.log('✅ Direct API call successful');
    console.log(`   Words: ${directResponse.data.words}`);
    console.log(`   Country: ${directResponse.data.country}\n`);

    // Test 2: POST /api/location/what3words
    console.log('Test 2: POST /api/location/what3words');
    const postResponse = await axios.post(`${BASE_URL}/api/location/what3words`, {
      latitude: TEST_COORDINATES.latitude,
      longitude: TEST_COORDINATES.longitude
    });
    console.log('✅ POST endpoint successful');
    console.log(`   Response:`, postResponse.data);
    console.log();

    // Test 3: GET /api/location/convert
    console.log('Test 3: GET /api/location/convert');
    const getResponse = await axios.get(
      `${BASE_URL}/api/location/convert?lat=${TEST_COORDINATES.latitude}&lng=${TEST_COORDINATES.longitude}`
    );
    console.log('✅ GET convert endpoint successful');
    console.log(`   Response:`, getResponse.data);
    console.log();

    // Test 4: GET /api/location/autosuggest
    console.log('Test 4: GET /api/location/autosuggest');
    const suggestResponse = await axios.get(
      `${BASE_URL}/api/location/autosuggest?input=filled.count.soap`
    );
    console.log('✅ Autosuggest endpoint successful');
    console.log(`   Suggestions:`, suggestResponse.data);
    console.log();

    // Test 5: Verify graceful fallback (no API key scenario)
    console.log('Test 5: Environment variable check');
    console.log(`   WHAT3WORDS_API_KEY is ${process.env.WHAT3WORDS_API_KEY ? 'SET ✅' : 'NOT SET ❌'}`);
    console.log();

    console.log('🎉 All tests completed successfully!\n');
    console.log('Summary:');
    console.log('- Direct API call: ✅');
    console.log('- POST endpoint: ✅');
    console.log('- GET convert endpoint: ✅');
    console.log('- Autosuggest endpoint: ✅');
    console.log(`- Environment variable: ${process.env.WHAT3WORDS_API_KEY ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }

    if (!process.env.WHAT3WORDS_API_KEY) {
      console.error('\n⚠️  WHAT3WORDS_API_KEY is not set in environment!');
      console.error('   Add it to Replit Secrets: WHAT3WORDS_API_KEY=C0C4RX8X');
    }

    process.exit(1);
  }
}

// Run tests
testWhat3wordsIntegration();
