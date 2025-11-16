#!/usr/bin/env node

/**
 * Clear Test Data - Cleanup script for Supabase test data
 *
 * WARNING: This will DELETE data from:
 * - user_signup
 * - user_documents
 * - incident_reports
 * - incident_other_vehicles
 * - incident_witnesses
 * - temp_uploads
 * - ai_transcription
 * - Supabase Storage files
 *
 * USE WITH CAUTION - Data deletion is permanent!
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function clearTestData() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              SUPABASE TEST DATA CLEANUP                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('⚠️  WARNING: This will DELETE ALL test data from Supabase!\n');

  // Step 1: Show what will be deleted
  console.log('📋 SCANNING DATABASE FOR TEST DATA...\n');

  try {
    // Count records
    const { count: signupCount } = await supabase
      .from('user_signup')
      .select('*', { count: 'exact', head: true });

    const { count: documentsCount } = await supabase
      .from('user_documents')
      .select('*', { count: 'exact', head: true });

    const { count: incidentsCount } = await supabase
      .from('incident_reports')
      .select('*', { count: 'exact', head: true });

    const { count: tempCount } = await supabase
      .from('temp_uploads')
      .select('*', { count: 'exact', head: true });

    const { count: transcriptionCount } = await supabase
      .from('ai_transcription')
      .select('*', { count: 'exact', head: true });

    const { count: otherVehiclesCount } = await supabase
      .from('incident_other_vehicles')
      .select('*', { count: 'exact', head: true });

    const { count: witnessesCount } = await supabase
      .from('incident_witnesses')
      .select('*', { count: 'exact', head: true });

    console.log('Found records to delete:');
    console.log(`  - user_signup: ${signupCount || 0}`);
    console.log(`  - user_documents: ${documentsCount || 0}`);
    console.log(`  - incident_reports: ${incidentsCount || 0}`);
    console.log(`  - incident_other_vehicles: ${otherVehiclesCount || 0}`);
    console.log(`  - incident_witnesses: ${witnessesCount || 0}`);
    console.log(`  - temp_uploads: ${tempCount || 0}`);
    console.log(`  - ai_transcription: ${transcriptionCount || 0}`);
    console.log('');

    const totalRecords = (signupCount || 0) + (documentsCount || 0) +
                         (incidentsCount || 0) + (tempCount || 0) +
                         (transcriptionCount || 0) + (otherVehiclesCount || 0) +
                         (witnessesCount || 0);

    if (totalRecords === 0) {
      console.log('✅ No test data found - database is already clean!\n');
      rl.close();
      return;
    }

    console.log(`📊 TOTAL: ${totalRecords} records will be PERMANENTLY DELETED\n`);

    // Step 2: Get confirmation
    const answer = await question('❓ Type "DELETE" to confirm (or anything else to cancel): ');

    if (answer.trim() !== 'DELETE') {
      console.log('\n✅ Cancelled - No data was deleted\n');
      rl.close();
      return;
    }

    console.log('\n🗑️  DELETING DATA...\n');

    // Step 3: Delete in correct order (respecting foreign keys)
    let deletedCount = 0;

    // 3a. Delete temp_uploads (no dependencies)
    console.log('🗑️  Deleting temp_uploads...');
    const { error: tempError, count: tempDeleted } = await supabase
      .from('temp_uploads')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (tempError) {
      console.error('❌ Error deleting temp_uploads:', tempError.message);
    } else {
      console.log(`   ✅ Deleted ${tempDeleted || 0} temp_uploads records`);
      deletedCount += (tempDeleted || 0);
    }

    // 3b. Delete ai_transcription (references user_signup)
    console.log('🗑️  Deleting ai_transcription...');
    const { error: transcriptionError, count: transcriptionDeleted } = await supabase
      .from('ai_transcription')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (transcriptionError) {
      console.error('❌ Error deleting ai_transcription:', transcriptionError.message);
    } else {
      console.log(`   ✅ Deleted ${transcriptionDeleted || 0} ai_transcription records`);
      deletedCount += (transcriptionDeleted || 0);
    }

    // 3c. Delete user_documents (references user_signup and incident_reports)
    console.log('🗑️  Deleting user_documents...');
    const { error: docsError, count: docsDeleted } = await supabase
      .from('user_documents')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (docsError) {
      console.error('❌ Error deleting user_documents:', docsError.message);
    } else {
      console.log(`   ✅ Deleted ${docsDeleted || 0} user_documents records`);
      deletedCount += (docsDeleted || 0);
    }

    // 3d. Delete incident_other_vehicles (references incident_reports)
    console.log('🗑️  Deleting incident_other_vehicles...');
    const { error: otherVehiclesError, count: otherVehiclesDeleted } = await supabase
      .from('incident_other_vehicles')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (otherVehiclesError) {
      console.error('❌ Error deleting incident_other_vehicles:', otherVehiclesError.message);
    } else {
      console.log(`   ✅ Deleted ${otherVehiclesDeleted || 0} incident_other_vehicles records`);
      deletedCount += (otherVehiclesDeleted || 0);
    }

    // 3e. Delete incident_witnesses (references incident_reports)
    console.log('🗑️  Deleting incident_witnesses...');
    const { error: witnessesError, count: witnessesDeleted } = await supabase
      .from('incident_witnesses')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (witnessesError) {
      console.error('❌ Error deleting incident_witnesses:', witnessesError.message);
    } else {
      console.log(`   ✅ Deleted ${witnessesDeleted || 0} incident_witnesses records`);
      deletedCount += (witnessesDeleted || 0);
    }

    // 3f. Delete incident_reports (references user_signup)
    console.log('🗑️  Deleting incident_reports...');
    const { error: incidentsError, count: incidentsDeleted } = await supabase
      .from('incident_reports')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (incidentsError) {
      console.error('❌ Error deleting incident_reports:', incidentsError.message);
    } else {
      console.log(`   ✅ Deleted ${incidentsDeleted || 0} incident_reports records`);
      deletedCount += (incidentsDeleted || 0);
    }

    // 3g. Delete user_signup (parent table - delete last)
    console.log('🗑️  Deleting user_signup...');
    const { error: signupError, count: signupDeleted } = await supabase
      .from('user_signup')
      .delete({ count: 'exact' })
      .neq('create_user_id', '00000000-0000-0000-0000-000000000000');

    if (signupError) {
      console.error('❌ Error deleting user_signup:', signupError.message);
    } else {
      console.log(`   ✅ Deleted ${signupDeleted || 0} user_signup records`);
      deletedCount += (signupDeleted || 0);
    }

    // Step 4: Clean up Supabase Storage (optional but recommended)
    console.log('\n🗑️  Cleaning Supabase Storage...');
    console.log('   ℹ️  Storage cleanup requires manual verification in Supabase Dashboard');
    console.log('   → https://supabase.com/dashboard → Storage → user-documents bucket');
    console.log('   → Delete folders manually: users/, temp/');

    // Step 5: Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      CLEANUP COMPLETE                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`✅ Successfully deleted ${deletedCount} database records\n`);

    console.log('📋 NEXT STEPS:\n');
    console.log('1. ✅ Database tables cleaned');
    console.log('2. ⚠️  Manually clean Storage bucket (see URL above)');
    console.log('3. ✅ Ready for fresh verification testing\n');

    console.log('🔄 VERIFICATION TESTING:\n');
    console.log('Signup Photos (5 images):');
    console.log('  1. Complete NEW signup with all 5 images');
    console.log('  2. Run: node verify-signup-fixes.js');
    console.log('  3. Expected: All 5 images with signed_url\n');

    console.log('Incident Photos (14 images):');
    console.log('  1. Submit NEW incident report with all 14 photos');
    console.log('  2. Run: node check-incident-photos.js');
    console.log('  3. Expected: All 14 images with signed_url\n');

    console.log('Complete Test (19 images total):');
    console.log('  1. Complete both tests above');
    console.log('  2. Verify all 19 images have signed URLs');
    console.log('  3. Test PDF generation with: node test-form-filling.js [user-uuid]\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  } finally {
    rl.close();
  }
}

clearTestData().catch(console.error);
