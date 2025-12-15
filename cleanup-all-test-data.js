/**
 * DESTRUCTIVE OPERATION: Delete ALL test data from Supabase
 *
 * This script:
 * - Deletes all records from incident-related tables
 * - Deletes all files from Storage buckets
 * - Keeps Auth users intact
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

async function deleteAllData() {
  console.log('\n🔥 STARTING DATA DELETION - THIS CANNOT BE UNDONE!\n');

  const results = {
    tables: {},
    storage: {},
    errors: []
  };

  try {
    // 1. Delete completed_incident_forms (references incident_reports)
    console.log('📋 Deleting completed_incident_forms...');
    const { data: forms, error: formsError } = await supabase
      .from('completed_incident_forms')
      .delete()
      .neq('id', 0); // Delete all records

    if (formsError) {
      console.error('❌ Error deleting completed_incident_forms:', formsError.message);
      results.errors.push({ table: 'completed_incident_forms', error: formsError.message });
    } else {
      results.tables.completed_incident_forms = 'deleted';
      console.log('✅ completed_incident_forms deleted');
    }

    // 2. Delete ai_transcription
    console.log('🎙️  Deleting ai_transcription...');
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('ai_transcription')
      .delete()
      .neq('id', 0);

    if (transcriptsError) {
      console.error('❌ Error deleting ai_transcription:', transcriptsError.message);
      results.errors.push({ table: 'ai_transcription', error: transcriptsError.message });
    } else {
      results.tables.ai_transcription = 'deleted';
      console.log('✅ ai_transcription deleted');
    }

    // 3. Delete incident_witnesses
    console.log('👥 Deleting incident_witnesses...');
    const { data: witnesses, error: witnessesError } = await supabase
      .from('incident_witnesses')
      .delete()
      .neq('id', 0);

    if (witnessesError) {
      console.error('❌ Error deleting incident_witnesses:', witnessesError.message);
      results.errors.push({ table: 'incident_witnesses', error: witnessesError.message });
    } else {
      results.tables.incident_witnesses = 'deleted';
      console.log('✅ incident_witnesses deleted');
    }

    // 4. Delete incident_other_vehicles
    console.log('🚗 Deleting incident_other_vehicles...');
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('incident_other_vehicles')
      .delete()
      .neq('id', 0);

    if (vehiclesError) {
      console.error('❌ Error deleting incident_other_vehicles:', vehiclesError.message);
      results.errors.push({ table: 'incident_other_vehicles', error: vehiclesError.message });
    } else {
      results.tables.incident_other_vehicles = 'deleted';
      console.log('✅ incident_other_vehicles deleted');
    }

    // 5. Delete user_documents (and track files to delete from storage)
    console.log('📄 Deleting user_documents...');

    // First, get all storage paths to delete files
    const { data: docsToDelete, error: docsListError } = await supabase
      .from('user_documents')
      .select('storage_path, storage_bucket');

    if (docsListError) {
      console.error('❌ Error listing user_documents:', docsListError.message);
      results.errors.push({ table: 'user_documents (list)', error: docsListError.message });
    }

    // Delete records
    const { data: docs, error: docsError } = await supabase
      .from('user_documents')
      .delete()
      .neq('id', 0);

    if (docsError) {
      console.error('❌ Error deleting user_documents:', docsError.message);
      results.errors.push({ table: 'user_documents', error: docsError.message });
    } else {
      results.tables.user_documents = 'deleted';
      console.log('✅ user_documents deleted');
    }

    // 6. Delete temp_uploads
    console.log('⏳ Deleting temp_uploads...');

    // Get temp upload paths
    const { data: tempToDelete, error: tempListError } = await supabase
      .from('temp_uploads')
      .select('storage_path, storage_bucket');

    if (tempListError) {
      console.error('❌ Error listing temp_uploads:', tempListError.message);
      results.errors.push({ table: 'temp_uploads (list)', error: tempListError.message });
    }

    const { data: temps, error: tempsError } = await supabase
      .from('temp_uploads')
      .delete()
      .neq('id', 0);

    if (tempsError) {
      console.error('❌ Error deleting temp_uploads:', tempsError.message);
      results.errors.push({ table: 'temp_uploads', error: tempsError.message });
    } else {
      results.tables.temp_uploads = 'deleted';
      console.log('✅ temp_uploads deleted');
    }

    // 7. Delete incident_reports
    console.log('📋 Deleting incident_reports...');
    const { data: incidents, error: incidentsError } = await supabase
      .from('incident_reports')
      .delete()
      .neq('id', 0);

    if (incidentsError) {
      console.error('❌ Error deleting incident_reports:', incidentsError.message);
      results.errors.push({ table: 'incident_reports', error: incidentsError.message });
    } else {
      results.tables.incident_reports = 'deleted';
      console.log('✅ incident_reports deleted');
    }

    // 8. Delete user_signup (parent table - delete last)
    console.log('👤 Deleting user_signup...');
    const { data: users, error: usersError } = await supabase
      .from('user_signup')
      .delete()
      .neq('create_user_id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (usersError) {
      console.error('❌ Error deleting user_signup:', usersError.message);
      results.errors.push({ table: 'user_signup', error: usersError.message });
    } else {
      results.tables.user_signup = 'deleted';
      console.log('✅ user_signup deleted');
    }

    // 9. Delete files from Storage buckets
    console.log('\n🗑️  Deleting files from Storage...\n');

    // Delete from user-documents bucket
    console.log('📦 Deleting from user-documents bucket...');
    const { data: userDocsList, error: listUserDocsError } = await supabase
      .storage
      .from('user-documents')
      .list();

    if (listUserDocsError) {
      console.error('❌ Error listing user-documents bucket:', listUserDocsError.message);
      results.errors.push({ storage: 'user-documents (list)', error: listUserDocsError.message });
    } else if (userDocsList && userDocsList.length > 0) {
      const filePaths = userDocsList.map(file => file.name);
      const { data: deleteUserDocs, error: deleteUserDocsError } = await supabase
        .storage
        .from('user-documents')
        .remove(filePaths);

      if (deleteUserDocsError) {
        console.error('❌ Error deleting from user-documents bucket:', deleteUserDocsError.message);
        results.errors.push({ storage: 'user-documents', error: deleteUserDocsError.message });
      } else {
        results.storage['user-documents'] = `deleted ${filePaths.length} files`;
        console.log(`✅ Deleted ${filePaths.length} files from user-documents bucket`);
      }
    } else {
      results.storage['user-documents'] = 'already empty';
      console.log('✅ user-documents bucket already empty');
    }

    // Delete from temp-uploads bucket
    console.log('📦 Deleting from temp-uploads bucket...');
    const { data: tempUploadsList, error: listTempError } = await supabase
      .storage
      .from('temp-uploads')
      .list();

    if (listTempError) {
      console.error('❌ Error listing temp-uploads bucket:', listTempError.message);
      results.errors.push({ storage: 'temp-uploads (list)', error: listTempError.message });
    } else if (tempUploadsList && tempUploadsList.length > 0) {
      const filePaths = tempUploadsList.map(file => file.name);
      const { data: deleteTempUploads, error: deleteTempError } = await supabase
        .storage
        .from('temp-uploads')
        .remove(filePaths);

      if (deleteTempError) {
        console.error('❌ Error deleting from temp-uploads bucket:', deleteTempError.message);
        results.errors.push({ storage: 'temp-uploads', error: deleteTempError.message });
      } else {
        results.storage['temp-uploads'] = `deleted ${filePaths.length} files`;
        console.log(`✅ Deleted ${filePaths.length} files from temp-uploads bucket`);
      }
    } else {
      results.storage['temp-uploads'] = 'already empty';
      console.log('✅ temp-uploads bucket already empty');
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR during cleanup:', error);
    results.errors.push({ fatal: error.message });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(60));

  console.log('\n✅ Tables Cleared:');
  Object.entries(results.tables).forEach(([table, status]) => {
    console.log(`   - ${table}: ${status}`);
  });

  console.log('\n✅ Storage Buckets:');
  Object.entries(results.storage).forEach(([bucket, status]) => {
    console.log(`   - ${bucket}: ${status}`);
  });

  if (results.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    results.errors.forEach((err, index) => {
      console.log(`   ${index + 1}. ${JSON.stringify(err)}`);
    });
  } else {
    console.log('\n✅ NO ERRORS - All data deleted successfully!');
  }

  console.log('\n🔄 Auth users have been PRESERVED (can still log in)');
  console.log('='.repeat(60) + '\n');
}

// Execute cleanup
deleteAllData()
  .then(() => {
    console.log('✅ Cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
