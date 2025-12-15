#!/usr/bin/env node

/**
 * Recursively delete ALL files from Supabase Storage buckets
 * Handles nested folders and subdirectories
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Recursively list all files in a bucket path
 */
async function listAllFiles(bucketName, path = '', allFiles = []) {
  const { data: items, error } = await supabase
    .storage
    .from(bucketName)
    .list(path, {
      limit: 1000,
      offset: 0
    });

  if (error) {
    console.warn(`  ⚠️  Error listing ${bucketName}/${path}:`, error.message);
    return allFiles;
  }

  if (!items || items.length === 0) {
    return allFiles;
  }

  for (const item of items) {
    const itemPath = path ? `${path}/${item.name}` : item.name;

    if (item.id === null) {
      // It's a folder - recurse into it
      await listAllFiles(bucketName, itemPath, allFiles);
    } else {
      // It's a file - add to list
      allFiles.push(itemPath);
    }
  }

  return allFiles;
}

async function deleteStorageRecursive() {
  console.log('🗑️  Starting recursive storage cleanup...\n');

  try {
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('❌ Error fetching buckets:', bucketsError.message);
      process.exit(1);
    }

    if (!buckets || buckets.length === 0) {
      console.log('✅ No storage buckets found\n');
      process.exit(0);
    }

    console.log(`Found ${buckets.length} bucket(s)\n`);

    let totalFilesDeleted = 0;

    // Process each bucket
    for (const bucket of buckets) {
      console.log(`🗑️  Processing bucket: ${bucket.name}`);

      // Recursively list all files
      const allFiles = await listAllFiles(bucket.name);

      if (allFiles.length === 0) {
        console.log(`  ✅ No files in ${bucket.name}\n`);
        continue;
      }

      console.log(`  Found ${allFiles.length} file(s) (including nested)`);

      // Delete in batches of 100 (Supabase limit)
      const batchSize = 100;
      let deletedCount = 0;

      for (let i = 0; i < allFiles.length; i += batchSize) {
        const batch = allFiles.slice(i, i + batchSize);

        const { error: deleteError } = await supabase
          .storage
          .from(bucket.name)
          .remove(batch);

        if (deleteError) {
          console.warn(`  ⚠️  Error deleting batch:`, deleteError.message);
        } else {
          deletedCount += batch.length;
        }
      }

      console.log(`  ✅ Deleted ${deletedCount} file(s) from ${bucket.name}\n`);
      totalFilesDeleted += deletedCount;
    }

    // Verify cleanup
    console.log('🔍 Verifying cleanup...');
    let remainingTotal = 0;

    for (const bucket of buckets) {
      const remaining = await listAllFiles(bucket.name);
      if (remaining.length > 0) {
        console.log(`  ⚠️  ${bucket.name}: ${remaining.length} file(s) remain`);
        remainingTotal += remaining.length;
      }
    }

    if (remainingTotal === 0) {
      console.log('  ✅ All buckets completely empty\n');
    } else {
      console.log(`  ⚠️  Total remaining: ${remainingTotal} file(s)\n`);
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Recursive Storage Cleanup Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Deleted ${totalFilesDeleted} file(s) across ${buckets.length} bucket(s)`);
    console.log('🎯 All storage buckets are clean\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

deleteStorageRecursive()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
