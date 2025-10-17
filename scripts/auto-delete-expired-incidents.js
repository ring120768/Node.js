#!/usr/bin/env node

/**
 * Auto-Delete Expired Incidents
 *
 * This script automatically deletes incident reports that have passed
 * their 90-day retention period. Performs soft delete (sets deleted_at).
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
 * Delete expired incidents
 */
async function deleteExpiredIncidents() {
  console.log('🗑️  Checking for expired incidents...');

  const now = new Date();

  // Find incidents where retention_until has passed
  const { data: expiredIncidents, error } = await supabase
    .from('incident_reports')
    .select(`
      id,
      create_user_id,
      created_at,
      retention_until
    `)
    .lt('retention_until', now.toISOString())
    .is('deleted_at', null);

  if (error) {
    console.error('❌ Error fetching expired incidents:', error);
    return { deleted: 0, failed: 0, notified: 0 };
  }

  console.log(`   Found ${expiredIncidents.length} expired incidents`);

  let deleted = 0, failed = 0, notified = 0;

  for (const incident of expiredIncidents) {
    try {
      // Soft delete the incident report
      const { error: deleteError } = await supabase
        .from('incident_reports')
        .update({ deleted_at: now.toISOString() })
        .eq('id', incident.id);

      if (deleteError) {
        console.error(`   ❌ Failed to delete incident ${incident.id}:`, deleteError);
        failed++;
        continue;
      }

      // Also soft delete associated documents
      await supabase
        .from('user_documents')
        .update({ deleted_at: now.toISOString() })
        .eq('associated_with', 'incident_report')
        .eq('associated_id', incident.id)
        .is('deleted_at', null);

      console.log(`   ✅ Deleted incident ${incident.id}`);
      deleted++;

      // Get user info for notification email
      const { data: user, error: userError } = await supabase
        .from('user_signup')
        .select('email, first_name, last_name, subscription_end_date')
        .eq('auth_user_id', incident.create_user_id)
        .single();

      if (!userError && user) {
        const userName = user.first_name
          ? `${user.first_name} ${user.last_name || ''}`.trim()
          : user.email.split('@')[0];

        // Send deletion confirmation email
        const deletionData = {
          userName,
          incidentId: incident.id,
          submittedDate: incident.created_at,
          deletionDate: now.toISOString(),
          subscriptionEndDate: user.subscription_end_date,
          dashboardUrl: process.env.DASHBOARD_URL || 'https://carcrashlawyerai.co.uk/dashboard'
        };

        const emailResult = await emailService.sendIncidentDeleted(
          user.email,
          deletionData
        );

        if (emailResult.success) {
          console.log(`   📧 Sent deletion confirmation to ${user.email}`);
          notified++;
        } else {
          console.log(`   ⚠️  Failed to send deletion email to ${user.email}`);
        }
      }

    } catch (err) {
      console.error(`   ❌ Error processing incident ${incident.id}:`, err);
      failed++;
    }
  }

  return { deleted, failed, notified };
}

/**
 * Clean up orphaned documents (documents without parent records)
 */
async function cleanupOrphanedDocuments() {
  console.log('\n🧹 Cleaning up orphaned documents...');

  const now = new Date();

  // Find documents where associated incident is deleted
  const { data: orphanedDocs, error } = await supabase
    .from('user_documents')
    .select('id, associated_with, associated_id')
    .eq('associated_with', 'incident_report')
    .is('deleted_at', null);

  if (error) {
    console.error('❌ Error fetching documents:', error);
    return { cleaned: 0 };
  }

  let cleaned = 0;

  for (const doc of orphanedDocs) {
    if (!doc.associated_id) continue;

    // Check if parent incident exists and is not deleted
    const { data: incident, error: incidentError } = await supabase
      .from('incident_reports')
      .select('id, deleted_at')
      .eq('id', doc.associated_id)
      .single();

    // If incident is deleted or doesn't exist, delete the document
    if (!incident || incident.deleted_at) {
      await supabase
        .from('user_documents')
        .update({ deleted_at: now.toISOString() })
        .eq('id', doc.id);

      console.log(`   🗑️  Deleted orphaned document ${doc.id}`);
      cleaned++;
    }
  }

  console.log(`   Cleaned ${cleaned} orphaned documents`);
  return { cleaned };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Auto-Delete Expired Incidents Script');
  console.log(`⏰ Running at: ${new Date().toISOString()}\n`);

  const deleteResults = await deleteExpiredIncidents();
  const cleanupResults = await cleanupOrphanedDocuments();

  console.log('\n📊 Summary:');
  console.log(`   🗑️  Incidents Deleted: ${deleteResults.deleted}`);
  console.log(`   📧 Notifications Sent: ${deleteResults.notified}`);
  console.log(`   ❌ Failed: ${deleteResults.failed}`);
  console.log(`   🧹 Orphaned Docs Cleaned: ${cleanupResults.cleaned}`);
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

module.exports = { deleteExpiredIncidents, cleanupOrphanedDocuments };
