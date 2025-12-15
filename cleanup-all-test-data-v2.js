/**
 * DESTRUCTIVE OPERATION: Delete ALL test data from Supabase (IMPROVED VERSION)
 *
 * This script:
 * - Deletes all records from incident-related tables
 * - Deletes all files from Storage buckets
 * - Keeps Auth users intact
 * - Uses proper deletion methods
 *
 * USE WITH EXTREME CAUTION - THIS AFFECTS PRODUCTION!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

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

    // Delete all records (no condition needed with service role)
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .gte('id', 0); // This works for both INT and will be ignored for tables without numeric id

    if (deleteError) {
      // Try alternative delete method for UUID primary keys
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

async function deleteAllData() {
  console.log('\n🔥 STARTING DATA DELETION - THIS CANNOT BE UNDONE!\n');

  const results = {
    tables: {},
    storage: {},
    errors: []
  };

  // Delete tables in correct order (respecting foreign keys)
  const tablesToDelete = [
    { name: 'ai_transcription', icon: '🎙️', desc: 'Deleting ai_transcription' },
    { name: 'user_documents', icon: '📄', desc: 'Deleting user_documents' },
    { name: 'temp_uploads', icon: '⏳', desc: 'Deleting temp_uploads' },
    { name: 'incident_witnesses', icon: '👥', desc: 'Deleting incident_witnesses' },
    { name: 'incident_other_vehicles', icon: '🚗', desc: 'Deleting incident_other_vehicles' },
    { name: 'incident_reports', icon: '📋', desc: 'Deleting incident_reports' },
    { name: 'completed_incident_forms', icon: '📋', desc: 'Deleting completed_incident_forms' },
    { name: 'user_signup', icon: '👤', desc: 'Deleting user_signup' }
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

  // Delete from user-documents bucket
  try {
    console.log('📦 Deleting from user-documents bucket...');

    const { data: userDocsList, error: listUserDocsError } = await supabase
      .storage
      .from('user-documents')
      .list('', { limit: 1000 }); // Get all files

    if (listUserDocsError) {
      console.error('❌ Error listing user-documents bucket:', listUserDocsError.message);
      results.errors.push({ storage: 'user-documents (list)', error: listUserDocsError.message });
      results.storage['user-documents'] = { status: 'error', error: listUserDocsError.message };
    } else if (userDocsList && userDocsList.length > 0) {
      const filePaths = userDocsList.map(file => file.name);

      const { error: deleteUserDocsError } = await supabase
        .storage
        .from('user-documents')
        .remove(filePaths);

      if (deleteUserDocsError) {
        console.error('❌ Error deleting from user-documents bucket:', deleteUserDocsError.message);
        results.errors.push({ storage: 'user-documents', error: deleteUserDocsError.message });
        results.storage['user-documents'] = { status: 'error', error: deleteUserDocsError.message };
      } else {
        results.storage['user-documents'] = { status: 'deleted', count: filePaths.length };
        console.log(`✅ Deleted ${filePaths.length} files from user-documents bucket`);
      }
    } else {
      results.storage['user-documents'] = { status: 'already empty', count: 0 };
      console.log('✅ user-documents bucket already empty');
    }
  } catch (error) {
    console.error('❌ Error with user-documents bucket:', error.message);
    results.errors.push({ storage: 'user-documents', error: error.message });
    results.storage['user-documents'] = { status: 'error', error: error.message };
  }

  // Delete from temp-uploads bucket
  try {
    console.log('📦 Deleting from temp-uploads bucket...');

    const { data: tempUploadsList, error: listTempError } = await supabase
      .storage
      .from('temp-uploads')
      .list('', { limit: 1000 });

    if (listTempError) {
      console.error('❌ Error listing temp-uploads bucket:', listTempError.message);
      results.errors.push({ storage: 'temp-uploads (list)', error: listTempError.message });
      results.storage['temp-uploads'] = { status: 'error', error: listTempError.message };
    } else if (tempUploadsList && tempUploadsList.length > 0) {
      const filePaths = tempUploadsList.map(file => file.name);

      const { error: deleteTempError } = await supabase
        .storage
        .from('temp-uploads')
        .remove(filePaths);

      if (deleteTempError) {
        console.error('❌ Error deleting from temp-uploads bucket:', deleteTempError.message);
        results.errors.push({ storage: 'temp-uploads', error: deleteTempError.message });
        results.storage['temp-uploads'] = { status: 'error', error: deleteTempError.message };
      } else {
        results.storage['temp-uploads'] = { status: 'deleted', count: filePaths.length };
        console.log(`✅ Deleted ${filePaths.length} files from temp-uploads bucket`);
      }
    } else {
      results.storage['temp-uploads'] = { status: 'already empty', count: 0 };
      console.log('✅ temp-uploads bucket already empty');
    }
  } catch (error) {
    console.error('❌ Error with temp-uploads bucket:', error.message);
    results.errors.push({ storage: 'temp-uploads', error: error.message });
    results.storage['temp-uploads'] = { status: 'error', error: error.message };
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(60));

  console.log('\n✅ Tables Processed:');
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

  console.log('\n✅ Storage Buckets:');
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
    console.log('\n✅ NO ERRORS - All data deleted successfully!');
  }

  console.log('\n🔄 Auth users have been PRESERVED (can still log in)');
  console.log('='.repeat(60) + '\n');

  return results;
}

// Execute cleanup
deleteAllData()
  .then((results) => {
    const hasErrors = results.errors.length > 0;
    console.log(hasErrors ? '⚠️  Cleanup completed with errors' : '✅ Cleanup completed successfully');
    process.exit(hasErrors ? 1 : 0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
