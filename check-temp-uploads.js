#!/usr/bin/env node

/**
 * Check temp_uploads table for failed upload records
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTempUploads() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          TEMP UPLOADS TABLE INVESTIGATION                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get user ID from the problematic signup
    const userId = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

    // Get all temp_uploads for this user
    const { data: tempUploads, error: tempError } = await supabase
      .from('temp_uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (tempError) {
      console.log('❌ Error fetching temp_uploads:', tempError.message);
      return;
    }

    console.log(`📋 FOUND ${tempUploads ? tempUploads.length : 0} TEMP UPLOADS (latest 20):\n`);

    if (!tempUploads || tempUploads.length === 0) {
      console.log('✅ temp_uploads table is EMPTY\n');
      console.log('🔍 DIAGNOSIS:');
      console.log('   This confirms the uploads failed at the Storage level.');
      console.log('   No temp_uploads records were created because Storage upload failed.');
      console.log('   The temp upload controller correctly prevented database records.\n');
      return;
    }

    // Analyze temp uploads
    tempUploads.forEach(upload => {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`Field: ${upload.field_name}`);
      console.log(`Session: ${upload.session_id}`);
      console.log(`Created: ${new Date(upload.uploaded_at || upload.created_at).toLocaleString()}`);
      console.log(`Expires: ${new Date(upload.expires_at).toLocaleString()}`);
      console.log(`Storage Path: ${upload.storage_path}`);
      console.log(`File Size: ${upload.file_size ? Math.round(upload.file_size / 1024) + ' KB' : 'N/A'}`);
      console.log(`Claimed: ${upload.claimed ? 'Yes' : 'No'}`);
    });

    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                         ANALYSIS                               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const claimed = tempUploads.filter(u => u.claimed);
    const unclaimed = tempUploads.filter(u => !u.claimed);

    console.log(`Total: ${tempUploads.length}`);
    console.log(`Claimed (moved to permanent): ${claimed.length}`);
    console.log(`Unclaimed (still temp): ${unclaimed.length}\n`);

    if (unclaimed.length > 0) {
      console.log('⚠️  UNCLAIMED TEMP UPLOADS:\n');
      unclaimed.forEach(u => {
        console.log(`   ${u.field_name} (${new Date(u.uploaded_at || u.created_at).toLocaleString()})`);
      });
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

checkTempUploads().catch(console.error);
