#!/usr/bin/env node

/**
 * Verify Recent Photo Uploads
 *
 * Checks recent temp_uploads and verifies:
 * 1. Records exist in temp_uploads table
 * 2. Files exist in Supabase Storage
 * 3. Signed URLs can be generated
 * 4. Session IDs are properly tracked
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyRecentUploads() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          VERIFY RECENT PHOTO UPLOADS                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get recent temp uploads (last 24 hours)
    console.log('📋 Step 1: Checking temp_uploads table...');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: uploads, error: uploadError } = await supabase
      .from('temp_uploads')
      .select('*')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    if (uploadError) {
      console.log('   ❌ Error querying temp_uploads:', uploadError.message);
      return;
    }

    if (!uploads || uploads.length === 0) {
      console.log('   ⚠️  No recent uploads found (last 24 hours)');
      console.log('   Try uploading photos through the UI first\n');
      return;
    }

    console.log(`   ✅ Found ${uploads.length} recent uploads\n`);

    // Group by session
    const sessionGroups = {};
    uploads.forEach(upload => {
      if (!sessionGroups[upload.session_id]) {
        sessionGroups[upload.session_id] = [];
      }
      sessionGroups[upload.session_id].push(upload);
    });

    console.log(`   📊 Sessions: ${Object.keys(sessionGroups).length}`);
    console.log('');

    // Step 2: Verify each upload
    let totalTested = 0;
    let storageVerified = 0;
    let signedUrlsGenerated = 0;
    let errors = [];

    for (const [sessionId, sessionUploads] of Object.entries(sessionGroups)) {
      console.log(`\n🔍 Session: ${sessionId}`);
      console.log(`   Uploads: ${sessionUploads.length}`);
      console.log('   ─────────────────────────────────────────────────────');

      for (const upload of sessionUploads) {
        totalTested++;

        const sizeKB = (upload.file_size / 1024).toFixed(2);
        console.log(`\n   📸 ${upload.field_name}`);
        console.log(`      File: ${upload.file_name}`);
        console.log(`      Size: ${sizeKB} KB`);
        console.log(`      Storage: ${upload.storage_path}`);
        console.log(`      Claimed: ${upload.claimed ? '✅ Yes' : '⚠️  No'}`);

        // Verify storage exists
        const { data: fileExists, error: storageError } = await supabase.storage
          .from('user-documents')
          .list('', {
            search: upload.storage_path
          });

        if (storageError) {
          console.log(`      Storage: ❌ Error - ${storageError.message}`);
          errors.push({ field: upload.field_name, error: storageError.message });
          continue;
        }

        if (fileExists && fileExists.length > 0) {
          console.log(`      Storage: ✅ File exists`);
          storageVerified++;

          // Try to generate signed URL
          const { data: signedUrl, error: urlError } = await supabase.storage
            .from('user-documents')
            .createSignedUrl(upload.storage_path, 3600);

          if (urlError) {
            console.log(`      Signed URL: ❌ Error - ${urlError.message}`);
            errors.push({ field: upload.field_name, error: urlError.message });
          } else {
            console.log(`      Signed URL: ✅ Generated`);
            signedUrlsGenerated++;
          }
        } else {
          console.log(`      Storage: ❌ File not found`);
          errors.push({ field: upload.field_name, error: 'File not in storage' });
        }
      }
    }

    // Summary
    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   VERIFICATION SUMMARY                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Statistics:`);
    console.log(`   Total uploads tested: ${totalTested}`);
    console.log(`   Storage verified: ${storageVerified}/${totalTested} (${Math.round(storageVerified/totalTested*100)}%)`);
    console.log(`   Signed URLs generated: ${signedUrlsGenerated}/${totalTested} (${Math.round(signedUrlsGenerated/totalTested*100)}%)`);
    console.log('');

    if (errors.length > 0) {
      console.log(`⚠️  Errors encountered: ${errors.length}`);
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.field}: ${err.error}`);
      });
      console.log('');
    }

    // Overall status
    if (storageVerified === totalTested && signedUrlsGenerated === totalTested) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('   - All uploads have database records');
      console.log('   - All files exist in Supabase Storage');
      console.log('   - All signed URLs generated successfully');
    } else if (storageVerified > 0) {
      console.log('⚠️  PARTIAL SUCCESS');
      console.log(`   - ${storageVerified}/${totalTested} files in storage`);
      console.log(`   - ${signedUrlsGenerated}/${totalTested} signed URLs working`);
    } else {
      console.log('❌ TESTS FAILED');
      console.log('   No files found in storage');
    }

    console.log('\n📋 Next Steps:\n');
    if (storageVerified === totalTested) {
      console.log('1. ✅ Photo upload working correctly');
      console.log('2. Test complete form submission with finalization');
      console.log('3. Verify photos appear in PDF generation');
    } else {
      console.log('1. Check upload endpoint logs for errors');
      console.log('2. Verify Supabase Storage bucket permissions');
      console.log('3. Re-upload photos through UI');
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

verifyRecentUploads().catch(console.error);
