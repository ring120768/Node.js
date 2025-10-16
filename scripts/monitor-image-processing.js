#!/usr/bin/env node

/**
 * Image Processing Monitoring Script
 * Monitors the status of image processing pipeline
 *
 * Usage:
 *   node scripts/monitor-image-processing.js [--detailed] [--user=USER_ID]
 *
 * Options:
 *   --detailed      Show detailed information about each status
 *   --user=USER_ID  Filter by specific user ID
 *   --show-failed   Show details of failed documents
 *
 * Cron Example (run every hour):
 *   0 * * * * cd /path/to/app && node scripts/monitor-image-processing.js >> logs/monitor.log 2>&1
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  detailed: false,
  userId: null,
  showFailed: false
};

args.forEach(arg => {
  if (arg === '--detailed') {
    options.detailed = true;
  }
  if (arg.startsWith('--user=')) {
    options.userId = arg.split('=')[1];
  }
  if (arg === '--show-failed') {
    options.showFailed = true;
  }
});

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('IMAGE PROCESSING MONITORING');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  if (options.userId) {
    console.log(`User Filter: ${options.userId}`);
  }
  console.log('='.repeat(80) + '\n');

  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Build base query
    let query = supabase
      .from('user_documents')
      .select('*')
      .is('deleted_at', null);

    if (options.userId) {
      query = query.eq('create_user_id', options.userId);
    }

    const { data: documents, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    // Calculate statistics
    const stats = {
      total: documents.length,
      byStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
      },
      byDocumentType: {},
      byCategory: {},
      byErrorCode: {},
      totalFileSize: 0,
      avgProcessingTime: 0,
      needingRetry: 0,
      permanentlyFailed: 0
    };

    let totalProcessingTime = 0;
    let completedCount = 0;
    const failedDocuments = [];

    documents.forEach(doc => {
      // Count by status
      stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;

      // Count by document type
      stats.byDocumentType[doc.document_type] = (stats.byDocumentType[doc.document_type] || 0) + 1;

      // Count by category
      stats.byCategory[doc.document_category] = (stats.byCategory[doc.document_category] || 0) + 1;

      // Count by error code
      if (doc.error_code) {
        stats.byErrorCode[doc.error_code] = (stats.byErrorCode[doc.error_code] || 0) + 1;
      }

      // Sum file sizes
      if (doc.file_size) {
        stats.totalFileSize += doc.file_size;
      }

      // Calculate processing time
      if (doc.status === 'completed' && doc.processing_duration_ms) {
        totalProcessingTime += doc.processing_duration_ms;
        completedCount++;
      }

      // Check retry status
      if (doc.status === 'failed') {
        if (doc.retry_count < doc.max_retries) {
          stats.needingRetry++;
        } else {
          stats.permanentlyFailed++;
        }

        // Collect failed documents for detailed view
        if (options.showFailed) {
          failedDocuments.push(doc);
        }
      }
    });

    // Calculate average processing time
    if (completedCount > 0) {
      stats.avgProcessingTime = Math.round(totalProcessingTime / completedCount);
    }

    // Display overview
    console.log('📊 OVERVIEW');
    console.log('-'.repeat(80));
    console.log(`Total Documents: ${stats.total}`);
    console.log(`Total File Size: ${formatBytes(stats.totalFileSize)}`);
    console.log(`Avg Processing Time: ${stats.avgProcessingTime}ms`);
    console.log('');

    // Display status breakdown
    console.log('📈 STATUS BREAKDOWN');
    console.log('-'.repeat(80));
    console.log(`✅ Completed:  ${stats.byStatus.completed} (${percentage(stats.byStatus.completed, stats.total)}%)`);
    console.log(`⏳ Pending:    ${stats.byStatus.pending} (${percentage(stats.byStatus.pending, stats.total)}%)`);
    console.log(`🔄 Processing: ${stats.byStatus.processing} (${percentage(stats.byStatus.processing, stats.total)}%)`);
    console.log(`❌ Failed:     ${stats.byStatus.failed} (${percentage(stats.byStatus.failed, stats.total)}%)`);
    console.log('');

    // Display retry information
    if (stats.byStatus.failed > 0) {
      console.log('🔁 RETRY STATUS');
      console.log('-'.repeat(80));
      console.log(`Needing Retry: ${stats.needingRetry}`);
      console.log(`Permanently Failed: ${stats.permanentlyFailed}`);
      console.log('');
    }

    // Display document type breakdown
    if (options.detailed && Object.keys(stats.byDocumentType).length > 0) {
      console.log('📄 DOCUMENT TYPES');
      console.log('-'.repeat(80));
      Object.entries(stats.byDocumentType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`${type.padEnd(30)} : ${count}`);
        });
      console.log('');
    }

    // Display category breakdown
    if (options.detailed && Object.keys(stats.byCategory).length > 0) {
      console.log('📂 DOCUMENT CATEGORIES');
      console.log('-'.repeat(80));
      Object.entries(stats.byCategory)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, count]) => {
          console.log(`${category.padEnd(30)} : ${count}`);
        });
      console.log('');
    }

    // Display error breakdown
    if (Object.keys(stats.byErrorCode).length > 0) {
      console.log('⚠️  ERROR BREAKDOWN');
      console.log('-'.repeat(80));
      Object.entries(stats.byErrorCode)
        .sort((a, b) => b[1] - a[1])
        .forEach(([code, count]) => {
          console.log(`${code.padEnd(30)} : ${count}`);
        });
      console.log('');
    }

    // Display failed documents details
    if (options.showFailed && failedDocuments.length > 0) {
      console.log('❌ FAILED DOCUMENTS DETAILS');
      console.log('-'.repeat(80));
      failedDocuments.forEach((doc, index) => {
        console.log(`[${index + 1}] ${doc.id}`);
        console.log(`    User: ${doc.create_user_id}`);
        console.log(`    Type: ${doc.document_type}`);
        console.log(`    Retry Count: ${doc.retry_count}/${doc.max_retries}`);
        console.log(`    Error Code: ${doc.error_code || 'UNKNOWN'}`);
        console.log(`    Error Message: ${doc.error_message || 'None'}`);
        console.log(`    Next Retry: ${doc.next_retry_at || 'Not scheduled'}`);
        console.log(`    Created: ${doc.created_at}`);
        console.log('');
      });
    }

    // Health check
    console.log('🏥 HEALTH CHECK');
    console.log('-'.repeat(80));

    const issues = [];

    // Check for high failure rate
    const failureRate = percentage(stats.byStatus.failed, stats.total);
    if (failureRate > 20) {
      issues.push(`⚠️  HIGH FAILURE RATE: ${failureRate}% of documents failed`);
    }

    // Check for stuck processing
    if (stats.byStatus.processing > 10) {
      issues.push(`⚠️  MANY PROCESSING DOCUMENTS: ${stats.byStatus.processing} documents stuck in processing`);
    }

    // Check for large retry queue
    if (stats.needingRetry > 20) {
      issues.push(`⚠️  LARGE RETRY QUEUE: ${stats.needingRetry} documents need retry`);
    }

    // Check for common errors
    const errorCodes = Object.keys(stats.byErrorCode);
    if (errorCodes.includes('AUTH_ERROR')) {
      issues.push(`⚠️  AUTHENTICATION ERRORS: Check Typeform URL permissions`);
    }
    if (errorCodes.includes('TIMEOUT')) {
      issues.push(`⚠️  TIMEOUT ERRORS: Network issues or large files`);
    }
    if (errorCodes.includes('STORAGE_UPLOAD_ERROR')) {
      issues.push(`⚠️  STORAGE ERRORS: Check Supabase bucket permissions`);
    }

    if (issues.length === 0) {
      console.log('✅ All systems nominal');
    } else {
      console.log('Issues detected:');
      issues.forEach(issue => console.log(issue));
    }
    console.log('');

    // Recommendations
    if (stats.needingRetry > 0) {
      console.log('💡 RECOMMENDATIONS');
      console.log('-'.repeat(80));
      console.log(`Run retry script: node scripts/retry-failed-images.js --limit=${Math.min(stats.needingRetry, 50)}`);
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('Monitoring complete');
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

// Helper functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function percentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Run the script
main();
