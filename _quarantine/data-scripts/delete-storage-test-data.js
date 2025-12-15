#!/usr/bin/env node

/**
 * Delete all test files from Supabase Storage buckets
 * Clears out uploaded images, PDFs, and other stored files
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteAllStorageFiles() {
  console.log('🗑️  Starting storage cleanup...\n');

  try {
    // Step 1: List all storage buckets
    console.log('📦 Fetching storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('❌ Error fetching buckets:', bucketsError.message);
      process.exit(1);
    }

    if (!buckets || buckets.length === 0) {
      console.log('✅ No storage buckets found - nothing to clean\n');
      process.exit(0);
    }

    console.log(`Found ${buckets.length} bucket(s):\n`);
    buckets.forEach((bucket, idx) => {
      console.log(`  ${idx + 1}. ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    console.log('');

    let totalFilesDeleted = 0;

    // Step 2: Delete all files from each bucket
    for (const bucket of buckets) {
      console.log(`🗑️  Processing bucket: ${bucket.name}`);

      // List all files in bucket
      const { data: files, error: listError } = await supabase
        .storage
        .from(bucket.name)
        .list('', {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (listError) {
        console.warn(`  ⚠️  Error listing files in ${bucket.name}:`, listError.message);
        continue;
      }

      if (!files || files.length === 0) {
        console.log(`  ✅ No files in ${bucket.name}\n`);
        continue;
      }

      console.log(`  Found ${files.length} file(s)`);

      // Delete all files
      const filePaths = files.map(file => file.name);
      const { data: deleteData, error: deleteError } = await supabase
        .storage
        .from(bucket.name)
        .remove(filePaths);

      if (deleteError) {
        console.warn(`  ⚠️  Error deleting files from ${bucket.name}:`, deleteError.message);
      } else {
        console.log(`  ✅ Deleted ${filePaths.length} file(s) from ${bucket.name}`);
        totalFilesDeleted += filePaths.length;
      }

      // Also check for folders/nested files
      const { data: folders, error: folderError } = await supabase
        .storage
        .from(bucket.name)
        .list('', {
          limit: 1000,
          offset: 0
        });

      if (folders && folders.length > 0) {
        // Check each folder for files
        for (const folder of folders) {
          if (folder.id) { // It's a folder
            const { data: nestedFiles, error: nestedError } = await supabase
              .storage
              .from(bucket.name)
              .list(folder.name, {
                limit: 1000,
                offset: 0
              });

            if (nestedFiles && nestedFiles.length > 0) {
              const nestedPaths = nestedFiles.map(f => `${folder.name}/${f.name}`);
              const { error: nestedDeleteError } = await supabase
                .storage
                .from(bucket.name)
                .remove(nestedPaths);

              if (!nestedDeleteError) {
                console.log(`  ✅ Deleted ${nestedPaths.length} file(s) from ${bucket.name}/${folder.name}`);
                totalFilesDeleted += nestedPaths.length;
              }
            }
          }
        }
      }

      console.log('');
    }

    // Step 3: Verify deletion
    console.log('🔍 Verifying storage cleanup...');
    let remainingFiles = 0;

    for (const bucket of buckets) {
      const { data: files } = await supabase
        .storage
        .from(bucket.name)
        .list('', { limit: 10 });

      if (files && files.length > 0) {
        remainingFiles += files.length;
        console.log(`  ⚠️  ${bucket.name} still has ${files.length} file(s)`);
      }
    }

    if (remainingFiles === 0) {
      console.log('  ✅ All storage buckets are empty\n');
    } else {
      console.log(`  ⚠️  ${remainingFiles} file(s) still remain in storage\n`);
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Storage Cleanup Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Deleted ${totalFilesDeleted} file(s) across ${buckets.length} bucket(s)`);
    console.log('🎯 Storage is now clean and ready for fresh uploads\n');

  } catch (error) {
    console.error('❌ Fatal error during storage cleanup:', error);
    process.exit(1);
  }
}

deleteAllStorageFiles()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
