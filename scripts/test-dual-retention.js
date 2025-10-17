#!/usr/bin/env node

/**
 * Dual Retention System Test Script
 *
 * Tests all components of the dual retention model:
 * - Export functionality
 * - Email templates
 * - Warning system
 * - Deletion automation
 * - S3 backups
 * - Subscription renewals
 *
 * @version 1.0.0
 * @date 2025-10-17
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const emailService = require('../lib/emailService');
const exportService = require('../src/services/exportService');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Log test result
 */
function logResult(testName, passed, message = '') {
  if (passed) {
    console.log(`✅ ${testName}`);
    results.passed.push(testName);
  } else {
    console.log(`❌ ${testName}${message ? `: ${message}` : ''}`);
    results.failed.push({ test: testName, message });
  }
}

/**
 * Log warning
 */
function logWarning(testName, message) {
  console.log(`⚠️  ${testName}: ${message}`);
  results.warnings.push({ test: testName, message });
}

/**
 * Test 1: Database Schema
 */
async function testDatabaseSchema() {
  console.log('\n📊 Test 1: Database Schema');
  console.log('━'.repeat(60));

  // Check user_signup columns
  const { data: userCols, error: userError } = await supabase
    .from('user_signup')
    .select('subscription_start_date, subscription_end_date, subscription_status, auto_renewal, retention_until')
    .limit(1);

  logResult('user_signup table has subscription fields', !userError);

  // Check user_documents columns
  const { data: docCols, error: docError } = await supabase
    .from('user_documents')
    .select('associated_with, associated_id, retention_until, original_checksum_sha256, current_checksum_sha256')
    .limit(1);

  logResult('user_documents table has association and checksum fields', !docError);

  // Check export_log table
  const { error: exportLogError } = await supabase
    .from('export_log')
    .select('*')
    .limit(1);

  logResult('export_log table exists', !exportLogError);

  // Check backup_log table
  const { error: backupLogError } = await supabase
    .from('backup_log')
    .select('*')
    .limit(1);

  logResult('backup_log table exists', !backupLogError);

  // Check warning tables
  const { error: incidentWarningsError } = await supabase
    .from('incident_warnings')
    .select('*')
    .limit(1);

  logResult('incident_warnings table exists', !incidentWarningsError);

  const { error: subscriptionWarningsError } = await supabase
    .from('subscription_warnings')
    .select('*')
    .limit(1);

  logResult('subscription_warnings table exists', !subscriptionWarningsError);
}

/**
 * Test 2: Email Templates
 */
async function testEmailTemplates() {
  console.log('\n📧 Test 2: Email Templates');
  console.log('━'.repeat(60));

  const templates = [
    'subscription-welcome',
    'incident-90day-notice',
    'incident-warning-60days',
    'incident-warning-30days',
    'incident-warning-7days',
    'incident-warning-1day',
    'incident-deleted',
    'subscription-expiring-30days',
    'subscription-renewed'
  ];

  for (const template of templates) {
    try {
      const html = await emailService.loadTemplate(template);
      logResult(`Template ${template}.html exists and loads`, !!html);
    } catch (error) {
      logResult(`Template ${template}.html exists and loads`, false, error.message);
    }
  }
}

/**
 * Test 3: Export Service
 */
async function testExportService() {
  console.log('\n📦 Test 3: Export Service');
  console.log('━'.repeat(60));

  // Find a test incident (or create one for testing)
  const { data: testIncident, error } = await supabase
    .from('incident_reports')
    .select('id, create_user_id')
    .is('deleted_at', null)
    .limit(1)
    .single();

  if (error || !testIncident) {
    logWarning('Export service test', 'No test incident found - skipping export test');
    return;
  }

  try {
    // Note: This will actually generate an export - use with caution in production
    if (process.env.RUN_EXPORT_TEST === 'true') {
      const { archive, exportLog, metadata } = await exportService.generateIncidentExport(
        testIncident.id,
        testIncident.create_user_id
      );

      logResult('Export service generates ZIP archive', !!archive);
      logResult('Export service creates export log', !!exportLog);
      logResult('Export service returns metadata', !!metadata);

      // Clean up test export log
      if (exportLog?.id) {
        await supabase
          .from('export_log')
          .delete()
          .eq('id', exportLog.id);
      }
    } else {
      logWarning('Export service test', 'Skipped (set RUN_EXPORT_TEST=true to enable)');
    }
  } catch (error) {
    logResult('Export service test', false, error.message);
  }
}

/**
 * Test 4: Configuration Check
 */
async function testConfiguration() {
  console.log('\n⚙️  Test 4: Configuration');
  console.log('━'.repeat(60));

  // Required environment variables
  const required = {
    'SUPABASE_URL': !!process.env.SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    'SMTP_USER': !!process.env.SMTP_USER,
    'SMTP_PASS': !!process.env.SMTP_PASS
  };

  for (const [key, value] of Object.entries(required)) {
    logResult(`Environment variable ${key} is set`, value);
  }

  // Optional but recommended
  const optional = {
    'AWS_ACCESS_KEY_ID': !!process.env.AWS_ACCESS_KEY_ID,
    'AWS_SECRET_ACCESS_KEY': !!process.env.AWS_SECRET_ACCESS_KEY,
    'AWS_S3_BACKUP_BUCKET': !!process.env.AWS_S3_BACKUP_BUCKET,
    'DASHBOARD_URL': !!process.env.DASHBOARD_URL,
    'BILLING_URL': !!process.env.BILLING_URL
  };

  for (const [key, value] of Object.entries(optional)) {
    if (value) {
      logResult(`Optional config ${key} is set`, true);
    } else {
      logWarning(key, 'Not configured (optional)');
    }
  }
}

/**
 * Test 5: Cron Scripts Exist
 */
async function testCronScripts() {
  console.log('\n⏰ Test 5: Cron Scripts');
  console.log('━'.repeat(60));

  const fs = require('fs').promises;
  const scripts = [
    'scripts/send-incident-deletion-warnings.js',
    'scripts/send-subscription-warnings.js',
    'scripts/auto-delete-expired-incidents.js',
    'scripts/auto-delete-expired-accounts.js',
    'scripts/process-subscription-renewals.js',
    'scripts/backup-incidents-to-s3.js',
    'scripts/backup-accounts-to-s3.js',
    'scripts/cleanup-old-backups.js'
  ];

  for (const script of scripts) {
    try {
      await fs.access(script);
      logResult(`Script ${script} exists`, true);
    } catch (error) {
      logResult(`Script ${script} exists`, false);
    }
  }
}

/**
 * Test 6: Sample Data Flow
 */
async function testDataFlow() {
  console.log('\n🔄 Test 6: Data Flow');
  console.log('━'.repeat(60));

  // Check if there's at least one user with subscription data
  const { data: users, error: userError } = await supabase
    .from('user_signup')
    .select('id, subscription_start_date, subscription_end_date, subscription_status')
    .not('subscription_start_date', 'is', null)
    .limit(1);

  if (!userError && users && users.length > 0) {
    logResult('User signup data has subscription info', true);
  } else {
    logWarning('User signup data', 'No users with subscription info found');
  }

  // Check if there's at least one incident with retention date
  const { data: incidents, error: incidentError } = await supabase
    .from('incident_reports')
    .select('id, retention_until')
    .not('retention_until', 'is', null)
    .limit(1);

  if (!incidentError && incidents && incidents.length > 0) {
    logResult('Incident reports have retention_until dates', true);
  } else {
    logWarning('Incident reports', 'No incidents with retention_until found');
  }

  // Check if documents have associations
  const { data: docs, error: docError } = await supabase
    .from('user_documents')
    .select('id, associated_with, associated_id, original_checksum_sha256')
    .not('associated_with', 'is', null)
    .limit(1);

  if (!docError && docs && docs.length > 0) {
    logResult('Documents have association tracking', true);
    logResult('Documents have checksums', !!docs[0].original_checksum_sha256);
  } else {
    logWarning('Document associations', 'No documents with associations found');
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('🚀 Dual Retention System Test Suite');
  console.log('═'.repeat(60));
  console.log(`⏰ Running at: ${new Date().toISOString()}\n`);

  await testDatabaseSchema();
  await testEmailTemplates();
  await testExportService();
  await testConfiguration();
  await testCronScripts();
  await testDataFlow();

  // Summary
  console.log('\n📊 Test Summary');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(({ test, message }) => {
      console.log(`   - ${test}${message ? `: ${message}` : ''}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(({ test, message }) => {
      console.log(`   - ${test}: ${message}`);
    });
  }

  console.log('\n✅ Test suite completed\n');

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Test suite error:', err);
    process.exit(1);
  });
}

module.exports = { main };
