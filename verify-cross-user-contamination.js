#!/usr/bin/env node

/**
 * Verify Cross-User Data Contamination Bug
 *
 * Checks if Sarah's user_signup record contains Ian's emergency contact/insurance data
 * due to localStorage draft reuse bug (fixed in signup-form.html)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// User IDs from the incident
const SARAH_EMAIL = 'sarahlgilbert70@gmail.com';  // Note: sarahLgilbert (with L)
const IAN_EMAIL = 'ian.ring@sky.com';

async function verifyContamination() {
  console.log('🔍 Verifying Cross-User Data Contamination Bug');
  console.log('================================================\n');

  try {
    // Step 1: Fetch Ian's data
    console.log('Step 1: Fetching Ian\'s user_signup data...');
    const { data: ianData, error: ianError } = await supabase
      .from('user_signup')
      .select(`
        create_user_id,
        email,
        emergency_contact,
        emergency_email,
        emergency_company,
        policy_holder,
        insurance_company,
        street_address,
        postcode
      `)
      .eq('email', IAN_EMAIL)
      .single();

    if (ianError) {
      console.error('❌ Error fetching Ian\'s data:', ianError.message);
      process.exit(1);
    }

    console.log(`✅ Ian's record found (${ianData.create_user_id})`);
    console.log('   Emergency Contact:', ianData.emergency_contact || 'NULL');
    console.log('   Policy Holder:', ianData.policy_holder || 'NULL');
    console.log('   Insurance Company:', ianData.insurance_company || 'NULL');
    console.log('');

    // Step 2: Fetch Sarah's data (most recent record if multiple exist)
    console.log('Step 2: Fetching Sarah\'s user_signup data...');
    const { data: sarahRecords, error: sarahError } = await supabase
      .from('user_signup')
      .select(`
        create_user_id,
        email,
        emergency_contact,
        emergency_email,
        emergency_company,
        policy_holder,
        insurance_company,
        street_address,
        postcode,
        created_at
      `)
      .eq('email', SARAH_EMAIL)
      .order('created_at', { ascending: false });

    if (sarahError) {
      console.error('❌ Error fetching Sarah\'s data:', sarahError.message);
      process.exit(1);
    }

    if (!sarahRecords || sarahRecords.length === 0) {
      console.error('❌ No records found for Sarah');
      process.exit(1);
    }

    console.log(`📋 Found ${sarahRecords.length} record(s) for Sarah (analyzing most recent)`);
    const sarahData = sarahRecords[0]; // Most recent record

    console.log(`✅ Sarah's most recent record found (${sarahData.create_user_id})`);
    console.log(`   Created: ${new Date(sarahData.created_at).toLocaleString('en-GB')}`);
    console.log('   Emergency Contact:', sarahData.emergency_contact || 'NULL');
    console.log('   Policy Holder:', sarahData.policy_holder || 'NULL');
    console.log('   Insurance Company:', sarahData.insurance_company || 'NULL');
    console.log('');

    // Step 3: Compare for contamination
    console.log('Step 3: Checking for cross-contamination...\n');

    const contaminations = [];

    // Check emergency contact fields
    if (sarahData.emergency_contact &&
        sarahData.emergency_contact === ianData.emergency_contact) {
      contaminations.push({
        field: 'emergency_contact',
        sarahValue: sarahData.emergency_contact,
        ianValue: ianData.emergency_contact
      });
    }

    if (sarahData.emergency_email &&
        sarahData.emergency_email === ianData.emergency_email) {
      contaminations.push({
        field: 'emergency_email',
        sarahValue: sarahData.emergency_email,
        ianValue: ianData.emergency_email
      });
    }

    if (sarahData.emergency_company &&
        sarahData.emergency_company === ianData.emergency_company) {
      contaminations.push({
        field: 'emergency_company',
        sarahValue: sarahData.emergency_company,
        ianValue: ianData.emergency_company
      });
    }

    // Check policy holder fields
    if (sarahData.policy_holder &&
        sarahData.policy_holder === ianData.policy_holder) {
      contaminations.push({
        field: 'policy_holder',
        sarahValue: sarahData.policy_holder,
        ianValue: ianData.policy_holder
      });
    }

    if (sarahData.street_address &&
        sarahData.street_address === ianData.street_address) {
      contaminations.push({
        field: 'street_address',
        sarahValue: sarahData.street_address,
        ianValue: ianData.street_address
      });
    }

    if (sarahData.postcode &&
        sarahData.postcode === ianData.postcode) {
      contaminations.push({
        field: 'postcode',
        sarahValue: sarahData.postcode,
        ianValue: ianData.postcode
      });
    }

    // Check insurance
    if (sarahData.insurance_company &&
        sarahData.insurance_company === ianData.insurance_company) {
      contaminations.push({
        field: 'insurance_company',
        sarahValue: sarahData.insurance_company,
        ianValue: ianData.insurance_company
      });
    }

    // Report results
    console.log('═══════════════════════════════════════════════════');
    console.log('🎯 Contamination Analysis Results');
    console.log('═══════════════════════════════════════════════════\n');

    if (contaminations.length === 0) {
      console.log('✅ NO CONTAMINATION DETECTED');
      console.log('');
      console.log('Sarah\'s record contains no data matching Ian\'s record.');
      console.log('Either:');
      console.log('  1. The bug never occurred (different browsers/sessions)');
      console.log('  2. Sarah\'s record was already cleaned up');
      console.log('  3. The localStorage draft fix prevented the issue');
    } else {
      console.log(`❌ CONTAMINATION DETECTED: ${contaminations.length} field(s)\n`);

      contaminations.forEach(c => {
        console.log(`⚠️  Field: ${c.field}`);
        console.log(`   Sarah's value: "${c.sarahValue}"`);
        console.log(`   Ian's value:   "${c.ianValue}"`);
        console.log(`   Status: ❌ MATCH (should be different!)`);
        console.log('');
      });

      console.log('📋 Contaminated Fields Summary:');
      contaminations.forEach(c => console.log(`   - ${c.field}`));
      console.log('');

      console.log('🔧 Recommended Action:');
      console.log('   1. Manually update Sarah\'s record to remove Ian\'s data');
      console.log('   2. Contact Sarah to re-enter correct emergency contact/insurance');
      console.log('   3. Consider GDPR data breach notification requirements');
    }

    console.log('\n═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

verifyContamination();
