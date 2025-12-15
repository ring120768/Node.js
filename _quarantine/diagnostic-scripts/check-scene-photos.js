#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('🔍 Investigating the 3 scene_photo records...\n');

  const { data, error } = await supabase
    .from('temp_uploads')
    .select('*')
    .eq('field_name', 'scene_photo')
    .order('uploaded_at', { ascending: true });

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${data.length} scene_photo records:\n`);

  const targetUserId = '35a7475f-60ca-4c5d-bc48-d13a299f4309';

  data.forEach((record, i) => {
    const isTargetUser = record.claimed_by_user_id === targetUserId;
    console.log(`Scene Photo #${i + 1} ${isTargetUser ? '← TARGET USER' : ''}`);
    console.log(`  ID: ${record.id}`);
    console.log(`  Session ID: ${record.session_id || 'NULL'}`);
    console.log(`  Claimed: ${record.claimed}`);
    console.log(`  Claimed by user: ${record.claimed_by_user_id || 'NULL'}`);
    console.log(`  Claimed at: ${record.claimed_at || 'NULL'}`);
    console.log(`  Uploaded: ${record.uploaded_at}`);
    console.log(`  Expires: ${record.expires_at}`);
    console.log(`  Storage path: ${record.storage_path}`);
    console.log(`  File size: ${record.file_size} bytes`);
    console.log();
  });

  const userScenePhotos = data.filter(d => d.claimed_by_user_id === targetUserId);
  console.log(`\n✅ Scene photos for target user: ${userScenePhotos.length}`);

  const unclaimedPhotos = data.filter(d => !d.claimed_by_user_id);
  console.log(`⚠️  Unclaimed scene photos: ${unclaimedPhotos.length}`);

  const otherUserPhotos = data.filter(d => d.claimed_by_user_id && d.claimed_by_user_id !== targetUserId);
  console.log(`⚠️  Scene photos claimed by OTHER users: ${otherUserPhotos.length}`);
  if (otherUserPhotos.length > 0) {
    otherUserPhotos.forEach(p => {
      console.log(`   - User: ${p.claimed_by_user_id}`);
    });
  }
})();
