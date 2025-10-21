#!/usr/bin/env node

/**
 * Fix Image Paths V2
 *
 * The issue: Images are stored in nested folders like:
 * user-documents/199d9251-b2e0-40a5-80bf-fc1529d9bf6c/vehicle_picture_front/1760653683800_vehicle_picture_front.jpeg
 *
 * But we need to check if the files actually exist at these paths
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

async function fixImagePaths() {
  try {
    log(colors.cyan, '\n🔧 Fixing Image Paths - V2\n');
    log(colors.cyan, '========================================\n');

    const userId = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c';

    // Step 1: List all files in the user's directory
    log(colors.cyan, '📁 Checking actual files in storage...\n');

    const { data: files, error: listError } = await supabase.storage
      .from('user-documents')
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      log(colors.red, `❌ Error listing files: ${listError.message}`);
      return;
    }

    log(colors.green, `Found ${files.length} items in user directory\n`);

    // List subdirectories
    for (const item of files) {
      if (!item.id) {
        // This is a folder
        log(colors.yellow, `📂 Folder: ${item.name}`);

        // List files in this subfolder
        const subPath = `${userId}/${item.name}`;
        const { data: subFiles, error: subError } = await supabase.storage
          .from('user-documents')
          .list(subPath, {
            limit: 100,
            offset: 0
          });

        if (!subError && subFiles) {
          for (const subFile of subFiles) {
            if (subFile.id) {
              log(colors.green, `   📄 File: ${subFile.name}`);
            }
          }
        }
      } else {
        // This is a file
        log(colors.green, `📄 File: ${item.name}`);
      }
    }

    // Step 2: Get documents from database
    log(colors.cyan, '\n📊 Fetching documents from database...\n');

    const { data: documents, error: fetchError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId);

    if (fetchError) {
      log(colors.red, `❌ Error fetching documents: ${fetchError.message}`);
      return;
    }

    log(colors.green, `Found ${documents.length} documents in database\n`);

    // Step 3: Fix each document
    let successCount = 0;

    for (const doc of documents) {
      log(colors.cyan, `\n🔧 Processing: ${doc.document_type}`);
      log(colors.yellow, `   Current storage_path: ${doc.storage_path}`);

      // Extract the filename from the original URL
      let filename = null;
      if (doc.original_url || doc.public_url) {
        const url = doc.original_url || doc.public_url;
        const match = url.match(/(\d+_[^\/]+\.(jpeg|jpg|png))$/i);
        if (match) {
          filename = match[1];
        }
      }

      if (!filename && doc.original_filename) {
        filename = doc.original_filename;
      }

      log(colors.yellow, `   Extracted filename: ${filename}`);

      if (!filename) {
        log(colors.red, `   ❌ Could not extract filename`);
        continue;
      }

      // Try different path combinations
      const pathsToTry = [
        `${userId}/${doc.document_type}/${filename}`,
        `${userId}/${filename}`,
        `user-documents/${userId}/${doc.document_type}/${filename}`,
        `user-documents/${userId}/${filename}`
      ];

      let workingPath = null;
      let publicUrl = null;

      for (const path of pathsToTry) {
        log(colors.yellow, `   Trying path: ${path}`);

        // Try to get a signed URL for this path
        const { data: signedData, error: signedError } = await supabase.storage
          .from('user-documents')
          .createSignedUrl(path.replace('user-documents/', ''), 604800); // 7 days

        if (!signedError && signedData) {
          log(colors.green, `   ✅ Found working path!`);
          workingPath = path;
          publicUrl = signedData.signedUrl;
          break;
        }
      }

      if (workingPath && publicUrl) {
        // Update the document with the working path
        const { error: updateError } = await supabase
          .from('user_documents')
          .update({
            storage_path: workingPath.replace('user-documents/', ''),
            public_url: publicUrl,
            storage_bucket: 'user-documents',
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.id);

        if (updateError) {
          log(colors.red, `   ❌ Failed to update database: ${updateError.message}`);
        } else {
          log(colors.green, `   ✅ Updated successfully with working path`);
          successCount++;
        }
      } else {
        log(colors.red, `   ❌ Could not find file in any location`);
      }
    }

    // Step 4: Summary
    log(colors.cyan, '\n========================================');
    log(colors.cyan, '                SUMMARY');
    log(colors.cyan, '========================================\n');

    log(colors.green, `✅ Successfully fixed ${successCount} out of ${documents.length} documents`);

    if (successCount === documents.length) {
      log(colors.green, '\n🎉 All images are now properly configured!');
      log(colors.green, '🌐 Dashboard should display images at:');
      log(colors.green, '   http://localhost:5001/dashboard.html');
    } else {
      log(colors.yellow, `\n⚠️  Some images could not be fixed`);
      log(colors.yellow, 'These may need to be re-uploaded');
    }

  } catch (error) {
    log(colors.red, `\n❌ Unexpected error: ${error.message}`);
    console.error(error);
  }
}

// Run the fix
fixImagePaths().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});