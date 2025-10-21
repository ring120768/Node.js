#!/usr/bin/env node

/**
 * Test Script for Incident Page Emergency Buttons
 * Verifies the API connection and data mapping
 */

const fetch = require('node-fetch');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testIncidentButtons() {
  log(colors.cyan, '\n📞 Testing Emergency Call Buttons Connection\n');
  log(colors.cyan, '========================================\n');

  const userId = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c';
  const apiUrl = `http://localhost:5001/api/emergency/contacts/${userId}`;

  try {
    // Test the API endpoint
    log(colors.cyan, '1. Testing API Endpoint...');
    log(colors.yellow, `   URL: ${apiUrl}`);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      log(colors.red, `   ❌ API returned error: ${response.status}`);
      return;
    }

    const data = await response.json();
    log(colors.green, '   ✅ API responded successfully\n');

    // Check data structure
    log(colors.cyan, '2. Checking Data Fields...');

    const fields = [
      { key: 'emergency_contact', label: 'Emergency Contact', required: true },
      { key: 'recovery_breakdown_number', label: 'Recovery/Breakdown', required: false },
      { key: 'emergency_services_number', label: 'Emergency Services (999)', required: true }
    ];

    for (const field of fields) {
      if (data[field.key]) {
        log(colors.green, `   ✅ ${field.label}: ${data[field.key]}`);
      } else if (field.required) {
        log(colors.red, `   ❌ ${field.label}: MISSING (Required)`);
      } else {
        log(colors.yellow, `   ⚠️  ${field.label}: Not set (Optional)`);
      }
    }

    // Test phone number formats
    log(colors.cyan, '\n3. Validating Phone Number Formats...');

    if (data.emergency_contact) {
      const isValidFormat = /^[+0-9][\d\s\-()]+$/.test(data.emergency_contact);
      if (isValidFormat) {
        log(colors.green, `   ✅ Emergency contact format valid: ${data.emergency_contact}`);
        log(colors.green, `      Can be used with: tel:${data.emergency_contact}`);
      } else {
        log(colors.red, `   ❌ Invalid format: ${data.emergency_contact}`);
      }
    }

    if (data.recovery_breakdown_number) {
      const isValidFormat = /^[+0-9][\d\s\-()]+$/.test(data.recovery_breakdown_number);
      if (isValidFormat) {
        log(colors.green, `   ✅ Recovery number format valid: ${data.recovery_breakdown_number}`);
        log(colors.green, `      Can be used with: tel:${data.recovery_breakdown_number}`);
      } else {
        log(colors.red, `   ❌ Invalid format: ${data.recovery_breakdown_number}`);
      }
    }

    // Summary
    log(colors.cyan, '\n========================================');
    log(colors.cyan, '              SUMMARY');
    log(colors.cyan, '========================================\n');

    const hasEmergencyContact = !!data.emergency_contact;
    const hasRecoveryNumber = !!data.recovery_breakdown_number;
    const hasEmergencyServices = !!data.emergency_services_number;

    if (hasEmergencyContact && hasEmergencyServices) {
      log(colors.green, '✅ Call buttons are properly connected!');
      log(colors.green, '   - Emergency Contact button will work');
      if (hasRecoveryNumber) {
        log(colors.green, '   - Recovery Service button will work');
      } else {
        log(colors.yellow, '   - Recovery Service button will show "Not configured"');
      }
      log(colors.green, '   - 999 Emergency button will work\n');

      log(colors.cyan, '📱 Test the buttons at:');
      log(colors.cyan, '   http://localhost:5001/incident.html');

    } else {
      log(colors.red, '❌ Some buttons may not work properly');
      if (!hasEmergencyContact) {
        log(colors.red, '   - Emergency Contact is missing');
      }
      if (!hasEmergencyServices) {
        log(colors.red, '   - Emergency Services number is missing');
      }
      log(colors.yellow, '\n⚠️  Please check the database fields');
    }

    // Show exact button behavior
    log(colors.cyan, '\n📋 Button Behavior:');
    log(colors.cyan, '-------------------');

    log(colors.cyan, '\n1. 999 Emergency Button:');
    log(colors.green, `   Will call: ${data.emergency_services_number || '999'}`);
    log(colors.green, '   Status: Always works (hardcoded fallback)');

    log(colors.cyan, '\n2. Recovery Service Button:');
    if (data.recovery_breakdown_number) {
      log(colors.green, `   Will call: ${data.recovery_breakdown_number}`);
      log(colors.green, '   Status: Working');
    } else {
      log(colors.yellow, '   Will show: "No recovery service number available"');
      log(colors.yellow, '   Status: Alert message (no call)');
    }

    log(colors.cyan, '\n3. Emergency Contact Button:');
    if (data.emergency_contact) {
      log(colors.green, `   Will call: ${data.emergency_contact}`);
      log(colors.green, '   Status: Working');
    } else {
      log(colors.yellow, '   Will show: "No emergency contact available"');
      log(colors.yellow, '   Status: Alert message (no call)');
    }

  } catch (error) {
    log(colors.red, `\n❌ Test failed: ${error.message}`);
    log(colors.yellow, '\nMake sure the server is running on port 5001:');
    log(colors.yellow, '  PORT=5001 npm run dev');
  }
}

// Run the test
testIncidentButtons().catch(console.error);