/**
 * Search for time-of-day related field in incident_reports
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findTimeField() {
  const possibleNames = [
    'time_of_day',
    'lighting_conditions',
    'daylight',
    'dawn',
    'dusk',
    'night',
    'darkness',
    'weather_time',
    'accident_time',
    'visibility_conditions',
    'lighting',
    'time_of_accident'
  ];

  console.log('\n🔍 Checking for time-of-day related fields in incident_reports:\n');
  console.log('═'.repeat(60));

  for (const field of possibleNames) {
    try {
      const { error } = await supabase
        .from('incident_reports')
        .select(field)
        .limit(0);

      if (!error) {
        console.log(`  ✅ ${field} - EXISTS`);
      }
    } catch (e) {
      // Field doesn't exist
    }
  }

  console.log('\n═'.repeat(60));
  console.log('\nNote: PDF field "weather_dusk" currently maps to incident.dusk (which does NOT exist)');
  console.log('Need to find the correct database column name.\n');
}

findTimeField().then(() => process.exit(0));
