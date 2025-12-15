#!/usr/bin/env node

/**
 * Delete all test data from Supabase
 * Hard delete - permanently removes all test incidents and associated data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteAllTestData() {
  console.log('🗑️  Starting test data deletion...\n');

  try {
    // Step 1: Get all test incidents
    console.log('📋 Fetching all test incidents...');
    const { data: incidents, error: fetchError } = await supabase
      .from('incident_reports')
      .select('id, create_user_id, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching incidents:', fetchError.message);
      process.exit(1);
    }

    if (!incidents || incidents.length === 0) {
      console.log('✅ No test data found - database already clean\n');
      process.exit(0);
    }

    console.log(`Found ${incidents.length} incident(s) to delete:\n`);
    incidents.forEach((inc, idx) => {
      console.log(`  ${idx + 1}. Incident ${inc.id.substring(0, 8)}... (User: ${inc.create_user_id?.substring(0, 8)}...)`);
    });
    console.log('');

    // Step 2: Delete from related tables first (foreign key constraints)
    console.log('🗑️  Deleting related data...');

    // Delete user documents
    const { error: docsError } = await supabase
      .from('user_documents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible condition to delete everything)

    if (docsError) {
      console.warn('⚠️  Error deleting user_documents:', docsError.message);
    } else {
      console.log('  ✅ Deleted user documents');
    }

    // Delete transcriptions
    const { error: transcriptError } = await supabase
      .from('ai_transcription')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (transcriptError) {
      console.warn('⚠️  Error deleting ai_transcription:', transcriptError.message);
    } else {
      console.log('  ✅ Deleted AI transcriptions');
    }

    // Delete temp uploads
    const { error: tempError } = await supabase
      .from('temp_uploads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (tempError) {
      console.warn('⚠️  Error deleting temp_uploads:', tempError.message);
    } else {
      console.log('  ✅ Deleted temp uploads');
    }

    // Delete other vehicles
    const { error: vehiclesError } = await supabase
      .from('incident_other_vehicles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (vehiclesError) {
      console.warn('⚠️  Error deleting incident_other_vehicles:', vehiclesError.message);
    } else {
      console.log('  ✅ Deleted other vehicles records');
    }

    // Delete witnesses
    const { error: witnessesError } = await supabase
      .from('incident_witnesses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (witnessesError) {
      console.warn('⚠️  Error deleting incident_witnesses:', witnessesError.message);
    } else {
      console.log('  ✅ Deleted witnesses records');
    }

    console.log('');

    // Step 3: Delete all incident reports
    console.log('🗑️  Deleting incident reports...');
    const { error: incidentsError } = await supabase
      .from('incident_reports')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (incidentsError) {
      console.error('❌ Error deleting incident_reports:', incidentsError.message);
      process.exit(1);
    }

    console.log(`  ✅ Deleted ${incidents.length} incident report(s)\n`);

    // Step 4: Verify deletion
    console.log('🔍 Verifying deletion...');
    const { data: remainingIncidents, error: verifyError } = await supabase
      .from('incident_reports')
      .select('id')
      .limit(1);

    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError.message);
      process.exit(1);
    }

    if (remainingIncidents && remainingIncidents.length > 0) {
      console.warn('⚠️  Warning: Some incidents still remain in database');
      console.log(`   Remaining count: ${remainingIncidents.length}`);
    } else {
      console.log('  ✅ All test data successfully deleted\n');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test Data Deletion Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Deleted ${incidents.length} incident(s) and all related data`);
    console.log('🎯 Database is now clean and ready for fresh testing\n');

  } catch (error) {
    console.error('❌ Fatal error during deletion:', error);
    process.exit(1);
  }
}

deleteAllTestData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
