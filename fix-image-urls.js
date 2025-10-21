#!/usr/bin/env node

/**
 * Fix Image URLs and Storage Issues
 *
 * This script checks if images exist in storage and provides solutions
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndFixImages(userId = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c') {
  console.log('\n🔍 Checking image storage for user:', userId);
  console.log('='.repeat(60));

  try {
    // Get all user documents
    const { data: documents, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`\n📁 Found ${documents.length} documents in database\n`);

    for (const doc of documents) {
      console.log(`\n📄 Document: ${doc.document_type}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Created: ${new Date(doc.created_at).toLocaleDateString('en-GB')}`);

      if (doc.storage_path) {
        // Check if file exists in storage
        const bucketName = 'user-documents';
        const filePath = doc.storage_path.replace('user-documents/', '');

        console.log(`   Storage Path: ${filePath}`);

        // Try to download the file to check if it exists
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(filePath);

        if (downloadError) {
          console.log(`   ❌ File not found in storage: ${downloadError.message}`);

          // Try to fix by using the public URL if available
          if (doc.public_url) {
            console.log(`   🔄 Attempting to use public URL...`);

            // Extract the actual storage path from the public URL
            const urlParts = doc.public_url.split('/storage/v1/object/sign/');
            if (urlParts.length > 1) {
              const pathWithToken = urlParts[1];
              const actualPath = pathWithToken.split('?')[0];
              console.log(`   📍 Extracted path: ${actualPath}`);

              // Update the storage_path in the database
              const { error: updateError } = await supabase
                .from('user_documents')
                .update({ storage_path: actualPath })
                .eq('id', doc.id);

              if (!updateError) {
                console.log(`   ✅ Updated storage path in database`);
              }
            }
          }
        } else {
          console.log(`   ✅ File exists in storage (${(fileData.size / 1024).toFixed(2)} KB)`);

          // Generate a fresh signed URL
          const { data: urlData, error: urlError } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 3600); // 1 hour expiry

          if (!urlError && urlData?.signedUrl) {
            console.log(`   🔗 Fresh signed URL generated`);

            // Update the public_url in the database
            const { error: updateError } = await supabase
              .from('user_documents')
              .update({ public_url: urlData.signedUrl })
              .eq('id', doc.id);

            if (!updateError) {
              console.log(`   ✅ Updated public URL in database`);
            }
          }
        }
      } else {
        console.log(`   ⚠️  No storage path recorded`);
      }
    }

    // Now let's check what files actually exist in the storage bucket
    console.log('\n\n📦 Checking Storage Bucket Contents...');
    console.log('='.repeat(60));

    const { data: files, error: listError } = await supabase.storage
      .from('user-documents')
      .list(userId, {
        limit: 100,
        offset: 0
      });

    if (listError) {
      console.log('❌ Error listing storage files:', listError.message);
    } else if (files && files.length > 0) {
      console.log(`\n✅ Found ${files.length} files in storage for this user:\n`);

      for (const file of files) {
        console.log(`   📁 ${file.name}`);
        console.log(`      Size: ${(file.metadata?.size / 1024).toFixed(2)} KB`);
        console.log(`      Modified: ${new Date(file.updated_at).toLocaleDateString('en-GB')}`);
      }
    } else {
      console.log('\n⚠️  No files found in storage bucket for this user');
      console.log('\nThis might mean:');
      console.log('1. Images were never uploaded to storage');
      console.log('2. Images were deleted from storage');
      console.log('3. Images are in a different bucket or path');
    }

    // Summary
    console.log('\n\n📊 Summary');
    console.log('='.repeat(60));
    console.log(`Database records: ${documents.length}`);
    console.log(`Storage files: ${files?.length || 0}`);

    if (documents.length > 0 && (!files || files.length === 0)) {
      console.log('\n⚠️  Issue Detected: Database has records but storage is empty');
      console.log('\n🔧 Recommended Solutions:');
      console.log('1. Re-upload images through the incident form');
      console.log('2. Use test images to populate the storage');
      console.log('3. Check if images are in a different storage bucket');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the check
checkAndFixImages().then(() => {
  console.log('\n✨ Check complete!\n');
});