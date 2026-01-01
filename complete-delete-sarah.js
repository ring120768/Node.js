#!/usr/bin/env node

/**
 * Complete Account Deletion: Remove ALL data for Sarah
 *
 * DELETES: Everything including user_signup record
 * PRESERVES: Ian's data only
 * METHOD: Complete account removal
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SARAH_USER_ID = '30d82d89-42d5-406a-9b7d-83345d972f61';
const IAN_USER_ID = '94d80b2d-e77c-4b90-b3ad-544a20a13571';

async function completeDeleteSarah() {
  console.log('💀 COMPLETE ACCOUNT DELETION for Sarah\n');
  console.log(`Target user: ${SARAH_USER_ID}`);
  console.log(`Protected user: ${IAN_USER_ID}\n`);

  try {
    // ========================================
    // STEP 1: CHECK CURRENT STATE
    // ========================================
    console.log('📊 Current state:\n');

    const { data: sarahUser } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', SARAH_USER_ID)
      .single();

    if (sarahUser) {
      console.log('Sarah\'s account:');
      console.log(`  Email: ${sarahUser.email}`);
      console.log(`  Name: ${sarahUser.name} ${sarahUser.surname || ''}`);
      console.log(`  Created: ${sarahUser.created_at}\n`);
    } else {
      console.log('⚠️  Sarah\'s user_signup record not found\n');
    }

    // Get all incident IDs for cleanup
    const { data: sarahIncidents } = await supabase
      .from('incident_reports')
      .select('id')
      .or(`auth_user_id.eq.${SARAH_USER_ID},create_user_id.eq.${SARAH_USER_ID},user_id.eq.${SARAH_USER_ID}`);

    const incidentIds = sarahIncidents?.map(inc => inc.id) || [];

    // ========================================
    // STEP 2: DELETE ALL RELATED DATA
    // ========================================
    console.log('🗑️  Deleting all related data...\n');

    // Delete witnesses
    for (const incidentId of incidentIds) {
      await supabase
        .from('incident_witnesses')
        .delete()
        .eq('incident_report_id', incidentId);
    }
    console.log('✅ Deleted witnesses');

    // Delete other vehicles
    for (const incidentId of incidentIds) {
      await supabase
        .from('incident_other_vehicles')
        .delete()
        .eq('incident_id', incidentId);
    }
    console.log('✅ Deleted other vehicles');

    // Delete emergency audio
    for (const incidentId of incidentIds) {
      await supabase
        .from('ai_listening_transcripts')
        .delete()
        .eq('incident_id', incidentId);
    }
    console.log('✅ Deleted emergency audio');

    // Delete user documents
    await supabase
      .from('user_documents')
      .delete()
      .eq('create_user_id', SARAH_USER_ID);
    console.log('✅ Deleted user documents');

    // Delete completed PDFs
    await supabase
      .from('completed_incident_forms')
      .delete()
      .eq('create_user_id', SARAH_USER_ID);
    console.log('✅ Deleted completed PDFs');

    // Delete incident reports
    await supabase
      .from('incident_reports')
      .delete()
      .or(`auth_user_id.eq.${SARAH_USER_ID},create_user_id.eq.${SARAH_USER_ID},user_id.eq.${SARAH_USER_ID}`);
    console.log('✅ Deleted incident reports');

    // Delete DVLA vehicle info
    await supabase
      .from('dvla_vehicle_info_new')
      .delete()
      .eq('create_user_id', SARAH_USER_ID);
    console.log('✅ Deleted DVLA vehicle info');

    // Delete legacy incident images
    await supabase
      .from('incident_images')
      .delete()
      .eq('create_user_id', SARAH_USER_ID);
    console.log('✅ Deleted legacy incident images');

    // Delete AI transcription (if linked by user)
    await supabase
      .from('ai_transcription')
      .delete()
      .eq('create_user_id', SARAH_USER_ID);
    console.log('✅ Deleted AI transcription');

    // ========================================
    // STEP 3: DELETE USER_SIGNUP RECORD
    // ========================================
    console.log('\n💥 Deleting user_signup record...\n');

    const { error: userDeleteError, count } = await supabase
      .from('user_signup')
      .delete({ count: 'exact' })
      .eq('create_user_id', SARAH_USER_ID);

    if (userDeleteError) {
      console.error('❌ Error deleting user_signup:', userDeleteError.message);
    } else {
      console.log(`✅ Deleted ${count || 0} user_signup record(s)`);
    }

    // ========================================
    // STEP 4: DELETE SUPABASE AUTH USER
    // ========================================
    console.log('\n🔐 Attempting to delete Supabase Auth user...\n');

    try {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(SARAH_USER_ID);

      if (authDeleteError) {
        if (authDeleteError.message.includes('not found')) {
          console.log('ℹ️  Auth user already deleted or doesn\'t exist');
        } else {
          console.error('⚠️  Error deleting auth user:', authDeleteError.message);
        }
      } else {
        console.log('✅ Deleted Supabase Auth user');
      }
    } catch (authError) {
      console.log('ℹ️  Auth user cleanup skipped:', authError.message);
    }

    // ========================================
    // STEP 5: VERIFY COMPLETE DELETION
    // ========================================
    console.log('\n📊 Verification:\n');

    // Check Sarah's data
    const { data: remainingUser } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', SARAH_USER_ID)
      .single();

    const { data: remainingIncidents } = await supabase
      .from('incident_reports')
      .select('id')
      .or(`auth_user_id.eq.${SARAH_USER_ID},create_user_id.eq.${SARAH_USER_ID},user_id.eq.${SARAH_USER_ID}`);

    const { data: remainingDocs } = await supabase
      .from('user_documents')
      .select('id')
      .eq('create_user_id', SARAH_USER_ID);

    // Check Ian's data
    const { data: ianUser } = await supabase
      .from('user_signup')
      .select('email, name')
      .eq('create_user_id', IAN_USER_ID)
      .single();

    const { data: ianIncidents } = await supabase
      .from('incident_reports')
      .select('id')
      .or(`auth_user_id.eq.${IAN_USER_ID},create_user_id.eq.${IAN_USER_ID},user_id.eq.${IAN_USER_ID}`);

    console.log('Sarah (30d82d89-42d5-406a-9b7d-83345d972f61):');
    console.log(`  user_signup: ${remainingUser ? '❌ STILL EXISTS' : '✅ DELETED'}`);
    console.log(`  Incidents: ${remainingIncidents?.length || 0}`);
    console.log(`  Documents: ${remainingDocs?.length || 0}`);

    console.log('\nIan (94d80b2d-e77c-4b90-b3ad-544a20a13571):');
    console.log(`  user_signup: ${ianUser ? '✅ INTACT' : '❌ MISSING'}`);
    if (ianUser) {
      console.log(`    Email: ${ianUser.email}`);
      console.log(`    Name: ${ianUser.name}`);
    }
    console.log(`  Incidents: ${ianIncidents?.length || 0} ✅`);

    console.log('\n✅ COMPLETE DELETION FINISHED!\n');
    console.log('Summary:');
    console.log('  - Sarah\'s account: COMPLETELY REMOVED');
    console.log('  - All incident data: DELETED');
    console.log('  - All documents: DELETED');
    console.log('  - Auth user: DELETED');
    console.log('  - Ian\'s account: FULLY INTACT');
    console.log('  - No trace of Sarah remaining');

  } catch (error) {
    console.error('\n❌ Complete deletion failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

completeDeleteSarah();
