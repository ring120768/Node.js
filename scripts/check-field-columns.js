/**
 * Check if specific columns exist in incident_reports table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  console.log('\n🔍 Checking incident_reports table columns...\n');
  console.log('═'.repeat(60));

  try {
    // Get a sample record to see what columns exist
    const { data, error } = await supabase
      .from('incident_reports')
      .select('six_point_safety_check_completed, are_you_safe_and_ready_to_complete_this_form, final_feeling, medical_symptom_change_in_vision, dusk')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('\n❌ Query error:', error.message);
      console.log('\nThis might mean one or more columns do NOT exist in the table.\n');

      // Try each field individually to see which ones exist
      console.log('🔍 Testing each field individually...\n');

      const fields = [
        'six_point_safety_check_completed',
        'are_you_safe_and_ready_to_complete_this_form',
        'final_feeling',
        'medical_symptom_change_in_vision',
        'dusk'
      ];

      for (const field of fields) {
        try {
          const { error: fieldError } = await supabase
            .from('incident_reports')
            .select(field)
            .limit(0);

          if (fieldError) {
            console.log(`  ❌ ${field} - DOES NOT EXIST`);
            console.log(`     Error: ${fieldError.message}`);
          } else {
            console.log(`  ✅ ${field} - EXISTS`);
          }
        } catch (e) {
          console.log(`  ❌ ${field} - ERROR: ${e.message}`);
        }
      }
    } else {
      console.log('\n✅ Query successful! All fields exist.\n');
      console.log('Field values:');
      console.log('  six_point_safety_check_completed:', data?.six_point_safety_check_completed);
      console.log('  are_you_safe_and_ready_to_complete_this_form:', data?.are_you_safe_and_ready_to_complete_this_form);
      console.log('  final_feeling:', data?.final_feeling);
      console.log('  medical_symptom_change_in_vision:', data?.medical_symptom_change_in_vision);
      console.log('  dusk:', data?.dusk);
    }

    console.log('\n═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Script error:', error.message);
  }

  process.exit(0);
}

checkColumns();
