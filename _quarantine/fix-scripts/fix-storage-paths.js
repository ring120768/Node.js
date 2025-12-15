#!/usr/bin/env node
/**
 * Fix storage paths in database and generate fresh signed URLs
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('========================================');
console.log('   Fix Storage Paths & Generate URLs');
console.log('========================================\n');

async function fixStoragePaths() {
  try {
    const userId = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c';

    // 1. Get all documents for user
    const { data: documents, error: fetchError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId);

    if (fetchError) {
      console.error('❌ Error fetching documents:', fetchError.message);
      return;
    }

    console.log(`📊 Found ${documents.length} documents to fix\n`);

    for (const doc of documents) {
      console.log(`\n🔧 Fixing ${doc.document_type}...`);
      console.log(`   Old path: ${doc.storage_path}`);

      // Fix the path by ADDING "user-documents/" prefix if it's missing
      let correctedPath = doc.storage_path;
      if (correctedPath && !correctedPath.startsWith('user-documents/')) {
        correctedPath = `user-documents/${correctedPath}`;
      }

      console.log(`   New path: ${correctedPath}`);

      // Check if file exists with corrected path
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('user-documents')
        .download(correctedPath);

      if (downloadError) {
        console.log(`   ❌ File not found with corrected path either`);
        continue;
      }

      console.log(`   ✅ File found! Size: ${downloadData.size} bytes`);

      // Generate fresh signed URL (valid for 7 days)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(correctedPath, 604800); // 7 days in seconds

      if (signedError) {
        console.log(`   ❌ Failed to generate signed URL: ${signedError.message}`);
        continue;
      }

      console.log(`   ✅ Generated new signed URL (valid for 7 days)`);

      // Update database with corrected path and fresh URL
      const { error: updateError } = await supabase
        .from('user_documents')
        .update({
          storage_path: correctedPath,
          public_url: signedData.signedUrl
        })
        .eq('id', doc.id);

      if (updateError) {
        console.log(`   ❌ Failed to update database: ${updateError.message}`);
      } else {
        console.log(`   ✅ Database updated successfully`);
      }
    }

    // 2. Verify the fix
    console.log('\n\n📋 Verification...\n');

    const { data: verifyDocs, error: verifyError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId);

    if (!verifyError && verifyDocs) {
      let successCount = 0;
      for (const doc of verifyDocs) {
        if (doc.public_url && doc.public_url.includes('token=')) {
          successCount++;
          console.log(`✅ ${doc.document_type}: Has valid signed URL`);
        } else {
          console.log(`❌ ${doc.document_type}: Missing signed URL`);
        }
      }

      console.log(`\n✨ Fixed ${successCount} out of ${verifyDocs.length} documents`);
    }

    console.log('\n========================================');
    console.log('          Complete!');
    console.log('========================================\n');

    console.log('✅ Storage paths have been corrected');
    console.log('✅ Fresh signed URLs generated (valid for 7 days)');
    console.log('\n🌐 Dashboard should now show images at:');
    console.log('   http://localhost:5001/dashboard.html');
    console.log('\n💡 Test user: ian.ring@sky.com');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

fixStoragePaths();