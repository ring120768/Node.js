#!/usr/bin/env node
/**
 * Check if the incident report form is actually complete
 * by inspecting what fields were saved
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

async function checkFormCompletion() {
  const userId = 'nkwxh49sm2swwlzxtx1bnkwxhroukfn7';

  console.log(colors.cyan, '\n📋 CHECKING FORM COMPLETION STATUS\n');
  console.log(colors.reset, 'User ID:', userId, '\n');

  // Get incident report
  const { data: incident, error } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (error) {
    console.log(colors.red, '❌ Error:', error.message);
    return;
  }

  console.log(colors.cyan, '📊 DATA RECEIVED FROM TYPEFORM:');
  console.log(colors.reset, '-----------------------------------\n');

  // According to TYPEFORM_SUPABASE_FIELD_MAPPING.md, the incident report has 131+ fields
  // Only 9 text fields are populated according to our investigation

  const criticalSections = {
    'Medical Information (6 text fields expected)': [
      'medical_how_are_you_feeling',
      'medical_attention',
      'medical_attention_from_who',
      'further_medical_attention',
      'are_you_safe',
      'six_point_safety_check'
    ],
    'Accident Details (3 fields expected)': [
      'when_did_the_accident_happen',
      'what_time_did_the_accident_happen',
      'where_exactly_did_this_happen'
    ],
    'Weather (1 text + 11 boolean expected)': [
      'weather_conditions'
    ],
    'Vehicle Info (4 fields expected)': [
      'wearing_seatbelts',
      'reason_no_seatbelts',
      'airbags_deployed',
      'damage_to_your_vehicle'
    ],
    'Road Info (3 fields expected)': [
      'road_type',
      'speed_limit',
      'junction_information'
    ],
    'Detailed Account (CRITICAL - 1 long text field)': [
      'detailed_account_of_what_happened'
    ],
    'Your Vehicle (7 fields expected)': [
      'make_of_car',
      'model_of_car',
      'license_plate_number',
      'direction_and_speed',
      'impact',
      'damage_caused_by_accident',
      'any_damage_prior'
    ],
    'Other Driver (12 fields expected)': [
      'other_drivers_name',
      'other_drivers_number',
      'other_drivers_address',
      'other_make_of_vehicle',
      'other_model_of_vehicle',
      'vehicle_license_plate',
      'other_policy_number',
      'other_insurance_company',
      'other_policy_cover',
      'other_policy_holder',
      'other_damage_accident',
      'other_damage_prior'
    ],
    'Police Info (7 fields expected)': [
      'did_police_attend',
      'accident_reference_number',
      'police_officer_badge_number',
      'police_officers_name',
      'police_force_details',
      'breath_test',
      'other_breath_test'
    ],
    'Witnesses (2 fields expected)': [
      'any_witness',
      'witness_contact_information'
    ],
    'Additional (3 fields expected)': [
      'anything_else',
      'call_recovery',
      'upgrade_to_premium'
    ]
  };

  let totalExpected = 0;
  let totalReceived = 0;
  let allSectionsEmpty = true;

  for (const [sectionName, fields] of Object.entries(criticalSections)) {
    console.log(colors.blue, sectionName);
    totalExpected += fields.length;

    let sectionReceived = 0;
    fields.forEach(field => {
      const value = incident[field];
      const hasValue = value !== null && value !== '';

      if (hasValue) {
        sectionReceived++;
        totalReceived++;
        allSectionsEmpty = false;
        const display = typeof value === 'string'
          ? (value.length > 60 ? value.substring(0, 60) + '...' : value)
          : value;
        console.log(colors.green, `  ✅ ${field}: ${display}`);
      } else {
        console.log(colors.red, `  ❌ ${field}: EMPTY`);
      }
    });

    if (sectionReceived === 0) {
      console.log(colors.red, `  ⚠️  Section completely empty (0/${fields.length} fields)\n`);
    } else {
      console.log(colors.yellow, `  Section: ${sectionReceived}/${fields.length} fields\n`);
    }
  }

  // Final Analysis
  console.log(colors.cyan, '\n🔍 COMPLETION ANALYSIS:');
  console.log(colors.reset, '======================\n');
  console.log(`Total fields expected: ${totalExpected}`);
  console.log(`Total fields received: ${totalReceived}`);
  console.log(`Completion rate: ${((totalReceived / totalExpected) * 100).toFixed(1)}%\n`);

  // Root Cause Determination
  console.log(colors.cyan, '💡 ROOT CAUSE:');
  console.log(colors.reset, '--------------\n');

  if (totalReceived === 0 || allSectionsEmpty) {
    console.log(colors.red, '❌ CRITICAL: Form appears to be COMPLETELY EMPTY');
    console.log(colors.yellow, '\nPossible causes:');
    console.log('   1. User opened the form but hasn\'t started filling it yet');
    console.log('   2. Typeform sent a webhook for form view (not submission)');
    console.log('   3. Webhook field mapping is completely broken');
    console.log('   4. Form submission failed but webhook fired anyway');

  } else if (totalReceived < 10) {
    console.log(colors.red, '❌ CRITICAL: Form is INCOMPLETE or PARTIALLY FILLED');
    console.log(colors.yellow, '\nPossible causes:');
    console.log('   1. User is still filling out the form (Typeform auto-saves progress)');
    console.log('   2. User abandoned form after first few questions');
    console.log('   3. Webhook fired on partial save, not final submission');
    console.log('   4. Conditional logic in Typeform is hiding most questions');

  } else if (totalReceived < totalExpected * 0.5) {
    console.log(colors.yellow, '⚠️  WARNING: Form is only PARTIALLY COMPLETE');
    console.log('\nPossible causes:');
    console.log('   1. User skipped many optional questions');
    console.log('   2. Some sections don\'t apply to this incident');
    console.log('   3. Conditional logic is working as designed');

  } else {
    console.log(colors.green, '✅ Form appears reasonably complete');
    console.log('\nNote: Some empty fields are expected if questions were optional or conditional.');
  }

  // Check if this was a partial save webhook
  console.log(colors.cyan, '\n📅 SUBMISSION INFO:');
  console.log(colors.reset, '-----------------');
  console.log('Submission date:', incident.date || 'Unknown');
  console.log('Form ID:', incident.form_id || 'Unknown');
  console.log('Created at:', incident.created_at || 'Unknown');

  // Recommendation
  console.log(colors.cyan, '\n📋 RECOMMENDATION:');
  console.log(colors.reset, '-----------------\n');

  if (totalReceived < 10) {
    console.log(colors.yellow, 'This form is NOT ready for PDF generation.');
    console.log('Action needed: Contact user to complete the incident report.');
    console.log('\nUser should:');
    console.log('  1. Return to the Typeform link');
    console.log('  2. Complete all required fields');
    console.log('  3. Submit the final form');
  } else {
    console.log(colors.green, 'Form has sufficient data for PDF generation.');
    console.log('Empty fields will show as blank in the PDF (expected behavior).');
  }

  console.log(colors.reset, '\n');
}

checkFormCompletion().catch(console.error);
