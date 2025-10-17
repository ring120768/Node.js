# Dual Retention Model - Complete Implementation Guide

## 🎯 Overview

This system implements a **dual retention model** for GDPR compliance:

- **User Accounts**: 12-month retention (subscription-based)
- **Incident Reports**: 90-day retention (temporary staging)

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Setup Instructions](#setup-instructions)
4. [Cron Jobs](#cron-jobs)
5. [Email System](#email-system)
6. [Export & Backup](#export--backup)
7. [Testing](#testing)
8. [Maintenance](#maintenance)

---

## 🏗️ Architecture

### Core Concepts

1. **Association Tracking**: Every document is linked to either an incident or user signup via `associated_with` and `associated_id` fields
2. **Automatic Retention Dates**: Database triggers calculate retention dates based on association type
3. **SHA-256 Checksums**: All images have checksums for data integrity verification
4. **Audit Trails**: All exports and backups are logged for legal compliance

### Data Flow

```
User Signup (via Typeform/Webhook)
  ↓
Create user_signup record
  ↓
Set subscription_end_date = NOW() + 12 months
Set retention_until = subscription_end_date
  ↓
Upload profile images
  ↓
Link documents to user_signup (associated_with = 'user_signup')
  ↓
Calculate SHA-256 checksums
  ↓
Auto-set document retention_until = 12 months
```

```
Incident Report (via Typeform/Webhook)
  ↓
Create incident_reports record
  ↓
Set retention_until = NOW() + 90 days
  ↓
Upload incident images
  ↓
Link documents to incident (associated_with = 'incident_report')
  ↓
Calculate SHA-256 checksums
  ↓
Auto-set document retention_until = 90 days
  ↓
Send 90-day notice email immediately
```

---

## 🗄️ Database Schema

### Migration Files

Run migrations in order:

```bash
# 1. Dual retention schema (core)
psql $DATABASE_URL -f scripts/migrations/001_dual_retention_schema.sql

# 2. Warning tracking tables
psql $DATABASE_URL -f scripts/migrations/002_warning_tracking_tables.sql

# 3. Backup log table
psql $DATABASE_URL -f scripts/migrations/003_backup_log_table.sql
```

### Key Tables

#### `user_signup` (enhanced)
- `subscription_start_date` - When subscription begins
- `subscription_end_date` - When subscription expires
- `subscription_status` - active, expired, payment_failed, deleted
- `auto_renewal` - Boolean for auto-renewal
- `retention_until` - When user data will be deleted

#### `incident_reports` (enhanced)
- `retention_until` - When incident will be deleted (90 days)

#### `user_documents` (enhanced)
- `associated_with` - 'incident_report' or 'user_signup'
- `associated_id` - UUID of parent record
- `retention_until` - Calculated by trigger based on association
- `original_checksum_sha256` - Original file hash
- `current_checksum_sha256` - Current file hash
- `checksum_verified_at` - Last verification timestamp

#### `export_log` (new)
- Tracks all incident exports
- Prevents duplicate exports
- Audit trail for legal compliance

#### `backup_log` (new)
- Tracks S3 backups
- Contains checksums for integrity
- Prevents duplicate backups

#### `incident_warnings` (new)
- Tracks sent deletion warnings
- Prevents duplicate emails

#### `subscription_warnings` (new)
- Tracks sent renewal warnings
- Prevents duplicate emails

---

## ⚙️ Setup Instructions

### 1. Install Dependencies

```bash
npm install archiver @aws-sdk/client-s3 @aws-sdk/lib-storage node-cron
```

### 2. Environment Variables

Add to `.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AWS S3 (for backups)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-2
AWS_S3_BACKUP_BUCKET=carcrash-backups

# URLs
DASHBOARD_URL=https://yourdomain.com/dashboard
BILLING_URL=https://yourdomain.com/billing
APP_URL=https://yourdomain.com

# Subscription Configuration
SUBSCRIPTION_DURATION_MONTHS=12
SUBSCRIPTION_PRICE=£99.00

# Grace Periods
ACCOUNT_GRACE_PERIOD_DAYS=30
BACKUP_INCIDENT_RETENTION_DAYS=2555  # 7 years
BACKUP_ACCOUNT_RETENTION_DAYS=2555   # 7 years

# Cron Jobs
CRON_ENABLED=true
TZ=Europe/London
```

### 3. Run Database Migrations

```bash
# Connect to Supabase
psql postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Run migrations
\i scripts/migrations/001_dual_retention_schema.sql
\i scripts/migrations/002_warning_tracking_tables.sql
\i scripts/migrations/003_backup_log_table.sql
```

### 4. Verify Installation

```bash
# Run test suite
node scripts/test-dual-retention.js

# Or with export testing (caution: creates real exports)
RUN_EXPORT_TEST=true node scripts/test-dual-retention.js
```

---

## ⏰ Cron Jobs

### Schedule (All Times in Europe/London)

| Job | Schedule | Description |
|-----|----------|-------------|
| Backup Incidents | 1:00 AM Daily | Backup expired incidents to S3 |
| Backup Accounts | 1:30 AM Daily | Backup expired accounts to S3 |
| Delete Incidents | 2:00 AM Daily | Delete incidents past 90 days |
| Delete Accounts | 2:30 AM Daily | Delete accounts past subscription + grace |
| Process Renewals | 3:00 AM Daily | Auto-renew subscriptions |
| Incident Warnings | 9:00 AM Daily | Send 60/30/7/1 day warnings |
| Subscription Warnings | 9:30 AM Daily | Send 30-day renewal notices |
| Cleanup S3 | 4:00 AM 1st of Month | Remove old backups (7+ years) |

### Manual Execution

```bash
# Test individual scripts
node scripts/send-incident-deletion-warnings.js
node scripts/send-subscription-warnings.js
node scripts/auto-delete-expired-incidents.js
node scripts/auto-delete-expired-accounts.js
node scripts/process-subscription-renewals.js
node scripts/backup-incidents-to-s3.js
node scripts/backup-accounts-to-s3.js
node scripts/cleanup-old-backups.js
```

### Disabling Cron Jobs

```env
# In .env
CRON_ENABLED=false
```

Or programmatically:
```javascript
const cronManager = require('./src/services/cronManager');
cronManager.stop();
```

---

## 📧 Email System

### Templates

All templates are in `templates/emails/`:

1. **subscription-welcome.html** - Sent when user signs up
2. **incident-90day-notice.html** - Sent immediately after incident submission
3. **incident-warning-60days.html** - 60 days before deletion
4. **incident-warning-30days.html** - 30 days before deletion
5. **incident-warning-7days.html** - 7 days before deletion
6. **incident-warning-1day.html** - 24 hours before deletion
7. **incident-deleted.html** - Confirmation after deletion
8. **subscription-expiring-30days.html** - 30 days before renewal
9. **subscription-renewed.html** - Confirmation after renewal

### Using Email Service

```javascript
const emailService = require('./lib/emailService');

// Send subscription welcome
await emailService.sendSubscriptionWelcome('user@example.com', {
  userName: 'John Doe',
  subscriptionStartDate: '2025-10-17',
  subscriptionEndDate: '2026-10-17',
  dashboardUrl: 'https://yourdomain.com/dashboard'
});

// Send incident 90-day notice
await emailService.sendIncident90DayNotice('user@example.com', {
  userName: 'John Doe',
  incidentId: 'uuid',
  submittedDate: '2025-10-17',
  deletionDate: '2026-01-15',
  daysRemaining: 90,
  exportUrl: 'https://yourdomain.com/api/incidents/uuid/export'
});

// Send deletion warning
await emailService.sendIncidentDeletionWarning('user@example.com', {
  userName: 'John Doe',
  incidentId: 'uuid',
  submittedDate: '2025-10-17',
  deletionDate: '2026-01-15',
  exportUrl: 'https://yourdomain.com/api/incidents/uuid/export'
}, 30); // 30 days
```

---

## 📦 Export & Backup

### User Export

Users can export their incidents via the API:

```bash
# Export incident as ZIP
GET /api/incidents/:id/export

# Get export info (without downloading)
GET /api/incidents/:id/export/info

# View export history
GET /api/exports/history
```

### Export Package Contents

```
incident_report_<id>_<timestamp>.zip
├── README.txt                    # User guide and legal info
├── incident_data.json            # Complete incident data
├── incident_report.pdf           # Generated PDF (if available)
├── checksums.txt                 # SHA-256 checksums for verification
└── images/
    ├── front_damage.jpg
    ├── rear_damage.jpg
    └── ...
```

### S3 Backup Structure

```
s3://carcrash-backups/
├── incidents/
│   ├── 2025-10-17/
│   │   ├── <incident-id-1>.json
│   │   └── <incident-id-2>.json
│   └── 2025-10-18/
│       └── <incident-id-3>.json
└── accounts/
    ├── 2025-10-17/
    │   ├── <user-id-1>.json
    │   └── <user-id-2>.json
    └── 2025-10-18/
        └── <user-id-3>.json
```

### Backup Verification

```bash
# Verify backup integrity
aws s3 cp s3://carcrash-backups/incidents/2025-10-17/uuid.json - | \
  jq -r '.checksum' | \
  shasum -a 256 -c
```

---

## 🧪 Testing

### Test Suite

```bash
# Run full test suite
node scripts/test-dual-retention.js

# Run with export testing
RUN_EXPORT_TEST=true node scripts/test-dual-retention.js
```

### Manual Testing Checklist

- [ ] Create user signup via webhook → verify subscription fields populated
- [ ] Create incident report → verify retention_until = 90 days
- [ ] Upload images → verify checksums calculated
- [ ] Export incident → verify ZIP contains all files
- [ ] Trigger warning script → verify emails sent
- [ ] Trigger deletion script → verify soft delete (deleted_at set)
- [ ] Check S3 backup → verify JSON + checksums match
- [ ] Test subscription renewal → verify dates updated

---

## 🔧 Maintenance

### Monitoring

Check cron job status:
```javascript
const cronManager = require('./src/services/cronManager');
const status = cronManager.getStatus();
console.log(status);
```

### Database Cleanup

```sql
-- Check incidents ready for deletion
SELECT id, create_user_id, retention_until,
       EXTRACT(DAY FROM retention_until - NOW()) as days_remaining
FROM incident_reports
WHERE retention_until < NOW()
  AND deleted_at IS NULL;

-- Check accounts ready for deletion
SELECT id, email, subscription_end_date,
       EXTRACT(DAY FROM subscription_end_date - NOW()) as days_remaining
FROM user_signup
WHERE subscription_status != 'active'
  AND subscription_end_date < NOW() - INTERVAL '30 days'
  AND deleted_at IS NULL;
```

### S3 Storage Monitoring

```bash
# Get bucket size
aws s3 ls s3://carcrash-backups --recursive --summarize | grep "Total Size"

# Count objects
aws s3 ls s3://carcrash-backups --recursive --summarize | grep "Total Objects"

# List old backups
aws s3 ls s3://carcrash-backups/incidents/ --recursive | \
  awk '{print $1" "$2" "$4}' | \
  grep "^2024"
```

### Troubleshooting

#### Cron jobs not running
```bash
# Check logs
pm2 logs

# Verify cron enabled
echo $CRON_ENABLED

# Test manual execution
node scripts/send-incident-deletion-warnings.js
```

#### Emails not sending
```bash
# Test SMTP connection
node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
transport.verify().then(() => console.log('✅ SMTP OK'));
"
```

#### S3 backups failing
```bash
# Test AWS credentials
aws s3 ls s3://carcrash-backups

# Check permissions
aws s3api get-bucket-policy --bucket carcrash-backups
```

---

## 📊 Metrics & Reporting

### Key Metrics

```sql
-- Active subscriptions
SELECT COUNT(*) FROM user_signup
WHERE subscription_status = 'active';

-- Incidents pending deletion
SELECT COUNT(*) FROM incident_reports
WHERE retention_until < NOW() + INTERVAL '7 days'
  AND deleted_at IS NULL;

-- Export activity (last 30 days)
SELECT DATE(created_at) as date, COUNT(*) as exports
FROM export_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- S3 backup status
SELECT backup_type, COUNT(*) as backups,
       SUM(file_size) / 1024 / 1024 as total_mb
FROM backup_log
GROUP BY backup_type;
```

---

## 🔒 Security & Compliance

### GDPR Compliance

✅ **Right to Access**: Users can export their data anytime
✅ **Right to Erasure**: Data automatically deleted after retention period
✅ **Data Minimization**: Only essential data retained
✅ **Storage Limitation**: Clear retention periods (90 days/12 months)
✅ **Integrity & Confidentiality**: SHA-256 checksums, encrypted S3
✅ **Accountability**: Full audit trail of exports and deletions

### Data Protection

- All S3 backups use AES256 encryption
- SHA-256 checksums verify data integrity
- Export logs track all data access
- Soft deletes allow for grace periods
- Automated deletion prevents manual errors

---

## 📝 Changelog

### Version 1.0.0 (2025-10-17)

**Added:**
- Dual retention model (12-month subscriptions, 90-day incidents)
- SHA-256 checksum system for data integrity
- Association tracking for documents
- Complete email notification system (9 templates)
- Automated warning emails (60/30/7/1 days)
- S3 backup automation
- Export functionality with ZIP archives
- Cron job manager for automation
- Database migrations (3 files)
- Comprehensive test suite

**Modified:**
- `imageProcessorV2.js` - Added checksum calculation
- `webhook.controller.js` - Added association population
- `app.js` - Integrated cron manager
- `index.js` - Added graceful cron shutdown

**Database:**
- Enhanced `user_signup` with subscription fields
- Enhanced `user_documents` with association/checksum fields
- Enhanced `incident_reports` with retention_until
- Created `export_log` table
- Created `backup_log` table
- Created `incident_warnings` table
- Created `subscription_warnings` table

---

## 🆘 Support

For issues or questions:
1. Check logs: `pm2 logs` or console output
2. Run test suite: `node scripts/test-dual-retention.js`
3. Review this guide
4. Check environment variables
5. Verify database migrations ran successfully

---

## 📚 Additional Resources

- [GDPR Compliance Guide](https://gdpr.eu/)
- [Supabase Documentation](https://supabase.com/docs)
- [Node-Cron Documentation](https://www.npmjs.com/package/node-cron)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/best-practices.html)

---

**Last Updated**: 2025-10-17
**Version**: 1.0.0
**Status**: ✅ Production Ready
