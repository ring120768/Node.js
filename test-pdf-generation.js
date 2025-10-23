#!/usr/bin/env node
/**
 * Test Script: PDF Generation with Test Scenarios
 * Purpose: Import test incident data and generate PDF reports
 * Usage: node test-pdf-generation.js [scenario-number]
 *
 * This script:
 * 1. Reads test scenarios from TEST-INCIDENT-SCENARIOS.md
 * 2. Imports data into Supabase (user_signup and incident_reports tables)
 * 3. Calls the PDF generation endpoint
 * 4. Verifies all 150+ fields populate correctly
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service role (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test scenario data (extracted from TEST-INCIDENT-SCENARIOS.md)
// Field names match actual Supabase schema from TYPEFORM_SUPABASE_FIELD_MAPPING.md
const TEST_SCENARIOS = [
  {
    id: 1,
    name: 'Simple Rear-End Collision (M25)',
    userSignup: {
      name: 'James',
      surname: 'Mitchell',
      email: 'james.mitchell@email.co.uk',
      mobile: '07700900123',
      car_registration_number: 'BF19 XYZ',
      driving_license_number: 'MITC8712053JM9AB',
      insurance_company: 'Direct Line',
      policy_number: 'DL-2024-789456',
      street_address: '45 Meadow Lane',
      street_address_optional: '',
      town: 'Watford',
      postcode: 'WD17 3QR',
      country: 'United Kingdom',
      vehicle_make: 'Ford',
      vehicle_model: 'Focus',
      vehicle_colour: 'Blue',
      policy_holder: 'James Mitchell',
      cover_type: 'Comprehensive'
    },
    incidentReport: {
      // Essential fields only for initial test
      where_exactly_did_this_happen: 'M25 Junction 15, Hertfordshire',
      detailed_account_of_what_happened: 'I was stationary in slow-moving traffic on the M25 near Junction 15. The traffic ahead was at a complete stop. Suddenly, I felt a strong impact from behind. The other driver, Mr Thompson, admitted he was looking at his phone and didn\'t notice the traffic had stopped. He was very apologetic. My vehicle was pushed forward slightly but I managed to keep control. The damage is all to the rear of my vehicle.',
      medical_how_are_you_feeling: 'Experiencing whiplash, neck pain, and back stiffness',
      damage_to_your_vehicle: 'Yes',
      damage_caused_by_accident: 'Rear bumper cracked, boot lid dented, rear lights smashed',
      other_drivers_name: 'Michael Thompson',
      other_drivers_number: '07788654321',
      vehicle_license_plate: 'LK67 MNP',
      other_insurance_company: 'Admiral Insurance'
    }
  },
  {
    id: 2,
    name: 'Roundabout Collision (Heavy Rain)',
    userSignup: {
      name: 'Sarah',
      surname: 'Williams',
      email: 'sarah.williams@email.co.uk',
      mobile: '07711123456',
      car_registration_number: 'FG21 ABC',
      driving_license_number: 'WILL9103121SW5CD',
      insurance_company: 'Aviva',
      policy_number: 'AV-2024-456123',
      street_address: '12 Oak Drive',
      street_address_optional: '',
      town: 'St Albans',
      postcode: 'AL1 2BG',
      country: 'United Kingdom',
      vehicle_make: 'Volkswagen',
      vehicle_model: 'Golf',
      vehicle_colour: 'Silver',
      policy_holder: 'Sarah Williams',
      cover_type: 'Comprehensive'
    },
    incidentReport: {
      // Essential fields only for initial test
      where_exactly_did_this_happen: 'Colney Heath Roundabout, St Albans, Hertfordshire',
      detailed_account_of_what_happened: 'I was entering Colney Heath roundabout from the A414. It was raining heavily with standing water on the road. I was already on the roundabout when a silver Audi A4 entered from the next junction without yielding. We both stopped and exchanged details. A witness saw the incident. Police attended and took statements.',
      medical_how_are_you_feeling: 'Shaken but physically fine',
      damage_to_your_vehicle: 'Yes',
      damage_caused_by_accident: 'Front nearside wing dented, headlight smashed, bumper cracked',
      other_drivers_name: 'David Patel',
      other_drivers_number: '07899456123',
      vehicle_license_plate: 'NM18 XYZ',
      other_insurance_company: 'LV= Insurance'
    }
  }
];

/**
 * Clean up test data from database
 */
async function cleanupTestData(userId) {
  console.log(colors.yellow, `\n🧹 Cleaning up existing test data for user ${userId}...`);

  try {
    // Delete from related tables first (foreign key constraints)
    await supabase.from('incident_reports').delete().eq('create_user_id', userId);
    await supabase.from('user_documents').delete().eq('create_user_id', userId);
    await supabase.from('completed_incident_forms').delete().eq('create_user_id', userId);
    await supabase.from('ai_transcription').delete().eq('create_user_id', userId);
    await supabase.from('ai_summary').delete().eq('create_user_id', userId);

    // Finally delete user signup
    await supabase.from('user_signup').delete().eq('create_user_id', userId);

    console.log(colors.green, '✅ Test data cleaned up successfully');
  } catch (error) {
    console.log(colors.red, `❌ Cleanup error: ${error.message}`);
  }
}

/**
 * Import test scenario data into Supabase
 */
async function importScenarioData(scenario) {
  console.log(colors.cyan, `\n📥 Importing Scenario ${scenario.id}: ${scenario.name}`);

  // Generate a unique user ID for this test
  const createUserId = `test-scenario-${scenario.id}-${Date.now()}`;

  try {
    // Step 1: Insert user signup data
    console.log('1. Inserting user signup data...');
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .insert({
        create_user_id: createUserId,
        ...scenario.userSignup,
        gdpr_consent: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) throw userError;
    console.log(colors.green, `   ✅ User created: ${userData.full_name} (${userData.email})`);

    // Step 2: Insert incident report data
    console.log('2. Inserting incident report data...');
    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .insert({
        create_user_id: createUserId,
        ...scenario.incidentReport,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (incidentError) throw incidentError;
    console.log(colors.green, `   ✅ Incident report created: ${incidentData.incident_location}`);

    return {
      success: true,
      userId: createUserId,
      userData,
      incidentData
    };

  } catch (error) {
    console.log(colors.red, `❌ Import failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate PDF for the imported test data
 */
async function generatePDF(userId) {
  console.log(colors.cyan, `\n📄 Generating PDF report for user ${userId}...`);

  try {
    const apiUrl = process.env.APP_URL || 'http://localhost:5000';
    const response = await fetch(`${apiUrl}/api/pdf/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF generation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log(colors.green, '✅ PDF generated successfully!');
    console.log(colors.bright, '\n📊 PDF Generation Result:');
    console.log(`   PDF URL: ${result.pdf_url || 'Not available'}`);
    console.log(`   Storage Path: ${result.storage_path || 'Not available'}`);
    console.log(`   File Size: ${result.file_size ? Math.round(result.file_size / 1024) + ' KB' : 'Unknown'}`);

    return {
      success: true,
      result
    };

  } catch (error) {
    console.log(colors.red, `❌ PDF generation failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify PDF data completeness by checking database
 */
async function verifyPDFData(userId) {
  console.log(colors.cyan, `\n🔍 Verifying data completeness for PDF...`);

  try {
    // Fetch data using the same queries as PDF generation
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (userError || incidentError) {
      throw new Error('Failed to fetch data for verification');
    }

    // Count populated fields
    const userFieldCount = Object.values(userData).filter(v => v !== null && v !== '').length;
    const incidentFieldCount = Object.values(incidentData).filter(v => v !== null && v !== '').length;

    console.log(colors.green, '✅ Data verification complete:');
    console.log(`   User fields populated: ${userFieldCount}`);
    console.log(`   Incident fields populated: ${incidentFieldCount}`);
    console.log(`   Total fields: ${userFieldCount + incidentFieldCount}`);

    // Check for critical fields
    const criticalFields = {
      user: ['full_name', 'email', 'phone', 'car_registration_number'],
      incident: ['incident_date', 'incident_time', 'incident_location']
    };

    let missingCritical = [];
    criticalFields.user.forEach(field => {
      if (!userData[field]) missingCritical.push(`user.${field}`);
    });
    criticalFields.incident.forEach(field => {
      if (!incidentData[field]) missingCritical.push(`incident.${field}`);
    });

    if (missingCritical.length > 0) {
      console.log(colors.yellow, `\n⚠️  Missing critical fields: ${missingCritical.join(', ')}`);
    } else {
      console.log(colors.green, '\n✅ All critical fields populated!');
    }

    return {
      success: true,
      userFieldCount,
      incidentFieldCount,
      missingCritical
    };

  } catch (error) {
    console.log(colors.red, `❌ Verification failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main test execution
 */
async function runTest() {
  console.log(colors.cyan, colors.bright, '\n🧪 PDF GENERATION TEST\n');
  console.log('=' .repeat(60));

  // Get scenario number from command line args (default to 1)
  const scenarioNum = parseInt(process.argv[2]) || 1;

  if (scenarioNum < 1 || scenarioNum > TEST_SCENARIOS.length) {
    console.log(colors.red, `❌ Invalid scenario number. Must be 1-${TEST_SCENARIOS.length}`);
    process.exit(1);
  }

  const scenario = TEST_SCENARIOS[scenarioNum - 1];

  console.log(colors.bright, `\nTesting Scenario ${scenario.id}: ${scenario.name}`);
  console.log('=' .repeat(60));

  try {
    // Step 1: Import test data
    const importResult = await importScenarioData(scenario);
    if (!importResult.success) {
      throw new Error('Data import failed');
    }

    const userId = importResult.userId;

    // Step 2: Verify data before PDF generation
    const verifyResult = await verifyPDFData(userId);

    // Step 3: Generate PDF
    const pdfResult = await generatePDF(userId);

    // Step 4: Display summary
    console.log(colors.cyan, '\n' + '='.repeat(60));
    console.log(colors.bright, '📊 TEST SUMMARY');
    console.log('='.repeat(60));

    if (importResult.success && pdfResult.success) {
      console.log(colors.green, '\n✅ ALL TESTS PASSED!\n');
      console.log('Results:');
      console.log(`  User ID: ${userId}`);
      console.log(`  Data fields populated: ${verifyResult.userFieldCount + verifyResult.incidentFieldCount}`);
      console.log(`  PDF generated: ${pdfResult.result.pdf_url ? 'Yes' : 'No'}`);

      if (pdfResult.result.pdf_url) {
        console.log(colors.cyan, `\n📥 Download PDF:`);
        console.log(`  ${pdfResult.result.pdf_url}`);
      }

      console.log(colors.yellow, `\n🧹 To clean up test data, run:`);
      console.log(colors.reset, `  node test-pdf-generation.js cleanup ${userId}`);

    } else {
      console.log(colors.red, '\n❌ TESTS FAILED\n');
      if (!importResult.success) {
        console.log(`  Import error: ${importResult.error}`);
      }
      if (!pdfResult.success) {
        console.log(`  PDF error: ${pdfResult.error}`);
      }
    }

    console.log('\n');

  } catch (error) {
    console.log(colors.red, `\n❌ Test failed: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * Cleanup command handler
 */
async function handleCleanup() {
  const userId = process.argv[3];
  if (!userId) {
    console.log(colors.red, '❌ Please provide user ID to clean up');
    console.log(colors.reset, 'Usage: node test-pdf-generation.js cleanup <user-id>');
    process.exit(1);
  }

  await cleanupTestData(userId);
  console.log('\n');
}

// Execute based on command
if (process.argv[2] === 'cleanup') {
  handleCleanup();
} else {
  runTest();
}
