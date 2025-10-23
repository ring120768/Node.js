#!/usr/bin/env node
/**
 * Delete Test Users - Complete Cleanup
 * Deletes BOTH auth users and application data
 *
 * DANGER: This will permanently delete user data!
 * Only use for testing/development
 *
 * Usage: node scripts/delete-test-users.js [email]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

// Initialize Supabase with SERVICE ROLE key (has admin access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteUser(email) {
  try {
    console.log(colors.cyan, '\n🗑️  Deleting User: ' + email + '\n');
    console.log('='.repeat(80), '\n');

    // Step 1: Find user in auth.users
    console.log(colors.cyan, '1️⃣ Looking up auth user...\n');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.log(colors.red, '❌ Failed to list users:', listError.message);
      return;
    }

    const authUser = users.find(u => u.email === email);

    if (!authUser) {
      console.log(colors.yellow, '⚠️  No auth user found with email:', email);
      console.log('   User may have already been deleted.\n');
    } else {
      console.log(colors.green, '✅ Found auth user:');
      console.log('   ID:', authUser.id);
      console.log('   Email:', authUser.email);
      console.log('   Created:', authUser.created_at);
      console.log();

      // Step 2: Delete from application tables
      console.log(colors.cyan, '2️⃣ Deleting application data...\n');

      const userId = authUser.id;

      // Delete from all tables (in order due to foreign keys)
      const tables = [
        'completed_incident_forms',
        'ai_summary',
        'ai_transcription',
        'user_documents',
        'dvla_vehicle_info_new',
        'incident_reports',
        'user_signup'
      ];

      for (const table of tables) {
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('create_user_id', userId);

        if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.log(colors.yellow, `   ⚠️  Error deleting from ${table}:`, deleteError.message);
        } else {
          console.log(colors.green, `   ✅ Deleted from ${table}`);
        }
      }

      // Step 3: Delete from Storage buckets
      console.log(colors.cyan, '\n3️⃣ Deleting storage files...\n');

      const buckets = ['audio-files', 'transcription-data', 'user-documents', 'completed-reports'];

      for (const bucket of buckets) {
        const { data: files, error: listError } = await supabase
          .storage
          .from(bucket)
          .list(userId);

        if (!listError && files && files.length > 0) {
          const filePaths = files.map(f => `${userId}/${f.name}`);

          const { error: deleteError } = await supabase
            .storage
            .from(bucket)
            .remove(filePaths);

          if (deleteError) {
            console.log(colors.yellow, `   ⚠️  Error deleting from ${bucket}:`, deleteError.message);
          } else {
            console.log(colors.green, `   ✅ Deleted ${files.length} files from ${bucket}`);
          }
        }
      }

      // Step 4: Delete from auth.users (THE CRITICAL STEP!)
      console.log(colors.cyan, '\n4️⃣ Deleting auth user...\n');

      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

      if (authDeleteError) {
        console.log(colors.red, '❌ Failed to delete auth user:', authDeleteError.message);
      } else {
        console.log(colors.green, '✅ Deleted auth user successfully!\n');
      }
    }

    console.log('='.repeat(80));
    console.log(colors.green, '\n✅ CLEANUP COMPLETE!\n');
    console.log(colors.cyan, 'You can now sign up with this email again.\n');
    console.log(colors.reset);

  } catch (error) {
    console.log(colors.red, '\n❌ Error:', error.message);
    console.error(error.stack);
    console.log(colors.reset);
  }
}

// Get email from command line or prompt user
const email = process.argv[2];

if (!email) {
  console.log(colors.red, '\n❌ Please provide an email address\n');
  console.log('Usage: node scripts/delete-test-users.js user@example.com\n');
  console.log(colors.reset);
  process.exit(1);
}

// Confirm before deletion
console.log(colors.yellow, '\n⚠️  WARNING: This will permanently delete all data for:', email);
console.log('   - Auth user');
console.log('   - Application data (user_signup, incident_reports, etc.)');
console.log('   - Storage files (audio, documents, PDFs)');
console.log('\n   Are you sure? Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
console.log(colors.reset);

setTimeout(() => {
  deleteUser(email).catch(console.error);
}, 3000);
