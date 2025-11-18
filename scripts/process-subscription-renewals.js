#!/usr/bin/env node

/**
 * Process Subscription Renewals
 *
 * This script automatically renews subscriptions where:
 * - auto_renewal is enabled
 * - subscription_end_date has passed
 * - Payment processing succeeds (simulated for now)
 *
 * Should be run daily via cron
 *
 * @version 1.0.0
 * @date 2025-10-17
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const emailService = require('../lib/emailService');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Subscription duration (default 12 months)
const SUBSCRIPTION_MONTHS = parseInt(process.env.SUBSCRIPTION_DURATION_MONTHS || '12', 10);

/**
 * Simulate payment processing
 * In production, this would integrate with Stripe/PayPal/etc.
 */
async function processPayment(userId, amount) {
  // TODO: Integrate with actual payment processor
  // For now, simulate successful payment
  console.log(`   💳 Processing payment for user ${userId}: ${amount}`);

  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Return success (in production, handle actual payment response)
  return {
    success: true,
    transactionId: `sim_${Date.now()}_${userId.substring(0, 8)}`,
    amount: amount
  };
}

/**
 * Renew a subscription
 */
async function renewSubscription(account) {
  const now = new Date();
  const newStartDate = new Date(account.subscription_end_date);
  const newEndDate = new Date(newStartDate);
  newEndDate.setMonth(newEndDate.getMonth() + SUBSCRIPTION_MONTHS);
  const nextRenewalDate = new Date(newEndDate);

  // Calculate retention date (12 months from renewal)
  const retentionUntil = new Date(newEndDate);

  const renewalAmount = process.env.SUBSCRIPTION_PRICE || '£99.00';

  // Process payment
  const paymentResult = await processPayment(account.auth_user_id, renewalAmount);

  if (!paymentResult.success) {
    console.log(`   ❌ Payment failed for ${account.email}`);

    // Update subscription status to payment_failed
    await supabase
      .from('user_signup')
      .update({
        subscription_status: 'payment_failed',
        auto_renewal: false // Disable auto-renewal on payment failure
      })
      .eq('id', account.id);

    return { success: false, reason: 'payment_failed' };
  }

  // Update subscription dates
  const { error: updateError } = await supabase
    .from('user_signup')
    .update({
      subscription_start_date: newStartDate.toISOString(),
      subscription_end_date: newEndDate.toISOString(),
      retention_until: retentionUntil.toISOString(),
      subscription_status: 'active',
      updated_at: now.toISOString()
    })
    .eq('id', account.id);

  if (updateError) {
    console.error(`   ❌ Failed to update subscription for ${account.email}:`, updateError);
    return { success: false, reason: 'database_error' };
  }

  console.log(`   ✅ Renewed subscription for ${account.email}`);
  console.log(`      New period: ${newStartDate.toLocaleDateString('en-GB')} - ${newEndDate.toLocaleDateString('en-GB')}`);

  // Send renewal confirmation email
  const userName = account.name
    ? `${account.name} ${account.surname || ''}`.trim()
    : account.email.split('@')[0];

  const renewalData = {
    userName,
    renewalDate: now.toISOString(),
    newSubscriptionStartDate: newStartDate.toISOString(),
    newSubscriptionEndDate: newEndDate.toISOString(),
    nextRenewalDate: nextRenewalDate.toISOString(),
    chargedAmount: renewalAmount,
    dashboardUrl: process.env.DASHBOARD_URL || 'https://carcrashlawyerai.co.uk/dashboard',
    billingUrl: process.env.BILLING_URL || 'https://carcrashlawyerai.co.uk/billing'
  };

  const emailResult = await emailService.sendSubscriptionRenewed(
    account.email,
    renewalData
  );

  if (emailResult.success) {
    console.log(`   📧 Sent renewal confirmation to ${account.email}`);
  } else {
    console.log(`   ⚠️  Failed to send renewal email to ${account.email}`);
  }

  return { success: true, transactionId: paymentResult.transactionId };
}

/**
 * Process all pending renewals
 */
async function processRenewals() {
  console.log('🔄 Checking for subscriptions ready to renew...');

  const now = new Date();

  // Find subscriptions where:
  // 1. auto_renewal is true
  // 2. subscription_end_date has passed
  // 3. status is still 'active'
  // 4. Not deleted
  const { data: renewalDue, error } = await supabase
    .from('user_signup')
    .select(`
      id,
      auth_user_id,
      email,
      name,
      surname,
      subscription_start_date,
      subscription_end_date,
      auto_renewal
    `)
    .eq('auto_renewal', true)
    .eq('subscription_status', 'active')
    .lt('subscription_end_date', now.toISOString())
    .is('deleted_at', null);

  if (error) {
    console.error('❌ Error fetching renewals:', error);
    return { renewed: 0, failed: 0 };
  }

  console.log(`   Found ${renewalDue.length} subscriptions to renew`);

  let renewed = 0, failed = 0;

  for (const account of renewalDue) {
    try {
      const result = await renewSubscription(account);

      if (result.success) {
        renewed++;
      } else {
        failed++;
      }

      // Add small delay between renewals to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.error(`   ❌ Error renewing ${account.email}:`, err);
      failed++;
    }
  }

  return { renewed, failed };
}

/**
 * Handle failed renewal retry logic
 */
async function retryFailedRenewals() {
  console.log('\n🔁 Checking for failed renewals to retry...');

  // Find subscriptions with payment_failed status that are less than 7 days old
  const retryDeadline = new Date();
  retryDeadline.setDate(retryDeadline.getDate() - 7);

  const { data: failedRenewals, error } = await supabase
    .from('user_signup')
    .select(`
      id,
      auth_user_id,
      email,
      name,
      surname,
      subscription_start_date,
      subscription_end_date
    `)
    .eq('subscription_status', 'payment_failed')
    .gte('subscription_end_date', retryDeadline.toISOString())
    .is('deleted_at', null);

  if (error) {
    console.error('❌ Error fetching failed renewals:', error);
    return { retried: 0 };
  }

  console.log(`   Found ${failedRenewals.length} failed renewals to retry`);

  let retried = 0;

  for (const account of failedRenewals) {
    try {
      // Re-enable auto-renewal for retry
      await supabase
        .from('user_signup')
        .update({
          auto_renewal: true,
          subscription_status: 'active'
        })
        .eq('id', account.id);

      const result = await renewSubscription(account);

      if (result.success) {
        console.log(`   ✅ Retry successful for ${account.email}`);
        retried++;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.error(`   ❌ Retry failed for ${account.email}:`, err);
    }
  }

  return { retried };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Subscription Renewal Script');
  console.log(`⏰ Running at: ${new Date().toISOString()}`);
  console.log(`📅 Subscription Duration: ${SUBSCRIPTION_MONTHS} months\n`);

  const renewalResults = await processRenewals();
  const retryResults = await retryFailedRenewals();

  console.log('\n📊 Summary:');
  console.log(`   🔄 Subscriptions Renewed: ${renewalResults.renewed}`);
  console.log(`   🔁 Failed Renewals Retried: ${retryResults.retried}`);
  console.log(`   ❌ Failed: ${renewalResults.failed}`);
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

module.exports = { processRenewals, renewSubscription, retryFailedRenewals };
