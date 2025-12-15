const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== ADDING 13 IMAGE URL COLUMNS TO incident_reports ===\n');

  const columns = [
    { name: 'audio_recording_url', pdf_field: 'file_url_record_detailed_account_of_what_happened' },
    { name: 'scene_photo_1_url', pdf_field: 'scene_images_path_1' },
    { name: 'scene_photo_2_url', pdf_field: 'scene_images_path_2' },
    { name: 'scene_photo_3_url', pdf_field: 'scene_images_path_3' },
    { name: 'other_vehicle_photo_1_url', pdf_field: 'other_vehicle_photo_1' },
    { name: 'other_vehicle_photo_2_url', pdf_field: 'other_vehicle_photo_2' },
    { name: 'other_vehicle_photo_3_url', pdf_field: 'other_vehicle_photo_3' },
    { name: 'vehicle_damage_photo_1_url', pdf_field: 'vehicle_damage_path_1' },
    { name: 'vehicle_damage_photo_2_url', pdf_field: 'vehicle_damage_path_2' },
    { name: 'vehicle_damage_photo_3_url', pdf_field: 'vehicle_damage_path_3' },
    { name: 'vehicle_damage_photo_4_url', pdf_field: 'vehicle_damage_path_4' },
    { name: 'vehicle_damage_photo_5_url', pdf_field: 'vehicle_damage_path_5' },
    { name: 'vehicle_damage_photo_6_url', pdf_field: 'vehicle_damage_path_6' }
  ];

  console.log('Columns to add:', columns.length);
  console.log('');

  // First, check which columns already exist
  const { data: sample, error: sampleError } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(1)
    .single();

  if (sampleError) {
    console.error('Error fetching sample:', sampleError);
    return;
  }

  const existingColumns = Object.keys(sample);

  columns.forEach((col, i) => {
    const exists = existingColumns.includes(col.name);
    console.log(`[${i + 1}/13] ${col.name}:`);
    console.log(`    Status: ${exists ? '✅ Already exists' : '⚠️  Needs to be added'}`);
    console.log(`    Maps to PDF: ${col.pdf_field}`);
    console.log('');
  });

  const toAdd = columns.filter(col => !existingColumns.includes(col.name));

  if (toAdd.length === 0) {
    console.log('✅ All columns already exist!');
    return;
  }

  console.log(`\n⚠️  Need to add ${toAdd.length} columns to incident_reports table`);
  console.log('\nPlease run this SQL in Supabase SQL Editor:\n');
  console.log('```sql');
  console.log('ALTER TABLE incident_reports');
  toAdd.forEach((col, i) => {
    const comma = i < toAdd.length - 1 ? ',' : ';';
    console.log(`ADD COLUMN IF NOT EXISTS ${col.name} TEXT${comma}`);
  });
  console.log('```');

  console.log('\nOr use the Supabase Dashboard:');
  console.log('1. Go to: Table Editor → incident_reports');
  console.log('2. Click "+ New Column" for each:');
  toAdd.forEach((col, i) => {
    console.log(`   ${i + 1}. Name: ${col.name}, Type: text, Nullable: true`);
  });
})();
