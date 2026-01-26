require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanUserData(userId, autoConfirm = false) {
  console.log('\n🔍 STEP 1: Analyzing user data for deletion...\n');
  console.log(`User ID: ${userId}\n`);

  // Fetch user details
  const { data: user, error: userError } = await supabase
    .from('user_signup')
    .select('email, name, surname, subscription_end_date')
    .eq('create_user_id', userId)
    .single();

  if (userError || !user) {
    console.error('❌ User not found:', userError?.message || 'No data');
    return;
  }

  console.log(`👤 User: ${user.name} ${user.surname} (${user.email})`);
  console.log(`📅 Subscription ends: ${user.subscription_end_date}\n`);

  // Count all related data
  const counts = {};

  const { count: docsCount } = await supabase
    .from('user_documents')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.user_documents = docsCount || 0;

  const { count: incidentsCount } = await supabase
    .from('incident_reports')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.incident_reports = incidentsCount || 0;

  const { count: audioCount } = await supabase
    .from('emergency_audio')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.emergency_audio = audioCount || 0;

  const { count: transcriptionsCount } = await supabase
    .from('ai_transcriptions')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.ai_transcriptions = transcriptionsCount || 0;

  const { count: analysesCount } = await supabase
    .from('ai_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.ai_analyses = analysesCount || 0;

  const { count: witnessesCount } = await supabase
    .from('witnesses')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.witnesses = witnessesCount || 0;

  const { count: vehiclesCount } = await supabase
    .from('other_vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.other_vehicles = vehiclesCount || 0;

  const { count: subscriptionsCount } = await supabase
    .from('subscription_history')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.subscription_history = subscriptionsCount || 0;

  console.log('📊 Data to be deleted:\n');
  console.log(`   User Documents:      ${counts.user_documents}`);
  console.log(`   Incident Reports:    ${counts.incident_reports}`);
  console.log(`   Emergency Audio:     ${counts.emergency_audio}`);
  console.log(`   AI Transcriptions:   ${counts.ai_transcriptions}`);
  console.log(`   AI Analyses:         ${counts.ai_analyses}`);
  console.log(`   Witnesses:           ${counts.witnesses}`);
  console.log(`   Other Vehicles:      ${counts.other_vehicles}`);
  console.log(`   Subscription History: ${counts.subscription_history}`);
  console.log(`   User Signup Record:  1`);

  // Get storage paths for cleanup
  const { data: docs } = await supabase
    .from('user_documents')
    .select('storage_path')
    .eq('create_user_id', userId);

  const storagePaths = docs?.map(d => d.storage_path).filter(Boolean) || [];
  console.log(`\n📁 Storage files to delete: ${storagePaths.length}`);

  if (!autoConfirm) {
    console.log('\n⚠️  Run with --confirm flag to proceed with deletion');
    console.log(`   Example: node clean-user-data-auto.js ${userId} --confirm\n`);
    return;
  }

  console.log('\n⚠️  WARNING: Proceeding with deletion (--confirm flag set)...\n');
  console.log('🗑️  STEP 2: Deleting user data...\n');

  let deletedCount = 0;

  // 1. Delete storage files first
  if (storagePaths.length > 0) {
    console.log(`📁 Deleting ${storagePaths.length} storage files...`);
    const { error: storageError } = await supabase.storage
      .from('user-documents')
      .remove(storagePaths);

    if (storageError) {
      console.warn(`⚠️  Storage deletion warning: ${storageError.message}`);
    } else {
      console.log(`✅ Deleted ${storagePaths.length} files from storage`);
    }
  }

  // 2. Delete user_documents
  if (counts.user_documents > 0) {
    const { error } = await supabase
      .from('user_documents')
      .delete()
      .eq('create_user_id', userId);

    if (error) {
      console.error(`❌ Error deleting user_documents: ${error.message}`);
    } else {
      console.log(`✅ Deleted ${counts.user_documents} user_documents`);
      deletedCount += counts.user_documents;
    }
  }

  // 3. Delete witnesses
  if (counts.witnesses > 0) {
    const { error } = await supabase
      .from('witnesses')
      .delete()
      .eq('create_user_id', userId);

    if (error) {
      console.error(`❌ Error deleting witnesses: ${error.message}`);
    } else {
      console.log(`✅ Deleted ${counts.witnesses} witnesses`);
      deletedCount += counts.witnesses;
    }
  }

  // 4. Delete other_vehicles
  if (counts.other_vehicles > 0) {
    const { error } = await supabase
      .from('other_vehicles')
      .delete()
      .eq('create_user_id', userId);

    if (error) {
      console.error(`❌ Error deleting other_vehicles: ${error.message}`);
    } else {
      console.log(`✅ Deleted ${counts.other_vehicles} other_vehicles`);
      deletedCount += counts.other_vehicles;
    }
  }

  // 5. Delete AI analyses
  if (counts.ai_analyses > 0) {
    const { error } = await supabase
      .from('ai_analyses')
      .delete()
      .eq('create_user_id', userId);

    if (error) {
      console.error(`❌ Error deleting ai_analyses: ${error.message}`);
    } else {
      console.log(`✅ Deleted ${counts.ai_analyses} ai_analyses`);
      deletedCount += counts.ai_analyses;
    }
  }

  // 6. Delete AI transcriptions
  if (counts.ai_transcriptions > 0) {
    const { error } = await supabase
      .from('ai_transcriptions')
      .delete()
      .eq('create_user_id', userId);

    if (error) {
      console.error(`❌ Error deleting ai_transcriptions: ${error.message}`);
    } else {
      console.log(`✅ Deleted ${counts.ai_transcriptions} ai_transcriptions`);
      deletedCount += counts.ai_transcriptions;
    }
  }

  // 7. Delete emergency audio
  if (counts.emergency_audio > 0) {
    const { error } = await supabase
      .from('emergency_audio')
      .delete()
      .eq('create_user_id', userId);

    if (error) {
      console.error(`❌ Error deleting emergency_audio: ${error.message}`);
    } else {
      console.log(`✅ Deleted ${counts.emergency_audio} emergency_audio`);
      deletedCount += counts.emergency_audio;
    }
  }

  // 8. Delete incident_reports
  if (counts.incident_reports > 0) {
    const { error } = await supabase
      .from('incident_reports')
      .delete()
      .eq('create_user_id', userId);

    if (error) {
      console.error(`❌ Error deleting incident_reports: ${error.message}`);
    } else {
      console.log(`✅ Deleted ${counts.incident_reports} incident_reports`);
      deletedCount += counts.incident_reports;
    }
  }

  // 9. Delete subscription history
  if (counts.subscription_history > 0) {
    const { error } = await supabase
      .from('subscription_history')
      .delete()
      .eq('create_user_id', userId);

    if (error) {
      console.error(`❌ Error deleting subscription_history: ${error.message}`);
    } else {
      console.log(`✅ Deleted ${counts.subscription_history} subscription_history`);
      deletedCount += counts.subscription_history;
    }
  }

  // 10. Finally, delete user_signup record
  const { error: userDeleteError } = await supabase
    .from('user_signup')
    .delete()
    .eq('create_user_id', userId);

  if (userDeleteError) {
    console.error(`❌ Error deleting user_signup: ${userDeleteError.message}`);
  } else {
    console.log(`✅ Deleted user_signup record`);
    deletedCount += 1;
  }

  console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} database records and ${storagePaths.length} storage files.\n`);
}

// Get user ID and confirmation flag from command line
const userId = process.argv[2];
const confirmFlag = process.argv[3];

if (!userId) {
  console.error('❌ Usage: node clean-user-data-auto.js <user_id> [--confirm]');
  console.log('\nExample (dry run): node clean-user-data-auto.js 61033b12-c351-42c0-9647-725eb1ee9154');
  console.log('Example (execute):  node clean-user-data-auto.js 61033b12-c351-42c0-9647-725eb1ee9154 --confirm\n');
  process.exit(1);
}

cleanUserData(userId, confirmFlag === '--confirm');
