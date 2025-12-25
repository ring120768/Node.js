#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const userId = '62afcde2-6cf0-419b-9a6e-dbcb72d23b03';

  // Get ALL incident reports (not single)
  const { data: incidents, error: iErr } = await supabase
    .from('incident_reports')
    .select('id, create_user_id, auth_user_id, user_id, voice_transcription, ai_summary, form_data_summary, created_at, updated_at')
    .or(`auth_user_id.eq.${userId},create_user_id.eq.${userId},user_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  console.log('=== INCIDENT REPORTS ===');
  if (iErr) {
    console.log('Error:', iErr.message);
  } else if (incidents.length === 0) {
    console.log('None found');
  } else {
    incidents.forEach(i => console.log({
      id: i.id,
      has_voice: Boolean(i.voice_transcription),
      voice_len: i.voice_transcription?.length || 0,
      has_summary: Boolean(i.ai_summary),
      has_form_data: Boolean(i.form_data_summary),
      created: i.created_at
    }));
  }

  // Check ai_transcription for this user
  const { data: trans, error: tErr } = await supabase
    .from('ai_transcription')
    .select('*')
    .eq('create_user_id', userId);

  console.log('\n=== AI_TRANSCRIPTION for user ===');
  if (tErr) {
    console.log('Error:', tErr.message);
  } else if (trans.length === 0) {
    console.log('None found');
  } else {
    trans.forEach(t => console.log({
      id: t.id,
      has_transcript: Boolean(t.transcript_text),
      transcript_len: t.transcript_text?.length || 0,
      has_narrative: Boolean(t.narrative_text),
      has_voice: Boolean(t.voice_transcription),
      created: t.created_at
    }));
  }

  // Check transcription_queue
  const { data: queue, error: qErr } = await supabase
    .from('transcription_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n=== TRANSCRIPTION_QUEUE ===');
  if (qErr) {
    console.log('Error:', qErr.message);
  } else if (!queue || queue.length === 0) {
    console.log('Empty');
  } else {
    queue.forEach(q => console.log({
      id: q.id,
      user_id: q.user_id?.substring(0,8) + '...',
      status: q.status,
      error: q.error_message,
      created: q.created_at
    }));
  }

  // Check user_documents for audio files
  const { data: docs, error: dErr } = await supabase
    .from('user_documents')
    .select('id, create_user_id, document_type, status, storage_path, created_at')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\n=== USER_DOCUMENTS for test user ===');
  if (dErr) {
    console.log('Error:', dErr.message);
  } else if (!docs || docs.length === 0) {
    console.log('No documents');
  } else {
    docs.forEach(d => console.log({
      type: d.document_type,
      status: d.status,
      path: d.storage_path?.substring(0, 50) + '...'
    }));
  }
}

check().catch(console.error);
