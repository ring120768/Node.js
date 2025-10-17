# Architecture Evaluation - FINAL
## Short-Term Data Collection Service (3-Month Retention)

**Your Role**: Temporary evidence collection and staging service
**Retention**: 3 months only
**User Responsibility**: Export data within 3 months for long-term storage

---

## 🎯 What This Changes - EVERYTHING

### Your Business Model (Now Clear)

**You Are**:
- ✅ Evidence collection tool (like SurveyMonkey/Typeform for incidents)
- ✅ Temporary staging area (3-month holding period)
- ✅ Data export service (users download for their own storage)

**You Are NOT**:
- ❌ Long-term evidence vault (users must export)
- ❌ Permanent storage provider (auto-delete after 3 months)
- ❌ Litigation support service (too short for legal timelines)

**Analogy**: Like **Google Forms** but with integrity features and export capability

---

## 📊 Legal Timeline Reality Check

| Event | Typical Timeline | Your Service Window |
|-------|------------------|---------------------|
| **User submits incident** | Day 1 | Day 1 ✅ |
| **Insurance claim filed** | Week 2-4 | Within 3 months ✅ |
| **Initial assessment** | Month 1-2 | Within 3 months ✅ |
| **User exports data** | **Must do by Month 3** | **DEADLINE** ⏰ |
| **Your auto-delete** | Month 3 | Data gone 🗑️ |
| **Insurance negotiation** | Month 3-12 | **User's exported copy** |
| **Litigation starts** | Month 6-24 | **User's exported copy** |
| **Court case** | Year 2-5 | **User's exported copy** |

**Critical Point**: Users **MUST** export within 3 months or lose access forever.

---

## ✅ What This SIMPLIFIES

### ❌ You DON'T Need (Removed Requirements)

#### 1. **Long-Term URL Strategy** ❌
**Before**: Worried about URLs working 2-5 years later
**Now**: URLs only need to work 3 months
- Signed URLs with 24-hour expiry → Regenerate on demand
- After 3 months → Deleted anyway
- **Saved**: 16 hours (no need for complex permanent API strategy)

#### 2. **Legal Hold Mechanism** ❌
**Before**: Support litigation preservation (multi-year)
**Now**: Not needed - users export before deletion
- No legal hold feature needed
- Users know: "Export by Month 3 or lose it"
- **Saved**: 8 hours

#### 3. **Document Versioning** ❌
**Before**: Track all versions over years
**Now**: 3-month window too short to matter
- If user re-submits, fine to overwrite (short window)
- **Saved**: 10 hours

#### 4. **Long-Term Backup Strategy** ❌ (Partial)
**Before**: Multi-year backup retention
**Now**: Rolling 3-month backup only
- Daily backup, 90-day retention
- After 90 days, backups also deleted
- **Saved**: Simpler infrastructure, lower storage costs

#### 5. **EXIF Metadata** ❌ (Deprioritized)
**Before**: Preserve metadata for years
**Now**: User downloads original files with EXIF intact
- Export preserves original files
- User can extract EXIF themselves
- **Saved**: 12 hours

**Total Saved**: ~46 hours of work you DON'T need to do!

---

## ✅ What You STILL Need (Simplified)

### 🔴 Critical (3-Month Service Integrity)

#### 1. **Checksums** (8 hours) 🔴
**Why**: Prove data integrity during collection → export
```
User submits → Your checksum → User exports → User verifies
"SHA-256 matches submission" = Proof of integrity
```
**Liability**: Prove you didn't corrupt data during your 3-month custody

#### 2. **Export Functionality** (16 hours) 🔴 **NEW PRIORITY**
**Why**: Users MUST be able to export everything before deletion
```
Export includes:
- All images (original quality)
- Incident report data (JSON/PDF)
- Checksums for verification
- Metadata (timestamps, GPS if captured)
- Export date/time
```
**Liability**: If users can't export, they lose evidence = lawsuit

#### 3. **Deletion Warnings** (4 hours) 🔴 **NEW REQUIREMENT**
**Why**: Users must know when data will be deleted
```
Day 60: Email warning "30 days until deletion"
Day 75: Email warning "15 days until deletion"
Day 85: Email warning "5 days until deletion"
Day 90: Auto-delete with confirmation email
```
**Liability**: If you delete without warning, users can claim surprise

#### 4. **Backup (90 days)** (8 hours) 🔴
**Why**: Protect against Supabase failure during 3-month window
```
Daily backup to secondary storage
90-day rolling retention
Auto-delete backups older than 90 days
```
**Liability**: Data loss during your custody period

**Total Critical**: **36 hours** (down from 90 hours!)

---

### 🟡 Important (Quality & Trust)

#### 5. **Access Audit Logs** (8 hours) 🟡
**Why**: Prove who accessed during 3-month window
- Still valuable for security
- But less critical (shorter window)

#### 6. **Data Export Audit** (4 hours) 🟡
**Why**: Prove user successfully exported
```sql
CREATE TABLE export_log (
  user_id TEXT,
  incident_id UUID,
  exported_at TIMESTAMP,
  export_format TEXT,  -- 'pdf', 'zip', 'json'
  file_size BIGINT,
  checksum TEXT,
  download_ip TEXT
);
```
**Value**: Prove "user exported on Day 45" if they claim data loss

---

## 📋 Updated Terms of Service

### Your Responsibilities (3-Month Window)

```
Data Collection & Preservation Service - 3 Month Retention

We provide:
✓ Secure data collection and storage
✓ Data integrity verification (SHA-256 checksums)
✓ Export functionality (download all data)
✓ 90-day retention period from submission date
✓ Deletion warnings at 60, 75, and 85 days
✓ 99.9% uptime during retention period

IMPORTANT NOTICE:
• Data automatically deleted after 90 days
• YOU MUST EXPORT your data before deletion
• We send multiple reminders but deletion is automatic
• After deletion, data cannot be recovered
• Export early - don't wait until the last minute
```

### User Responsibilities

```
You are responsible for:
✓ Exporting data before 90-day deadline
✓ Storing exported data securely (long-term)
✓ Verifying checksums after export
✓ Using exported data in legal/insurance matters
✓ Maintaining your own backups after export

We are NOT:
✗ A long-term storage provider
✗ A legal services provider
✗ Responsible for data after 90 days
✗ Responsible if you forget to export
```

---

## 🔄 User Workflow (Now Clear)

```
┌─────────────────────────────────────────────────┐
│ Day 1: User submits incident via mobile app    │
│   → Photos uploaded with checksums              │
│   → Stored in your system                       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Day 1-7: User completes incident details       │
│   → Fills out Typeform questions                │
│   → Reviews submission                           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Day 7-30: User files insurance claim           │
│   → Downloads PDF report from your system       │
│   → Submits to insurance company                │
│   → Can still access via your platform          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Day 60: Automated deletion warning #1          │
│   "30 days until automatic deletion"            │
│   [EXPORT NOW] button prominent                 │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Day 30-85: User exports complete package       │
│   → ZIP file with all images                    │
│   → JSON data file                              │
│   → PDF report                                  │
│   → Checksums.txt for verification             │
│   → Stored on user's computer/cloud            │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Day 90: Automatic deletion (GDPR compliant)    │
│   → All data deleted from your system           │
│   → User receives confirmation email            │
│   → User relies on exported copy                │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Month 6-24: Insurance claim progresses         │
│   → User uses exported data                     │
│   → NOT your system (already deleted)           │
└─────────────────────────────────────────────────┘
```

---

## 🚨 Critical Implementation Requirements

### 1. **Export Package Format** 🔴

Users need a complete, portable package:

```
incident_report_2025-10-17_abc123.zip
├── README.txt                    (Instructions, checksums)
├── incident_report.pdf           (Professional formatted report)
├── incident_report.json          (Machine-readable data)
├── checksums.txt                 (SHA-256 for all files)
├── images/
│   ├── scene_overview_1.jpg      (Original quality)
│   ├── scene_overview_2.jpg
│   ├── vehicle_damage_1.jpg
│   ├── vehicle_damage_2.jpg
│   └── what3words_location.jpg
└── metadata/
    ├── export_info.json          (Export date, version, user)
    ├── image_metadata.json       (EXIF data if captured)
    └── submission_receipt.json   (Original submission details)
```

**README.txt Example**:
```
INCIDENT REPORT EXPORT
Generated: 2025-10-17 14:30:00 UTC
Incident ID: abc123
User ID: user_xyz

This package contains your complete incident report data exported
from [Your Service]. This is YOUR permanent copy.

IMPORTANT:
- Store this ZIP file securely
- Make multiple backups
- Verify checksums (see checksums.txt)
- Original data deleted from our system on: 2026-01-15

FILE VERIFICATION:
To verify file integrity, run:
  sha256sum -c checksums.txt

CHECKSUMS:
scene_overview_1.jpg: a1b2c3d4e5f6...
vehicle_damage_1.jpg: f6e5d4c3b2a1...
incident_report.pdf: 1234567890ab...

For support: support@yourservice.com
```

**Implementation** (16 hours):
```javascript
// API endpoint: GET /api/incidents/:id/export
app.get('/api/incidents/:id/export', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // 1. Verify ownership
  const incident = await db.query(
    'SELECT * FROM incident_reports WHERE id = $1 AND create_user_id = $2',
    [id, userId]
  );

  if (!incident.rows.length) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  // 2. Get all related documents
  const documents = await db.query(`
    SELECT * FROM user_documents
    WHERE create_user_id = $1
    AND created_at >= (SELECT created_at FROM incident_reports WHERE id = $2)
    ORDER BY created_at
  `, [userId, id]);

  // 3. Create ZIP archive
  const archiver = require('archiver');
  const archive = archiver('zip', { zlib: { level: 9 } });

  res.attachment(`incident_report_${id}.zip`);
  archive.pipe(res);

  // 4. Add incident report PDF
  const pdf = await generatePDFReport(incident.rows[0]);
  archive.append(pdf, { name: 'incident_report.pdf' });

  // 5. Add incident report JSON
  archive.append(JSON.stringify(incident.rows[0], null, 2), {
    name: 'incident_report.json'
  });

  // 6. Add images with checksums
  const checksums = [];
  for (const doc of documents.rows) {
    const imageBuffer = await downloadFromStorage(doc.storage_path);

    archive.append(imageBuffer, {
      name: `images/${doc.document_type}_${doc.id}.${doc.file_extension}`
    });

    checksums.push(
      `${doc.original_checksum_sha256}  images/${doc.document_type}_${doc.id}.${doc.file_extension}`
    );
  }

  // 7. Add checksums.txt
  archive.append(checksums.join('\n'), { name: 'checksums.txt' });

  // 8. Add README.txt
  const readme = generateReadme(incident.rows[0], documents.rows);
  archive.append(readme, { name: 'README.txt' });

  // 9. Add export metadata
  const exportMeta = {
    exported_at: new Date().toISOString(),
    exported_by: userId,
    incident_id: id,
    export_version: '1.0',
    file_count: documents.rows.length,
    retention_deadline: incident.rows[0].retention_until
  };
  archive.append(JSON.stringify(exportMeta, null, 2), {
    name: 'metadata/export_info.json'
  });

  // 10. Log export event
  await db.query(`
    INSERT INTO export_log
    (user_id, incident_id, exported_at, export_format, download_ip)
    VALUES ($1, $2, NOW(), 'zip', $3)
  `, [userId, id, req.ip]);

  // 11. Finalize archive
  await archive.finalize();
});
```

---

### 2. **Deletion Warning System** 🔴

**Implementation** (4 hours):

```javascript
// scripts/send-deletion-warnings.js (run daily via cron)

async function sendDeletionWarnings() {
  // Find incidents expiring in 30, 15, and 5 days
  const warnings = [
    { days: 30, template: 'deletion_warning_30d' },
    { days: 15, template: 'deletion_warning_15d' },
    { days: 5, template: 'deletion_warning_5d' },
    { days: 1, template: 'deletion_warning_24h' }
  ];

  for (const warning of warnings) {
    const expiringIncidents = await db.query(`
      SELECT
        ir.id,
        ir.create_user_id,
        ir.retention_until,
        us.email,
        us.name
      FROM incident_reports ir
      JOIN user_signup us ON ir.create_user_id = us.create_user_id
      WHERE ir.retention_until BETWEEN NOW() AND NOW() + INTERVAL '${warning.days} days'
      AND ir.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM export_log
        WHERE incident_id = ir.id
        AND exported_at > NOW() - INTERVAL '7 days'
      )
    `);

    for (const incident of expiringIncidents.rows) {
      // Send email
      await sendEmail({
        to: incident.email,
        template: warning.template,
        data: {
          name: incident.name,
          incident_id: incident.id,
          deletion_date: incident.retention_until,
          days_remaining: warning.days,
          export_url: `https://yourapp.com/incidents/${incident.id}/export`
        }
      });

      // Log warning sent
      await db.query(`
        INSERT INTO deletion_warnings_sent
        (incident_id, warning_type, sent_at)
        VALUES ($1, $2, NOW())
      `, [incident.id, `${warning.days}d`]);
    }
  }
}
```

**Email Template** (`deletion_warning_30d.html`):
```html
Hi {{name}},

⚠️ IMPORTANT: Your incident report will be automatically deleted in 30 DAYS

Incident ID: {{incident_id}}
Deletion Date: {{deletion_date}}

ACTION REQUIRED:
To preserve your evidence, you must export your data before deletion.

[EXPORT DATA NOW - Large Button]

What happens when you export?
✓ Complete ZIP package with all photos and data
✓ Verified checksums for authenticity
✓ Professional PDF report included
✓ Yours to keep forever

What happens if you don't export?
✗ All data permanently deleted on {{deletion_date}}
✗ Photos cannot be recovered
✗ Report cannot be regenerated
✗ You will lose all evidence

Don't wait until the last minute - export today!

[EXPORT DATA NOW]

Questions? support@yourservice.com

This is an automated reminder. We'll send follow-ups at 15, 5, and 1 days.
```

---

### 3. **Automated Deletion Job** 🔴

**Implementation** (4 hours):

```javascript
// scripts/auto-delete-expired.js (run daily via cron)

async function deleteExpiredData() {
  console.log('Starting automated deletion job...');

  // 1. Find expired incidents
  const expired = await db.query(`
    SELECT id, create_user_id, retention_until
    FROM incident_reports
    WHERE retention_until < NOW()
    AND deleted_at IS NULL
  `);

  console.log(`Found ${expired.rows.length} expired incidents`);

  for (const incident of expired.rows) {
    // 2. Check if user exported (warning if not)
    const exported = await db.query(`
      SELECT COUNT(*) as count
      FROM export_log
      WHERE incident_id = $1
    `, [incident.id]);

    const userExported = exported.rows[0].count > 0;

    // 3. Get associated documents
    const documents = await db.query(`
      SELECT id, storage_path
      FROM user_documents
      WHERE create_user_id = $1
      AND created_at >= (
        SELECT created_at FROM incident_reports WHERE id = $2
      )
    `, [incident.create_user_id, incident.id]);

    // 4. Delete from Supabase Storage
    for (const doc of documents.rows) {
      await deleteFromStorage(doc.storage_path);
    }

    // 5. Soft delete documents
    await db.query(`
      UPDATE user_documents
      SET deleted_at = NOW()
      WHERE id = ANY($1)
    `, [documents.rows.map(d => d.id)]);

    // 6. Soft delete incident
    await db.query(`
      UPDATE incident_reports
      SET deleted_at = NOW()
      WHERE id = $1
    `, [incident.id]);

    // 7. Log deletion
    await db.query(`
      INSERT INTO gdpr_audit_log
      (event_type, incident_id, action, reason, metadata)
      VALUES ('auto_deletion', $1, 'delete', 'retention_period_expired', $2)
    `, [incident.id, JSON.stringify({ user_exported: userExported })]);

    // 8. Send confirmation email
    const user = await getUserEmail(incident.create_user_id);
    await sendEmail({
      to: user.email,
      template: 'data_deleted_confirmation',
      data: {
        incident_id: incident.id,
        deletion_date: new Date().toISOString(),
        user_exported: userExported
      }
    });

    console.log(`Deleted incident ${incident.id} (exported: ${userExported})`);
  }

  console.log(`Deletion job complete: ${expired.rows.length} incidents deleted`);
}
```

---

### 4. **Backup Strategy (Simplified)** 🔴

**Rolling 90-Day Backup** (8 hours):

```javascript
// scripts/backup-to-s3.js (run daily)

async function backupToS3() {
  // 1. Get all documents from last 90 days
  const documents = await db.query(`
    SELECT *
    FROM user_documents
    WHERE created_at > NOW() - INTERVAL '90 days'
    AND deleted_at IS NULL
    AND status = 'completed'
  `);

  for (const doc of documents.rows) {
    // 2. Download from Supabase
    const buffer = await downloadFromSupabase(doc.storage_path);

    // 3. Verify checksum
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    if (checksum !== doc.original_checksum_sha256) {
      logger.error(`Checksum mismatch: ${doc.id}`);
      continue;
    }

    // 4. Upload to S3 with 90-day lifecycle policy
    await s3.putObject({
      Bucket: 'incident-backups',
      Key: `${doc.id}/${doc.storage_path}`,
      Body: buffer,
      Metadata: {
        checksum: checksum,
        original_created_at: doc.created_at,
        retention_until: doc.retention_until
      },
      // S3 Lifecycle: Auto-delete after 90 days
      Tagging: 'retention=90days'
    });
  }

  // 5. Delete S3 objects older than 90 days (if lifecycle not configured)
  const oldObjects = await s3.listObjects({
    Bucket: 'incident-backups',
    Prefix: '',
    // Filter by date
  });

  for (const obj of oldObjects) {
    if (isOlderThan90Days(obj.LastModified)) {
      await s3.deleteObject({
        Bucket: 'incident-backups',
        Key: obj.Key
      });
    }
  }
}
```

---

## 📊 Updated Requirements Summary

### Must Implement (36 hours)

| Feature | Hours | Priority | Why |
|---------|-------|----------|-----|
| **Checksums** | 8 | 🔴 Critical | Prove integrity during custody |
| **Export Package** | 16 | 🔴 Critical | Users MUST export before deletion |
| **Deletion Warnings** | 4 | 🔴 Critical | Legal protection (prove warning) |
| **Auto-Delete Job** | 4 | 🔴 Critical | GDPR compliance |
| **90-Day Backup** | 8 | 🔴 Critical | Protect against storage failure |

**Total**: 40 hours (~$4,000 investment)

### Should Implement (12 hours)

| Feature | Hours | Priority | Why |
|---------|-------|----------|-----|
| **Access Audit Logs** | 8 | 🟡 Important | Prove security |
| **Export Audit Logs** | 4 | 🟡 Important | Prove user exported |

**Total**: 12 hours (~$1,200 investment)

### Don't Need (Removed)

| Feature | Hours Saved | Reason |
|---------|-------------|--------|
| Long-term URL strategy | 16 | 3-month window, not needed |
| Legal hold mechanism | 8 | Users export before deletion |
| Document versioning | 10 | 3-month window too short |
| EXIF extraction | 12 | User downloads originals |
| Junction tables | 8 | Cleaner code, not critical |

**Total Saved**: 54 hours (~$5,400 saved)

---

## 💰 Cost-Benefit (Final)

### Implementation Cost
- **Must Have**: 40 hours = $4,000
- **Should Have**: 12 hours = $1,200
- **Total**: 52 hours = $5,200

### Ongoing Costs
- **Backup storage (S3)**: ~$50/month (90-day rolling)
- **Email (deletion warnings)**: ~$10/month
- **Maintenance**: ~2 hours/month = $200/month
- **Total**: ~$260/month

### Risk Mitigation
- **Data loss lawsuit**: $50K-500K (if you lose data during custody)
- **GDPR fine**: Up to €20M (if over-retention or no deletion)
- **"Surprise deletion" lawsuit**: $10K-50K (if no warnings)
- **Reputation damage**: Loss of trust, user churn

### ROI
- **Implementation**: $5,200
- **Risk Avoided**: $500,000+
- **ROI**: 9,615% (prevent 1 major lawsuit)

---

## ✅ Final Recommendations

### Week 1: Core Features (24 hours)
1. ✅ Checksums on upload (8 hours)
2. ✅ Export package functionality (16 hours)

### Week 2: Deletion System (16 hours)
3. ✅ Deletion warning emails (4 hours)
4. ✅ Automated deletion job (4 hours)
5. ✅ 90-day backup to S3 (8 hours)

### Week 3: Audit & Polish (12 hours)
6. ✅ Access audit logs (8 hours)
7. ✅ Export audit logs (4 hours)

**Total**: 52 hours = 2.5 weeks for 2 devs OR 5 weeks for 1 dev

---

## 🚨 Critical User Communication

### On Signup / First Incident
```
⚠️ IMPORTANT: 90-Day Data Retention

Your incident data is stored for 90 DAYS from submission.
After 90 days, all data is PERMANENTLY DELETED.

YOU MUST EXPORT your data before this deadline.

We'll send reminders at 30, 15, 5, and 1 days before deletion,
but it's YOUR RESPONSIBILITY to export in time.

[I Understand - Checkbox Required]
```

### In Dashboard (Always Visible)
```
┌────────────────────────────────────────┐
│ ⏰ RETENTION STATUS                    │
│                                        │
│ Your incident expires in: 45 DAYS      │
│ Deletion date: 2026-01-15              │
│                                        │
│ ⚠️ Don't lose your evidence!           │
│ [EXPORT NOW]                           │
└────────────────────────────────────────┘
```

### Email Reminders (4 Total)
- Day 60: "30 days until deletion"
- Day 75: "15 days until deletion"
- Day 85: "5 days until deletion"
- Day 89: "24 hours until deletion - FINAL WARNING"

---

## 📄 Updated Terms of Service

```
DATA RETENTION AND DELETION POLICY

1. RETENTION PERIOD
   We retain your incident data for 90 DAYS from the date of submission.

2. AUTOMATIC DELETION
   After 90 days, ALL data is PERMANENTLY and AUTOMATICALLY deleted,
   including:
   - All photos and images
   - Incident report data
   - Backups
   - All associated records

3. YOUR RESPONSIBILITY TO EXPORT
   YOU MUST export your data before the 90-day deadline.
   We provide export functionality and send multiple reminders,
   but deletion is automatic and CANNOT BE REVERSED.

4. NO RECOVERY AFTER DELETION
   Once deleted, data CANNOT be recovered under ANY circumstances.
   We do not maintain archives or backups beyond 90 days.

5. EXPORT TIMING
   We recommend exporting within the first 30 days, not waiting
   until the deadline.

6. REMINDERS
   We send email reminders at 60, 75, 85, and 89 days, but you
   are responsible for exporting regardless of whether you receive
   these emails.

By using this service, you acknowledge and accept this 90-day
retention policy and your responsibility to export data in time.
```

---

## 🎯 Your Simplified Value Proposition

**Before (Confusing)**:
> "High-integrity legal-grade incident reports"

**After (Crystal Clear)**:
> "Fast, secure incident data collection. Collect evidence in minutes, export within 90 days. We're your collection tool, not your storage solution."

### Key Messaging

```
✓ Collect evidence at the scene (GPS, photos, details)
✓ Generate professional PDF reports instantly
✓ Access your data for 90 days
✓ Export complete package anytime
✓ Auto-delete after 90 days (GDPR compliant)
✓ Verified checksums prove data integrity

Remember: EXPORT within 90 days - we don't provide long-term storage!
```

---

## ❓ Questions to Clarify

1. **Current Deletion**: Do you currently auto-delete after 3 months, or is this planned?

2. **Export Feature**: Do you currently have an export feature, or does this need to be built?

3. **User Awareness**: Do current users know about the 3-month limit?

4. **Insurance Partners**: Do insurance companies understand they need to get data within 3 months?

5. **Pricing Model**: Do you charge for storage, or is it included? (If free, 3-month limit makes sense)

---

## 🚀 Immediate Action Plan

### This Week (8 hours)
1. ✅ Add checksums to all new uploads
2. ✅ Create clear user communication about 90-day limit
3. ✅ Update Terms of Service

### Next Week (24 hours)
4. ✅ Build export package functionality
5. ✅ Set up deletion warning emails
6. ✅ Create auto-deletion job

### Week 3 (20 hours)
7. ✅ Implement 90-day backup to S3
8. ✅ Add access/export audit logs
9. ✅ Test complete workflow

**Total Time**: 52 hours over 3 weeks

**Result**: Legally compliant, user-safe, liability-minimized service

---

**The 3-month retention changes EVERYTHING and makes this much simpler!**

Ready to implement whenever you give the go-ahead. This is now very achievable and focused.
