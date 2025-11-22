#!/usr/bin/env node

/**
 * Backup Incidents to AWS S3
 *
 * This script backs up incident report data to S3 before deletion.
 * Creates encrypted JSON backups with all associated documents for legal protection.
 *
 * Should be run before auto-delete-expired-incidents.js
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

/**
 * Generate SHA-256 checksum for data integrity
 */
function generateChecksum(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/**
 * Backup incident to S3
 */
async function backupIncident(incident) {
  try {
    // Fetch all associated documents
    const { data: documents } = await supabase
      .from('user_documents')
      .select('*')
      .eq('associated_with', 'incident_report')
      .eq('associated_id', incident.id);

    // Fetch user info
    const { data: user } = await supabase
      .from('user_signup')
      .select('email, name, surname')
      .eq('auth_user_id', incident.create_user_id)
      .single();

    // Build complete backup object
    const backupData = {
      backup_metadata: {
        backup_date: new Date().toISOString(),
        incident_id: incident.id,
        user_id: incident.create_user_id,
        user_email: user?.email || 'unknown',
        submitted_date: incident.created_at,
        retention_until: incident.retention_until,
        reason: 'incident_expiration'
      },
      incident_report: incident,
      documents: documents || [],
      user_info: {
        email: user?.email || null,
        name: user?.name ? `${user.name} ${user.surname || ''}`.trim() : null
      },
      checksum: null // Will be calculated below
    };

    // Calculate checksum
    backupData.checksum = generateChecksum(backupData);

    // Create S3 key with date and incident ID
    const timestamp = new Date().toISOString().split('T')[0];
    const s3Key = `incidents/${timestamp}/${incident.id}.json`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: JSON.stringify(backupData, null, 2),
      ContentType: 'application/json',
      Metadata: {
        'incident-id': incident.id,
        'user-id': incident.create_user_id,
        'user-email': user?.email || 'unknown',
        'backup-date': new Date().toISOString(),
        'checksum': backupData.checksum
      },
      ServerSideEncryption: 'AES256', // Enable server-side encryption
      StorageClass: 'STANDARD_IA' // Infrequent access (cheaper for backups)
    });

    await s3Client.send(command);

    console.log(`   ✅ Backed up incident ${incident.id} to s3://${S3_BUCKET}/${s3Key}`);
    console.log(`      Checksum: ${backupData.checksum}`);
    console.log(`      Size: ${JSON.stringify(backupData).length} bytes`);
    console.log(`      Documents: ${documents?.length || 0}`);

    // Log backup to database
    await supabase
      .from('backup_log')
      .insert({
        backup_type: 'incident',
        record_id: incident.id,
        s3_bucket: S3_BUCKET,
        s3_key: s3Key,
        checksum: backupData.checksum,
        backup_date: new Date().toISOString(),
        file_size: JSON.stringify(backupData).length
      });

    return { success: true, s3Key, checksum: backupData.checksum };

  } catch (error) {
    console.error(`   ❌ Failed to backup incident ${incident.id}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Find incidents that need backup
 */
async function findIncidentsToBackup() {
  console.log('🔍 Finding incidents that need backup...');

  const now = new Date();

  // Find expired incidents that haven't been deleted yet
  const { data: incidents, error } = await supabase
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
    console.error('❌ Error fetching incidents:', error);
    return [];
  }

  console.log(`   Found ${incidents.length} expired incidents`);

  // Filter out incidents that have already been backed up
  const incidentsToBackup = [];
  for (const incident of incidents) {
    const { data: existingBackup } = await supabase
      .from('backup_log')
      .select('id')
      .eq('backup_type', 'incident')
      .eq('record_id', incident.id)
      .single();

    if (!existingBackup) {
      incidentsToBackup.push(incident);
    }
  }

  console.log(`   ${incidentsToBackup.length} incidents need backup (${incidents.length - incidentsToBackup.length} already backed up)`);

  return incidentsToBackup;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Incident Backup to S3 Script');
  console.log(`⏰ Running at: ${new Date().toISOString()}`);
  console.log(`📦 S3 Bucket: ${S3_BUCKET}\n`);

  // Verify S3 configuration
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS credentials not configured');
    console.error('   Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
    process.exit(1);
  }

  const incidentsToBackup = await findIncidentsToBackup();

  let backed_up = 0, failed = 0;

  for (const incident of incidentsToBackup) {
    const result = await backupIncident(incident);

    if (result.success) {
      backed_up++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n📊 Summary:');
  console.log(`   💾 Incidents Backed Up: ${backed_up}`);
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

module.exports = { backupIncident, findIncidentsToBackup };
