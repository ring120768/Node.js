/**
 * Test Page 6 Vehicle Damage Photo Processing
 *
 * Verifies complete image flow from temp upload to permanent storage:
 * 1. Checks temp_uploads table for vehicle_damage_photo entries
 * 2. Verifies session_id is stored in localStorage (manual verification)
 * 3. Tests finalization: moving files from temp/ to permanent storage
 * 4. Verifies user_documents records are created
 * 5. Verifies temp_uploads are marked as claimed
 *
 * Usage:
 *   node test-page6-image-flow.js [session-id]
 *   node test-page6-image-flow.js --help
 */

const { createClient } = require('@supabase/supabase-js');
const locationPhotoService = require('./src/services/locationPhotoService');
require('dotenv').config();

// Supabase client (service role for testing)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Display usage information
 */
function showHelp() {
  console.log(`
Test Page 6 Vehicle Damage Photo Processing
============================================

This script verifies the complete image flow for Page 6 vehicle damage photos.

Usage:
  node test-page6-image-flow.js [session-id]
  node test-page6-image-flow.js --help

Arguments:
  session-id    UUID of the temp upload session (from localStorage)
                If not provided, will show all unclaimed vehicle_damage_photo uploads

Examples:
  # Test specific session
  node test-page6-image-flow.js 550e8400-e29b-41d4-a716-446655440000

  # Show all unclaimed uploads
  node test-page6-image-flow.js

Manual Testing Steps:
=====================

1. Open Page 6 in browser:
   http://localhost:5000/incident-form-page6-vehicle-images.html

2. Open browser console (F12) and check localStorage:
   localStorage.getItem('temp_session_id')

3. Upload some vehicle damage photos

4. Check temp_uploads table:
   SELECT * FROM temp_uploads WHERE field_name = 'vehicle_damage_photo' AND claimed = false;

5. Fill remaining form pages and submit

6. Run this test script with the session ID

7. Verify photos moved to permanent storage:
   SELECT * FROM user_documents WHERE document_type = 'vehicle_damage_photo';

8. Verify temp uploads claimed:
   SELECT * FROM temp_uploads WHERE session_id = '[your-session-id]' AND claimed = true;
  `);
}

/**
 * Check temp uploads for a session
 */
async function checkTempUploads(sessionId = null) {
  console.log('\n📋 Checking Temp Uploads for vehicle_damage_photo...\n');

  let query = supabase
    .from('temp_uploads')
    .select('*')
    .eq('field_name', 'vehicle_damage_photo')
    .eq('claimed', false)
    .order('uploaded_at', { ascending: false });

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching temp uploads:', error.message);
    return null;
  }

  if (!data || data.length === 0) {
    if (sessionId) {
      console.log(`⚠️  No unclaimed vehicle damage photos found for session: ${sessionId}`);
    } else {
      console.log('⚠️  No unclaimed vehicle damage photos found in temp_uploads');
    }
    return null;
  }

  console.log(`✅ Found ${data.length} unclaimed vehicle damage photo(s):\n`);

  data.forEach((upload, index) => {
    console.log(`Photo ${index + 1}:`);
    console.log(`  ID: ${upload.id}`);
    console.log(`  Session ID: ${upload.session_id}`);
    console.log(`  Storage Path: ${upload.storage_path}`);
    console.log(`  File Size: ${(upload.file_size / 1024).toFixed(2)} KB`);
    console.log(`  MIME Type: ${upload.mime_type}`);
    console.log(`  Uploaded At: ${upload.uploaded_at}`);
    console.log(`  Claimed: ${upload.claimed}`);
    console.log('');
  });

  return data;
}

/**
 * Test photo finalization
 */
async function testFinalization(sessionId, userId, incidentReportId) {
  console.log('\n🔄 Testing Photo Finalization...\n');
  console.log(`Session ID: ${sessionId}`);
  console.log(`User ID: ${userId}`);
  console.log(`Incident Report ID: ${incidentReportId}\n`);

  try {
    const result = await locationPhotoService.finalizeVehicleDamagePhotos(
      userId,
      incidentReportId,
      sessionId
    );

    if (result.success) {
      console.log('✅ Photo Finalization Successful!\n');
      console.log(`Total Processed: ${result.totalProcessed}`);
      console.log(`Success Count: ${result.successCount}`);
      console.log(`Error Count: ${result.errorCount}\n`);

      if (result.photos && result.photos.length > 0) {
        console.log('Finalized Photos:');
        result.photos.forEach((photo, index) => {
          console.log(`\nPhoto ${index + 1}:`);
          console.log(`  Document ID: ${photo.id}`);
          console.log(`  Storage Path: ${photo.storagePath}`);
          console.log(`  Download URL: ${photo.downloadUrl}`);
          console.log(`  File Size: ${(photo.fileSize / 1024).toFixed(2)} KB`);
        });
      }

      if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️  Some photos had errors:');
        result.errors.forEach((error, index) => {
          console.log(`\nError ${index + 1}:`);
          console.log(`  Upload ID: ${error.uploadId}`);
          console.log(`  Error: ${error.error}`);
        });
      }
    } else {
      console.error('❌ Photo Finalization Failed:', result.error);
    }

    return result;

  } catch (error) {
    console.error('❌ Unexpected error during finalization:', error.message);
    return null;
  }
}

/**
 * Verify user_documents records
 */
async function verifyDocuments(incidentReportId) {
  console.log('\n📄 Verifying user_documents Records...\n');

  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .eq('incident_report_id', incidentReportId)
    .eq('document_type', 'vehicle_damage_photo')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching user_documents:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No vehicle damage photo documents found');
    return;
  }

  console.log(`✅ Found ${data.length} vehicle damage photo document(s):\n`);

  data.forEach((doc, index) => {
    console.log(`Document ${index + 1}:`);
    console.log(`  ID: ${doc.id}`);
    console.log(`  Incident Report ID: ${doc.incident_report_id}`);
    console.log(`  Storage Path: ${doc.storage_path}`);
    console.log(`  Download URL: ${doc.download_url}`);
    console.log(`  Status: ${doc.status}`);
    console.log(`  Created At: ${doc.created_at}`);
    console.log('');
  });
}

/**
 * Verify temp uploads are claimed
 */
async function verifyClaimedUploads(sessionId) {
  console.log('\n✓ Verifying Claimed Temp Uploads...\n');

  const { data, error } = await supabase
    .from('temp_uploads')
    .select('*')
    .eq('session_id', sessionId)
    .eq('field_name', 'vehicle_damage_photo')
    .eq('claimed', true);

  if (error) {
    console.error('❌ Error checking claimed uploads:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No claimed uploads found for this session');
    return;
  }

  console.log(`✅ ${data.length} upload(s) successfully claimed:\n`);

  data.forEach((upload, index) => {
    console.log(`Upload ${index + 1}:`);
    console.log(`  ID: ${upload.id}`);
    console.log(`  Claimed By: ${upload.claimed_by_user_id}`);
    console.log(`  Claimed At: ${upload.claimed_at}`);
    console.log('');
  });
}

/**
 * Main test function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const sessionId = args[0] || null;

  console.log('🧪 Page 6 Vehicle Damage Photo Flow Test');
  console.log('=========================================\n');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables:');
    console.error('   SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Step 1: Check temp uploads
  const tempUploads = await checkTempUploads(sessionId);

  if (!tempUploads || tempUploads.length === 0) {
    console.log('\nℹ️  Manual Testing Steps:');
    console.log('1. Open Page 6: http://localhost:5000/incident-form-page6-vehicle-images.html');
    console.log('2. Upload vehicle damage photos');
    console.log('3. Get session ID: localStorage.getItem(\'temp_session_id\')');
    console.log('4. Run this script again with the session ID');
    process.exit(0);
  }

  // If specific session provided, offer to test finalization
  if (sessionId && tempUploads.length > 0) {
    console.log('\n⚠️  NOTE: Testing finalization requires:');
    console.log('   - User ID (UUID)');
    console.log('   - Incident Report ID (UUID)');
    console.log('');
    console.log('To test finalization, run:');
    console.log('  node test-page6-image-flow.js --finalize [session-id] [user-id] [incident-report-id]');
  }

  // If --finalize flag provided
  if (args[0] === '--finalize' && args.length === 4) {
    const [, sessionId, userId, incidentReportId] = args;

    await testFinalization(sessionId, userId, incidentReportId);
    await verifyDocuments(incidentReportId);
    await verifyClaimedUploads(sessionId);
  }

  console.log('\n✅ Test Complete\n');
}

// Run main function
main().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
