#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { fetchAllData } = require('./lib/dataFetcher');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testMapping() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     TEST PHOTO URL MAPPING (After Fix)                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const userId = '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

  console.log('Fetching data with new mapping logic...\n');

  const data = await fetchAllData(userId);

  console.log('📊 IMAGE URLS GENERATED:\n');

  const photoTypes = [
    'location_map_screenshot',
    'vehicle_damage_photo_1_url',
    'vehicle_damage_photo_2_url',
    'vehicle_damage_photo_3_url',
    'vehicle_damage_photo_4_url',
    'vehicle_damage_photo_5_url',
    'other_vehicle_photo_1_url',
    'other_vehicle_photo_2_url',
    'other_vehicle_photo_3_url',
    'other_vehicle_photo_4_url',
    'other_vehicle_photo_5_url'
  ];

  let successCount = 0;
  let missingCount = 0;

  photoTypes.forEach(key => {
    const url = data.imageUrls[key];
    if (url) {
      console.log(`✅ ${key}`);
      console.log(`   ${url.substring(0, 100)}...`);
      successCount++;
    } else {
      console.log(`❌ ${key} - MISSING`);
      missingCount++;
    }
  });

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     SUMMARY                                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`✅ URLs generated: ${successCount}/${photoTypes.length}`);
  console.log(`❌ URLs missing: ${missingCount}/${photoTypes.length}\n`);

  if (missingCount === 0) {
    console.log('🎉 SUCCESS! All photo URLs mapped correctly!\n');
  } else {
    console.log('⚠️  Some URLs still missing. Check mapping logic.\n');
  }
}

testMapping().catch(console.error);
