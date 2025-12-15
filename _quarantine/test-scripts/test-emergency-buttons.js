#!/usr/bin/env node
/**
 * Test Emergency Contact Buttons Flow
 * Tests the complete flow: storage → API → phone number
 */

const fetch = require('node-fetch');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m'
};

async function testEmergencyButtons() {
    console.log(colors.cyan, '\n🧪 Testing Emergency Contact Buttons Flow\n');

    // Test user from CSV
    const testUserId = 'eac531b7-3d03-4c75-9cf8-46ba065f4cb7';
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';

    console.log(`Using userId: ${testUserId}`);
    console.log(`Base URL: ${baseUrl}\n`);

    try {
        // Test 1: Check API endpoint
        console.log('1️⃣ Testing API endpoint: /api/emergency/contacts/' + testUserId);
        const response = await fetch(`${baseUrl}/api/emergency/contacts/${testUserId}`);

        if (!response.ok) {
            console.log(colors.red, `❌ API returned status ${response.status}`);
            const text = await response.text();
            console.log('Response:', text);
            return;
        }

        const contacts = await response.json();
        console.log(colors.green, '✅ API responded successfully');
        console.log('Response:', JSON.stringify(contacts, null, 2));

        // Test 2: Verify phone numbers
        console.log('\n2️⃣ Checking phone numbers in response:');

        if (contacts.emergency_contact) {
            console.log(colors.green, `✅ Emergency Contact: ${contacts.emergency_contact}`);
        } else {
            console.log(colors.red, '❌ Emergency Contact: missing or null');
        }

        if (contacts.recovery_breakdown_number) {
            console.log(colors.green, `✅ Recovery Number: ${contacts.recovery_breakdown_number}`);
        } else {
            console.log(colors.red, '❌ Recovery Number: missing or null');
        }

        if (contacts.emergency_services_number) {
            console.log(colors.green, `✅ Emergency Services: ${contacts.emergency_services_number}`);
        } else {
            console.log(colors.yellow, '⚠️  Emergency Services: using default (999)');
        }

        // Test 3: Simulate button clicks
        console.log('\n3️⃣ Simulating button clicks:');

        console.log('\n📞 Call 999 Button:');
        console.log(`   Would dial: tel:999`);
        console.log(colors.green, '   ✅ Always works (no API needed)');

        console.log('\n🚗 Call Recovery Button:');
        if (contacts.recovery_breakdown_number) {
            console.log(`   Would dial: tel:${contacts.recovery_breakdown_number}`);
            console.log(colors.green, '   ✅ Should work');
        } else {
            console.log(colors.red, '   ❌ Would show alert: "Recovery service number not found"');
        }

        console.log('\n👤 Call Emergency Contact Button:');
        if (contacts.emergency_contact) {
            console.log(`   Would dial: tel:${contacts.emergency_contact}`);
            console.log(colors.green, '   ✅ Should work');
        } else {
            console.log(colors.red, '   ❌ Would show alert: "Emergency contact number not found"');
        }

        // Test 4: Check Supabase data directly
        console.log('\n4️⃣ Checking Supabase data:');
        console.log(colors.cyan, '\nRun this query in Supabase SQL editor to verify data:');
        console.log(`
SELECT
    id,
    name,
    surname,
    mobile,
    emergency_contact,
    recovery_breakdown_number,
    create_user_id
FROM user_signup
WHERE create_user_id = '${testUserId}'
OR id::text = '${testUserId}';
        `);

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY:');

        const hasEmergency = !!contacts.emergency_contact;
        const hasRecovery = !!contacts.recovery_breakdown_number;

        if (hasEmergency && hasRecovery) {
            console.log(colors.green, '✅ ALL BUTTONS SHOULD WORK');
        } else if (hasEmergency || hasRecovery) {
            console.log(colors.yellow, '⚠️  SOME BUTTONS WILL WORK');
            if (!hasEmergency) console.log(colors.red, '   ❌ Emergency contact button will fail');
            if (!hasRecovery) console.log(colors.red, '   ❌ Recovery button will fail');
        } else {
            console.log(colors.red, '❌ BUTTONS WILL NOT WORK - NO PHONE NUMBERS IN DATABASE');
        }

        console.log('\n💡 To fix missing phone numbers:');
        console.log('   1. Go through signup flow again');
        console.log('   2. Or update Supabase manually');
        console.log('   3. Or check if Typeform webhook is processing correctly');

    } catch (error) {
        console.log(colors.red, `❌ Error: ${error.message}`);
        console.log('\nStack trace:', error.stack);
    }

    console.log(colors.reset);
}

testEmergencyButtons().catch(console.error);
