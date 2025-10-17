#!/usr/bin/env node

/**
 * Send Subscription Renewal Warnings
 *
 * This script checks for subscriptions approaching their renewal date
 * and sends warning emails at:
 * - 30 days before renewal
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

/**
 * Calculate days until renewal
 */
function getDaysUntilRenewal(subscriptionEndDate) {
  const now = new Date();
  const renewalDate = new Date(subscriptionEndDate);
  const diffTime = renewalDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if warning was already sent
 */
async function wasWarningSent(userId, warningType) {
  const { data, error } = await supabase
    .from('subscription_warnings')
    .select('id')
    .eq('user_id', userId)
    .eq('warning_type', warningType)
    .single();

  return !!data;
}

/**
 * Log warning sent
 */
async function logWarning(userId, warningType, emailSuccess) {
  await supabase
    .from('subscription_warnings')
    .insert({
      user_id: userId,
      warning_type: warningType,
      sent_at: new Date().toISOString(),
      email_success: emailSuccess
    });
}

/**
 * Send 30-day renewal warnings
 */
async function send30DayRenewalWarnings() {
  console.log(`\n📧 Checking for subscriptions 30 days from renewal...`);

  // Calculate date range for 30 days from now (±12 hours to account for timing)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 30);

  const startDate = new Date(targetDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(targetDate);
  endDate.setHours(23, 59, 59, 999);

  // Find active subscriptions with subscription_end_date in this range
  const { data: subscriptions, error } = await supabase
    .from('user_signup')
    .select(`
      id,
      auth_user_id,
      email,
      first_name,
      last_name,
      subscription_start_date,
      subscription_end_date,
      subscription_status,
      auto_renewal
    `)
    .eq('subscription_status', 'active')
    .eq('auto_renewal', true)
    .gte('subscription_end_date', startDate.toISOString())
    .lte('subscription_end_date', endDate.toISOString())
    .is('deleted_at', null);

  if (error) {
    console.error(`❌ Error fetching subscriptions:`, error);
    return { sent: 0, failed: 0, skipped: 0 };
  }

  console.log(`   Found ${subscriptions.length} subscriptions`);

  let sent = 0, failed = 0, skipped = 0;

  for (const subscription of subscriptions) {
    const warningType = '30_days_renewal';

    // Check if warning already sent
    const alreadySent = await wasWarningSent(subscription.auth_user_id, warningType);
    if (alreadySent) {
      console.log(`   ⏭️  Skipped user ${subscription.email} (warning already sent)`);
      skipped++;
      continue;
    }

    const userName = subscription.first_name
      ? `${subscription.first_name} ${subscription.last_name || ''}`.trim()
      : subscription.email.split('@')[0];

    // Calculate renewal amount (default £99, can be customized)
    const renewalAmount = process.env.SUBSCRIPTION_PRICE || '£99.00';

    // Send warning email
    const subscriptionData = {
      userName,
      subscriptionStartDate: subscription.subscription_start_date,
      subscriptionEndDate: subscription.subscription_end_date,
      renewalDate: subscription.subscription_end_date, // Renewal happens on end date
      renewalAmount,
      dashboardUrl: process.env.DASHBOARD_URL || 'https://carcrashlawyerai.co.uk/dashboard',
      billingUrl: process.env.BILLING_URL || 'https://carcrashlawyerai.co.uk/billing'
    };

    const result = await emailService.sendSubscriptionExpiring(
      subscription.email,
      subscriptionData
    );

    if (result.success) {
      console.log(`   ✅ Sent 30-day renewal warning to ${subscription.email}`);
      sent++;
      await logWarning(subscription.auth_user_id, warningType, true);
    } else {
      console.log(`   ❌ Failed to send warning to ${subscription.email}: ${result.error}`);
      failed++;
      await logWarning(subscription.auth_user_id, warningType, false);
    }
  }

  return { sent, failed, skipped };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Subscription Renewal Warning Script');
  console.log(`⏰ Running at: ${new Date().toISOString()}\n`);

  // Create warnings table if it doesn't exist
  try {
    await supabase.rpc('create_subscription_warnings_table', {}, { count: 'exact' });
  } catch (err) {
    // Table might already exist, that's okay
  }

  const results = await send30DayRenewalWarnings();

  console.log('\n📊 Summary:');
  console.log(`   ✅ Sent: ${results.sent}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⏭️  Skipped: ${results.skipped}`);
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

module.exports = { send30DayRenewalWarnings };
