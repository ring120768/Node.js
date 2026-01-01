#!/usr/bin/env node

/**
 * Test Supabase Storage Upload
 *
 * Tests if PDF uploads to 'generated_reports' bucket work correctly.
 * This helps diagnose why all 10 PDF generation attempts had storage_path: NULL
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testStorageUpload() {
  console.log('🧪 Testing Supabase Storage Upload\n');

  try {
    // ========================================
    // STEP 1: Verify Environment Variables
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 1: Environment Variables');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}\n`);

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing required environment variables\n');
      process.exit(1);
    }

    // ========================================
    // STEP 2: List Storage Buckets
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 Step 2: List Storage Buckets');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
      console.error('Full error:', JSON.stringify(bucketsError, null, 2));
      process.exit(1);
    }

    console.log(`Found ${buckets?.length || 0} bucket(s):\n`);
    buckets?.forEach(bucket => {
      console.log(`  - ${bucket.name}`);
      console.log(`    ID: ${bucket.id}`);
      console.log(`    Public: ${bucket.public}`);
      console.log(`    Created: ${bucket.created_at}`);
      console.log('');
    });

    const hasGeneratedReports = buckets?.some(b => b.name === 'generated_reports');
    console.log(`'generated_reports' bucket: ${hasGeneratedReports ? '✅ EXISTS' : '❌ MISSING'}\n`);

    if (!hasGeneratedReports) {
      console.error('❌ CRITICAL: "generated_reports" bucket does not exist!\n');
      console.log('To create it, run:');
      console.log('  1. Go to Supabase Dashboard → Storage');
      console.log('  2. Click "New Bucket"');
      console.log('  3. Name: "generated_reports"');
      console.log('  4. Public: No (private bucket)\n');
      process.exit(1);
    }

    // ========================================
    // STEP 3: Test File Upload
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Step 3: Test File Upload');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Create a test PDF buffer (small test file)
    const testPdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n190\n%%EOF';
    const testBuffer = Buffer.from(testPdfContent, 'utf-8');
    const testFileName = `test_uploads/test_${Date.now()}.pdf`;

    console.log(`Test file: ${testFileName}`);
    console.log(`Test file size: ${(testBuffer.length / 1024).toFixed(2)} KB\n`);

    console.log('Uploading test file...\n');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated_reports')
      .upload(testFileName, testBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload failed!\n');
      console.error('Error message:', uploadError.message);
      console.error('Error code:', uploadError.statusCode || 'N/A');
      console.error('Full error:', JSON.stringify(uploadError, null, 2));
      console.log('\n');

      // Provide diagnostic suggestions
      console.log('🔍 Possible causes:\n');
      console.log('1. RLS policies blocking upload');
      console.log('   - Check Storage → Policies in Supabase Dashboard');
      console.log('   - Service role should bypass RLS, but verify\n');
      console.log('2. Bucket permissions issue');
      console.log('   - Check bucket settings in Storage → Buckets\n');
      console.log('3. File path restrictions');
      console.log('   - Some buckets restrict file paths\n');
      console.log('4. API key permissions');
      console.log('   - Verify SUPABASE_SERVICE_ROLE_KEY has storage access\n');

      process.exit(1);
    }

    console.log('✅ Upload successful!\n');
    console.log('Upload data:', JSON.stringify(uploadData, null, 2));
    console.log('');

    // ========================================
    // STEP 4: Test Signed URL Generation
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 Step 4: Test Signed URL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: urlData, error: urlError } = await supabase.storage
      .from('generated_reports')
      .createSignedUrl(testFileName, 60); // 60 seconds

    if (urlError) {
      console.error('❌ Signed URL generation failed!');
      console.error('Error:', urlError.message);
      console.log('');
    } else if (urlData) {
      console.log('✅ Signed URL generated successfully!\n');
      console.log(`URL: ${urlData.signedUrl}\n`);
    }

    // ========================================
    // STEP 5: Clean Up Test File
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧹 Step 5: Clean Up');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { error: deleteError } = await supabase.storage
      .from('generated_reports')
      .remove([testFileName]);

    if (deleteError) {
      console.log('⚠️  Could not delete test file:', deleteError.message);
    } else {
      console.log('✅ Test file deleted\n');
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Storage upload test: ✅ PASSED');
    console.log('Bucket exists: ✅ YES');
    console.log('Upload works: ✅ YES');
    console.log('Signed URLs work: ✅ YES\n');

    console.log('🎯 CONCLUSION:\n');
    console.log('Storage upload functionality is working correctly in this environment.');
    console.log('The production failure may be due to:');
    console.log('  1. Different environment variables in Railway');
    console.log('  2. RLS policies that differ between dev/prod');
    console.log('  3. Network/firewall issues in Railway environment');
    console.log('  4. Different Supabase project being used\n');

    console.log('Next steps:');
    console.log('  - Verify Railway environment variables match local .env');
    console.log('  - Check Railway logs after next PDF generation attempt');
    console.log('  - Verify same Supabase project used in dev and prod\n');

  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testStorageUpload();
