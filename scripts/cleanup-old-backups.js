#!/usr/bin/env node

/**
 * Cleanup Old S3 Backups
 *
 * This script removes old backup files from S3 to manage storage costs.
 * Keeps backups for a configurable retention period (default 7 years for legal compliance).
 *
 * Should be run monthly via cron
 *
 * @version 1.0.0
 * @date 2025-10-17
 */

require('dotenv').config();
const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const S3_BUCKET = process.env.AWS_S3_BACKUP_BUCKET || 'carcrash-backups';

// Retention periods (in days)
const INCIDENT_RETENTION_DAYS = parseInt(process.env.BACKUP_INCIDENT_RETENTION_DAYS || '2555', 10); // 7 years
const ACCOUNT_RETENTION_DAYS = parseInt(process.env.BACKUP_ACCOUNT_RETENTION_DAYS || '2555', 10); // 7 years

/**
 * List all objects in S3 bucket with a specific prefix
 */
async function listObjects(prefix) {
  const objects = [];
  let continuationToken = null;

  do {
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      objects.push(...response.Contents);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

/**
 * Delete an object from S3
 */
async function deleteObject(key) {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  await s3Client.send(command);
}

/**
 * Calculate age of backup in days
 */
function getBackupAgeDays(lastModified) {
  const now = new Date();
  const diffTime = now - lastModified;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Cleanup old backups for a specific type
 */
async function cleanupBackups(prefix, retentionDays, backupType) {
  console.log(`\n🧹 Cleaning up ${backupType} backups older than ${retentionDays} days...`);
  console.log(`   Prefix: ${prefix}`);

  const objects = await listObjects(prefix);
  console.log(`   Found ${objects.length} backup files`);

  let deleted = 0, kept = 0, skipped = 0;

  for (const obj of objects) {
    const ageDays = getBackupAgeDays(obj.LastModified);

    if (ageDays > retentionDays) {
      try {
        await deleteObject(obj.Key);
        console.log(`   🗑️  Deleted: ${obj.Key} (${ageDays} days old)`);
        deleted++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`   ❌ Failed to delete ${obj.Key}:`, error.message);
        skipped++;
      }
    } else {
      kept++;
    }
  }

  console.log(`   ✅ Deleted: ${deleted}`);
  console.log(`   📁 Kept: ${kept}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);

  return { deleted, kept, skipped };
}

/**
 * Get storage statistics
 */
async function getStorageStats() {
  console.log('\n📊 S3 Storage Statistics:');

  const incidentObjects = await listObjects('incidents/');
  const accountObjects = await listObjects('accounts/');

  const incidentSize = incidentObjects.reduce((sum, obj) => sum + (obj.Size || 0), 0);
  const accountSize = accountObjects.reduce((sum, obj) => sum + (obj.Size || 0), 0);
  const totalSize = incidentSize + accountSize;

  console.log(`   Incident Backups: ${incidentObjects.length} files (${(incidentSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   Account Backups: ${accountObjects.length} files (${(accountSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   Total: ${incidentObjects.length + accountObjects.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

  return {
    incidentCount: incidentObjects.length,
    accountCount: accountObjects.length,
    totalSize
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting S3 Backup Cleanup Script');
  console.log(`⏰ Running at: ${new Date().toISOString()}`);
  console.log(`📦 S3 Bucket: ${S3_BUCKET}`);
  console.log(`📅 Incident Retention: ${INCIDENT_RETENTION_DAYS} days`);
  console.log(`📅 Account Retention: ${ACCOUNT_RETENTION_DAYS} days`);

  // Verify S3 configuration
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('\n❌ AWS credentials not configured');
    console.error('   Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
    process.exit(1);
  }

  // Show storage stats before cleanup
  await getStorageStats();

  // Cleanup old backups
  const incidentResults = await cleanupBackups('incidents/', INCIDENT_RETENTION_DAYS, 'incident');
  const accountResults = await cleanupBackups('accounts/', ACCOUNT_RETENTION_DAYS, 'account');

  // Show storage stats after cleanup
  await getStorageStats();

  console.log('\n📊 Cleanup Summary:');
  console.log(`   🗑️  Total Deleted: ${incidentResults.deleted + accountResults.deleted}`);
  console.log(`   📁 Total Kept: ${incidentResults.kept + accountResults.kept}`);
  console.log(`   ⚠️  Total Skipped: ${incidentResults.skipped + accountResults.skipped}`);
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

module.exports = { cleanupBackups, getStorageStats };
