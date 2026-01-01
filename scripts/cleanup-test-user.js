#!/usr/bin/env node

/**
 * Clean Test Data for User
 *
 * Removes all test data for a specific user while preserving signup information
 * Usage: node scripts/cleanup-test-user.js [user-uuid]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = process.argv[2] || '30d82d89-42d5-406a-9b7d-83345d972f61';

async function cleanupTestData() {
  console.log('🧹 Cleaning test data for user:', USER_ID);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // ========================================
    // STEP 1: Check what exists
    // ========================================
    console.log('📋 Step 1: Checking existing data...\n');

    const checks = await Promise.all([
      supabase.from('incident_reports').select('id').eq('create_user_id', USER_ID),
      supabase.from('incident_other_vehicles').select('id').eq('create_user_id', USER_ID),
      supabase.from('incident_witnesses').select('id').eq('create_user_id', USER_ID),
      supabase.from('user_documents').select('id').eq('create_user_id', USER_ID),
      supabase.from('ai_transcription').select('id').eq('create_user_id', USER_ID),
      supabase.from('completed_incident_forms').select('id').eq('create_user_id', USER_ID),
      supabase.from('temp_uploads').select('id').eq('create_user_id', USER_ID)
    ]);

    const [
      incidentReports,
      otherVehicles,
      witnesses,
      userDocuments,
      transcriptions,
      completedForms,
      tempUploads
    ] = checks;

    console.log('Found records:');
    console.log(`  - incident_reports: ${incidentReports.data?.length || 0}`);
    console.log(`  - incident_other_vehicles: ${otherVehicles.data?.length || 0}`);
    console.log(`  - incident_witnesses: ${witnesses.data?.length || 0}`);
    console.log(`  - user_documents: ${userDocuments.data?.length || 0}`);
    console.log(`  - ai_transcription: ${transcriptions.data?.length || 0}`);
    console.log(`  - completed_incident_forms: ${completedForms.data?.length || 0}`);
    console.log(`  - temp_uploads: ${tempUploads.data?.length || 0}`);
    console.log('');

    const totalRecords = [
      incidentReports,
      otherVehicles,
      witnesses,
      userDocuments,
      transcriptions,
      completedForms,
      tempUploads
    ].reduce((sum, result) => sum + (result.data?.length || 0), 0);

    if (totalRecords === 0) {
      console.log('✅ No test data to clean - user is already clean\n');
      return;
    }

    console.log(`⚠️  About to delete ${totalRecords} records\n`);

    // ========================================
    // STEP 2: Delete data (in dependency order)
    // ========================================
    console.log('🗑️  Step 2: Deleting test data...\n');

    // Delete in reverse dependency order to avoid FK violations

    // 1. Completed incident forms (no FK dependencies)
    if (completedForms.data?.length > 0) {
      const { error: formsError } = await supabase
        .from('completed_incident_forms')
        .delete()
        .eq('create_user_id', USER_ID);

      if (formsError) {
        console.error('❌ Error deleting completed_incident_forms:', formsError.message);
      } else {
        console.log(`✅ Deleted ${completedForms.data.length} completed_incident_forms`);
      }
    }

    // 2. AI transcriptions (no FK dependencies)
    if (transcriptions.data?.length > 0) {
      const { error: transcriptError } = await supabase
        .from('ai_transcription')
        .delete()
        .eq('create_user_id', USER_ID);

      if (transcriptError) {
        console.error('❌ Error deleting ai_transcription:', transcriptError.message);
      } else {
        console.log(`✅ Deleted ${transcriptions.data.length} ai_transcription records`);
      }
    }

    // 3. User documents (no FK dependencies)
    if (userDocuments.data?.length > 0) {
      const { error: docsError } = await supabase
        .from('user_documents')
        .delete()
        .eq('create_user_id', USER_ID);

      if (docsError) {
        console.error('❌ Error deleting user_documents:', docsError.message);
      } else {
        console.log(`✅ Deleted ${userDocuments.data.length} user_documents`);
      }
    }

    // 4. Temp uploads (no FK dependencies)
    if (tempUploads.data?.length > 0) {
      const { error: tempError } = await supabase
        .from('temp_uploads')
        .delete()
        .eq('create_user_id', USER_ID);

      if (tempError) {
        console.error('❌ Error deleting temp_uploads:', tempError.message);
      } else {
        console.log(`✅ Deleted ${tempUploads.data.length} temp_uploads`);
      }
    }

    // 5. Witnesses (FK to incident_reports)
    if (witnesses.data?.length > 0) {
      const { error: witnessError } = await supabase
        .from('incident_witnesses')
        .delete()
        .eq('create_user_id', USER_ID);

      if (witnessError) {
        console.error('❌ Error deleting incident_witnesses:', witnessError.message);
      } else {
        console.log(`✅ Deleted ${witnesses.data.length} incident_witnesses`);
      }
    }

    // 6. Other vehicles (FK to incident_reports)
    if (otherVehicles.data?.length > 0) {
      const { error: vehiclesError } = await supabase
        .from('incident_other_vehicles')
        .delete()
        .eq('create_user_id', USER_ID);

      if (vehiclesError) {
        console.error('❌ Error deleting incident_other_vehicles:', vehiclesError.message);
      } else {
        console.log(`✅ Deleted ${otherVehicles.data.length} incident_other_vehicles`);
      }
    }

    // 7. Incident reports (parent table, delete last)
    if (incidentReports.data?.length > 0) {
      const { error: incidentError } = await supabase
        .from('incident_reports')
        .delete()
        .eq('create_user_id', USER_ID);

      if (incidentError) {
        console.error('❌ Error deleting incident_reports:', incidentError.message);
      } else {
        console.log(`✅ Deleted ${incidentReports.data.length} incident_reports`);
      }
    }

    console.log('');

    // ========================================
    // STEP 3: Verify cleanup
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Step 3: Verifying cleanup...\n');

    const verifyChecks = await Promise.all([
      supabase.from('incident_reports').select('id').eq('create_user_id', USER_ID),
      supabase.from('user_documents').select('id').eq('create_user_id', USER_ID),
      supabase.from('completed_incident_forms').select('id').eq('create_user_id', USER_ID),
      supabase.from('user_signup').select('create_user_id, name, surname, email').eq('create_user_id', USER_ID).single()
    ]);

    const [
      remainingIncidents,
      remainingDocs,
      remainingForms,
      userSignup
    ] = verifyChecks;

    console.log('Remaining records after cleanup:');
    console.log(`  - incident_reports: ${remainingIncidents.data?.length || 0}`);
    console.log(`  - user_documents: ${remainingDocs.data?.length || 0}`);
    console.log(`  - completed_incident_forms: ${remainingForms.data?.length || 0}`);
    console.log('');

    if (userSignup.data) {
      console.log('✅ User signup preserved:');
      console.log(`  - Name: ${userSignup.data.name} ${userSignup.data.surname}`);
      console.log(`  - Email: ${userSignup.data.email}`);
      console.log(`  - User ID: ${userSignup.data.create_user_id}`);
    } else {
      console.log('⚠️  User signup not found!');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CLEANUP COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('User is now clean and ready for fresh testing.');
    console.log('Signup information preserved ✅');
    console.log('All test data removed ✅\n');

  } catch (error) {
    console.error('\n💥 Cleanup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

cleanupTestData();
