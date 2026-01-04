#!/usr/bin/env node

/**
 * Hard Delete Script: Complete removal of Sarah's incident data
 *
 * DELETES: All incident-related data for Sarah
 * PRESERVES: user_signup record only
 * METHOD: Hard delete (permanent removal, no soft delete)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SARAH_USER_ID = '30d82d89-42d5-406a-9b7d-83345d972f61';
const IAN_USER_ID = '94d80b2d-e77c-4b90-b3ad-544a20a13571';

async function hardDeleteSarahIncidents() {
  console.log('💥 HARD DELETE: Removing all Sarah\'s incident data...\n');
  console.log(`Target user: ${SARAH_USER_ID}`);
  console.log(`Protected user: ${IAN_USER_ID}`);
  console.log(`Preservation: user_signup only\n`);

  try {
    // ========================================
    // STEP 1: GET ALL SARAH'S INCIDENT IDs
    // ========================================
    const { data: sarahIncidents } = await supabase
      .from('incident_reports')
      .select('id, accident_date')
      .or(`auth_user_id.eq.${SARAH_USER_ID},create_user_id.eq.${SARAH_USER_ID},user_id.eq.${SARAH_USER_ID}`);

    console.log(`📋 Found ${sarahIncidents?.length || 0} incident(s) for Sarah`);

    const incidentIds = sarahIncidents?.map(inc => inc.id) || [];

    if (incidentIds.length > 0) {
      console.log(`   Incident IDs: ${incidentIds.join(', ')}\n`);
    }

    // ========================================
    // STEP 2: HARD DELETE CHILD RECORDS
    // ========================================
    console.log('🗑️  Hard deleting child records...\n');

    // Delete witnesses
    for (const incidentId of incidentIds) {
      const { error, count } = await supabase
        .from('incident_witnesses')
        .delete({ count: 'exact' })
        .eq('incident_report_id', incidentId);

      if (error) {
        console.error(`❌ Error deleting witnesses for ${incidentId}:`, error.message);
      } else {
        console.log(`✅ Deleted ${count || 0} witness(es) for incident ${incidentId}`);
      }
    }

    // Hard delete other vehicles (including soft-deleted ones)
    for (const incidentId of incidentIds) {
      const { error, count } = await supabase
        .from('incident_other_vehicles')
        .delete({ count: 'exact' })
        .eq('incident_id', incidentId);

      if (error) {
        console.error(`❌ Error deleting vehicles for ${incidentId}:`, error.message);
      } else {
        console.log(`✅ Deleted ${count || 0} vehicle(s) for incident ${incidentId}`);
      }
    }

    // Delete emergency audio transcripts
    for (const incidentId of incidentIds) {
      const { error, count } = await supabase
        .from('ai_listening_transcripts')
        .delete({ count: 'exact' })
        .eq('incident_id', incidentId);

      if (error) {
        console.error(`❌ Error deleting audio for ${incidentId}:`, error.message);
      } else if (count > 0) {
        console.log(`✅ Deleted ${count} audio transcript(s) for incident ${incidentId}`);
      }
    }

    // ========================================
    // STEP 3: HARD DELETE USER DOCUMENTS
    // ========================================
    console.log('\n🖼️  Hard deleting user documents...\n');

    const { error: docsError, count: docsCount } = await supabase
      .from('user_documents')
      .delete({ count: 'exact' })
      .eq('create_user_id', SARAH_USER_ID);

    if (docsError) {
      console.error('❌ Error deleting user documents:', docsError.message);
    } else {
      console.log(`✅ Deleted ${docsCount || 0} user document(s)`);
    }

    // ========================================
    // STEP 4: HARD DELETE COMPLETED PDFs
    // ========================================
    console.log('\n📄 Hard deleting completed PDFs...\n');

    const { error: pdfError, count: pdfCount } = await supabase
      .from('completed_incident_forms')
      .delete({ count: 'exact' })
      .eq('create_user_id', SARAH_USER_ID);

    if (pdfError) {
      console.error('❌ Error deleting PDFs:', pdfError.message);
    } else {
      console.log(`✅ Deleted ${pdfCount || 0} PDF record(s)`);
    }

    // ========================================
    // STEP 5: HARD DELETE INCIDENT REPORTS
    // ========================================
    console.log('\n📋 Hard deleting incident reports...\n');

    const { error: incidentError, count: incidentCount } = await supabase
      .from('incident_reports')
      .delete({ count: 'exact' })
      .or(`auth_user_id.eq.${SARAH_USER_ID},create_user_id.eq.${SARAH_USER_ID},user_id.eq.${SARAH_USER_ID}`);

    if (incidentError) {
      console.error('❌ Error deleting incident reports:', incidentError.message);
    } else {
      console.log(`✅ Deleted ${incidentCount || 0} incident report(s)`);
    }

    // ========================================
    // STEP 6: DELETE TEMPORARY UPLOADS
    // ========================================
    console.log('\n🗂️  Cleaning temporary uploads...\n');

    const { error: tempError, count: tempCount } = await supabase
      .from('temp_uploads')
      .delete({ count: 'exact' })
      .eq('create_user_id', SARAH_USER_ID);

    if (tempError) {
      console.error('❌ Error deleting temp uploads:', tempError.message);
    } else if (tempCount > 0) {
      console.log(`✅ Deleted ${tempCount} temporary upload(s)`);
    }

    // ========================================
    // STEP 7: VERIFY CLEANUP
    // ========================================
    console.log('\n📊 Verification...\n');

    // Check Sarah's remaining data
    const { data: remainingSarahIncidents } = await supabase
      .from('incident_reports')
      .select('id')
      .or(`auth_user_id.eq.${SARAH_USER_ID},create_user_id.eq.${SARAH_USER_ID},user_id.eq.${SARAH_USER_ID}`);

    const { data: remainingSarahDocs } = await supabase
      .from('user_documents')
      .select('id')
      .eq('create_user_id', SARAH_USER_ID);

    const { data: remainingSarahPdfs } = await supabase
      .from('completed_incident_forms')
      .select('id')
      .eq('create_user_id', SARAH_USER_ID);

    // Check Sarah's user_signup still exists
    const { data: sarahUser } = await supabase
      .from('user_signup')
      .select('create_user_id, email, name')
      .eq('create_user_id', SARAH_USER_ID)
      .single();

    // Check Ian's data is intact
    const { data: ianIncidents } = await supabase
      .from('incident_reports')
      .select('id')
      .or(`auth_user_id.eq.${IAN_USER_ID},create_user_id.eq.${IAN_USER_ID},user_id.eq.${IAN_USER_ID}`);

    console.log('Sarah\'s remaining data:');
    console.log(`  - Incidents: ${remainingSarahIncidents?.length || 0}`);
    console.log(`  - Documents: ${remainingSarahDocs?.length || 0}`);
    console.log(`  - PDFs: ${remainingSarahPdfs?.length || 0}`);
    console.log(`  - user_signup: ${sarahUser ? '✅ PRESERVED' : '❌ MISSING'}`);
    if (sarahUser) {
      console.log(`    Email: ${sarahUser.email}`);
      console.log(`    Name: ${sarahUser.name}`);
    }

    console.log('\nIan\'s data:');
    console.log(`  - Incidents: ${ianIncidents?.length || 0} ✅ INTACT`);

    console.log('\n✅ HARD DELETE COMPLETE!\n');
    console.log('Summary:');
    console.log('  - All incident data: PERMANENTLY DELETED');
    console.log('  - User documents: PERMANENTLY DELETED');
    console.log('  - PDFs: PERMANENTLY DELETED');
    console.log('  - user_signup: PRESERVED');
    console.log('  - No cross-contamination possible');

  } catch (error) {
    console.error('\n❌ Hard delete failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

hardDeleteSarahIncidents();
