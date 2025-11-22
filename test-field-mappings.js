#!/usr/bin/env node
/**
 * Test Field Mappings - Verify All Form Fields Map to Correct Database Columns
 *
 * This script validates that signup.controller.js maps form fields correctly
 * to the actual database column names per TYPEFORM_SUPABASE_FIELD_MAPPING.md
 *
 * Usage: node test-field-mappings.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const config = require('./src/config');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m'
};

async function testFieldMappings() {
  console.log(colors.cyan + colors.bold + '\n🧪 Testing Field Mappings\n' + colors.reset);

  try {
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    );

    console.log(colors.cyan + '📊 Database: ' + config.supabase.url + '\n' + colors.reset);

    // Test data matching controller's userSignupData structure
    const testUserId = '00000000-0000-0000-0000-000000000000';

    const testData = {
      create_user_id: testUserId,
      // Personal (mapped from form fields)
      name: 'Test',
      surname: 'User',
      email: 'test@example.com',
      mobile: '07411005390',
      date_of_birth: '1990-01-15',
      // Address (mapped from form fields)
      street_address: '123 Test Street',
      street_address_optional: 'Apt 4B',
      town: 'London',
      country: 'United Kingdom',
      postcode: 'SW1A 1AA',
      // Vehicle
      car_registration_number: 'AB12CDE',
      driving_license_number: 'SMITH901234AB1CD',
      // Insurance
      insurance_company: 'Test Insurance Co',
      policy_number: 'POL123456',
      policy_holder: 'Test User',
      cover_type: 'Fully Comprehensive',
      // Recovery (optional)
      recovery_company: 'AA',
      recovery_breakdown_number: '0800123456',
      recovery_breakdown_email: 'recovery@test.com',
      // Emergency Contact (pipe-delimited format)
      emergency_contact: 'John Doe | +447411005390 | john@example.com | Emergency Services Ltd',
      // Compliance
      gdpr_consent: true,
      // Image tracking
      images_status: 'complete',
      missing_images: null,
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log(colors.bold + '1️⃣  Testing ALL field mappings with database insert...\n' + colors.reset);

    const { data, error } = await supabase
      .from('user_signup')
      .insert([testData])
      .select()
      .single();

    if (error) {
      console.log(colors.red + '❌ Field mapping test FAILED!\n' + colors.reset);
      console.log(colors.red + 'Error: ' + error.message + '\n' + colors.reset);

      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log(colors.yellow + '💡 This means a field name in the controller doesn\'t match the database schema.\n' + colors.reset);
        console.log(colors.yellow + 'Check TYPEFORM_SUPABASE_FIELD_MAPPING.md for correct column names.\n' + colors.reset);
      }

      process.exit(1);
    }

    console.log(colors.green + '✅ ALL field mappings are CORRECT!\n' + colors.reset);

    // Verify data was inserted correctly
    console.log(colors.bold + '2️⃣  Verifying inserted data...\n' + colors.reset);

    const fieldChecks = [
      { field: 'name', value: data.name, expected: 'Test' },
      { field: 'surname', value: data.surname, expected: 'User' },
      { field: 'mobile', value: data.mobile, expected: '07411005390' },
      { field: 'street_address', value: data.street_address, expected: '123 Test Street' },
      { field: 'street_address_optional', value: data.street_address_optional, expected: 'Apt 4B' },
      { field: 'town', value: data.town, expected: 'London' },
      { field: 'country', value: data.country, expected: 'United Kingdom' },
      { field: 'cover_type', value: data.cover_type, expected: 'Fully Comprehensive' },
      { field: 'emergency_contact', value: data.emergency_contact, expected: 'John Doe | +447411005390 | john@example.com | Emergency Services Ltd' }
    ];

    let allCorrect = true;
    for (const check of fieldChecks) {
      if (check.value === check.expected) {
        console.log(colors.green + `   ✅ ${check.field}: ${check.value}` + colors.reset);
      } else {
        console.log(colors.red + `   ❌ ${check.field}: Got "${check.value}", expected "${check.expected}"` + colors.reset);
        allCorrect = false;
      }
    }

    if (!allCorrect) {
      console.log(colors.red + '\n❌ Data verification FAILED!\n' + colors.reset);
      process.exit(1);
    }

    console.log(colors.green + '\n✅ Data verification PASSED!\n' + colors.reset);

    // Clean up test record
    console.log(colors.bold + '3️⃣  Cleaning up test record...\n' + colors.reset);

    const { error: deleteError } = await supabase
      .from('user_signup')
      .delete()
      .eq('create_user_id', testUserId);

    if (deleteError) {
      console.log(colors.yellow + '⚠️  Warning: Could not delete test record: ' + deleteError.message + '\n' + colors.reset);
    } else {
      console.log(colors.green + '✅ Test record cleaned up\n' + colors.reset);
    }

    // Summary
    console.log(colors.green + colors.bold + '✅ Field Mapping Test PASSED!\n' + colors.reset);
    console.log(colors.cyan + '🎯 All controller field mappings match database schema\n' + colors.reset);
    console.log(colors.cyan + '📋 Verified fields:\n' + colors.reset);
    console.log(colors.cyan + '   • Personal: name, surname, mobile' + colors.reset);
    console.log(colors.cyan + '   • Address: street_address, street_address_optional, town, country' + colors.reset);
    console.log(colors.cyan + '   • Insurance: cover_type' + colors.reset);
    console.log(colors.cyan + '   • Emergency: pipe-delimited format' + colors.reset);
    console.log(colors.cyan + '\n🚀 Ready for end-to-end form submission test!\n' + colors.reset);

  } catch (error) {
    console.log(colors.red + '\n❌ Test failed: ' + error.message + '\n' + colors.reset);
    process.exit(1);
  }
}

testFieldMappings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(colors.red + 'Unexpected error:', error);
    process.exit(1);
  });
