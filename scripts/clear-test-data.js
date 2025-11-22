#!/usr/bin/env node
/**
 * Clear Test Data Script
 * Removes test data for specific test users only
 *
 * Usage:
 *   node scripts/clear-test-data.js --dry-run  # Preview what will be deleted
 *   node scripts/clear-test-data.js            # Execute deletion
 *   node scripts/clear-test-data.js --all      # Clear ALL data (use with caution!)
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

const isDryRun = process.argv.includes('--dry-run');
const clearAll = process.argv.includes('--all');

// Test user IDs to clear
const TEST_USER_IDS = [
  '9db03736-74ac-4d00-9ae2-3639b58360a3',  // ian.ring@sky.com
  '8d2d2809-bee1-436f-a16b-76edfd8f0792'   // page12test@example.com
];

// Tables to clear (in dependency order - children first, parents last)
const TABLES = [
  'completed_incident_forms',
  'ai_summary',
  'ai_transcription',
  'transcription_queue',
  'user_documents',
  'incident_witnesses',
  'incident_other_vehicles',
  'incident_images',
  'incident_reports'
];

async function getTableCount(tableName) {
  try {
    let query = supabase.from(tableName).select('*', { count: 'exact', head: true });

    // Only count test user records unless --all flag is set
    if (!clearAll) {
      query = query.in('create_user_id', TEST_USER_IDS);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.log(colors.yellow, `⚠️  Warning: Could not count ${tableName}: ${error.message}`, colors.reset);
    return 0;
  }
}

async function clearTable(tableName) {
  try {
    // Get count before deletion
    const countBefore = await getTableCount(tableName);

    if (countBefore === 0) {
      console.log(colors.cyan, `  ℹ️  ${tableName}: No records to delete`, colors.reset);
      return { success: true, deleted: 0 };
    }

    if (isDryRun) {
      console.log(colors.yellow, `  🔍 ${tableName}: Would delete ${countBefore} records`, colors.reset);
      return { success: true, deleted: countBefore, dryRun: true };
    }

    // Delete records
    let deleteQuery = supabase.from(tableName).delete({ count: 'exact' });

    if (clearAll) {
      // Delete all records
      deleteQuery = deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000');
    } else {
      // Delete only test user records
      deleteQuery = deleteQuery.in('create_user_id', TEST_USER_IDS);
    }

    const { error, count } = await deleteQuery;

    if (error) throw error;

    console.log(colors.green, `  ✅ ${tableName}: Deleted ${count || countBefore} records`, colors.reset);
    return { success: true, deleted: count || countBefore };

  } catch (error) {
    console.log(colors.red, `  ❌ ${tableName}: Error - ${error.message}`, colors.reset);
    return { success: false, error: error.message };
  }
}

async function clearAllData() {
  console.log(colors.cyan, '\n🗑️  Clear Test Data Script\n', colors.reset);

  if (clearAll) {
    console.log(colors.red, '⚠️  CLEARING ALL DATA FROM ALL TABLES!\n', colors.reset);
  } else {
    console.log(colors.cyan, '🎯 Target users:\n', colors.reset);
    console.log('   - ian.ring@sky.com (9db03736-74ac-4d00-9ae2-3639b58360a3)');
    console.log('   - page12test@example.com (8d2d2809-bee1-436f-a16b-76edfd8f0792)\n');
  }

  if (isDryRun) {
    console.log(colors.yellow, '⚠️  DRY RUN MODE - No data will be deleted\n', colors.reset);
  } else {
    console.log(colors.red, '⚠️  LIVE MODE - Data will be permanently deleted!\n', colors.reset);
  }

  let totalDeleted = 0;
  const errors = [];

  console.log('📊 Clearing tables in dependency order:\n');

  for (const tableName of TABLES) {
    const result = await clearTable(tableName);

    if (result.success) {
      totalDeleted += result.deleted;
    } else {
      errors.push({ table: tableName, error: result.error });
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Clear Supabase Storage buckets (only if --all flag is set)
  if (clearAll) {
    console.log('\n📦 Clearing Storage buckets:\n');

    const buckets = ['user-documents', 'completed-reports', 'incident-images-secure'];

    for (const bucket of buckets) {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from(bucket)
          .list();

        if (listError) {
          console.log(colors.yellow, `  ⚠️  ${bucket}: ${listError.message}`, colors.reset);
          continue;
        }

        if (!files || files.length === 0) {
          console.log(colors.cyan, `  ℹ️  ${bucket}: Already empty`, colors.reset);
          continue;
        }

        if (isDryRun) {
          console.log(colors.yellow, `  🔍 ${bucket}: Would delete ${files.length} files`, colors.reset);
          continue;
        }

        // Delete all files
        const filePaths = files.map(f => f.name);
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove(filePaths);

        if (deleteError) throw deleteError;

        console.log(colors.green, `  ✅ ${bucket}: Deleted ${files.length} files`, colors.reset);
      } catch (error) {
        console.log(colors.red, `  ❌ ${bucket}: Error - ${error.message}`, colors.reset);
        errors.push({ table: bucket, error: error.message });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } else {
    console.log('\n📦 Storage buckets: Not cleared (user_documents table records removed)\n');
    console.log(colors.cyan, '   ℹ️  Files remain in storage but database references removed', colors.reset);
    console.log(colors.cyan, '   ℹ️  Use --all flag to also clear storage buckets', colors.reset);
  }

  // Summary
  console.log('\n' + '─'.repeat(80));
  console.log(colors.cyan, '\n📈 Summary:\n', colors.reset);
  console.log(`  Total records ${isDryRun ? 'would be' : ''} deleted: ${totalDeleted}`);

  if (errors.length > 0) {
    console.log(colors.red, `  ❌ Errors encountered: ${errors.length}`, colors.reset);
    errors.forEach(err => {
      console.log(`     - ${err.table}: ${err.error}`);
    });
  } else {
    console.log(colors.green, '  ✅ All operations completed successfully', colors.reset);
  }

  if (isDryRun) {
    console.log(colors.yellow, '\n⚠️  This was a dry run. Run without --dry-run to actually delete data.', colors.reset);
  } else if (clearAll) {
    console.log(colors.green, '\n✅ All data cleared from database!', colors.reset);
  } else {
    console.log(colors.green, '\n✅ Test user data cleared!', colors.reset);
    console.log('\n📝 Note: User accounts preserved (can still log in)');
    console.log('📝 Note: Safety status preserved (are_you_safe = true)');
  }

  console.log('\n');
}

// Run the script
clearAllData().catch(error => {
  console.error(colors.red, '\n❌ Fatal error:', error, colors.reset);
  process.exit(1);
});
