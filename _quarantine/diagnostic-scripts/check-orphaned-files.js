#!/usr/bin/env node

/**
 * Check for Orphaned Files in Permanent Storage
 * 
 * Files that exist in storage but aren't tracked in user_documents table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrphanedFiles() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          CHECK FOR ORPHANED FILES IN STORAGE                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get all files in users/ folder
    console.log('📂 Listing all files in users/ folder...\n');

    const { data: userFolders, error: listError } = await supabase.storage
      .from('user-documents')
      .list('users', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.log('❌ Error listing users folder:', listError.message);
      return;
    }

    if (!userFolders || userFolders.length === 0) {
      console.log('⚠️  No user folders found in storage\n');
      return;
    }

    console.log(`✅ Found ${userFolders.length} user folders\n`);

    let totalFiles = 0;
    let orphanedFiles = [];

    // Check each user folder
    for (const userFolder of userFolders) {
      if (userFolder.name === '.emptyFolderPlaceholder') continue;

      const userId = userFolder.name;
      console.log(`👤 Checking user: ${userId}`);

      // List all files recursively for this user
      const userPath = `users/${userId}`;
      
      // Try to list incident-reports folder
      const { data: incidentFolders } = await supabase.storage
        .from('user-documents')
        .list(`${userPath}/incident-reports`);

      if (incidentFolders && incidentFolders.length > 0) {
        for (const incidentFolder of incidentFolders) {
          if (incidentFolder.name === '.emptyFolderPlaceholder') continue;

          const reportId = incidentFolder.name;
          console.log(`   📋 Report: ${reportId}`);

          // Check location-photos folder
          const { data: locationPhotos } = await supabase.storage
            .from('user-documents')
            .list(`${userPath}/incident-reports/${reportId}/location-photos`);

          if (locationPhotos && locationPhotos.length > 0) {
            console.log(`      📸 Location photos: ${locationPhotos.length}`);
            
            for (const photo of locationPhotos) {
              totalFiles++;
              const fullPath = `${userPath}/incident-reports/${reportId}/location-photos/${photo.name}`;
              
              // Check if this file is tracked in user_documents
              const { data: docRecord, error: docError } = await supabase
                .from('user_documents')
                .select('id, storage_path')
                .eq('storage_path', fullPath)
                .maybeSingle();

              if (docError) {
                console.log(`         ⚠️  Error checking ${photo.name}:`, docError.message);
              } else if (!docRecord) {
                console.log(`         🔴 ORPHANED: ${photo.name}`);
                orphanedFiles.push({
                  path: fullPath,
                  size: photo.metadata.size,
                  created: photo.created_at
                });
              } else {
                console.log(`         ✅ Tracked: ${photo.name}`);
              }
            }
          }

          // Check scene-photos folder
          const { data: scenePhotos } = await supabase.storage
            .from('user-documents')
            .list(`${userPath}/incident-reports/${reportId}/scene-photos`);

          if (scenePhotos && scenePhotos.length > 0) {
            console.log(`      📸 Scene photos: ${scenePhotos.length}`);
            
            for (const photo of scenePhotos) {
              totalFiles++;
              const fullPath = `${userPath}/incident-reports/${reportId}/scene-photos/${photo.name}`;
              
              const { data: docRecord } = await supabase
                .from('user_documents')
                .select('id, storage_path')
                .eq('storage_path', fullPath)
                .maybeSingle();

              if (!docRecord) {
                console.log(`         🔴 ORPHANED: ${photo.name}`);
                orphanedFiles.push({
                  path: fullPath,
                  size: photo.metadata.size,
                  created: photo.created_at
                });
              } else {
                console.log(`         ✅ Tracked: ${photo.name}`);
              }
            }
          }

          // Check vehicle-damage folder
          const { data: vehiclePhotos } = await supabase.storage
            .from('user-documents')
            .list(`${userPath}/incident-reports/${reportId}/vehicle-damage`);

          if (vehiclePhotos && vehiclePhotos.length > 0) {
            console.log(`      📸 Vehicle damage photos: ${vehiclePhotos.length}`);
            
            for (const photo of vehiclePhotos) {
              totalFiles++;
              const fullPath = `${userPath}/incident-reports/${reportId}/vehicle-damage/${photo.name}`;
              
              const { data: docRecord } = await supabase
                .from('user_documents')
                .select('id, storage_path')
                .eq('storage_path', fullPath)
                .maybeSingle();

              if (!docRecord) {
                console.log(`         🔴 ORPHANED: ${photo.name}`);
                orphanedFiles.push({
                  path: fullPath,
                  size: photo.metadata.size,
                  created: photo.created_at
                });
              } else {
                console.log(`         ✅ Tracked: ${photo.name}`);
              }
            }
          }
        }
      }

      console.log('');
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   ORPHANED FILES SUMMARY                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Total files checked: ${totalFiles}`);
    console.log(`🔴 Orphaned files: ${orphanedFiles.length}\n`);

    if (orphanedFiles.length > 0) {
      console.log('Orphaned files found:\n');
      orphanedFiles.forEach((file, idx) => {
        console.log(`${idx + 1}. ${file.path}`);
        console.log(`   Size: ${(file.size / 1024).toFixed(2)} KB`);
        console.log(`   Created: ${file.created}\n`);
      });

      console.log('⚠️  These files exist in storage but are not tracked in user_documents table.');
      console.log('   This could be the missing photos from finalization!\n');
    } else {
      console.log('✅ No orphaned files found. All storage files are tracked.\n');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

checkOrphanedFiles().catch(console.error);
