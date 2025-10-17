#!/usr/bin/env node

/**
 * Auto-Delete Expired Accounts
 *
 * This script automatically deletes user accounts whose subscriptions
 * have expired and are past the grace period (30 days after subscription_end_date).
 *
 * Performs soft delete (sets deleted_at) for GDPR compliance.
 *
 * Should be run daily via cron
 *
 * @version 1.0.0
 * @date 2025-10-17
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Grace period after subscription ends (default 30 days)
const GRACE_PERIOD_DAYS = parseInt(process.env.ACCOUNT_GRACE_PERIOD_DAYS || '30', 10);

/**
 * Delete expired accounts
 */
async function deleteExpiredAccounts() {
  console.log('🗑️  Checking for expired accounts...');

  const now = new Date();
  const graceDeadline = new Date();
  graceDeadline.setDate(graceDeadline.getDate() - GRACE_PERIOD_DAYS);

  // Find accounts where:
  // 1. subscription_status is not 'active'
  // 2. subscription_end_date is past the grace period
  // 3. auto_renewal is false (or subscription failed to renew)
  // 4. Not already deleted
  const { data: expiredAccounts, error } = await supabase
    .from('user_signup')
    .select(`
      id,
      auth_user_id,
      email,
      first_name,
      last_name,
      subscription_end_date,
      subscription_status
    `)
    .neq('subscription_status', 'active')
    .lt('subscription_end_date', graceDeadline.toISOString())
    .is('deleted_at', null);

  if (error) {
    console.error('❌ Error fetching expired accounts:', error);
    return { deleted: 0, failed: 0 };
  }

  console.log(`   Found ${expiredAccounts.length} expired accounts (past ${GRACE_PERIOD_DAYS}-day grace period)`);

  let deleted = 0, failed = 0;

  for (const account of expiredAccounts) {
    try {
      // Soft delete the user account
      const { error: deleteError } = await supabase
        .from('user_signup')
        .update({
          deleted_at: now.toISOString(),
          subscription_status: 'deleted'
        })
        .eq('id', account.id);

      if (deleteError) {
        console.error(`   ❌ Failed to delete account ${account.email}:`, deleteError);
        failed++;
        continue;
      }

      // Also soft delete all associated user_signup documents
      await supabase
        .from('user_documents')
        .update({ deleted_at: now.toISOString() })
        .eq('associated_with', 'user_signup')
        .eq('associated_id', account.id)
        .is('deleted_at', null);

      // Note: Incident reports should already be deleted by auto-delete-expired-incidents.js
      // But as a safety measure, delete any remaining incidents
      const { data: remainingIncidents } = await supabase
        .from('incident_reports')
        .select('id')
        .eq('create_user_id', account.auth_user_id)
        .is('deleted_at', null);

      if (remainingIncidents && remainingIncidents.length > 0) {
        console.log(`   ⚠️  Found ${remainingIncidents.length} remaining incidents for ${account.email}, deleting...`);
        for (const incident of remainingIncidents) {
          await supabase
            .from('incident_reports')
            .update({ deleted_at: now.toISOString() })
            .eq('id', incident.id);
        }
      }

      console.log(`   ✅ Deleted account ${account.email} (expired ${new Date(account.subscription_end_date).toLocaleDateString('en-GB')})`);
      deleted++;

    } catch (err) {
      console.error(`   ❌ Error processing account ${account.email}:`, err);
      failed++;
    }
  }

  return { deleted, failed };
}

/**
 * Update subscription status for expired but within grace period
 */
async function updateExpiredWithinGrace() {
  console.log('\n⚠️  Updating status for accounts within grace period...');

  const now = new Date();
  const graceDeadline = new Date();
  graceDeadline.setDate(graceDeadline.getDate() - GRACE_PERIOD_DAYS);

  // Find accounts where subscription has ended but still within grace period
  const { data: gracePeriodAccounts, error } = await supabase
    .from('user_signup')
    .select('id, email, subscription_end_date')
    .eq('subscription_status', 'active')
    .lt('subscription_end_date', now.toISOString())
    .gte('subscription_end_date', graceDeadline.toISOString())
    .is('deleted_at', null);

  if (error) {
    console.error('❌ Error fetching grace period accounts:', error);
    return { updated: 0 };
  }

  console.log(`   Found ${gracePeriodAccounts.length} accounts in grace period`);

  let updated = 0;

  for (const account of gracePeriodAccounts) {
    // Update status to 'expired' (but not deleted yet)
    const { error: updateError } = await supabase
      .from('user_signup')
      .update({ subscription_status: 'expired' })
      .eq('id', account.id);

    if (!updateError) {
      console.log(`   ⏰ Set status to 'expired' for ${account.email}`);
      updated++;
    }
  }

  return { updated };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Auto-Delete Expired Accounts Script');
  console.log(`⏰ Running at: ${new Date().toISOString()}`);
  console.log(`📅 Grace Period: ${GRACE_PERIOD_DAYS} days\n`);

  const graceResults = await updateExpiredWithinGrace();
  const deleteResults = await deleteExpiredAccounts();

  console.log('\n📊 Summary:');
  console.log(`   ⏰ Marked as Expired (in grace): ${graceResults.updated}`);
  console.log(`   🗑️  Accounts Deleted: ${deleteResults.deleted}`);
  console.log(`   ❌ Failed: ${deleteResults.failed}`);
  console.log('\n✅ Script completed successfully\n');

  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { deleteExpiredAccounts, updateExpiredWithinGrace };
