require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkImages() {
  const userId = 'e6708c56-f9bb-46f1-94d5-d5bea8db1d71';
  
  // Get ALL user_documents records
  const { data: docs, error } = await supabase
    .from('user_documents')
    .select('id, document_type, storage_path, status, created_at')
    .eq('create_user_id', userId)
    .is('deleted_at', null)
    .order('document_type');
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('All document types for user:');
  console.log('============================');
  
  const byType = {};
  docs.forEach(d => {
    if (!byType[d.document_type]) byType[d.document_type] = [];
    byType[d.document_type].push({ status: d.status, path: d.storage_path ? 'yes' : 'no' });
  });
  
  Object.entries(byType).sort().forEach(([type, items]) => {
    console.log(`\n${type}: ${items.length} record(s)`);
    items.forEach((item, i) => {
      console.log(`  [${i+1}] status: ${item.status}, has_path: ${item.path}`);
    });
  });
  
  // Check for scene-related types
  console.log('\n\nLooking for scene/accident/location types...');
  const sceneTypes = docs.filter(d => 
    d.document_type.includes('scene') || 
    d.document_type.includes('accident') ||
    d.document_type.includes('location')
  );
  console.log('Found:', sceneTypes.length);
  sceneTypes.forEach(s => console.log('  -', s.document_type, '| status:', s.status, '| path:', s.storage_path));
}

checkImages();
