/**
 * Upload APK to Supabase Storage and generate signed URL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadApkAndGenerateUrl() {
  try {
    const apkPath = path.join(__dirname, 'android/app/build/outputs/apk/release/app-release.apk');

    // Check if file exists
    if (!fs.existsSync(apkPath)) {
      throw new Error(`APK file not found at: ${apkPath}`);
    }

    const fileStats = fs.statSync(apkPath);
    console.log(`📦 APK file size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Read the APK file
    const apkBuffer = fs.readFileSync(apkPath);
    console.log('✅ APK file read successfully');

    // Upload to Supabase Storage using chunked/resumable upload
    const bucketName = 'user-documents';
    const filePath = 'public/CarCrashLawyerAI.apk';

    console.log(`⬆️  Uploading to ${bucketName}/${filePath} (using resumable upload for large file)...`);

    // For files > 50MB, we need to use a stream or chunks
    // First, let's try removing the old file if it exists
    const { error: removeError } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (removeError && !removeError.message.includes('not found')) {
      console.log('⚠️  Warning removing old file:', removeError.message);
    } else {
      console.log('🗑️  Old file removed (if existed)');
    }

    // Now upload with chunked option
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, apkBuffer, {
        contentType: 'application/vnd.android.package-archive',
        upsert: false,  // We already removed it
        duplex: 'half'  // Enable streaming for large files
      });

    if (uploadError) {
      // If still fails, try alternative: upload via URL with fetch
      console.log('⚠️  Standard upload failed, trying alternative method...');

      // Get upload URL
      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucketName)
        .createSignedUploadUrl(filePath);

      if (urlError) {
        throw new Error(`Failed to get upload URL: ${urlError.message}`);
      }

      // Upload directly to signed URL
      const uploadResponse = await fetch(urlData.signedUrl, {
        method: 'PUT',
        body: apkBuffer,
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Length': fileStats.size.toString()
        }
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Direct upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
      }

      console.log('✅ APK uploaded successfully via signed URL');
    } else {
      console.log('✅ APK uploaded successfully');
    }

    // Generate signed URL (valid for 7 days)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 604800); // 7 days in seconds

    if (signedUrlError) {
      throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`);
    }

    console.log('\n🎉 SUCCESS! New signed URL generated:\n');
    console.log(signedUrlData.signedUrl);
    console.log('\n📅 Valid for: 7 days (expires:', new Date(Date.now() + 604800000).toISOString(), ')');
    console.log('\n✉️  Share this link with your users to download the updated APK with:');
    console.log('   - DOB picker defaulting to 1990 (easier navigation)');
    console.log('   - Camera access enabled on photo upload pages');

    return signedUrlData.signedUrl;

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the upload
uploadApkAndGenerateUrl();
