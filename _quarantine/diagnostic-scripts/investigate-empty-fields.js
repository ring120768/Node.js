#!/usr/bin/env node
/**
 * Investigate why PDF fields are empty despite successful webhook processing
 * User: nkwxh49sm2swwlzxtx1bnkwxhroukfn7
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

async function investigateEmptyFields() {
  const userId = 'nkwxh49sm2swwlzxtx1bnkwxhroukfn7';

  console.log(colors.cyan, '\n🔍 INVESTIGATING EMPTY PDF FIELDS\n');
  console.log(colors.reset, 'User ID:', userId, '\n');

  try {
    // 1. Check user_signup table
    console.log(colors.blue, '1️⃣  Checking user_signup table...');
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    if (userError) {
      console.log(colors.red, '❌ User error:', userError.message);
    } else if (!user) {
      console.log(colors.yellow, '⚠️  No user found');
    } else {
      console.log(colors.green, '✅ User found');
      console.log('   Name:', user.name, user.surname);
      console.log('   Email:', user.email);
      console.log('   Car Reg:', user.car_registration_number);
    }

    // 2. Check incident_reports table
    console.log(colors.blue, '\n2️⃣  Checking incident_reports table...');
    const { data: incident, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', userId)
      .single();

    if (incidentError) {
      console.log(colors.red, '❌ Incident error:', incidentError.message);
      return;
    }

    if (!incident) {
      console.log(colors.yellow, '⚠️  No incident found');
      return;
    }

    console.log(colors.green, '✅ Incident found');

    // Analyze fields
    const fields = Object.entries(incident);
    const systemFields = ['id', 'create_user_id', 'created_at', 'updated_at', 'date', 'form_id'];

    const textFields = fields.filter(([key, val]) =>
      typeof val === 'string' &&
      val !== '' &&
      !systemFields.includes(key) &&
      !key.includes('_at')
    );

    const boolFields = fields.filter(([key, val]) => typeof val === 'boolean');
    const trueFields = boolFields.filter(([k, v]) => v === true);
    const nullFields = fields.filter(([key, val]) =>
      (val === null || val === '') &&
      !systemFields.includes(key)
    );

    console.log(colors.cyan, '\n📊 FIELD ANALYSIS:');
    console.log(colors.reset, '-------------------');
    console.log('Total columns:', fields.length);
    console.log('System fields:', systemFields.length);
    console.log(colors.green, 'Populated text fields:', textFields.length);
    console.log(colors.blue, 'Boolean fields (total):', boolFields.length);
    console.log(colors.blue, 'Boolean fields (TRUE):', trueFields.length);
    console.log(colors.red, 'Null/empty fields:', nullFields.length);

    // Show populated text fields
    if (textFields.length > 0) {
      console.log(colors.cyan, '\n✅ POPULATED TEXT FIELDS:');
      console.log(colors.reset);
      textFields.forEach(([key, val]) => {
        const display = val.length > 60 ? val.substring(0, 60) + '...' : val;
        console.log(`  ${key}: ${display}`);
      });
    }

    // Show TRUE boolean fields
    if (trueFields.length > 0) {
      console.log(colors.cyan, '\n✅ BOOLEAN FIELDS (TRUE):');
      console.log(colors.reset);
      trueFields.forEach(([key]) => {
        console.log(`  ${key}: true`);
      });
    }

    // Show null/empty fields (first 50)
    console.log(colors.cyan, '\n❌ NULL/EMPTY FIELDS (first 50):');
    console.log(colors.reset);
    nullFields.slice(0, 50).forEach(([key]) => {
      console.log(`  ${key}: NULL/EMPTY`);
    });

    if (nullFields.length > 50) {
      console.log(colors.yellow, `\n... and ${nullFields.length - 50} more empty fields`);
    }

    // 3. Compare against expected incident report fields
    console.log(colors.cyan, '\n3️⃣  CRITICAL INCIDENT FIELDS CHECK:');
    console.log(colors.reset);

    const criticalFields = {
      'Medical': ['medical_how_are_you_feeling', 'medical_attention', 'are_you_safe'],
      'Accident Details': ['when_did_the_accident_happen', 'what_time_did_the_accident_happen', 'where_exactly_did_this_happen'],
      'Your Vehicle': ['make_of_car', 'model_of_car', 'license_plate_number', 'direction_and_speed'],
      'Other Driver': ['other_drivers_name', 'other_drivers_number', 'other_make_of_vehicle', 'other_model_of_vehicle'],
      'Account': ['detailed_account_of_what_happened'],
      'Weather': ['weather_conditions'],
      'Police': ['did_police_attend', 'accident_reference_number']
    };

    for (const [category, fieldList] of Object.entries(criticalFields)) {
      console.log(colors.blue, `\n${category}:`);
      fieldList.forEach(field => {
        const value = incident[field];
        if (value && value !== '') {
          console.log(colors.green, `  ✅ ${field}:`,
            typeof value === 'string' ? (value.substring(0, 40) + (value.length > 40 ? '...' : '')) : value
          );
        } else {
          console.log(colors.red, `  ❌ ${field}: EMPTY`);
        }
      });
    }

    // 4. Root cause analysis
    console.log(colors.cyan, '\n\n🔍 ROOT CAUSE ANALYSIS:');
    console.log(colors.reset, '======================\n');

    if (textFields.length < 10) {
      console.log(colors.red, '❌ CRITICAL: Very few text fields populated (' + textFields.length + ')');
      console.log(colors.yellow, '\nPossible causes:');
      console.log('   1. User may still be filling out the form');
      console.log('   2. Webhook received partial/incomplete submission');
      console.log('   3. Field mapping mismatch between webhook and database');
      console.log('   4. Data transformation logic not working');
    } else {
      console.log(colors.green, '✅ Reasonable number of text fields populated');
    }

    if (trueFields.length > 0 && textFields.length < 10) {
      console.log(colors.yellow, '\n⚠️  PATTERN DETECTED: Booleans work, text fields don\'t');
      console.log(colors.yellow, '   This suggests field mapping or data extraction issue');
    }

    // Check form submission status
    if (incident.form_id) {
      console.log(colors.cyan, '\nForm ID:', incident.form_id);
    }
    if (incident.date) {
      console.log(colors.cyan, 'Submission date:', incident.date);
    }

  } catch (error) {
    console.log(colors.red, '\n❌ Error:', error.message);
    console.error(error);
  }

  console.log(colors.reset, '\n');
}

investigateEmptyFields().catch(console.error);
