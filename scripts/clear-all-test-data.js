#!/usr/bin/env node

/**
 * Clear All Test Data from Supabase
 *
 * WARNING: This deletes ALL records from ALL tables.
 * Only use in development environment with test data.
 *
 * Usage: node scripts/clear-all-test-data.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearAllData() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          CLEAR ALL TEST DATA FROM SUPABASE                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('⚠️  WARNING: This will delete ALL records from ALL tables!\n');

  const tables = [
    // Delete child records first (FK constraints)
    'temp_uploads',
    'transcription_queue',
    'user_documents',
    'ai_transcription',
    'ai_summary',
    'completed_incident_forms',
    'incident_witnesses',
    'incident_other_vehicles',
    'incident_reports',
    'user_signup'  // Last - parent table
  ];

  const results = {};
  let totalDeleted = 0;

  for (const table of tables) {
    try {
      console.log(`\n🗑️  Clearing table: ${table}...`);

      // Count records before deletion
      const { count: beforeCount, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log(`   ⚠️  Could not count records in ${table}:`, countError.message);
        results[table] = { error: countError.message };
        continue;
      }

      console.log(`   Found ${beforeCount || 0} records`);

      if (!beforeCount || beforeCount === 0) {
        console.log(`   ✅ Table already empty`);
        results[table] = { deleted: 0, status: 'empty' };
        continue;
      }

      // Delete all records
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)

      if (deleteError) {
        console.log(`   ❌ Error deleting from ${table}:`, deleteError.message);
        results[table] = { error: deleteError.message };
        continue;
      }

      // Verify deletion
      const { count: afterCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      const deleted = beforeCount - (afterCount || 0);
      totalDeleted += deleted;

      console.log(`   ✅ Deleted ${deleted} records`);
      results[table] = { deleted, status: 'success' };

    } catch (error) {
      console.error(`   ❌ Unexpected error with ${table}:`, error.message);
      results[table] = { error: error.message };
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                       CLEANUP SUMMARY                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('Results by table:\n');
  for (const [table, result] of Object.entries(results)) {
    if (result.error) {
      console.log(`  ❌ ${table}: ERROR - ${result.error}`);
    } else if (result.status === 'empty') {
      console.log(`  ⚪ ${table}: Already empty`);
    } else {
      console.log(`  ✅ ${table}: ${result.deleted} records deleted`);
    }
  }

  console.log(`\n📊 Total Records Deleted: ${totalDeleted}`);
  console.log('\n✅ Database cleanup complete!\n');
}

// Run the cleanup
clearAllData().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
