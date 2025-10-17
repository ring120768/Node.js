#!/usr/bin/env node

/**
 * Backup Accounts to AWS S3
 *
 * This script backs up user account data to S3 before deletion.
 * Creates encrypted JSON backups for GDPR compliance and legal protection.
 *
 * Should be run before auto-delete-expired-accounts.js
 *
 * @version 1.0.0
 * @date 2025-10-17
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const S3_BUCKET = process.env.AWS_S3_BACKUP_BUCKET || 'carcrash-backups';
const GRACE_PERIOD_DAYS = parseInt(process.env.ACCOUNT_GRACE_PERIOD_DAYS || '30', 10);

/**
 * Generate SHA-256 checksum for data integrity
 */
function generateChecksum(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/**
 * Backup user account to S3
 */
async function backupAccount(account) {
  try {
    // Fetch all related data
    const { data: documents } = await supabase
      .from('user_documents')
      .select('*')
      .eq('associated_with', 'user_signup')
      .eq('associated_id', account.id);

    const { data: incidents } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', account.auth_user_id);

    // Build complete backup object
    const backupData = {
      backup_metadata: {
        backup_date: new Date().toISOString(),
        account_id: account.id,
        auth_user_id: account.auth_user_id,
        email: account.email,
        subscription_end_date: account.subscription_end_date,
        reason: 'account_expiration'
      },
      user_account: account,
      documents: documents || [],
      incidents: incidents || [],
      checksum: null // Will be calculated below
    };

    // Calculate checksum
    backupData.checksum = generateChecksum(backupData);

    // Create S3 key with date and user ID
    const timestamp = new Date().toISOString().split('T')[0];
    const s3Key = `accounts/${timestamp}/${account.auth_user_id}.json`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: JSON.stringify(backupData, null, 2),
      ContentType: 'application/json',
      Metadata: {
        'account-id': account.id,
        'email': account.email,
        'backup-date': new Date().toISOString(),
        'checksum': backupData.checksum
      },
      ServerSideEncryption: 'AES256', // Enable server-side encryption
      StorageClass: 'STANDARD_IA' // Infrequent access (cheaper for backups)
    });

    await s3Client.send(command);

    console.log(`   ✅ Backed up account ${account.email} to s3://${S3_BUCKET}/${s3Key}`);
    console.log(`      Checksum: ${backupData.checksum}`);
    console.log(`      Size: ${JSON.stringify(backupData).length} bytes`);

    // Log backup to database
    await supabase
      .from('backup_log')
      .insert({
        backup_type: 'account',
        record_id: account.id,
        s3_bucket: S3_BUCKET,
        s3_key: s3Key,
        checksum: backupData.checksum,
        backup_date: new Date().toISOString(),
        file_size: JSON.stringify(backupData).length
      });

    return { success: true, s3Key, checksum: backupData.checksum };

  } catch (error) {
    console.error(`   ❌ Failed to backup account ${account.email}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Find accounts that need backup
 */
async function findAccountsToBackup() {
  console.log('🔍 Finding accounts that need backup...');

  const now = new Date();
  const graceDeadline = new Date();
  graceDeadline.setDate(graceDeadline.getDate() - GRACE_PERIOD_DAYS);

  // Find expired accounts that haven't been backed up yet
  const { data: accounts, error } = await supabase
    .from('user_signup')
    .select(`
      id,
      auth_user_id,
      email,
      first_name,
      last_name,
      subscription_end_date,
      subscription_status,
      created_at
    `)
    .neq('subscription_status', 'active')
    .lt('subscription_end_date', graceDeadline.toISOString())
    .is('deleted_at', null);

  if (error) {
    console.error('❌ Error fetching accounts:', error);
    return [];
  }

  console.log(`   Found ${accounts.length} accounts to backup`);

  // Filter out accounts that have already been backed up
  const accountsToBackup = [];
  for (const account of accounts) {
    const { data: existingBackup } = await supabase
      .from('backup_log')
      .select('id')
      .eq('backup_type', 'account')
      .eq('record_id', account.id)
      .single();

    if (!existingBackup) {
      accountsToBackup.push(account);
    }
  }

  console.log(`   ${accountsToBackup.length} accounts need backup (${accounts.length - accountsToBackup.length} already backed up)`);

  return accountsToBackup;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Account Backup to S3 Script');
  console.log(`⏰ Running at: ${new Date().toISOString()}`);
  console.log(`📦 S3 Bucket: ${S3_BUCKET}`);
  console.log(`📅 Grace Period: ${GRACE_PERIOD_DAYS} days\n`);

  // Verify S3 configuration
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS credentials not configured');
    console.error('   Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
    process.exit(1);
  }

  const accountsToBackup = await findAccountsToBackup();

  let backed_up = 0, failed = 0;

  for (const account of accountsToBackup) {
    const result = await backupAccount(account);

    if (result.success) {
      backed_up++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n📊 Summary:');
  console.log(`   💾 Accounts Backed Up: ${backed_up}`);
  console.log(`   ❌ Failed: ${failed}`);
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

module.exports = { backupAccount, findAccountsToBackup };
