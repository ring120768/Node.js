/**
 * Clean up a specific test signup
 * Deletes user from user_signup table and Supabase Auth
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupTestSignup(userId) {
  console.log('\n🧹 Cleaning up test signup:', userId);
  console.log('━'.repeat(60));

  try {
    // 1. Get user details first
    const { data: user, error: fetchError } = await supabase
      .from('user_signup')
      .select('email, name, surname, create_user_id')
      .eq('create_user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('⚠️  User not found in user_signup table');
        return;
      }
      throw fetchError;
    }

    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Name: ${user.name} ${user.surname}`);
    console.log();

    // 2. Delete from user_signup table (cascades to related tables)
    console.log('🗑️  Deleting from user_signup table...');
    const { error: deleteError } = await supabase
      .from('user_signup')
      .delete()
      .eq('create_user_id', userId);

    if (deleteError) {
      console.error('❌ Error deleting from user_signup:', deleteError);
    } else {
      console.log('✅ Deleted from user_signup');
    }

    // 3. Delete from Supabase Auth (using service role)
    console.log('🗑️  Deleting from Supabase Auth...');
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('❌ Error deleting from auth:', authDeleteError);
    } else {
      console.log('✅ Deleted from Supabase Auth');
    }

    console.log();
    console.log('━'.repeat(60));
    console.log('✅ Cleanup complete!');
    console.log();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get user ID from command line or use most recent
const userId = process.argv[2] || 'b725b865-a668-426a-83e9-6a9110ac2502';

cleanupTestSignup(userId);
