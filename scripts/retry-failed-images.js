#!/usr/bin/env node

/**
 * Retry Failed Images Script
 * Processes failed image uploads and retries them
 *
 * Usage:
 *   node scripts/retry-failed-images.js [--limit=10] [--dry-run]
 *
 * Options:
 *   --limit=N    Maximum number of images to retry (default: 10)
 *   --dry-run    Show what would be retried without actually doing it
 *
 * Cron Example (run every 30 minutes):
 *   */30 * * * * cd /path/to/app && node scripts/retry-failed-images.js >> logs/retry.log 2>&1
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ImageRetryService = require('../src/services/imageRetryService');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 10,
  dryRun: false
};

args.forEach(arg => {
  if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1], 10);
  }
  if (arg === '--dry-run') {
    options.dryRun = true;
  }
});

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('RETRY FAILED IMAGES');
  console.log('='.repeat(80));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Options: ${JSON.stringify(options, null, 2)}`);
  console.log('='.repeat(80) + '\n');

  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Create retry service
    const retryService = new ImageRetryService(supabase);

    // Get statistics before retry
    console.log('📊 Pre-Retry Statistics:');
    console.log('-'.repeat(40));
    const statsBefore = await retryService.getRetryStatistics();
    console.log(JSON.stringify(statsBefore, null, 2));
    console.log('-'.repeat(40) + '\n');

    if (options.dryRun) {
      // Dry run - just show what would be retried
      console.log('🔍 DRY RUN MODE - No changes will be made\n');

      const documents = await retryService.getDocumentsNeedingRetry(options.limit);

      if (documents.length === 0) {
        console.log('✅ No documents need retry\n');
      } else {
        console.log(`Found ${documents.length} documents that would be retried:\n`);

        documents.forEach((doc, index) => {
          console.log(`[${index + 1}] Document ID: ${doc.id}`);
          console.log(`    User: ${doc.create_user_id}`);
          console.log(`    Type: ${doc.document_type}`);
          console.log(`    Retry Count: ${doc.retry_count}/${doc.max_retries}`);
          console.log(`    Last Error: ${doc.error_message || 'None'}`);
          console.log(`    Next Retry: ${doc.next_retry_at || 'Now'}`);
          console.log('');
        });
      }
    } else {
      // Actually process retries
      console.log(`🔄 Processing retry queue (limit: ${options.limit})...\n`);

      const results = await retryService.processRetryQueue(options.limit);

      console.log('\n' + '='.repeat(80));
      console.log('RETRY RESULTS');
      console.log('='.repeat(80));
      console.log(`Processed: ${results.processed}`);
      console.log(`✅ Succeeded: ${results.succeeded}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`⛔ Permanently Failed: ${results.permanentlyFailed}`);
      console.log(`⏱️  Duration: ${results.duration}ms`);
      console.log('='.repeat(80) + '\n');

      // Show individual results
      if (results.results && results.results.length > 0) {
        console.log('Individual Results:');
        console.log('-'.repeat(40));
        results.results.forEach((result, index) => {
          const status = result.status === 'completed' ? '✅' :
                        result.status === 'failed' ? '❌' : '⛔';
          console.log(`${status} [${index + 1}] ${result.documentId}: ${result.status}`);
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
          if (result.nextRetryAt) {
            console.log(`   Next Retry: ${result.nextRetryAt}`);
          }
        });
        console.log('-'.repeat(40) + '\n');
      }

      // Get statistics after retry
      console.log('📊 Post-Retry Statistics:');
      console.log('-'.repeat(40));
      const statsAfter = await retryService.getRetryStatistics();
      console.log(JSON.stringify(statsAfter, null, 2));
      console.log('-'.repeat(40) + '\n');
    }

    console.log('='.repeat(80));
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n' + '!'.repeat(80));
    console.error('ERROR');
    console.error('!'.repeat(80));
    console.error(`Message: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error('!'.repeat(80) + '\n');
    process.exit(1);
  }
}

// Run the script
main();
