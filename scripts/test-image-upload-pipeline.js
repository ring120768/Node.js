/**
 * Image Upload Pipeline Test (CORRECTED)
 *
 * Tests the complete image upload workflow:
 * 1. Upload to Supabase Storage (temp/ location)
 * 2. Create temp_uploads tracking record
 * 3. Retrieve temp uploads by session
 * 4. Generate signed URLs for preview
 * 5. Move to permanent storage (simulation)
 * 6. Create user_documents records
 * 7. Cleanup and expiry
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client (service role for admin operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration
const TEST_USER_ID = '1af483d1-35c3-4202-a50f-4b5a8aa631f7'; // Same test user from other scripts
const TEST_SESSION_ID = `test-session-${Date.now()}`;
const TEST_IMAGE_PAGES = ['page6', 'page8', 'page11'];

// Test counters
let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    if (details) console.log(`   ${details}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   ${details}`);
    failed++;
  }
}

// Helper: Create test image file (1x1 PNG)
function createTestImage() {
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);

  return {
    buffer: pngBuffer,
    mimeType: 'image/png',
    size: pngBuffer.length,
    filename: `test-image-${Date.now()}.png`,
    checksum: crypto.createHash('sha256').update(pngBuffer).digest('hex')
  };
}

// Helper: Upload to Supabase Storage (temp location)
async function uploadToTempStorage(sessionId, fieldName, imageData) {
  const timestamp = Date.now();
  const fileName = `temp/${sessionId}/${fieldName}_${timestamp}.png`;

  const { data, error } = await supabase.storage
    .from('user-documents')
    .upload(fileName, imageData.buffer, {
      contentType: imageData.mimeType,
      cacheControl: '3600',
      upsert: false
    });

  return { data, error, fileName };
}

// Helper: Create temp_uploads tracking record
async function createTempUploadRecord(sessionId, fieldName, storagePath, imageData) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const { data, error } = await supabase
    .from('temp_uploads')
    .insert([{
      session_id: sessionId,
      field_name: fieldName,
      storage_path: storagePath,
      file_size: imageData.size,
      mime_type: imageData.mimeType,
      uploaded_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      claimed: false
    }])
    .select()
    .single();

  return { data, error };
}

// Helper: Cleanup test data
async function cleanup(sessionId, userId) {
  // Delete temp uploads from database
  await supabase
    .from('temp_uploads')
    .delete()
    .eq('session_id', sessionId);

  // Delete temp files from storage (temp/ folder)
  const { data: tempFiles } = await supabase.storage
    .from('user-documents')
    .list(`temp/${sessionId}`);

  if (tempFiles && tempFiles.length > 0) {
    await supabase.storage
      .from('user-documents')
      .remove(tempFiles.map(f => `temp/${sessionId}/${f.name}`));
  }

  // Delete test user documents from database
  // Note: metadata is JSONB, so we filter by document_type = 'test_image'
  await supabase
    .from('user_documents')
    .delete()
    .eq('create_user_id', userId)
    .eq('document_type', 'test_image');

  // Delete permanent test files from storage
  const { data: permFiles } = await supabase.storage
    .from('user-documents')
    .list(userId);

  if (permFiles && permFiles.length > 0) {
    const testFiles = permFiles.filter(f => f.name.includes('test-image'));
    if (testFiles.length > 0) {
      await supabase.storage
        .from('user-documents')
        .remove(testFiles.map(f => `${userId}/${f.name}`));
    }
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 IMAGE UPLOAD PIPELINE TEST (CORRECTED)');
  console.log('='.repeat(70) + '\n');

  console.log(`📋 Test Configuration:`);
  console.log(`   User ID: ${TEST_USER_ID}`);
  console.log(`   Session ID: ${TEST_SESSION_ID}`);
  console.log(`   Pages to test: ${TEST_IMAGE_PAGES.join(', ')}\n`);

  try {
    // =====================================================
    // PHASE 1: PRE-TEST CLEANUP
    // =====================================================

    console.log('🧹 Phase 1: Pre-Test Cleanup\n');

    await cleanup(TEST_SESSION_ID, TEST_USER_ID);
    console.log('✅ Cleaned up any existing test data\n');

    // =====================================================
    // PHASE 2: TEMP STORAGE UPLOAD
    // =====================================================

    console.log('📦 Phase 2: Temp Storage Upload\n');

    // Test 2.1: Create test images
    const testImages = {};
    for (const page of TEST_IMAGE_PAGES) {
      testImages[page] = createTestImage();
    }

    test(
      'Test images created',
      Object.keys(testImages).length === 3,
      `Created ${Object.keys(testImages).length} test images`
    );

    // Test 2.2: Upload to Supabase Storage (temp/ location)
    const storageUploads = {};
    for (const page of TEST_IMAGE_PAGES) {
      const { data, error, fileName } = await uploadToTempStorage(
        TEST_SESSION_ID,
        page,
        testImages[page]
      );

      test(
        `Upload ${page} image to temp storage`,
        !error && data,
        error ? `Error: ${error.message}` : `Path: ${fileName}`
      );

      if (data) {
        storageUploads[page] = { path: data.path, fileName };
      }
    }

    // =====================================================
    // PHASE 3: TEMP_UPLOADS TABLE RECORDS
    // =====================================================

    console.log('\n💾 Phase 3: Temp Uploads Table Records\n');

    // Test 3.1: Create temp_uploads tracking records
    const tempUploadRecords = {};
    for (const page of TEST_IMAGE_PAGES) {
      if (!storageUploads[page]) continue;

      const { data, error } = await createTempUploadRecord(
        TEST_SESSION_ID,
        page,
        storageUploads[page].fileName,
        testImages[page]
      );

      test(
        `Create temp_uploads record for ${page}`,
        !error && data,
        error ? `Error: ${error.message}` : `ID: ${data.id}`
      );

      if (data) {
        tempUploadRecords[page] = data;
      }
    }

    // Test 3.2: Verify temp uploads exist
    const { data: tempUploads, error: fetchError } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('session_id', TEST_SESSION_ID);

    test(
      'Retrieve temp uploads by session',
      !fetchError && tempUploads && tempUploads.length === 3,
      `Found ${tempUploads?.length || 0} temp uploads`
    );

    // Test 3.3: Verify temp upload fields
    if (tempUploads && tempUploads.length > 0) {
      const firstUpload = tempUploads[0];

      test(
        'Temp upload has required fields',
        firstUpload.id &&
        firstUpload.session_id === TEST_SESSION_ID &&
        firstUpload.field_name &&
        firstUpload.storage_path &&
        firstUpload.file_size &&
        firstUpload.mime_type === 'image/png',
        `Fields: id, session_id, field_name, storage_path, file_size, mime_type`
      );

      test(
        'Temp upload has timestamps and expiry',
        firstUpload.uploaded_at && firstUpload.expires_at,
        `Uploaded: ${firstUpload.uploaded_at}, Expires: ${firstUpload.expires_at}`
      );

      test(
        'Temp upload is unclaimed initially',
        firstUpload.claimed === false && !firstUpload.claimed_by_user_id,
        'claimed=false, claimed_by_user_id=null'
      );
    }

    // =====================================================
    // PHASE 4: SIGNED URL GENERATION
    // =====================================================

    console.log('\n🔗 Phase 4: Signed URL Generation\n');

    // Test 4.1: Generate signed URLs for preview
    const signedUrls = {};
    for (const [page, record] of Object.entries(tempUploadRecords)) {
      const { data, error } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(record.storage_path, 3600); // 1 hour

      test(
        `Generate signed URL for ${page}`,
        !error && data && data.signedUrl,
        error ? `Error: ${error.message}` : 'URL generated successfully'
      );

      if (data) {
        signedUrls[page] = data.signedUrl;
      }
    }

    // Test 4.2: Verify URL format
    if (Object.keys(signedUrls).length > 0) {
      const firstUrl = Object.values(signedUrls)[0];

      test(
        'Signed URL has correct format',
        firstUrl.includes(process.env.SUPABASE_URL) &&
        firstUrl.includes('user-documents') &&
        firstUrl.includes('token='),
        'URL contains: base URL, bucket name, auth token'
      );
    }

    // Test 4.3: Test URL accessibility
    if (Object.keys(signedUrls).length > 0) {
      const firstUrl = Object.values(signedUrls)[0];
      const response = await fetch(firstUrl);

      test(
        'Signed URL is accessible',
        response.ok && response.status === 200,
        `HTTP ${response.status}`
      );
    }

    // =====================================================
    // PHASE 5: PERMANENT STORAGE MIGRATION
    // =====================================================

    console.log('\n🔄 Phase 5: Permanent Storage Migration\n');

    // Test 5.1: Move files to permanent location
    const permanentUploads = {};
    for (const page of TEST_IMAGE_PAGES) {
      if (!storageUploads[page]) continue;

      const sourcePath = storageUploads[page].fileName;
      const destPath = `${TEST_USER_ID}/test-image-${page}-${Date.now()}.png`;

      // Copy to permanent location
      const { data: copyData, error: copyError } = await supabase.storage
        .from('user-documents')
        .copy(sourcePath, destPath);

      test(
        `Copy ${page} to permanent storage`,
        !copyError,
        copyError ? `Error: ${copyError.message}` : `Copied to: ${destPath}`
      );

      if (!copyError) {
        permanentUploads[page] = destPath;
      }
    }

    // Test 5.2: Create user_documents records with signed URLs
    const documentRecords = [];
    for (const page of TEST_IMAGE_PAGES) {
      if (!permanentUploads[page]) continue;

      // Generate signed URL for this document (1 hour expiry)
      const { data: urlData } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(permanentUploads[page], 3600);

      const signedUrl = urlData?.signedUrl || null;
      const signedUrlExpiresAt = signedUrl
        ? new Date(Date.now() + 3600 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('user_documents')
        .insert([{
          create_user_id: TEST_USER_ID,
          document_type: 'test_image', // Required field
          original_filename: testImages[page].filename,
          mime_type: testImages[page].mimeType,
          file_size: testImages[page].size,
          storage_bucket: 'user-documents',
          storage_path: permanentUploads[page],
          status: 'completed',
          retry_count: 0,
          max_retries: 3,
          // URL fields (like imageProcessorV2 does)
          public_url: signedUrl,
          signed_url: signedUrl,
          signed_url_expires_at: signedUrlExpiresAt,
          metadata: {
            page_context: page,
            upload_source: 'test-script',
            test_run: true
          }
        }])
        .select()
        .single();

      test(
        `Create user_documents record for ${page}`,
        !error && data,
        error ? `Error: ${error.message}` : `Document ID: ${data.id}`
      );

      if (data) {
        documentRecords.push(data);
      }
    }

    // Test 5.3: Mark temp uploads as claimed
    for (const [page, record] of Object.entries(tempUploadRecords)) {
      const { error } = await supabase
        .from('temp_uploads')
        .update({
          claimed: true,
          claimed_by_user_id: TEST_USER_ID,
          claimed_at: new Date().toISOString()
        })
        .eq('id', record.id);

      test(
        `Mark ${page} temp upload as claimed`,
        !error,
        error ? `Error: ${error.message}` : 'Successfully claimed'
      );
    }

    // =====================================================
    // PHASE 6: PDF URL GENERATION
    // =====================================================

    console.log('\n📄 Phase 6: PDF URL Generation\n');

    // Test 6.1: Generate permanent signed URLs
    const pdfUrls = {};
    for (const doc of documentRecords) {
      const { data, error } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(doc.storage_path, 3600);

      const pageName = doc.metadata?.page_context || 'unknown';
      test(
        `Generate PDF URL for ${pageName}`,
        !error && data && data.signedUrl,
        error ? `Error: ${error.message}` : 'URL ready for PDF'
      );

      if (data && doc.metadata?.page_context) {
        pdfUrls[doc.metadata.page_context] = data.signedUrl;
      }
    }

    // Test 6.2: Simulate PDF data structure
    const pdfImageData = {
      page6: pdfUrls['page6'] || null,
      page8: pdfUrls['page8'] || null,
      page11: pdfUrls['page11'] || null
    };

    test(
      'PDF-ready image data structure',
      pdfImageData.page6 && pdfImageData.page8 && pdfImageData.page11,
      'All 3 page image URLs available for PDF embedding'
    );

    // =====================================================
    // PHASE 7: CLEANUP & EXPIRY
    // =====================================================

    console.log('\n🗑️  Phase 7: Cleanup & Expiry\n');

    // Test 7.1: Check temp upload expiry timestamps
    const uploadAge = Date.now() - new Date(tempUploads[0].uploaded_at).getTime();

    test(
      'Temp uploads have recent timestamp',
      uploadAge < 60000, // Less than 1 minute old
      `Upload age: ${Math.round(uploadAge / 1000)}s`
    );

    // Test 7.2: Verify temp files can be deleted
    const { data: tempFileList } = await supabase.storage
      .from('user-documents')
      .list(`temp/${TEST_SESSION_ID}`);

    test(
      'Temp files exist in storage',
      tempFileList && tempFileList.length === 3,
      `Found ${tempFileList?.length || 0} temp files`
    );

    // Test 7.3: Delete temp files from storage
    if (tempFileList && tempFileList.length > 0) {
      const filesToDelete = tempFileList.map(f => `temp/${TEST_SESSION_ID}/${f.name}`);
      const { error: deleteError } = await supabase.storage
        .from('user-documents')
        .remove(filesToDelete);

      test(
        'Delete temp files from storage',
        !deleteError,
        deleteError ? `Error: ${deleteError.message}` : 'Temp files cleaned up'
      );
    }

    // Test 7.4: Verify temp files deleted
    const { data: remainingFiles } = await supabase.storage
      .from('user-documents')
      .list(`temp/${TEST_SESSION_ID}`);

    test(
      'Temp files successfully deleted',
      !remainingFiles || remainingFiles.length === 0,
      'No temp files remaining in storage'
    );

    // Test 7.5: Permanent files still exist
    const { data: permanentDocs } = await supabase
      .from('user_documents')
      .select('id')
      .eq('create_user_id', TEST_USER_ID)
      .eq('document_type', 'test_image');

    test(
      'Permanent documents retained',
      permanentDocs && permanentDocs.length === 3,
      `${permanentDocs?.length || 0} permanent documents in database`
    );

    // =====================================================
    // PHASE 8: INTEGRATION TESTS
    // =====================================================

    console.log('\n🔄 Phase 8: Integration Tests\n');

    // Test 8.1: Complete workflow validation
    const workflowTest = {
      tempStorage: Object.keys(storageUploads).length === 3,
      tempRecords: Object.keys(tempUploadRecords).length === 3,
      signedUrls: Object.keys(signedUrls).length === 3,
      permanentStorage: Object.keys(permanentUploads).length === 3,
      databaseRecords: documentRecords.length === 3,
      pdfUrls: Object.keys(pdfUrls).length === 3,
      cleanup: !remainingFiles || remainingFiles.length === 0
    };

    test(
      'Complete workflow validation',
      Object.values(workflowTest).every(v => v === true),
      `Steps: ${Object.entries(workflowTest).map(([k, v]) => `${k}=${v}`).join(', ')}`
    );

    // Test 8.2: Verify claimed status
    const { data: claimedUploads } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('session_id', TEST_SESSION_ID)
      .eq('claimed', true);

    test(
      'Temp uploads marked as claimed',
      claimedUploads && claimedUploads.length === 3,
      `${claimedUploads?.length || 0} uploads claimed by user`
    );

    // =====================================================
    // PHASE 9: POST-TEST CLEANUP
    // =====================================================

    console.log('\n🧹 Phase 9: Post-Test Cleanup\n');

    await cleanup(TEST_SESSION_ID, TEST_USER_ID);

    // Verify cleanup
    const { data: afterCleanup } = await supabase
      .from('user_documents')
      .select('id')
      .eq('create_user_id', TEST_USER_ID)
      .eq('document_type', 'test_image');

    test(
      'Post-test cleanup successful',
      !afterCleanup || afterCleanup.length === 0,
      'All test data removed from database and storage'
    );

  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    console.error('Stack:', error.stack);
    failed++;
  }

  // =====================================================
  // SUMMARY
  // =====================================================

  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(70));

  const total = passed + failed;
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${percentage}%\n`);

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Image upload pipeline is working correctly.\n');
    console.log('✅ Temp storage uploads (temp/ folder)');
    console.log('✅ Temp uploads tracking table');
    console.log('✅ Signed URL generation for preview');
    console.log('✅ Migration to permanent storage');
    console.log('✅ User documents database records');
    console.log('✅ PDF URL generation');
    console.log('✅ Cleanup and expiry handling');
    console.log('✅ End-to-end integration workflow\n');
    console.log('👍 Safe to proceed with manual UI upload testing\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Review failures above before manual testing.\n`);
  }

  console.log('='.repeat(70) + '\n');

  // Exit with error code if tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests()
  .then(() => console.log('✅ Test execution complete'))
  .catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
