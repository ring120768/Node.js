/**
 * Check for dusk-related fields in incident_reports
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDuskField() {
  const userId = process.argv[2] || '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

  console.log('\n🔍 Checking for dusk-related fields for user:', userId);
  console.log('═'.repeat(70));

  // Try various possible dusk field names
  const possibleFields = [
    'dusk',
    'weather_dusk',
    'time_of_day_dusk',
    'lighting_dusk',
    'is_dusk'
  ];

  console.log('\n🔍 Testing possible field names:\n');

  for (const field of possibleFields) {
    try {
      const { data, error } = await supabase
        .from('incident_reports')
        .select(field)
        .eq('create_user_id', userId)
        .single();

      if (!error && data) {
        console.log(`✅ "${field}" EXISTS`);
        console.log(`   Value: ${data[field]}`);
        console.log(`   Type: ${typeof data[field]}`);
      } else if (error) {
        console.log(`❌ "${field}" DOES NOT EXIST`);
        console.log(`   Error: ${error.message}`);
      }
    } catch (e) {
      console.log(`❌ "${field}" ERROR: ${e.message}`);
    }
  }

  // Also get accident_time to see current calculation
  console.log('\n═'.repeat(70));
  console.log('\n🕐 Current auto-calculation from accident_time:\n');

  const { data: timeData } = await supabase
    .from('incident_reports')
    .select('accident_time')
    .eq('create_user_id', userId)
    .single();

  if (timeData && timeData.accident_time) {
    const timeParts = timeData.accident_time.split(':');
    const hour = parseInt(timeParts[0], 10);
    const isDusk = hour >= 18 && hour < 20;

    console.log(`accident_time: ${timeData.accident_time}`);
    console.log(`Hour: ${hour}`);
    console.log(`Auto-calculated isDusk: ${isDusk ? 'YES ✅' : 'NO ❌'} (18:00-20:00 = dusk)`);
  }

  console.log('\n═'.repeat(70));
  console.log('\n📋 RECOMMENDATION:\n');
  console.log('If a dusk field exists in database, provide the exact column name');
  console.log('and I will update the PDF mapping to use it instead of auto-calculation.\n');

  process.exit(0);
}

checkDuskField();
