#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllUserImages() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          CHECK ALL USER IMAGES IN DATABASE                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const userId = '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

  const { data: docs, error } = await supabase
    .from('user_documents')
    .select('id, original_filename, document_type, document_category, storage_path, signed_url, created_at')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log(`Found ${docs.length} total user_documents records\n`);

  // Group by document_category
  const categoryGroups = {};
  docs.forEach(doc => {
    const category = doc.document_category || 'null';
    if (!categoryGroups[category]) categoryGroups[category] = [];
    categoryGroups[category].push(doc);
  });

  console.log('📊 GROUPED BY document_category:\n');
  Object.entries(categoryGroups).forEach(([category, records]) => {
    console.log(`\n📁 Category: "${category}" (${records.length} files)`);

    // Group by document_type within category
    const typeGroups = {};
    records.forEach(doc => {
      const type = doc.document_type || 'null';
      if (!typeGroups[type]) typeGroups[type] = [];
      typeGroups[type].push(doc);
    });

    Object.entries(typeGroups).forEach(([type, typeRecords]) => {
      console.log(`\n   🏷️  document_type: "${type}" (${typeRecords.length} files)`);
      typeRecords.forEach((doc, idx) => {
        const hasSignedUrl = doc.signed_url ? '✅ URL' : '❌ No URL';
        console.log(`      ${idx + 1}. ${doc.original_filename} ${hasSignedUrl}`);
        console.log(`         Path: ${doc.storage_path}`);
      });
    });
  });

  // Check what the PDF expects
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          PDF FIELD EXPECTATIONS                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('Signup vehicle photos (5 expected):');
  const signupTypes = [
    'driving_license_picture',
    'vehicle_front_image',
    'vehicle_driver_side_image',
    'vehicle_passenger_side_image',
    'vehicle_back_image'
  ];
  signupTypes.forEach(type => {
    const exists = docs.find(d => d.document_type === type);
    console.log(`   ${exists ? '✅' : '❌'} ${type}`);
  });

  console.log('\nIncident photos:');
  console.log('   Location map (1 expected):');
  const mapExists = docs.find(d => d.document_type === 'location_map_screenshot');
  console.log(`      ${mapExists ? '✅' : '❌'} location_map_screenshot`);

  console.log('\n   Scene photos (0-3 expected):');
  const scenePhotos = docs.filter(d => d.document_type && d.document_type.includes('scene'));
  console.log(`      Found ${scenePhotos.length} scene photos`);
  scenePhotos.forEach((doc, idx) => {
    console.log(`      ${idx + 1}. ${doc.document_type} → ${doc.original_filename}`);
  });

  console.log('\n   Vehicle damage photos (5 expected):');
  const damagePhotos = docs.filter(d => d.document_type === 'vehicle_damage_photo');
  console.log(`      Found ${damagePhotos.length} vehicle_damage_photo`);

  console.log('\n   Other vehicle photos (5 expected):');
  const otherPhotos = docs.filter(d => d.document_type === 'other_vehicle_photo');
  console.log(`      Found ${otherPhotos.length} other_vehicle_photo`);

  console.log('\n');
}

checkAllUserImages().catch(console.error);
