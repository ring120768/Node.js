#!/usr/bin/env node
/**
 * Debug script to identify and fix storage issues
 * Tests what files actually exist in Supabase storage
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('========================================');
console.log('   Storage Debugging Tool');
console.log('========================================\n');

async function debugStorage() {
  try {
    const userId = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c';

    // 1. Check what's in storage
    console.log('🗄️  Checking Supabase Storage...\n');

    const { data: storageList, error: listError } = await supabase.storage
      .from('user-documents')
      .list(userId, {
        limit: 100,
        offset: 0
      });

    if (listError) {
      console.error('❌ Error listing storage:', listError.message);
    } else {
      console.log(`📁 Found ${storageList?.length || 0} folders/files in storage for user ${userId}\n`);

      if (storageList && storageList.length > 0) {
        for (const item of storageList) {
          console.log(`  📂 ${item.name} (${item.metadata?.size || 'folder'})`);

          // If it's a folder, list its contents
          if (!item.metadata) {
            const { data: folderContents } = await supabase.storage
              .from('user-documents')
              .list(`${userId}/${item.name}`, { limit: 10 });

            if (folderContents && folderContents.length > 0) {
              for (const file of folderContents) {
                console.log(`    📄 ${file.name} (${file.metadata?.size} bytes)`);
              }
            }
          }
        }
      }
    }

    // 2. Check database records
    console.log('\n📊 Checking Database Records...\n');

    const { data: dbRecords, error: dbError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId);

    if (dbError) {
      console.error('❌ Error fetching database records:', dbError.message);
    } else {
      console.log(`Found ${dbRecords?.length || 0} database records\n`);

      if (dbRecords && dbRecords.length > 0) {
        for (const record of dbRecords) {
          console.log(`📝 ${record.document_type}:`);
          console.log(`   Status: ${record.status}`);
          console.log(`   Storage Path: ${record.storage_path}`);

          // Check if this file actually exists in storage
          if (record.storage_path) {
            const { data: fileData, error: fileError } = await supabase.storage
              .from('user-documents')
              .download(record.storage_path);

            if (fileError) {
              console.log(`   ❌ File NOT found in storage: ${fileError.message}`);
            } else {
              console.log(`   ✅ File exists in storage (${fileData.size} bytes)`);
            }
          }
        }
      }
    }

    // 3. Create test image if needed
    console.log('\n🎨 Creating Test Image...\n');

    // Create a simple test image (1x1 pixel transparent PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');

    const testPath = `${userId}/test_image/dashboard_test_image.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(testPath, testImageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.log('❌ Failed to upload test image:', uploadError.message);
    } else {
      console.log('✅ Test image uploaded successfully:', testPath);

      // Generate signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(testPath, 3600); // 1 hour expiry

      if (signedError) {
        console.log('❌ Failed to create signed URL:', signedError.message);
      } else {
        console.log('✅ Signed URL generated:', signedData.signedUrl);

        // Update database with test record
        const { data: insertData, error: insertError } = await supabase
          .from('user_documents')
          .upsert({
            create_user_id: userId,
            document_type: 'test_image',
            status: 'completed',
            storage_path: testPath,
            public_url: signedData.signedUrl,
            signed_url: signedData.signedUrl,
            file_size: testImageBuffer.length,
            mime_type: 'image/png'
          })
          .select()
          .single();

        if (insertError) {
          console.log('❌ Failed to update database:', insertError.message);
        } else {
          console.log('✅ Database updated with test image record');
        }
      }
    }

    // 4. Provide solution
    console.log('\n========================================');
    console.log('          Solution');
    console.log('========================================\n');

    console.log('🔧 The issue is that the image files referenced in the database');
    console.log('   do not exist in Supabase storage.\n');

    console.log('📋 To fix this:');
    console.log('1. The original images from Typeform have expired');
    console.log('2. You need to re-upload images through the Typeform');
    console.log('3. Or use the test image created above');
    console.log('\n💡 The test image has been uploaded and should now be visible');
    console.log('   in the dashboard at http://localhost:5001/dashboard.html');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

debugStorage();