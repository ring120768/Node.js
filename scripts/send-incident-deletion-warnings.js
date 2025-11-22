#!/usr/bin/env node

/**
 * Send Incident Deletion Warnings
 *
 * This script checks for incidents approaching their 90-day deletion deadline
 * and sends warning emails at:
 * - 60 days before deletion
 * - 30 days before deletion
 * - 7 days before deletion
 * - 1 day (24 hours) before deletion
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
 * Calculate days until deletion
 */
function getDaysUntilDeletion(retentionUntil) {
  const now = new Date();
  const deletionDate = new Date(retentionUntil);
  const diffTime = deletionDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get export URL for incident
 */
function getExportUrl(incidentId) {
  const baseUrl = process.env.APP_URL || 'https://carcrashlawyerai.co.uk';
  return `${baseUrl}/api/incidents/${incidentId}/export`;
}

/**
 * Check if warning was already sent
 */
async function wasWarningSent(incidentId, warningType) {
  const { data, error } = await supabase
    .from('incident_warnings')
    .select('id')
    .eq('incident_id', incidentId)
    .eq('warning_type', warningType)
    .single();

  return !!data;
}

/**
 * Log warning sent
 */
async function logWarning(incidentId, warningType, emailSuccess) {
  await supabase
    .from('incident_warnings')
    .insert({
      incident_id: incidentId,
      warning_type: warningType,
      sent_at: new Date().toISOString(),
      email_success: emailSuccess
    });
}

/**
 * Send warnings for specific day threshold
 */
async function sendWarningsForThreshold(daysThreshold) {
  console.log(`\n📧 Checking for incidents ${daysThreshold} days from deletion...`);

  // Calculate date range for this threshold (±12 hours to account for timing)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysThreshold);

  const startDate = new Date(targetDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(targetDate);
  endDate.setHours(23, 59, 59, 999);

  // Find incidents with retention_until in this range
  const { data: incidents, error } = await supabase
    .from('incident_reports')
    .select(`
      id,
      create_user_id,
      created_at,
      retention_until
    `)
    .gte('retention_until', startDate.toISOString())
    .lte('retention_until', endDate.toISOString())
    .is('deleted_at', null);

  if (error) {
    console.error(`❌ Error fetching incidents:`, error);
    return { sent: 0, failed: 0, skipped: 0 };
  }

  console.log(`   Found ${incidents.length} incidents`);

  let sent = 0, failed = 0, skipped = 0;

  for (const incident of incidents) {
    const warningType = `${daysThreshold}_days`;

    // Check if warning already sent
    const alreadySent = await wasWarningSent(incident.id, warningType);
    if (alreadySent) {
      console.log(`   ⏭️  Skipped incident ${incident.id} (warning already sent)`);
      skipped++;
      continue;
    }

    // Get user email
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('email, name, surname')
      .eq('auth_user_id', incident.create_user_id)
      .single();

    if (userError || !user) {
      console.log(`   ⚠️  No user found for incident ${incident.id}`);
      failed++;
      await logWarning(incident.id, warningType, false);
      continue;
    }

    const userName = user.name
      ? `${user.name} ${user.surname || ''}`.trim()
      : user.email.split('@')[0];

    // Send warning email
    const warningData = {
      userName,
      incidentId: incident.id,
      submittedDate: incident.created_at,
      deletionDate: incident.retention_until,
      deletionTime: new Date(incident.retention_until).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      exportUrl: getExportUrl(incident.id)
    };

    const result = await emailService.sendIncidentDeletionWarning(
      user.email,
      warningData,
      daysThreshold
    );

    if (result.success) {
      console.log(`   ✅ Sent ${daysThreshold}-day warning to ${user.email} for incident ${incident.id}`);
      sent++;
      await logWarning(incident.id, warningType, true);
    } else {
      console.log(`   ❌ Failed to send warning to ${user.email}: ${result.error}`);
      failed++;
      await logWarning(incident.id, warningType, false);
    }
  }

  return { sent, failed, skipped };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Incident Deletion Warning Script');
  console.log(`⏰ Running at: ${new Date().toISOString()}\n`);

  // Create warnings table if it doesn't exist
  try {
    await supabase.rpc('create_incident_warnings_table', {}, { count: 'exact' });
  } catch (err) {
    // Table might already exist, that's okay
  }

  const thresholds = [60, 30, 7, 1];
  const summary = {
    totalSent: 0,
    totalFailed: 0,
    totalSkipped: 0
  };

  for (const threshold of thresholds) {
    const results = await sendWarningsForThreshold(threshold);
    summary.totalSent += results.sent;
    summary.totalFailed += results.failed;
    summary.totalSkipped += results.skipped;
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Sent: ${summary.totalSent}`);
  console.log(`   ❌ Failed: ${summary.totalFailed}`);
  console.log(`   ⏭️  Skipped: ${summary.totalSkipped}`);
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

module.exports = { sendWarningsForThreshold };
