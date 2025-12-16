require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserImages() {
  const userId = 'e6708c56-f9bb-46f1-94d5-d5bea8db1d71'; // Ian Ring

  console.log('User ID:', userId);

  // Get all documents for this user
  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .eq('create_user_id', userId)
    .order('document_type');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nTotal documents:', data.length);

  // Group by document type
  const grouped = {};
  data.forEach(doc => {
    if (!grouped[doc.document_type]) grouped[doc.document_type] = [];
    grouped[doc.document_type].push(doc);
  });

  console.log('\n=== DOCUMENTS BY TYPE ===');
  for (const type in grouped) {
    console.log(`${type}: ${grouped[type].length} images`);
  }

  // Specifically check scene photos
  const scenePhotos = data.filter(d =>
    d.document_type === 'scene_photo' ||
    d.document_type.includes('scene')
  );

  console.log('\n=== SCENE PHOTO ANALYSIS ===');
  console.log('Scene photos found:', scenePhotos.length);

  if (scenePhotos.length > 0) {
    scenePhotos.forEach((photo, i) => {
      console.log(`  ${i + 1}. ${photo.document_type}`);
      console.log(`     public_url: ${photo.public_url ? 'YES' : 'NO'}`);
      console.log(`     storage_path: ${photo.storage_path || 'NULL'}`);
    });
  } else {
    console.log('  ❌ NO SCENE PHOTOS FOUND!');
    console.log('\n  Expected document_types:');
    console.log('    - scene_photo');
    console.log('    - scene_overview');
    console.log('    - scene_overview_1');
    console.log('    - scene_overview_2');
    console.log('    - scene_overview_3');
  }
}

checkUserImages();
