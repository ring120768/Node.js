#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const INCIDENT_ID = '3d92a38e-a381-490e-9e0e-42c01e35b4c3';
const USER_ID = '61033b12-c351-42c0-9647-725eb1ee9154';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDashcamFields() {
  console.log(`🔍 Checking dashcam and journey purpose fields\n`);

  // Get incident data
  const { data: incident, error } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('id', INCIDENT_ID)
    .single();

  if (error) {
    console.error('❌ Error fetching incident:', error.message);
    return;
  }

  // Check all columns that contain 'dashcam' or 'journey'
  const allColumns = Object.keys(incident);
  const dashcamColumns = allColumns.filter(col => col.toLowerCase().includes('dashcam'));
  const journeyColumns = allColumns.filter(col => col.toLowerCase().includes('journey'));

  console.log('📹 DASHCAM FIELDS:');
  if (dashcamColumns.length === 0) {
    console.log('   ❌ No dashcam columns found in incident_reports table');
  } else {
    dashcamColumns.forEach(col => {
      console.log(`   - ${col}: ${incident[col] || '[EMPTY]'}`);
    });
  }

  console.log('\n🚗 JOURNEY PURPOSE FIELDS:');
  if (journeyColumns.length === 0) {
    console.log('   ❌ No journey columns found in incident_reports table');
  } else {
    journeyColumns.forEach(col => {
      console.log(`   - ${col}: ${incident[col] || '[EMPTY]'}`);
    });
  }

  // Check user_documents for dashcam footage
  const { data: dashcamDocs, error: docsError } = await supabase
    .from('user_documents')
    .select('*')
    .eq('create_user_id', USER_ID)
    .eq('document_type', 'dashcam_footage')
    .is('deleted_at', null);

  console.log('\n📁 DASHCAM FOOTAGE IN USER_DOCUMENTS:');
  if (docsError) {
    console.log(`   ❌ Error: ${docsError.message}`);
  } else if (!dashcamDocs || dashcamDocs.length === 0) {
    console.log('   No dashcam footage documents found');
  } else {
    console.log(`   Found ${dashcamDocs.length} dashcam footage files:`);
    dashcamDocs.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.file_name || 'unnamed'}`);
      console.log(`      Incident ID: ${doc.incident_id || 'NULL'}`);
      console.log(`      Signed URL: ${doc.signed_url ? 'YES' : 'NO'}`);
      console.log(`      Created: ${new Date(doc.created_at).toLocaleString('en-GB')}`);
    });
  }

  // Check AI listening transcripts (eavesdropper)
  const { data: audioRecordings, error: audioError } = await supabase
    .from('ai_listening_transcripts')
    .select('*')
    .eq('create_user_id', USER_ID)
    .order('recorded_at', { ascending: false })
    .limit(5);

  console.log('\n🎤 AI EAVESDROPPER RECORDINGS:');
  if (audioError) {
    console.log(`   ❌ Error: ${audioError.message}`);
  } else if (!audioRecordings || audioRecordings.length === 0) {
    console.log('   No eavesdropper recordings found');
  } else {
    console.log(`   Found ${audioRecordings.length} recordings:`);
    audioRecordings.forEach((audio, index) => {
      console.log(`   ${index + 1}. ID: ${audio.id.substring(0, 8)}...`);
      console.log(`      Incident ID: ${audio.incident_id || 'NOT LINKED'}`);
      console.log(`      Recorded: ${new Date(audio.recorded_at).toLocaleString('en-GB')}`);
      console.log(`      Duration: ${audio.duration_seconds || 0}s`);
      console.log(`      Transcription: ${audio.transcription_text ? audio.transcription_text.length + ' chars' : 'EMPTY'}`);
    });
  }

  console.log('\n✅ Check complete');
}

checkDashcamFields().catch(console.error);
