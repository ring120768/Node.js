/**
 * Cleanup Test Data - Database and Storage
 *
 * Removes test data from:
 * - Database tables (user_signup, incident_reports, etc.)
 * - Storage buckets (user-documents, ai-analysis, gdpr-exports, temp-uploads)
 *
 * Usage: node cleanup-test-data.js [--dry-run] [--user-id=UUID]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('./src/utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const userIdArg = args.find(arg => arg.startsWith('--user-id='));
const specificUserId = userIdArg ? userIdArg.split('=')[1] : null;

async function identifyTestData() {
  console.log('🔍 Identifying test data...\n');

  const testData = {
    users: [],
    storageFiles: {
      'user-documents': [],
      'ai-analysis': [],
      'gdpr-exports': [],
      'temp-uploads': []
    }
  };

  try {
    // Identify test users
    let query = supabase
      .from('user_signup')
      .select('create_user_id, email, created_at')
      .order('created_at', { ascending: false });

    if (specificUserId) {
      query = query.eq('create_user_id', specificUserId);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) throw usersError;

    if (users && users.length > 0) {
      testData.users = users;
      console.log(`📋 Found ${users.length} user(s):`);
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.create_user_id})`);
        console.log(`     Created: ${new Date(user.created_at).toLocaleString('en-GB')}`);
      });
      console.log();
    } else {
      console.log('✅ No users found in database\n');
    }

    // Check storage buckets
    const buckets = ['user-documents', 'ai-analysis', 'gdpr-exports', 'temp-uploads'];

    for (const bucket of buckets) {
      const { data: files, error: filesError } = await supabase
        .storage
        .from(bucket)
        .list('', { limit: 1000 });

      if (filesError) {
        console.log(`⚠️  Could not access ${bucket}: ${filesError.message}`);
        continue;
      }

      if (files && files.length > 0) {
        testData.storageFiles[bucket] = files;
        console.log(`📦 ${bucket}: ${files.length} file(s)`);

        // Show first few files as examples
        const examples = files.slice(0, 3);
        examples.forEach(file => {
          const size = (file.metadata?.size || 0 / 1024).toFixed(1);
          console.log(`   - ${file.name} (${size} KB)`);
        });
        if (files.length > 3) {
          console.log(`   ... and ${files.length - 3} more`);
        }
        console.log();
      } else {
        console.log(`✅ ${bucket}: empty\n`);
      }
    }

    return testData;

  } catch (error) {
    console.error('❌ Error identifying test data:', error.message);
    throw error;
  }
}

async function deleteUserData(userId) {
  console.log(`🗑️  Deleting data for user: ${userId}`);

  const deletedCounts = {
    incident_reports: 0,
    incident_witnesses: 0,
    incident_other_vehicles: 0,
    user_documents: 0,
    ai_transcription: 0,
    completed_incident_forms: 0,
    temp_uploads: 0,
    user_signup: 0,
    auth_user: 0
  };

  try {
    // First, get all incident report IDs for this user (needed for witnesses/vehicles)
    const { data: incidentReports, error: incidentFetchError } = await supabase
      .from('incident_reports')
      .select('id')
      .eq('create_user_id', userId);

    if (incidentFetchError) throw incidentFetchError;
    const incidentIds = incidentReports?.map(r => r.id) || [];

    // Delete in order (foreign key constraints)
    // IMPORTANT: user_documents references incident_reports, so delete user_documents FIRST

    // 1. User documents (references incident_reports) - uses create_user_id column
    const { data: docs, error: docsError } = await supabase
      .from('user_documents')
      .delete()
      .eq('create_user_id', userId)
      .select();
    if (docsError) throw docsError;
    deletedCounts.user_documents = docs?.length || 0;

    // 2. Completed incident forms - uses create_user_id column
    const { data: forms, error: formsError } = await supabase
      .from('completed_incident_forms')
      .delete()
      .eq('create_user_id', userId)
      .select();
    if (formsError) throw formsError;
    deletedCounts.completed_incident_forms = forms?.length || 0;

    // 3. AI transcription - uses create_user_id column
    const { data: transcriptions, error: transcriptionsError } = await supabase
      .from('ai_transcription')
      .delete()
      .eq('create_user_id', userId)
      .select();
    if (transcriptionsError) throw transcriptionsError;
    deletedCounts.ai_transcription = transcriptions?.length || 0;

    // 4. Temp uploads - uses claimed_by_user_id column (nullable)
    const { data: tempUploads, error: tempError } = await supabase
      .from('temp_uploads')
      .delete()
      .eq('claimed_by_user_id', userId)
      .select();
    if (tempError) throw tempError;
    deletedCounts.temp_uploads = tempUploads?.length || 0;

    // 5. Witnesses (linked to incidents, not directly to user)
    if (incidentIds.length > 0) {
      const { data: witnesses, error: witnessesError } = await supabase
        .from('incident_witnesses')
        .delete()
        .in('incident_report_id', incidentIds)
        .select();
      if (witnessesError) throw witnessesError;
      deletedCounts.incident_witnesses = witnesses?.length || 0;
    }

    // 6. Other vehicles (linked to incidents, not directly to user)
    if (incidentIds.length > 0) {
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('incident_other_vehicles')
        .delete()
        .in('incident_id', incidentIds)
        .select();
      if (vehiclesError) throw vehiclesError;
      deletedCounts.incident_other_vehicles = vehicles?.length || 0;
    }

    // 7. Incident reports (can now be deleted after user_documents)
    const { data: reports, error: reportsError } = await supabase
      .from('incident_reports')
      .delete()
      .eq('create_user_id', userId)
      .select();
    if (reportsError) throw reportsError;
    deletedCounts.incident_reports = reports?.length || 0;

    // 8. Get auth_user_id from user_signup before deleting it
    const { data: signupRecord, error: signupFetchError } = await supabase
      .from('user_signup')
      .select('auth_user_id')
      .eq('create_user_id', userId)
      .single();

    if (signupFetchError && signupFetchError.code !== 'PGRST116') {
      throw signupFetchError;
    }

    const authUserId = signupRecord?.auth_user_id;

    // 9. User signup (delete database record)
    const { data: signup, error: signupError } = await supabase
      .from('user_signup')
      .delete()
      .eq('create_user_id', userId)
      .select();
    if (signupError) throw signupError;
    deletedCounts.user_signup = signup?.length || 0;

    // 10. Delete authentication user (if exists)
    if (authUserId) {
      const { data: authDeleteData, error: authDeleteError } = await supabase.auth.admin.deleteUser(authUserId);
      if (authDeleteError) {
        console.warn(`⚠️  Failed to delete auth user ${authUserId}:`, authDeleteError.message);
      } else {
        deletedCounts.auth_user = 1;
        console.log(`   ✅ Deleted authentication user: ${authUserId}`);
      }
    }

    return deletedCounts;

  } catch (error) {
    console.error(`❌ Error deleting user data for ${userId}:`, error.message);
    throw error;
  }
}

async function deleteStorageFiles(bucket, files) {
  if (!files || files.length === 0) return 0;

  console.log(`🗑️  Deleting ${files.length} file(s) from ${bucket}...`);

  try {
    const filePaths = files.map(f => f.name);
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .remove(filePaths);

    if (error) throw error;

    console.log(`   ✅ Deleted ${filePaths.length} file(s) from ${bucket}`);
    return filePaths.length;

  } catch (error) {
    console.error(`❌ Error deleting from ${bucket}:`, error.message);
    throw error;
  }
}

async function cleanup() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧹 CLEANUP TEST DATA - Database & Storage');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No data will be deleted\n');
  }

  if (specificUserId) {
    console.log(`🎯 Targeting specific user: ${specificUserId}\n`);
  }

  try {
    // Step 1: Identify test data
    const testData = await identifyTestData();

    if (testData.users.length === 0 &&
        Object.values(testData.storageFiles).every(files => files.length === 0)) {
      console.log('✅ No test data found - database and storage are clean!\n');
      return;
    }

    // Step 2: Confirm deletion (unless dry run)
    if (!isDryRun) {
      console.log('⚠️  WARNING: This will permanently delete the above data!\n');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('\n🗑️  Starting deletion...\n');
    }

    const totalDeleted = {
      users: 0,
      database_records: 0,
      storage_files: 0
    };

    // Step 3: Delete user data from database
    if (testData.users.length > 0 && !isDryRun) {
      for (const user of testData.users) {
        const counts = await deleteUserData(user.create_user_id);

        const recordsDeleted = Object.values(counts).reduce((sum, count) => sum + count, 0);
        totalDeleted.database_records += recordsDeleted;
        totalDeleted.users += counts.user_signup;

        console.log(`   ✅ User ${user.email}:`);
        Object.entries(counts).forEach(([table, count]) => {
          if (count > 0) {
            const label = table === 'auth_user' ? 'authentication user' : table;
            console.log(`      - ${label}: ${count} record(s)`);
          }
        });
        console.log();
      }
    }

    // Step 4: Delete storage files
    if (!isDryRun) {
      for (const [bucket, files] of Object.entries(testData.storageFiles)) {
        if (files.length > 0) {
          const deletedCount = await deleteStorageFiles(bucket, files);
          totalDeleted.storage_files += deletedCount;
        }
      }
    }

    // Step 5: Summary
    console.log('═══════════════════════════════════════════════════════════');
    if (isDryRun) {
      console.log('🔍 DRY RUN COMPLETE - Summary of what WOULD be deleted:\n');
    } else {
      console.log('✅ CLEANUP COMPLETE - Summary:\n');
    }
    console.log(`   👤 Users: ${testData.users.length}`);
    console.log(`   📊 Database records: ${isDryRun ? 'N/A' : totalDeleted.database_records}`);
    console.log(`   📦 Storage files: ${isDryRun ? 'N/A' : totalDeleted.storage_files}`);
    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ CLEANUP FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run cleanup
cleanup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
