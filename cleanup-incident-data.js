/**
 * DESTRUCTIVE OPERATION: Delete ALL incident report test data from Supabase
 *
 * This script:
 * - Deletes all records from incident-related tables (including PDF queue)
 * - Deletes all files from Storage buckets
 * - Keeps Auth users intact
 * - Uses proper deletion order (respecting foreign keys)
 *
 * USE WITH EXTREME CAUTION - THIS AFFECTS YOUR DATABASE!
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role bypasses RLS
);

async function deleteFromTable(tableName, description) {
  console.log(`${description}...`);

  try {
    // First, check if table exists and get count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      if (countError.message.includes('does not exist') ||
          countError.message.includes('Could not find the table')) {
        console.log(`⚠️  Table ${tableName} does not exist - skipping`);
        return { status: 'skipped', reason: 'table not found' };
      }
      throw countError;
    }

    if (count === 0) {
      console.log(`✅ ${tableName} already empty`);
      return { status: 'already empty', count: 0 };
    }

    console.log(`   Found ${count} records to delete`);

    // Delete all records
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .gte('id', 0);

    if (deleteError) {
      // Try alternative delete for UUID primary keys
      const { data: allRecords, error: selectError } = await supabase
        .from(tableName)
        .select('id');

      if (selectError) throw selectError;

      if (allRecords && allRecords.length > 0) {
        // Delete in batches of 100
        for (let i = 0; i < allRecords.length; i += 100) {
          const batch = allRecords.slice(i, i + 100);
          const ids = batch.map(r => r.id);

          const { error: batchDeleteError } = await supabase
            .from(tableName)
            .delete()
            .in('id', ids);

          if (batchDeleteError) throw batchDeleteError;
        }
      }
    }

    console.log(`✅ ${tableName} deleted (${count} records)`);
    return { status: 'deleted', count };

  } catch (error) {
    console.error(`❌ Error deleting ${tableName}:`, error.message);
    return { status: 'error', error: error.message };
  }
}

async function deleteStorageBucket(bucketName) {
  try {
    console.log(`📦 Deleting from ${bucketName} bucket...`);

    const { data: filesList, error: listError } = await supabase
      .storage
      .from(bucketName)
      .list('', { limit: 1000 });

    if (listError) {
      console.error(`❌ Error listing ${bucketName} bucket:`, listError.message);
      return { status: 'error', error: listError.message };
    }

    if (!filesList || filesList.length === 0) {
      console.log(`✅ ${bucketName} bucket already empty`);
      return { status: 'already empty', count: 0 };
    }

    const filePaths = filesList.map(file => file.name);

    const { error: deleteError } = await supabase
      .storage
      .from(bucketName)
      .remove(filePaths);

    if (deleteError) {
      console.error(`❌ Error deleting from ${bucketName} bucket:`, deleteError.message);
      return { status: 'error', error: deleteError.message };
    }

    console.log(`✅ Deleted ${filePaths.length} files from ${bucketName} bucket`);
    return { status: 'deleted', count: filePaths.length };

  } catch (error) {
    console.error(`❌ Error with ${bucketName} bucket:`, error.message);
    return { status: 'error', error: error.message };
  }
}

async function deleteAllIncidentData() {
  console.log('\n🔥 STARTING INCIDENT DATA DELETION - THIS CANNOT BE UNDONE!\n');
  console.log('⏳ This will take a few moments...\n');

  const results = {
    tables: {},
    storage: {},
    errors: []
  };

  // Delete tables in correct order (respecting foreign keys)
  // IMPORTANT: pdf_generation_queue must be deleted before completed_incident_forms
  const tablesToDelete = [
    { name: 'ai_transcription', icon: '🎙️', desc: 'Deleting AI transcriptions' },
    { name: 'user_documents', icon: '📄', desc: 'Deleting user documents' },
    { name: 'temp_uploads', icon: '⏳', desc: 'Deleting temporary uploads' },
    { name: 'incident_witnesses', icon: '👥', desc: 'Deleting witnesses' },
    { name: 'incident_other_vehicles', icon: '🚗', desc: 'Deleting other vehicles' },
    { name: 'pdf_generation_queue', icon: '📑', desc: 'Deleting PDF queue' },
    { name: 'completed_incident_forms', icon: '📋', desc: 'Deleting completed forms' },
    { name: 'incident_reports', icon: '📋', desc: 'Deleting incident reports' },
    { name: 'user_signup', icon: '👤', desc: 'Deleting user signups' }
  ];

  for (const table of tablesToDelete) {
    const result = await deleteFromTable(table.name, `${table.icon} ${table.desc}`);
    results.tables[table.name] = result;

    if (result.status === 'error') {
      results.errors.push({ table: table.name, error: result.error });
    }
  }

  // Delete files from Storage buckets
  console.log('\n🗑️  Deleting files from Storage...\n');

  const buckets = ['user-documents', 'temp-uploads'];
  for (const bucket of buckets) {
    const result = await deleteStorageBucket(bucket);
    results.storage[bucket] = result;

    if (result.status === 'error') {
      results.errors.push({ storage: bucket, error: result.error });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(60));

  console.log('\n📋 Tables Processed:');
  Object.entries(results.tables).forEach(([table, result]) => {
    const status = result.status === 'deleted'
      ? `✅ deleted ${result.count} records`
      : result.status === 'already empty'
      ? '✅ already empty'
      : result.status === 'skipped'
      ? `⚠️  ${result.reason}`
      : `❌ ${result.error}`;
    console.log(`   ${table}: ${status}`);
  });

  console.log('\n📦 Storage Buckets:');
  Object.entries(results.storage).forEach(([bucket, result]) => {
    const status = result.status === 'deleted'
      ? `✅ deleted ${result.count} files`
      : result.status === 'already empty'
      ? '✅ already empty'
      : `❌ ${result.error}`;
    console.log(`   ${bucket}: ${status}`);
  });

  if (results.errors.length > 0) {
    console.log(`\n⚠️  Encountered ${results.errors.length} errors (see details above)`);
  } else {
    console.log('\n✅ NO ERRORS - All incident data deleted successfully!');
  }

  console.log('\n🔄 Auth users have been PRESERVED (can still log in)');
  console.log('📧 Email functionality preserved');
  console.log('🔑 Stripe data preserved');
  console.log('='.repeat(60) + '\n');

  return results;
}

// Execute cleanup
deleteAllIncidentData()
  .then((results) => {
    const hasErrors = results.errors.length > 0;
    console.log(hasErrors ? '⚠️  Cleanup completed with errors' : '✅ Cleanup completed successfully');
    console.log('\n💡 You can now start fresh with new test data\n');
    process.exit(hasErrors ? 1 : 0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
