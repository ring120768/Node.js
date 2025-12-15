#!/usr/bin/env node

/**
 * Check Scene Photo Schema
 * Investigates pages 11-12 missing image URLs
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '1048b3ac-11ec-4e98-968d-9de28183a84d';

async function checkScenePhotos() {
  console.log('🔍 Checking Scene Photo Schema and Data');
  console.log('='.repeat(80));

  // 1. Check incident_reports table for scene_photo columns
  console.log('\n📋 Checking incident_reports table...\n');

  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (incidentError) {
    console.log('❌ Error:', incidentError.message);
    return;
  }

  // Find all columns containing "scene" or "photo"
  const scenePhotoColumns = Object.keys(incident).filter(col =>
    col.includes('scene') || (col.includes('photo') && col.includes('url'))
  );

  console.log(`Found ${scenePhotoColumns.length} scene/photo columns:\n`);
  scenePhotoColumns.forEach(col => {
    const value = incident[col];
    const hasValue = value ? '✅ HAS DATA' : '⚠️  NULL';
    console.log(`  ${hasValue} ${col}: ${value || 'null'}`);
  });

  // 2. Check user_documents table for scene photos
  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Checking user_documents table...\n');

  const { data: userDocs, error: docsError } = await supabase
    .from('user_documents')
    .select('*')
    .eq('create_user_id', userId)
    .eq('status', 'completed')
    .is('deleted_at', null);

  if (docsError) {
    console.log('❌ Error:', docsError.message);
    return;
  }

  if (!userDocs || userDocs.length === 0) {
    console.log('⚠️  No completed documents found');
  } else {
    console.log(`Found ${userDocs.length} documents:\n`);
    userDocs.forEach(doc => {
      const url = doc.signed_url ? '✅ HAS URL' : '❌ NO URL';
      console.log(`  ${url} ${doc.document_type}`);
      if (doc.signed_url) {
        console.log(`       ${doc.signed_url.substring(0, 80)}...`);
      }
    });

    // Check for scene-related documents
    const sceneDocuments = userDocs.filter(doc =>
      doc.document_type.includes('scene') ||
      doc.document_type.includes('location') ||
      doc.document_type.includes('overview')
    );

    console.log(`\n🔍 Scene-related documents: ${sceneDocuments.length}`);
    sceneDocuments.forEach(doc => {
      console.log(`  - ${doc.document_type}`);
      console.log(`    Storage path: ${doc.storage_path}`);
      console.log(`    Created: ${doc.created_at}`);
    });
  }

  // 3. Check temp_uploads table
  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Checking temp_uploads table...\n');

  // Get temp_session_id from incident_reports (if it exists there)
  const tempSessionId = incident.temp_session_id || localStorage.getItem('temp_session_id');

  const { data: tempUploads, error: tempError } = await supabase
    .from('temp_uploads')
    .select('*')
    .eq('create_user_id', userId);

  if (tempError) {
    console.log('❌ Error:', tempError.message);
  } else if (!tempUploads || tempUploads.length === 0) {
    console.log('⚠️  No temp uploads found');
  } else {
    console.log(`Found ${tempUploads.length} temp uploads:\n`);
    tempUploads.forEach(upload => {
      const url = upload.public_url ? '✅ HAS URL' : '❌ NO URL';
      console.log(`  ${url} ${upload.field_name}`);
      if (upload.public_url) {
        console.log(`       ${upload.public_url.substring(0, 80)}...`);
      }
      console.log(`       Created: ${upload.created_at}`);
    });

    // Check for scene photos
    const sceneUploads = tempUploads.filter(u => u.field_name === 'scene_photo');
    console.log(`\n🔍 Scene photo uploads: ${sceneUploads.length}`);
    sceneUploads.forEach(upload => {
      console.log(`  - ${upload.field_name}`);
      console.log(`    Storage path: ${upload.storage_path}`);
      console.log(`    Public URL: ${upload.public_url ? 'YES' : 'NO'}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

checkScenePhotos().catch(console.error);
