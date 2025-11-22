const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== ADDING TEST IMAGE URLs TO incident_reports ===\n');

  const userId = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

  // Mock image URLs (using Supabase placeholder URLs)
  const baseUrl = 'https://kctlcmbjmhcfoobmkfrs.supabase.co/storage/v1/object/sign/incident-evidence';

  const testImageUrls = {
    // Audio recording
    audio_recording_url: `${baseUrl}/audio/accident_recording_${Date.now()}.mp3`,

    // Scene photos
    scene_photo_1_url: `${baseUrl}/scene/wide_angle_${Date.now()}.jpg`,
    scene_photo_2_url: `${baseUrl}/scene/traffic_lights_${Date.now()}.jpg`,
    scene_photo_3_url: `${baseUrl}/scene/road_markings_${Date.now()}.jpg`,

    // Other vehicle photos
    other_vehicle_photo_1_url: `${baseUrl}/other_vehicle/front_view_${Date.now()}.jpg`,
    other_vehicle_photo_2_url: `${baseUrl}/other_vehicle/side_view_${Date.now()}.jpg`,
    other_vehicle_photo_3_url: `${baseUrl}/other_vehicle/license_plate_${Date.now()}.jpg`,

    // Vehicle damage photos
    vehicle_damage_photo_1_url: `${baseUrl}/damage/front_bumper_${Date.now()}.jpg`,
    vehicle_damage_photo_2_url: `${baseUrl}/damage/headlight_${Date.now()}.jpg`,
    vehicle_damage_photo_3_url: `${baseUrl}/damage/bonnet_${Date.now()}.jpg`,
    vehicle_damage_photo_4_url: `${baseUrl}/damage/wing_panel_${Date.now()}.jpg`,
    vehicle_damage_photo_5_url: `${baseUrl}/damage/close_up_1_${Date.now()}.jpg`,
    vehicle_damage_photo_6_url: `${baseUrl}/damage/close_up_2_${Date.now()}.jpg`
  };

  console.log('Test image URLs to add:');
  Object.entries(testImageUrls).forEach(([key, value]) => {
    console.log(`  ${key}: ${value.substring(0, 80)}...`);
  });

  console.log('\nUpdating incident_reports...');

  const { data, error } = await supabase
    .from('incident_reports')
    .update(testImageUrls)
    .eq('create_user_id', userId)
    .select();

  if (error) {
    console.error('❌ Error updating:', error);
    return;
  }

  console.log('✅ Successfully added 13 image URLs to incident_reports!');
  console.log(`   Updated ${data.length} record(s)`);

  console.log('\n=== VERIFICATION ===\n');

  // Verify the data
  const { data: verification } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  const columns = Object.keys(testImageUrls);
  console.log('Verifying 13 columns:');
  columns.forEach((col, i) => {
    const hasValue = verification[col] ? '✅' : '❌';
    console.log(`  [${i + 1}/13] ${hasValue} ${col}`);
  });

  const allPopulated = columns.every(col => verification[col]);
  console.log(`\n${allPopulated ? '✅' : '❌'} All 13 image URLs ${allPopulated ? 'populated successfully' : 'NOT populated'}!`);

  if (allPopulated) {
    console.log('\n🎉 Ready to test PDF generation!');
    console.log('   Run: node test-form-filling.js ee7cfcaf-5810-4c62-b99b-ab0f2291733e');
  }
})();
