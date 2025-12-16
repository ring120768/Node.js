require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSceneImages() {
  const incidentId = 'e6708c56-f9bb-46f1-94d5-d5bea8db1d71';

  const { data, error } = await supabase
    .from('user_documents')
    .select('document_type, public_url, field_name')
    .eq('incident_report_id', incidentId)
    .order('document_type');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total documents:', data.length);
  console.log('\nGrouped by document_type:');

  const grouped = {};
  data.forEach(doc => {
    if (!grouped[doc.document_type]) grouped[doc.document_type] = [];
    grouped[doc.document_type].push(doc);
  });

  for (const type in grouped) {
    const docs = grouped[type];
    console.log(`\n${type}: ${docs.length} images`);
    docs.forEach((doc, i) => {
      console.log(`  ${i+1}. field_name: ${doc.field_name || 'NULL'}`);
      console.log(`     url: ${doc.public_url ? doc.public_url.substring(0, 60) + '...' : 'NULL'}`);
    });
  }

  // Check specifically for scene images
  const sceneImages = data.filter(d => d.document_type === 'scene');
  console.log('\n=== SCENE IMAGES ANALYSIS ===');
  console.log(`Total scene images: ${sceneImages.length}`);
  console.log('Field names:', sceneImages.map(s => s.field_name || 'NULL').join(', '));
}

checkSceneImages();
