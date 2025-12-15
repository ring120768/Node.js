#!/usr/bin/env node

/**
 * Test Incident Form Submission - Scene Photo Finalization
 *
 * Simulates POST /api/incident-form with page4a.session_id
 * to trigger scene photo finalization
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '1048b3ac-11ec-4e98-968d-9de28183a84d';
const sessionId = 'c8c058bb-88e7-4ee6-aceb-f517164dccd6';

async function testIncidentSubmission() {
  console.log('🧪 Testing Incident Form Submission - Scene Photo Finalization');
  console.log('='.repeat(80));
  console.log(`User ID: ${userId}`);
  console.log(`Session ID: ${sessionId}`);
  console.log('');

  // 1. Check current state of temp_uploads
  console.log('📋 Step 1: Pre-submission state check\\n');

  const { data: tempBefore, error: tempError } = await supabase
    .from('temp_uploads')
    .select('id, field_name, claimed')
    .eq('session_id', sessionId)
    .eq('field_name', 'scene_photo');

  if (tempError) {
    console.log('❌ Error:', tempError.message);
    return;
  }

  console.log(`Found ${tempBefore.length} scene photos in temp_uploads:`);
  console.log(`  - Unclaimed: ${tempBefore.filter(u => !u.claimed).length}`);
  console.log(`  - Claimed: ${tempBefore.filter(u => u.claimed).length}\\n`);

  // 2. Simulate the finalization call directly (bypassing full form submission)
  console.log('='.repeat(80));
  console.log('📋 Step 2: Simulating scene photo finalization...\\n');

  const locationPhotoService = require('./src/services/locationPhotoService');

  // First, we need an incident report ID
  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .select('id')
    .eq('create_user_id', userId)
    .single();

  if (incidentError || !incident) {
    console.log('❌ No incident report found. Creating test incident report...\\n');
    
    const { data: newIncident, error: createError } = await supabase
      .from('incident_reports')
      .insert({
        create_user_id: userId,
        incident_date: '2025-11-17',
        incident_time: '15:30:00'
      })
      .select('id')
      .single();

    if (createError) {
      console.log('❌ Failed to create incident report:', createError.message);
      return;
    }

    console.log('✅ Created test incident report:', newIncident.id, '\\n');
    incident.id = newIncident.id;
  } else {
    console.log('✅ Using existing incident report:', incident.id, '\\n');
  }

  // Now finalize the photos
  try {
    const result = await locationPhotoService.finalizePhotos(
      userId,
      incident.id,
      sessionId
    );

    console.log('📊 Finalization Result:\\n');
    console.log(`  Success: ${result.success ? '✅' : '❌'}`);
    console.log(`  Photos finalized: ${result.photos.length}`);
    
    if (result.photos.length > 0) {
      console.log('\\n  Photo Details:');
      result.photos.forEach((photo, index) => {
        console.log(`    ${index + 1}. Document Type: ${photo.document_type}`);
        console.log(`       Document ID: ${photo.document_id}`);
        console.log(`       Storage Path: ${photo.storage_path}`);
        console.log('');
      });
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\\n  ⚠️  Errors encountered:');
      result.errors.forEach(err => {
        console.log(`    - Photo ${err.photoNumber}: ${err.error}`);
      });
    }

  } catch (error) {
    console.log('❌ Finalization failed:', error.message);
    console.log('\\n', error.stack);
    return;
  }

  // 3. Check post-submission state
  console.log('\\n' + '='.repeat(80));
  console.log('📋 Step 3: Post-submission state check\\n');

  const { data: tempAfter } = await supabase
    .from('temp_uploads')
    .select('id, claimed')
    .eq('session_id', sessionId)
    .eq('field_name', 'scene_photo');

  console.log(`Temp uploads after finalization:`);
  console.log(`  - Unclaimed: ${tempAfter.filter(u => !u.claimed).length}`);
  console.log(`  - Claimed: ${tempAfter.filter(u => u.claimed).length}\\n`);

  const { data: userDocs } = await supabase
    .from('user_documents')
    .select('document_type, status, signed_url')
    .eq('create_user_id', userId)
    .in('document_type', ['scene_overview', 'scene_overview_2'])
    .order('created_at', { ascending: true });

  if (!userDocs || userDocs.length === 0) {
    console.log('⚠️  No finalized scene photos found in user_documents\\n');
  } else {
    console.log(`✅ Found ${userDocs.length} finalized scene photos:\\n`);
    userDocs.forEach((doc, index) => {
      const hasUrl = doc.signed_url ? '✅' : '❌';
      console.log(`  ${index + 1}. ${doc.document_type}`);
      console.log(`     Status: ${doc.status}`);
      console.log(`     Signed URL: ${hasUrl}`);
      console.log('');
    });
  }

  // 4. Summary
  console.log('='.repeat(80));
  console.log('📊 Test Summary\\n');

  const claimed = tempAfter.filter(u => u.claimed).length;
  const finalized = userDocs?.length || 0;

  console.log(`Before: ${tempBefore.filter(u => !u.claimed).length} unclaimed temp uploads`);
  console.log(`After:  ${tempAfter.filter(u => !u.claimed).length} unclaimed temp uploads`);
  console.log(`Claimed: ${claimed}`);
  console.log(`Finalized: ${finalized}\\n`);

  if (claimed === tempBefore.length && finalized === claimed) {
    console.log('✅ SUCCESS: All scene photos finalized correctly!');
    console.log('\\n✅ READY FOR PDF GENERATION');
    console.log('   Run: node test-form-filling.js ' + userId);
  } else if (claimed > 0 && finalized > 0) {
    console.log('⚠️  PARTIAL SUCCESS: Some photos finalized');
    console.log(`   ${claimed - finalized} photos claimed but not in user_documents`);
  } else {
    console.log('❌ FAILED: Scene photos not finalized');
    console.log('   Check logs for errors');
  }

  console.log('\\n' + '='.repeat(80));
}

testIncidentSubmission().catch(console.error);
