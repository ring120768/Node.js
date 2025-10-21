#!/usr/bin/env node

/**
 * Fix Image Paths - Final Solution
 *
 * The files are stored with timestamp prefixes like:
 * 1760653683931_driving_license_picture.jpeg
 *
 * And they're in subfolders by document type
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function fixImagePathsFinal() {
  try {
    log(colors.cyan, '\n🔧 Final Fix for Image Paths\n');
    log(colors.cyan, '========================================\n');

    const userId = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c';

    // Get documents from database
    const { data: documents, error: fetchError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId);

    if (fetchError) {
      log(colors.red, `❌ Error fetching documents: ${fetchError.message}`);
      return;
    }

    log(colors.green, `Found ${documents.length} documents to fix\n`);

    let successCount = 0;

    // Map of document types to their actual filenames in storage
    const fileMapping = {
      'driving_license_picture': '1760653683931_driving_license_picture.jpeg',
      'vehicle_picture_front': '1760653683800_vehicle_picture_front.jpeg',
      'vehicle_picture_back': '1760653683904_vehicle_picture_back.jpeg',
      'vehicle_picture_passenger_side': '1760653683912_vehicle_picture_passenger_side.jpeg',
      'vehicle_picture_driver_side': '1760653683894_vehicle_picture_driver_side.jpeg'
    };

    for (const doc of documents) {
      log(colors.cyan, `\n🔧 Fixing: ${doc.document_type}`);

      // Get the correct filename from our mapping
      const filename = fileMapping[doc.document_type];

      if (!filename) {
        log(colors.red, `   ❌ No filename mapping for ${doc.document_type}`);
        continue;
      }

      // The correct storage path is: userId/document_type/filename
      const correctPath = `${userId}/${doc.document_type}/${filename}`;

      log(colors.yellow, `   Storage path: ${correctPath}`);

      // Generate a signed URL for this path
      const { data: signedData, error: signedError } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(correctPath, 604800); // 7 days

      if (signedError) {
        log(colors.red, `   ❌ Failed to create signed URL: ${signedError.message}`);
        continue;
      }

      log(colors.green, `   ✅ Generated signed URL`);

      // Update the document with the correct path and fresh URL
      const { error: updateError } = await supabase
        .from('user_documents')
        .update({
          storage_path: correctPath,
          public_url: signedData.signedUrl,
          storage_bucket: 'user-documents',
          original_filename: filename,
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id);

      if (updateError) {
        log(colors.red, `   ❌ Failed to update database: ${updateError.message}`);
      } else {
        log(colors.green, `   ✅ Updated database successfully`);
        successCount++;
      }
    }

    // Verify the fix
    log(colors.cyan, '\n📋 Verification...\n');

    const { data: verifyDocs } = await supabase
      .from('user_documents')
      .select('document_type, storage_path, public_url')
      .eq('create_user_id', userId);

    if (verifyDocs) {
      for (const doc of verifyDocs) {
        const hasValidUrl = doc.public_url && doc.public_url.includes('token=');
        if (hasValidUrl) {
          log(colors.green, `✅ ${doc.document_type}: Has valid signed URL`);
        } else {
          log(colors.red, `❌ ${doc.document_type}: Missing valid URL`);
        }
      }
    }

    // Summary
    log(colors.cyan, '\n========================================');
    log(colors.cyan, '                SUMMARY');
    log(colors.cyan, '========================================\n');

    if (successCount === documents.length) {
      log(colors.green, `✅ All ${successCount} documents fixed successfully!`);
      log(colors.green, '\n🎉 Images should now display correctly in the dashboard!');
    } else {
      log(colors.yellow, `⚠️  Fixed ${successCount} out of ${documents.length} documents`);
    }

    log(colors.cyan, '\n🌐 Test the dashboard at:');
    log(colors.cyan, '   http://localhost:5001/dashboard.html');
    log(colors.cyan, '   http://localhost:5001/test-images.html');
    log(colors.cyan, '   http://localhost:5001/dashboard-with-auth.html\n');

  } catch (error) {
    log(colors.red, `\n❌ Unexpected error: ${error.message}`);
    console.error(error);
  }
}

// Run the fix
fixImagePathsFinal().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});