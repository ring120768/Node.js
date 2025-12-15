#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDocumentTypes() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     CHECK ALL DOCUMENT_TYPE VALUES IN DATABASE                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Get ALL document types across the entire database
  const { data: docs, error } = await supabase
    .from('user_documents')
    .select('id, original_filename, document_type, document_category, storage_path, created_at')
    .not('document_type', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log(`Found ${docs.length} user_documents records\n`);

  // Group by document_type
  const typeGroups = {};
  docs.forEach(doc => {
    const type = doc.document_type || 'null';
    if (!typeGroups[type]) typeGroups[type] = [];
    typeGroups[type].push(doc);
  });

  // Display grouped
  console.log('📊 GROUPED BY document_type:\n');
  Object.entries(typeGroups).forEach(([type, records]) => {
    console.log(`\n🏷️  document_type: "${type}" (${records.length} files)`);
    console.log(`   document_category: "${records[0].document_category || 'null'}"`);
    records.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.original_filename}`);
      console.log(`      Path: ${doc.storage_path}`);
    });
  });

  // Check against expected mapping keys
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     MAPPING VALIDATION                                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const expectedMappings = {
    'location_map_screenshot': 'location_map_screenshot',
    'what3words_screenshot': 'location_map_screenshot',
    'location_screenshot': 'location_map_screenshot',
    'other_vehicle': 'other_vehicle_photo_1_url',
    'other_vehicle_1': 'other_vehicle_photo_1_url',
    'other_vehicle_2': 'other_vehicle_photo_2_url',
    'other_vehicle_3': 'other_vehicle_photo_3_url',
    'vehicle_damage': 'vehicle_damage_photo_1_url',
    'vehicle_damage_1': 'vehicle_damage_photo_1_url',
    'vehicle_damage_2': 'vehicle_damage_photo_2_url',
    'vehicle_damage_3': 'vehicle_damage_photo_3_url',
    'vehicle_damage_4': 'vehicle_damage_photo_4_url',
  };

  const actualTypes = Object.keys(typeGroups);
  
  console.log('Expected mapping keys from dataFetcher.js:');
  Object.keys(expectedMappings).forEach(key => {
    console.log(`   "${key}"`);
  });

  console.log('\nActual document_type values in database:');
  actualTypes.forEach(type => {
    const match = expectedMappings[type];
    if (match) {
      console.log(`   ✅ "${type}" → maps to: ${match}`);
    } else {
      console.log(`   ❌ "${type}" → NO MAPPING FOUND!`);
    }
  });

  // Check for document_category values too
  console.log('\n\n📋 document_category values found:');
  const categories = [...new Set(docs.map(d => d.document_category))];
  categories.forEach(cat => {
    console.log(`   "${cat}"`);
  });

  console.log('\n');
}

checkDocumentTypes().catch(console.error);
