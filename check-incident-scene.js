require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkIncident() {
  const userId = 'e6708c56-f9bb-46f1-94d5-d5bea8db1d71';

  // Get incident report - look for scene-related columns
  const { data: incidents, error } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const incident = incidents?.[0];

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  if (!incident) {
    console.log('No incident report found');
    return;
  }

  console.log('Scene-related fields in incident_reports:');
  console.log('==========================================\n');

  // Find all keys that contain scene, location, accident, photo, image
  const sceneKeys = Object.keys(incident).filter(k =>
    k.includes('scene') ||
    k.includes('location') ||
    k.includes('accident') ||
    k.includes('photo') ||
    k.includes('image')
  );

  sceneKeys.sort().forEach(key => {
    const value = incident[key];
    if (value) {
      console.log(`${key}:`);
      if (typeof value === 'string' && value.length > 100) {
        console.log(`  ${value.substring(0, 100)}...`);
      } else {
        console.log(`  ${JSON.stringify(value)}`);
      }
    }
  });

  // Also check for any URL-like values
  console.log('\n\nAll URL-like values:');
  console.log('====================\n');
  Object.entries(incident).forEach(([key, value]) => {
    if (typeof value === 'string' && (value.includes('http') || value.includes('supabase'))) {
      console.log(`${key}: ${value.substring(0, 120)}...`);
    }
  });
}

checkIncident();
