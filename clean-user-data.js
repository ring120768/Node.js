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

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

async function cleanUserData(userId) {
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

  // User documents
  const { count: docsCount } = await supabase
    .from('user_documents')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.user_documents = docsCount || 0;

  // Incident reports
  const { count: incidentsCount } = await supabase
    .from('incident_reports')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.incident_reports = incidentsCount || 0;

  // Emergency audio
  const { count: audioCount } = await supabase
    .from('emergency_audio')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.emergency_audio = audioCount || 0;

  // AI transcriptions
  const { count: transcriptionsCount } = await supabase
    .from('ai_transcriptions')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.ai_transcriptions = transcriptionsCount || 0;

  // AI analyses
  const { count: analysesCount } = await supabase
    .from('ai_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.ai_analyses = analysesCount || 0;

  // Witnesses
  const { count: witnessesCount } = await supabase
    .from('witnesses')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.witnesses = witnessesCount || 0;

  // Other vehicles
  const { count: vehiclesCount } = await supabase
    .from('other_vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('create_user_id', userId);
  counts.other_vehicles = vehiclesCount || 0;

  // Subscription history
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

  console.log('\n⚠️  WARNING: This action cannot be undone!\n');

  const confirmation = await askQuestion('Type "DELETE" to confirm deletion: ');

  if (confirmation !== 'DELETE') {
    console.log('\n❌ Deletion cancelled.');
    rl.close();
    return;
  }

  console.log('\n🗑️  STEP 2: Deleting user data...\n');

  // Delete in order respecting foreign key constraints
  let deletedCount = 0;

  // 1. Delete storage files first
  if (storagePaths.length > 0) {
    console.log(`📁 Deleting ${storagePaths.length} storage files...`);
    const { data: deleteResult, error: storageError } = await supabase.storage
      .from('user-documents')
      .remove(storagePaths);

    if (storageError) {
      console.warn(`⚠️  Storage deletion warning: ${storageError.message}`);
    } else {
      console.log(`✅ Deleted ${storagePaths.length} files from storage`);
    }
  }

  // 2. Delete user_documents (has foreign keys to incident_reports)
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

  // 8. Delete incident_reports (parent table)
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

  console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} database records and ${storagePaths.length} storage files.`);

  rl.close();
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Usage: node clean-user-data.js <user_id>');
  console.log('\nExample: node clean-user-data.js 61033b12-c351-42c0-9647-725eb1ee9154');
  process.exit(1);
}

cleanUserData(userId);
