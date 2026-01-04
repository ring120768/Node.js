#!/usr/bin/env node

/**
 * Cleanup Script: Remove Sarah's incident data for testing
 *
 * SAFE: Only targets Sarah's UUID (30d82d89-42d5-406a-9b7d-83345d972f61)
 * PRESERVES: Ian's data (94d80b2d-e77c-4b90-b3ad-544a20a13571)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SARAH_USER_ID = '30d82d89-42d5-406a-9b7d-83345d972f61';
const IAN_USER_ID = '94d80b2d-e77c-4b90-b3ad-544a20a13571';

async function cleanupSarahData() {
  console.log('🧹 Starting cleanup for Sarah\'s test data...\n');
  console.log(`Target user: ${SARAH_USER_ID}`);
  console.log(`Protected user: ${IAN_USER_ID}\n`);

  try {
    // ========================================
    // STEP 1: CHECK WHAT EXISTS
    // ========================================
    console.log('📊 Checking existing data...\n');

    // Check incident reports
    const { data: sarahIncidents } = await supabase
      .from('incident_reports')
      .select('id, accident_date, created_at')
      .or(`auth_user_id.eq.${SARAH_USER_ID},create_user_id.eq.${SARAH_USER_ID},user_id.eq.${SARAH_USER_ID}`)
      .is('deleted_at', null);

    console.log(`📋 Sarah's incidents: ${sarahIncidents?.length || 0}`);
    if (sarahIncidents && sarahIncidents.length > 0) {
      sarahIncidents.forEach(inc => {
        console.log(`   - ${inc.id} (${inc.accident_date || 'no date'})`);
      });
    }

    // Check witnesses
    if (sarahIncidents && sarahIncidents.length > 0) {
      for (const incident of sarahIncidents) {
        const { data: witnesses } = await supabase
          .from('incident_witnesses')
          .select('id, witness_name')
          .eq('incident_report_id', incident.id);

        if (witnesses && witnesses.length > 0) {
          console.log(`   👥 Witnesses for ${incident.id}: ${witnesses.length}`);
        }
      }
    }

    // Check other vehicles
    if (sarahIncidents && sarahIncidents.length > 0) {
      for (const incident of sarahIncidents) {
        const { data: vehicles } = await supabase
          .from('incident_other_vehicles')
          .select('id')
          .eq('incident_id', incident.id)
          .is('deleted_at', null);

        if (vehicles && vehicles.length > 0) {
          console.log(`   🚗 Other vehicles for ${incident.id}: ${vehicles.length}`);
        }
      }
    }

    // Check emergency audio
    if (sarahIncidents && sarahIncidents.length > 0) {
      for (const incident of sarahIncidents) {
        const { data: audio } = await supabase
          .from('ai_listening_transcripts')
          .select('id')
          .eq('incident_id', incident.id);

        if (audio && audio.length > 0) {
          console.log(`   🎤 Emergency audio for ${incident.id}: ${audio.length}`);
        }
      }
    }

    // Check completed PDFs
    const { data: sarahPdfs } = await supabase
      .from('completed_incident_forms')
      .select('id, created_at')
      .eq('create_user_id', SARAH_USER_ID);

    console.log(`📄 Sarah's PDFs: ${sarahPdfs?.length || 0}`);

    // Check user documents (images)
    const { data: sarahDocs } = await supabase
      .from('user_documents')
      .select('id, document_type')
      .eq('create_user_id', SARAH_USER_ID)
      .is('deleted_at', null);

    console.log(`🖼️  Sarah's documents: ${sarahDocs?.length || 0}\n`);

    // ========================================
    // STEP 2: VERIFY IAN'S DATA EXISTS
    // ========================================
    console.log('🔒 Verifying Ian\'s data is protected...\n');

    const { data: ianIncidents } = await supabase
      .from('incident_reports')
      .select('id')
      .or(`auth_user_id.eq.${IAN_USER_ID},create_user_id.eq.${IAN_USER_ID},user_id.eq.${IAN_USER_ID}`)
      .is('deleted_at', null);

    console.log(`✅ Ian has ${ianIncidents?.length || 0} incidents (will be preserved)\n`);

    // ========================================
    // STEP 3: DELETE SARAH'S DATA
    // ========================================
    console.log('🗑️  Deleting Sarah\'s data...\n');

    let deletedCount = 0;

    // Delete witnesses (child table first)
    if (sarahIncidents && sarahIncidents.length > 0) {
      for (const incident of sarahIncidents) {
        const { error: witnessError } = await supabase
          .from('incident_witnesses')
          .delete()
          .eq('incident_report_id', incident.id);

        if (witnessError) {
          console.error(`❌ Error deleting witnesses for ${incident.id}:`, witnessError.message);
        } else {
          console.log(`✅ Deleted witnesses for incident ${incident.id}`);
          deletedCount++;
        }
      }
    }

    // Soft delete other vehicles
    if (sarahIncidents && sarahIncidents.length > 0) {
      for (const incident of sarahIncidents) {
        const { error: vehicleError } = await supabase
          .from('incident_other_vehicles')
          .update({ deleted_at: new Date().toISOString() })
          .eq('incident_id', incident.id)
          .is('deleted_at', null);

        if (vehicleError) {
          console.error(`❌ Error soft-deleting vehicles for ${incident.id}:`, vehicleError.message);
        } else {
          console.log(`✅ Soft-deleted vehicles for incident ${incident.id}`);
          deletedCount++;
        }
      }
    }

    // Delete emergency audio transcripts
    if (sarahIncidents && sarahIncidents.length > 0) {
      for (const incident of sarahIncidents) {
        const { error: audioError } = await supabase
          .from('ai_listening_transcripts')
          .delete()
          .eq('incident_id', incident.id);

        if (audioError) {
          console.error(`❌ Error deleting audio for ${incident.id}:`, audioError.message);
        } else {
          console.log(`✅ Deleted emergency audio for incident ${incident.id}`);
          deletedCount++;
        }
      }
    }

    // Soft delete incident reports
    const { error: incidentError } = await supabase
      .from('incident_reports')
      .update({ deleted_at: new Date().toISOString() })
      .or(`auth_user_id.eq.${SARAH_USER_ID},create_user_id.eq.${SARAH_USER_ID},user_id.eq.${SARAH_USER_ID}`)
      .is('deleted_at', null);

    if (incidentError) {
      console.error('❌ Error soft-deleting incident reports:', incidentError.message);
    } else {
      console.log(`✅ Soft-deleted ${sarahIncidents?.length || 0} incident reports`);
      deletedCount++;
    }

    // Delete completed PDFs
    const { error: pdfError } = await supabase
      .from('completed_incident_forms')
      .delete()
      .eq('create_user_id', SARAH_USER_ID);

    if (pdfError) {
      console.error('❌ Error deleting PDFs:', pdfError.message);
    } else {
      console.log(`✅ Deleted ${sarahPdfs?.length || 0} PDF records`);
      deletedCount++;
    }

    // Soft delete user documents
    const { error: docsError } = await supabase
      .from('user_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('create_user_id', SARAH_USER_ID)
      .is('deleted_at', null);

    if (docsError) {
      console.error('❌ Error soft-deleting documents:', docsError.message);
    } else {
      console.log(`✅ Soft-deleted ${sarahDocs?.length || 0} user documents`);
      deletedCount++;
    }

    // ========================================
    // STEP 4: VERIFY CLEANUP
    // ========================================
    console.log('\n📊 Verifying cleanup...\n');

    const { data: remainingSarahIncidents } = await supabase
      .from('incident_reports')
      .select('id')
      .or(`auth_user_id.eq.${SARAH_USER_ID},create_user_id.eq.${SARAH_USER_ID},user_id.eq.${SARAH_USER_ID}`)
      .is('deleted_at', null);

    console.log(`Sarah's remaining incidents: ${remainingSarahIncidents?.length || 0}`);

    const { data: remainingIanIncidents } = await supabase
      .from('incident_reports')
      .select('id')
      .or(`auth_user_id.eq.${IAN_USER_ID},create_user_id.eq.${IAN_USER_ID},user_id.eq.${IAN_USER_ID}`)
      .is('deleted_at', null);

    console.log(`Ian's remaining incidents: ${remainingIanIncidents?.length || 0}`);

    console.log('\n✅ Cleanup complete!\n');
    console.log(`Total operations: ${deletedCount}`);
    console.log(`Sarah's data: CLEARED`);
    console.log(`Ian's data: PRESERVED`);

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

cleanupSarahData();
