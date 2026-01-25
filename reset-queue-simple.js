#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const INCIDENT_ID = '3d92a38e-a381-490e-9e0e-42c01e35b4c3';
const USER_ID = '61033b12-c351-42c0-9647-725eb1ee9154';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetQueue() {
  console.log(`🔄 Resetting queue entry for incident: ${INCIDENT_ID}`);

  const { error } = await supabase
    .from('pdf_generation_queue')
    .update({
      status: 'pending',
      attempt_count: 0,
      last_error: null
    })
    .eq('incident_id', INCIDENT_ID)
    .eq('create_user_id', USER_ID);

  if (error) {
    console.error('❌ Queue reset error:', error.message);
  } else {
    console.log('✅ Queue entry reset to pending');
    console.log('   Status: pending');
    console.log('   Attempts: 0');
    console.log('   Last error: null');
  }
}

resetQueue().catch(console.error);
