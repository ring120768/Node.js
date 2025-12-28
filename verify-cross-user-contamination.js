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
const SARAH_EMAIL = 'sarahlgibert70@gmail.com';
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
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        policy_holder_name,
        policy_holder_relationship,
        policy_holder_address_line1,
        policy_holder_postcode,
        insurer_name
      `)
      .eq('email', IAN_EMAIL)
      .single();

    if (ianError) {
      console.error('❌ Error fetching Ian\'s data:', ianError.message);
      process.exit(1);
    }

    console.log(`✅ Ian's record found (${ianData.create_user_id})`);
    console.log('   Emergency Contact:', ianData.emergency_contact_name || 'NULL');
    console.log('   Policy Holder:', ianData.policy_holder_name || 'NULL');
    console.log('   Insurer:', ianData.insurer_name || 'NULL');
    console.log('');

    // Step 2: Fetch Sarah's data
    console.log('Step 2: Fetching Sarah\'s user_signup data...');
    const { data: sarahData, error: sarahError } = await supabase
      .from('user_signup')
      .select(`
        create_user_id,
        email,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        policy_holder_name,
        policy_holder_relationship,
        policy_holder_address_line1,
        policy_holder_postcode,
        insurer_name,
        created_at
      `)
      .eq('email', SARAH_EMAIL)
      .single();

    if (sarahError) {
      console.error('❌ Error fetching Sarah\'s data:', sarahError.message);
      process.exit(1);
    }

    console.log(`✅ Sarah's record found (${sarahData.create_user_id})`);
    console.log(`   Created: ${new Date(sarahData.created_at).toLocaleString('en-GB')}`);
    console.log('   Emergency Contact:', sarahData.emergency_contact_name || 'NULL');
    console.log('   Policy Holder:', sarahData.policy_holder_name || 'NULL');
    console.log('   Insurer:', sarahData.insurer_name || 'NULL');
    console.log('');

    // Step 3: Compare for contamination
    console.log('Step 3: Checking for cross-contamination...\n');

    const contaminations = [];

    // Check emergency contact fields
    if (sarahData.emergency_contact_name &&
        sarahData.emergency_contact_name === ianData.emergency_contact_name) {
      contaminations.push({
        field: 'emergency_contact_name',
        sarahValue: sarahData.emergency_contact_name,
        ianValue: ianData.emergency_contact_name
      });
    }

    if (sarahData.emergency_contact_phone &&
        sarahData.emergency_contact_phone === ianData.emergency_contact_phone) {
      contaminations.push({
        field: 'emergency_contact_phone',
        sarahValue: sarahData.emergency_contact_phone,
        ianValue: ianData.emergency_contact_phone
      });
    }

    // Check policy holder fields
    if (sarahData.policy_holder_name &&
        sarahData.policy_holder_name === ianData.policy_holder_name) {
      contaminations.push({
        field: 'policy_holder_name',
        sarahValue: sarahData.policy_holder_name,
        ianValue: ianData.policy_holder_name
      });
    }

    if (sarahData.policy_holder_address_line1 &&
        sarahData.policy_holder_address_line1 === ianData.policy_holder_address_line1) {
      contaminations.push({
        field: 'policy_holder_address_line1',
        sarahValue: sarahData.policy_holder_address_line1,
        ianValue: ianData.policy_holder_address_line1
      });
    }

    if (sarahData.policy_holder_postcode &&
        sarahData.policy_holder_postcode === ianData.policy_holder_postcode) {
      contaminations.push({
        field: 'policy_holder_postcode',
        sarahValue: sarahData.policy_holder_postcode,
        ianValue: ianData.policy_holder_postcode
      });
    }

    // Check insurer
    if (sarahData.insurer_name &&
        sarahData.insurer_name === ianData.insurer_name) {
      contaminations.push({
        field: 'insurer_name',
        sarahValue: sarahData.insurer_name,
        ianValue: ianData.insurer_name
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
