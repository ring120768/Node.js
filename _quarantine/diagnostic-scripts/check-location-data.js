// Check if location data exists in the database
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLocationData() {
  const incidentId = '16d646f7-42a8-4218-ae23-4221c9ec912a';

  const { data, error } = await supabase
    .from('incident_reports')
    .select('location, what3words, nearest_landmark, junction_type, user_manoeuvre, additional_hazards, accident_date, accident_time')
    .eq('id', incidentId)
    .single();

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 PAGE 4 LOCATION DATA CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Incident ID:', incidentId);
  console.log('\nPage 4 fields:');
  console.log('  location:', data.location || 'NULL');
  console.log('  what3words:', data.what3words || 'NULL');
  console.log('  nearest_landmark:', data.nearest_landmark || 'NULL');
  console.log('  junction_type:', data.junction_type || 'NULL');
  console.log('  user_manoeuvre:', data.user_manoeuvre || 'NULL');
  console.log('  additional_hazards:', data.additional_hazards || 'NULL');
  console.log('\nPage 3 fields (for reference):');
  console.log('  accident_date:', data.accident_date || 'NULL');
  console.log('  accident_time:', data.accident_time || 'NULL');

  process.exit(0);
}

checkLocationData();
