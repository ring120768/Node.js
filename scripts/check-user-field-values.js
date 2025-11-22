/**
 * Check actual database values for the 4 problematic fields
 * Usage: node scripts/check-user-field-values.js [user-id]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFields() {
  const userId = process.argv[2] || '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

  console.log('\n🔍 Checking field values for user:', userId);
  console.log('═'.repeat(70));

  const { data, error } = await supabase
    .from('incident_reports')
    .select('six_point_safety_check_completed, final_feeling, medical_symptom_change_in_vision, accident_time')
    .eq('create_user_id', userId)
    .single();

  if (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }

  console.log('\n📊 DATABASE VALUES:\n');
  console.log('1. six_point_safety_check_completed:');
  console.log('   Value:', data.six_point_safety_check_completed);
  console.log('   Type:', typeof data.six_point_safety_check_completed);
  console.log('   Will populate PDF:', data.six_point_safety_check_completed ? '✅ YES' : '❌ NO (NULL/false)');

  console.log('\n2. final_feeling (NEW - replaced are_you_safe):');
  console.log('   Value:', data.final_feeling);
  console.log('   Type:', typeof data.final_feeling);
  console.log('   Will populate PDF:', data.final_feeling ? '✅ YES' : '❌ NO (NULL)');

  console.log('\n3. medical_symptom_change_in_vision:');
  console.log('   Value:', data.medical_symptom_change_in_vision);
  console.log('   Type:', typeof data.medical_symptom_change_in_vision);
  console.log('   Will populate PDF:', data.medical_symptom_change_in_vision ? '✅ YES' : '❌ NO (NULL/false)');

  console.log('\n4. accident_time (for weather_dusk calculation):');
  console.log('   Value:', data.accident_time);
  console.log('   Type:', typeof data.accident_time);
  console.log('   Note: weather_dusk commented out (not implemented)');

  console.log('\n═'.repeat(70));
  console.log('\n📄 Generated PDF location:');
  console.log('   /Users/ianring/Node.js/test-output/filled-form-' + userId + '.pdf\n');

  process.exit(0);
}

checkFields();
