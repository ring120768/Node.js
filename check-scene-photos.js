require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkScenePhotos() {
  const userId = 'e6708c56-f9bb-46f1-94d5-d5bea8db1d71';

  console.log('=== Checking Scene Photos ===\n');

  // 1. Check user_documents for scene-related types
  console.log('1. user_documents with scene-related document_type:');
  const { data: sceneDocs, error: sceneErr } = await supabase
    .from('user_documents')
    .select('id, document_type, storage_path, status, created_at')
    .eq('create_user_id', userId)
    .is('deleted_at', null)
    .or('document_type.ilike.%scene%,document_type.ilike.%overview%');

  if (sceneErr) {
    console.log('   Error:', sceneErr.message);
  } else if (sceneDocs.length === 0) {
    console.log('   ❌ NO scene photos found in user_documents!');
  } else {
    sceneDocs.forEach(d => {
      console.log(`   - ${d.document_type}: ${d.status} (${d.storage_path})`);
    });
  }

  // 2. Check temp_uploads for scene_photo
  console.log('\n2. temp_uploads with field_name = scene_photo:');
  const { data: tempDocs, error: tempErr } = await supabase
    .from('temp_uploads')
    .select('id, field_name, storage_path, status, created_at, session_id')
    .eq('create_user_id', userId)
    .eq('field_name', 'scene_photo');

  if (tempErr) {
    console.log('   Error:', tempErr.message);
  } else if (!tempDocs || tempDocs.length === 0) {
    console.log('   ❌ NO scene_photo entries in temp_uploads');
  } else {
    console.log(`   Found ${tempDocs.length} temp uploads:`);
    tempDocs.forEach(d => {
      console.log(`   - session: ${d.session_id?.substring(0, 8)}... | status: ${d.status} | path: ${d.storage_path}`);
    });
  }

  // 3. Check incident_reports for scene photo URLs
  console.log('\n3. incident_reports scene photo URL columns:');
  const { data: incidents } = await supabase
    .from('incident_reports')
    .select('scene_photo_1_url, scene_photo_2_url, scene_photo_3_url, file_url_scene_overview, file_url_scene_overview_1')
    .eq('create_user_id', userId)
    .limit(1);

  if (incidents && incidents[0]) {
    const inc = incidents[0];
    console.log('   scene_photo_1_url:', inc.scene_photo_1_url || '(empty)');
    console.log('   scene_photo_2_url:', inc.scene_photo_2_url || '(empty)');
    console.log('   scene_photo_3_url:', inc.scene_photo_3_url || '(empty)');
    console.log('   file_url_scene_overview:', inc.file_url_scene_overview || '(empty)');
    console.log('   file_url_scene_overview_1:', inc.file_url_scene_overview_1 || '(empty)');
  }

  // 4. List ALL document types this user has
  console.log('\n4. All document types for this user:');
  const { data: allDocs } = await supabase
    .from('user_documents')
    .select('document_type')
    .eq('create_user_id', userId)
    .is('deleted_at', null);

  if (allDocs) {
    const types = [...new Set(allDocs.map(d => d.document_type))].sort();
    types.forEach(t => console.log(`   - ${t}`));
  }

  // 5. Check storage bucket for scene photos
  console.log('\n5. Checking storage bucket for scene/location photos:');
  const { data: storageFiles } = await supabase.storage
    .from('user-documents')
    .list(`users/${userId}`, { limit: 100, recursive: true });

  if (storageFiles) {
    const sceneFiles = storageFiles.filter(f =>
      f.name.includes('scene') || f.name.includes('location')
    );
    if (sceneFiles.length === 0) {
      console.log('   No scene/location files found at root');
    } else {
      sceneFiles.forEach(f => console.log(`   - ${f.name}`));
    }
  }

  // Check incident-reports subfolder
  const incidentReportId = '64e25a3f-1fbc-47b0-ba0d-216596d32d0a'; // From location_map_screenshot path
  console.log(`\n6. Checking incident-reports/${incidentReportId}/location-photos:`);
  const { data: locationPhotos } = await supabase.storage
    .from('user-documents')
    .list(`users/${userId}/incident-reports/${incidentReportId}/location-photos`, { limit: 20 });

  if (locationPhotos && locationPhotos.length > 0) {
    locationPhotos.forEach(f => console.log(`   - ${f.name}`));
  } else {
    console.log('   ❌ No files in location-photos folder');
  }

  // Check scene-photos subfolder
  console.log(`\n7. Checking incident-reports/${incidentReportId}/scene-photos:`);
  const { data: scenePhotos } = await supabase.storage
    .from('user-documents')
    .list(`users/${userId}/incident-reports/${incidentReportId}/scene-photos`, { limit: 20 });

  if (scenePhotos && scenePhotos.length > 0) {
    scenePhotos.forEach(f => console.log(`   - ${f.name}`));
  } else {
    console.log('   ❌ No files in scene-photos folder');
  }
}

checkScenePhotos();
