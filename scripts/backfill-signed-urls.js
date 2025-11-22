#!/usr/bin/env node
/**
 * Backfill signed URLs for existing user_documents records
 *
 * This script:
 * 1. Finds all completed documents with storage_path but no signed_url
 * 2. Generates fresh signed URLs (24 hour expiry)
 * 3. Updates records with signed_url and signed_url_expires_at
 *
 * Usage:
 *   node scripts/backfill-signed-urls.js --dry-run  # Preview changes
 *   node scripts/backfill-signed-urls.js            # Execute backfill
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
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');

/**
 * Generate signed URL for a storage path
 */
async function generateSignedUrl(storagePath) {
  try {
    const bucket = 'user-documents';

    // Remove bucket prefix if present
    let path = storagePath;
    if (path.startsWith('user-documents/')) {
      path = path.replace('user-documents/', '');
    }

    const expirySeconds = 31536000; // 365 days (12 months to match subscription)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expirySeconds);

    if (error) {
      throw error;
    }

    const expiresAt = new Date(Date.now() + (expirySeconds * 1000));

    return {
      signedUrl: data.signedUrl,
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

/**
 * Main backfill function
 */
async function backfillSignedUrls() {
  console.log(colors.cyan, '\n🔄 Backfilling signed URLs for existing documents...\n', colors.reset);

  if (isDryRun) {
    console.log(colors.yellow, '⚠️  DRY RUN MODE - No changes will be made\n', colors.reset);
  }

  try {
    // Step 1: Find documents that need backfilling
    console.log('📊 Fetching documents without signed URLs...\n');

    const { data: documents, error } = await supabase
      .from('user_documents')
      .select('id, storage_path, document_type, create_user_id, created_at')
      .eq('status', 'completed')
      .is('deleted_at', null)
      .not('storage_path', 'is', null)
      .or('signed_url.is.null,signed_url_expires_at.is.null');

    if (error) {
      throw error;
    }

    if (!documents || documents.length === 0) {
      console.log(colors.green, '✅ No documents need backfilling. All signed URLs are up to date!', colors.reset);
      return;
    }

    console.log(colors.magenta, `Found ${documents.length} documents to process\n`, colors.reset);

    // Step 2: Process each document
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const doc of documents) {
      try {
        console.log(`Processing: ${doc.id} (${doc.document_type})`);

        // Generate signed URL
        const { signedUrl, expiresAt } = await generateSignedUrl(doc.storage_path);

        console.log(`  ├─ Generated signed URL (expires: ${expiresAt})`);
        console.log(`  ├─ URL: ${signedUrl.substring(0, 60)}...`);

        // Update database (unless dry run)
        if (!isDryRun) {
          const { error: updateError } = await supabase
            .from('user_documents')
            .update({
              signed_url: signedUrl,
              signed_url_expires_at: expiresAt,
              public_url: signedUrl, // Also update public_url for backwards compatibility
              updated_at: new Date().toISOString()
            })
            .eq('id', doc.id);

          if (updateError) {
            throw updateError;
          }

          console.log(colors.green, '  └─ ✅ Updated successfully\n', colors.reset);
        } else {
          console.log(colors.yellow, '  └─ ⚠️  Skipped (dry run)\n', colors.reset);
        }

        successCount++;

      } catch (error) {
        errorCount++;
        errors.push({
          documentId: doc.id,
          documentType: doc.document_type,
          error: error.message
        });
        console.log(colors.red, `  └─ ❌ Error: ${error.message}\n`, colors.reset);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 3: Summary
    console.log('\n' + '─'.repeat(80));
    console.log(colors.cyan, '\n📈 Backfill Summary:\n', colors.reset);
    console.log(`  Total documents: ${documents.length}`);
    console.log(colors.green, `  ✅ Successful: ${successCount}`, colors.reset);
    if (errorCount > 0) {
      console.log(colors.red, `  ❌ Failed: ${errorCount}`, colors.reset);
    }

    if (errors.length > 0) {
      console.log(colors.red, '\n❌ Errors encountered:\n', colors.reset);
      errors.forEach(err => {
        console.log(`  - Document ${err.documentId} (${err.documentType}): ${err.error}`);
      });
    }

    if (isDryRun) {
      console.log(colors.yellow, '\n⚠️  Dry run complete. Run without --dry-run to apply changes.', colors.reset);
    } else {
      console.log(colors.green, '\n✅ Backfill complete!', colors.reset);
    }

    console.log('\n');

  } catch (error) {
    console.log(colors.red, `\n❌ Fatal error: ${error.message}`, colors.reset);
    console.error(error);
    process.exit(1);
  }
}

// Run the backfill
backfillSignedUrls().catch(error => {
  console.error(colors.red, '\n❌ Unhandled error:', error, colors.reset);
  process.exit(1);
});
