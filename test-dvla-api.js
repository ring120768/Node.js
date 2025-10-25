#!/usr/bin/env node
/**
 * Test DVLA API Integration
 * Tests the DVLA service with the configured API key
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

require('dotenv').config();
const dvlaService = require('./src/services/dvlaService');

async function testDVLAService() {
  console.log(colors.cyan, '\n🧪 Testing DVLA API Integration\n', colors.reset);

  // Check if API key is configured
  console.log('1. Checking DVLA API key configuration...');
  const apiKey = process.env.DVLA_API_KEY;

  if (!apiKey || apiKey === 'your-dvla-key-here') {
    console.log(colors.red, '❌ DVLA_API_KEY not configured in .env file');
    console.log('   Please add your API key to .env:', colors.reset);
    console.log('   DVLA_API_KEY=your-actual-key-here\n');
    process.exit(1);
  }

  console.log(colors.green, `✅ API key configured (${apiKey.substring(0, 10)}...)`, colors.reset);

  // Test with sample UK registration
  console.log('\n2. Testing DVLA lookup with sample registration...');
  const testReg = 'AB12ABC';
  console.log(`   Testing registration: ${testReg}`);

  try {
    const result = await dvlaService.lookupVehicle(testReg);

    if (result.success) {
      console.log(colors.green, '\n✅ DVLA API Test SUCCESSFUL!', colors.reset);
      console.log('\nVehicle Data Retrieved:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(JSON.stringify(result.data, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      console.log('\nKey Fields:');
      console.log(`  Registration: ${result.data.registration}`);
      console.log(`  Make/Model: ${result.data.make} ${result.data.model}`);
      console.log(`  Color: ${result.data.colour}`);
      console.log(`  Year: ${result.data.year_of_manufacture}`);
      console.log(`  MOT Status: ${result.data.mot_status}`);
      console.log(`  Tax Status: ${result.data.tax_status}`);

    } else {
      console.log(colors.red, '\n❌ DVLA API Test FAILED', colors.reset);
      console.log(`Error: ${result.error}`);
      console.log(`Error Code: ${result.errorCode}`);

      if (result.errorCode === 'AUTH_ERROR') {
        console.log(colors.yellow, '\n💡 Authentication Error - Check your API key:', colors.reset);
        console.log('   1. Verify API key in .env is correct');
        console.log('   2. Check subscription is active in DVLA Developer Portal');
        console.log('   3. Generate new API key if needed\n');
      } else if (result.errorCode === 'VEHICLE_NOT_FOUND') {
        console.log(colors.yellow, '\n💡 Vehicle Not Found - This is normal for:', colors.reset);
        console.log('   - Invalid or non-existent registrations');
        console.log('   - Test registrations (AB12ABC is a dummy)');
        console.log('   Try with a real UK registration you have permission to look up\n');
      }
    }

  } catch (error) {
    console.log(colors.red, '\n❌ Unexpected Error:', colors.reset);
    console.log(error.message);
    console.log('\nStack trace:');
    console.log(error.stack);
  }

  console.log(colors.cyan, '\n🎯 Test Complete!\n', colors.reset);
}

// Run the test
testDVLAService().catch(error => {
  console.error(colors.red, '\n❌ Fatal Error:', error.message, colors.reset);
  process.exit(1);
});
