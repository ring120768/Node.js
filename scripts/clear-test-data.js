#!/usr/bin/env node
/**
 * Clear Test Data Script
 * Safely removes all test data from Supabase tables
 *
 * Usage:
 *   node scripts/clear-test-data.js --dry-run  # Preview what will be deleted
 *   node scripts/clear-test-data.js            # Execute deletion
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
  'incident_reports',
  'dvla_vehicle_info_new',
  'user_signup'
];

async function getTableCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

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
      console.log(colors.cyan, `  ℹ️  ${tableName}: Already empty`, colors.reset);
      return { success: true, deleted: 0 };
    }

    if (isDryRun) {
      console.log(colors.yellow, `  🔍 ${tableName}: Would delete ${countBefore} records`, colors.reset);
      return { success: true, deleted: countBefore, dryRun: true };
    }

    // Delete all records (no WHERE clause = delete all)
    const { error } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Always true condition

    if (error) throw error;

    console.log(colors.green, `  ✅ ${tableName}: Deleted ${countBefore} records`, colors.reset);
    return { success: true, deleted: countBefore };

  } catch (error) {
    console.log(colors.red, `  ❌ ${tableName}: Error - ${error.message}`, colors.reset);
    return { success: false, error: error.message };
  }
}

async function clearAllData() {
  console.log(colors.cyan, '\n🗑️  Clear Test Data Script\n', colors.reset);

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

  // Clear Supabase Storage buckets
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
  } else {
    console.log(colors.green, '\n✅ All test data cleared!', colors.reset);
  }

  console.log('\n');
}

// Run the script
clearAllData().catch(error => {
  console.error(colors.red, '\n❌ Fatal error:', error, colors.reset);
  process.exit(1);
});
