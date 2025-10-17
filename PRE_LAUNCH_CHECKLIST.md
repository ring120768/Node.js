# Pre-Launch Implementation Checklist
## Dual Retention Data Collection Service

**Status**: Pre-launch (Not live yet)
**Timeline**: Implement before public launch
**Current State**: Clean slate - design from scratch

**Retention Model**:
- **User Account Data** (user_signup): 12-month retention (subscription-based)
- **Incident Reports** (incident_reports): 90-day retention (temporary staging)

---

## 🎯 Implementation Strategy

### Option A: Launch-Critical (Before Public Launch)
**Timeline**: 2-3 weeks before launch
**Must have these to operate safely**

### Option B: Post-Launch Enhancement
**Timeline**: Within 3 months of launch
**Nice to have but not blocking**

---

## 🔴 MUST IMPLEMENT BEFORE LAUNCH

### 1. **Checksums** (8 hours) 🔴
**Why blocking**: Core integrity promise, no way to add retroactively

```sql
ALTER TABLE user_documents
ADD COLUMN original_checksum_sha256 TEXT NOT NULL,
ADD COLUMN current_checksum_sha256 TEXT NOT NULL,
ADD COLUMN checksum_algorithm TEXT DEFAULT 'sha256',
ADD COLUMN checksum_verified_at TIMESTAMP;
```

**Code changes**:
- Calculate SHA-256 during image upload
- Store in database
- Display in UI (so users can verify after export)

**Priority**: **CRITICAL** - Do this first (can't add checksums to old uploads)

---

### 2. **Export Package Functionality** (16 hours) 🔴
**Why blocking**: Core service promise - users MUST be able to export

**Features**:
- Export button in incident detail page
- Generate ZIP with:
  - All images (original quality)
  - PDF report
  - JSON data
  - checksums.txt
  - README.txt
- Download tracking (export_log table)

**API Endpoint**:
```javascript
GET /api/incidents/:id/export
→ Returns ZIP file with complete package
```

**Priority**: **CRITICAL** - Core feature, not optional

---

### 3. **Retention & Subscription Fields in Database** (4 hours) 🔴
**Why blocking**: Need to track deletion dates from day 1 for BOTH data types

#### A. Incident Reports (90-day retention)
```sql
-- Already exists in incident_reports, but ensure populated
ALTER TABLE incident_reports
ALTER COLUMN retention_until SET DEFAULT (NOW() + INTERVAL '90 days');

-- Trigger to set retention on insert
CREATE OR REPLACE FUNCTION set_incident_retention_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.retention_until IS NULL THEN
    NEW.retention_until := NOW() + INTERVAL '90 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_incident_retention_trigger
BEFORE INSERT ON incident_reports
FOR EACH ROW EXECUTE FUNCTION set_incident_retention_date();
```

#### B. User Signup (12-month subscription-based retention)
```sql
-- Add subscription tracking to user_signup
ALTER TABLE user_signup
ADD COLUMN subscription_start_date TIMESTAMP DEFAULT NOW(),
ADD COLUMN subscription_end_date TIMESTAMP DEFAULT (NOW() + INTERVAL '12 months'),
ADD COLUMN subscription_status TEXT DEFAULT 'active',
ADD COLUMN auto_renewal BOOLEAN DEFAULT true,
ADD COLUMN retention_until TIMESTAMP;

-- Trigger to set subscription dates on insert
CREATE OR REPLACE FUNCTION set_subscription_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_start_date IS NULL THEN
    NEW.subscription_start_date := NOW();
  END IF;
  IF NEW.subscription_end_date IS NULL THEN
    NEW.subscription_end_date := NEW.subscription_start_date + INTERVAL '12 months';
  END IF;
  IF NEW.retention_until IS NULL THEN
    NEW.retention_until := NEW.subscription_end_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_subscription_trigger
BEFORE INSERT ON user_signup
FOR EACH ROW EXECUTE FUNCTION set_subscription_dates();
```

#### C. User Documents Association Tracking
```sql
-- Track which documents belong to incidents vs user account
ALTER TABLE user_documents
ADD COLUMN associated_with TEXT CHECK (associated_with IN ('incident_report', 'user_signup')),
ADD COLUMN associated_id UUID;

-- Index for faster lookups
CREATE INDEX idx_user_documents_association ON user_documents(associated_with, associated_id);

-- Trigger to set retention based on association
CREATE OR REPLACE FUNCTION set_document_retention()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.associated_with = 'incident_report' THEN
    NEW.retention_until := NOW() + INTERVAL '90 days';
  ELSIF NEW.associated_with = 'user_signup' THEN
    NEW.retention_until := NOW() + INTERVAL '12 months';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_document_retention_trigger
BEFORE INSERT ON user_documents
FOR EACH ROW EXECUTE FUNCTION set_document_retention();
```

**Priority**: **CRITICAL** - Need from day 1

---

### 4. **User Communication: Dual Retention Policy** (5 hours) 🔴
**Why blocking**: Legal requirement - users must be informed upfront

**Implementation**:

#### A. Account Signup (12-month subscription)
1. **During signup**: Clear subscription terms
   ```
   ✅ ACCOUNT DATA: 12-Month Retention

   Your account data (profile, vehicle info, documents) is stored
   for 12 MONTHS as part of your subscription.

   Subscription auto-renews unless cancelled.

   You can export your account data anytime.

   ☑️ I agree to the subscription terms [Required checkbox]
   ```

2. **Dashboard - Account Status**:
   ```
   ┌────────────────────────────────────┐
   │ 📋 Your Subscription                │
   │ Status: Active                     │
   │ Renewal date: 2026-10-17           │
   │ [MANAGE SUBSCRIPTION]              │
   └────────────────────────────────────┘
   ```

#### B. First Incident Submission (90-day temporary)
1. **First incident submission**: Mandatory acceptance
   ```
   ⚠️ IMPORTANT: 90-Day Incident Data Retention

   Your INCIDENT data is stored TEMPORARILY for 90 days only.

   Your ACCOUNT remains active during your subscription, but
   THIS INCIDENT will be automatically deleted after 90 days.

   You MUST export this incident before the deadline to keep it.

   We'll send email reminders, but it's your responsibility.

   ☑️ I understand and accept [Required checkbox]
   ```

2. **Dashboard - Incident Status**: Always visible countdown
   ```
   ┌────────────────────────────────────┐
   │ ⏰ Incident expires in: 45 DAYS    │
   │ Deletion date: 2026-01-15          │
   │ [EXPORT NOW]                       │
   └────────────────────────────────────┘
   ```

#### C. Terms of Service Updates
- **Section 1**: Account subscription terms (12 months)
- **Section 2**: Incident data retention (90 days)
- **Section 3**: User responsibility for exporting incidents
- **Section 4**: Data deletion policies

**Priority**: **CRITICAL** - Legal protection

---

### 5. **Differential Backup Strategy** (10 hours) 🔴
**Why blocking**: Protect against Supabase failure from day 1

**Minimum Implementation**:
- Daily backup to AWS S3 / Azure Blob
- **Differential retention**:
  - User account backups: 12-month rolling retention
  - Incident report backups: 90-day rolling retention
- Verify checksums during backup
- Separate S3 buckets/paths for clarity

**Backup Structure**:
```
s3://your-bucket/
  ├── user_accounts/
  │   ├── 2025-10-17/
  │   │   ├── user_signup.sql
  │   │   ├── user_documents_signup.sql
  │   │   └── documents/
  │   └── ... (12 months of backups)
  │
  └── incidents/
      ├── 2025-10-17/
      │   ├── incident_reports.sql
      │   ├── user_documents_incidents.sql
      │   └── documents/
      └── ... (90 days of backups)
```

**Scripts**:
- `scripts/backup-accounts-to-s3.js` (daily cron)
- `scripts/backup-incidents-to-s3.js` (daily cron)
- `scripts/cleanup-old-backups.js` (daily cron)

**Priority**: **CRITICAL** - Business continuity from day 1

---

### 6. **Export Log Table** (2 hours) 🔴
**Why blocking**: Track exports for liability protection

```sql
CREATE TABLE export_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  incident_id UUID NOT NULL REFERENCES incident_reports(id),
  exported_at TIMESTAMP DEFAULT NOW(),
  export_format TEXT DEFAULT 'zip',
  file_size BIGINT,
  checksum TEXT,
  download_ip INET,
  user_agent TEXT
);

CREATE INDEX idx_export_log_incident ON export_log(incident_id);
CREATE INDEX idx_export_log_user ON export_log(user_id, exported_at);
```

**Why important**: Prove "user exported on Day 45" if they claim data loss

**Priority**: **CRITICAL** - Legal protection

---

**Total Must-Haves**: **45 hours** (~2 weeks for 2 devs, 3 weeks for 1 dev)

**Updated from original**: +5 hours to handle dual retention model (subscription tracking + differential backup)

---

## 🟡 SHOULD IMPLEMENT BEFORE LAUNCH

### 7. **Deletion Warning Emails** (8 hours) 🟡
**Why important**: Good practice, legal protection

**Timing**: Can launch without this IF you:
- Have clear UI warnings about 90-day deadline
- Have manual process to remind users

**Implementation**:

#### A. Incident Deletion Warnings (90-day countdown)
```javascript
// scripts/send-incident-deletion-warnings.js

// Email at 60, 75, 85, 89 days
const WARNING_DAYS = [60, 75, 85, 89];

async function sendIncidentWarnings() {
  for (const daysRemaining of WARNING_DAYS) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysRemaining);

    // Find incidents expiring on target date
    const { data: incidents } = await supabase
      .from('incident_reports')
      .select('id, create_user_id, retention_until')
      .gte('retention_until', targetDate.toISOString())
      .lt('retention_until', new Date(targetDate.getTime() + 86400000).toISOString())
      .is('deleted_at', null);

    for (const incident of incidents) {
      await sendEmail({
        to: getUserEmail(incident.create_user_id),
        template: `incident-deletion-warning-${daysRemaining}days`,
        data: {
          daysRemaining,
          incidentId: incident.id,
          deletionDate: incident.retention_until,
          exportUrl: `${BASE_URL}/incidents/${incident.id}/export`
        }
      });
    }
  }
}
```

**Email Templates**:
1. **60 days remaining**: "Your incident report expires in 60 days"
2. **75 days remaining**: "Your incident report expires in 75 days - Export now"
3. **85 days remaining**: "URGENT: Only 5 days left to export your incident"
4. **89 days remaining**: "FINAL WARNING: Export your incident TODAY"

#### B. Subscription Expiry Warnings (12-month countdown)
```javascript
// scripts/send-subscription-warnings.js

// Email at 30, 14, 7, 1 days before expiry (if auto-renewal disabled)
const WARNING_DAYS = [30, 14, 7, 1];

async function sendSubscriptionWarnings() {
  for (const daysRemaining of WARNING_DAYS) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysRemaining);

    // Find subscriptions expiring on target date WITHOUT auto-renewal
    const { data: accounts } = await supabase
      .from('user_signup')
      .select('id, email, subscription_end_date, auto_renewal')
      .eq('auto_renewal', false)
      .eq('subscription_status', 'active')
      .gte('subscription_end_date', targetDate.toISOString())
      .lt('subscription_end_date', new Date(targetDate.getTime() + 86400000).toISOString())
      .is('deleted_at', null);

    for (const account of accounts) {
      await sendEmail({
        to: account.email,
        template: `subscription-expiry-warning-${daysRemaining}days`,
        data: {
          daysRemaining,
          expiryDate: account.subscription_end_date,
          renewUrl: `${BASE_URL}/account/subscription/renew`,
          exportUrl: `${BASE_URL}/account/export`
        }
      });
    }
  }
}
```

**Email Templates**:
1. **30 days remaining**: "Your subscription expires in 30 days"
2. **14 days remaining**: "Your subscription expires in 2 weeks"
3. **7 days remaining**: "Your subscription expires in 7 days - Renew now"
4. **1 day remaining**: "FINAL NOTICE: Your subscription expires tomorrow"

**Cron Schedule**: Daily at 8 AM

**Priority**: **HIGH** - But can launch without if users are clearly warned in-app

---

### 8. **Differential Auto-Delete Job** (6 hours) 🟡
**Why important**: GDPR compliance, cost savings, proper retention enforcement

**Timing**: Can launch without this IF:
- You manually delete during beta
- Beta period < 90 days

**Implementation**:

#### A. Incident Deletion (90 days)
```javascript
// scripts/auto-delete-expired-incidents.js
const { createClient } = require('@supabase/supabase-js');

async function deleteExpiredIncidents() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Find expired incidents
  const { data: expiredIncidents } = await supabase
    .from('incident_reports')
    .select('id, create_user_id, retention_until')
    .lt('retention_until', new Date().toISOString())
    .is('deleted_at', null);

  for (const incident of expiredIncidents) {
    // 1. Delete incident documents from storage
    const { data: documents } = await supabase
      .from('user_documents')
      .select('storage_path')
      .eq('associated_with', 'incident_report')
      .eq('associated_id', incident.id);

    for (const doc of documents) {
      await supabase.storage.from('incident-images').remove([doc.storage_path]);
    }

    // 2. Soft delete documents
    await supabase
      .from('user_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('associated_with', 'incident_report')
      .eq('associated_id', incident.id);

    // 3. Soft delete incident
    await supabase
      .from('incident_reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', incident.id);

    // 4. Send confirmation email
    await sendDeletionConfirmationEmail(incident.create_user_id, 'incident', incident.id);
  }
}
```

#### B. Account Deletion (12 months, subscription-based)
```javascript
// scripts/auto-delete-expired-accounts.js
async function deleteExpiredAccounts() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Find expired subscriptions (no auto-renewal + past end date)
  const { data: expiredAccounts } = await supabase
    .from('user_signup')
    .select('id, create_user_id, subscription_end_date, email')
    .eq('auto_renewal', false)
    .lt('subscription_end_date', new Date().toISOString())
    .is('deleted_at', null);

  for (const account of expiredAccounts) {
    // 1. Delete account documents from storage
    const { data: documents } = await supabase
      .from('user_documents')
      .select('storage_path')
      .eq('associated_with', 'user_signup')
      .eq('associated_id', account.id);

    for (const doc of documents) {
      await supabase.storage.from('user-documents').remove([doc.storage_path]);
    }

    // 2. Soft delete documents
    await supabase
      .from('user_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('associated_with', 'user_signup')
      .eq('associated_id', account.id);

    // 3. Soft delete account
    await supabase
      .from('user_signup')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', account.id);

    // 4. Send confirmation email
    await sendAccountDeletionEmail(account.email);
  }
}
```

#### C. Subscription Renewal Handler
```javascript
// scripts/process-subscription-renewals.js
async function processSubscriptionRenewals() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Find subscriptions expiring today with auto-renewal
  const { data: renewals } = await supabase
    .from('user_signup')
    .select('id, create_user_id, email, subscription_end_date')
    .eq('auto_renewal', true)
    .eq('subscription_status', 'active')
    .lte('subscription_end_date', new Date().toISOString());

  for (const account of renewals) {
    // Update subscription dates (12 months from now)
    const newEndDate = new Date();
    newEndDate.setMonth(newEndDate.getMonth() + 12);

    await supabase
      .from('user_signup')
      .update({
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: newEndDate.toISOString(),
        retention_until: newEndDate.toISOString()
      })
      .eq('id', account.id);

    // Update document retention dates
    await supabase
      .from('user_documents')
      .update({ retention_until: newEndDate.toISOString() })
      .eq('associated_with', 'user_signup')
      .eq('associated_id', account.id);

    // Send renewal confirmation
    await sendRenewalConfirmationEmail(account.email, newEndDate);
  }
}
```

**Cron Schedule**:
- Incident deletion: Daily at 2 AM
- Account deletion: Daily at 3 AM
- Subscription renewal: Daily at 1 AM

**Priority**: **HIGH** - Must have before 90 days after first incident

---

### 9. **Access Audit Logs** (8 hours) 🟡
**Why important**: Security proof, helpful for debugging

**Timing**: Can launch without this, add later

**Implementation**:
```sql
CREATE TABLE document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES user_documents(id),
  accessed_by TEXT NOT NULL,
  access_type TEXT NOT NULL,
  accessed_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);
```

**Priority**: **MEDIUM** - Add within first month

---

**Total Should-Haves**: **22 hours** (~1 week for 1 dev)

**Updated from original**: +4 hours to handle subscription warnings and renewal logic

---

## 🟢 CAN ADD AFTER LAUNCH

### 10. **EXIF Metadata Extraction** (12 hours) 🟢
**Why nice**: Strengthens evidence, competitive advantage

**Timing**: Add when you have bandwidth

**Value**: Users get original images with EXIF anyway (via export)

**Priority**: **LOW** - Enhancement feature

---

### 11. **Legal Hold Support** (8 hours) 🟢
**Why nice**: Premium feature for serious cases

**Timing**: Add when requested by users/partners

**Priority**: **LOW** - On-demand feature

---

### 12. **Version Control** (10 hours) 🟢
**Why nice**: Never lose originals if user re-submits

**Timing**: Add if users frequently re-submit photos

**Priority**: **LOW** - Based on usage patterns

---

---

## 📅 Recommended Implementation Timeline

### Pre-Launch Phase (2-3 weeks before launch)

#### Week 1: Core Integrity
- Day 1-2: Add checksums (8 hours)
- Day 3: Add retention field & trigger (2 hours)
- Day 4-5: Create export package functionality (16 hours)
- Day 5: Add export log table (2 hours)

**Checkpoint**: Basic integrity features working

#### Week 2: Safety & Communication
- Day 1-2: User communication (UI + ToS) (4 hours)
- Day 3: Basic backup to S3 (8 hours)
- Day 4: Deletion warning emails (6 hours)
- Day 5: Auto-delete job (4 hours)

**Checkpoint**: All critical features working

#### Week 3: Testing & Polish
- Test complete workflow (submission → export → deletion)
- Test deletion warnings
- Test backup/restore
- Load testing
- Documentation

**Launch Ready**: All critical features tested

---

### Post-Launch (First 3 Months)

#### Month 1
- Access audit logs (8 hours)
- Monitor user behavior
- Collect feedback on export experience

#### Month 2-3
- EXIF extraction (if requested)
- Legal hold (if requested)
- Version control (if needed)

---

## 🎯 Minimum Viable Launch (45 hours)

**You can safely launch with these 6 features**:

1. ✅ Checksums (8 hours)
2. ✅ Export package (16 hours)
3. ✅ Retention & Subscription tracking (4 hours) - **Updated for dual retention**
4. ✅ User communication (5 hours) - **Updated for dual retention**
5. ✅ Differential backup (10 hours) - **Updated for dual retention**
6. ✅ Export logging (2 hours)

**Total**: 45 hours = $4,500 = 2-3 weeks for 2 devs

**What this gives you**:
- ✅ Core integrity promise
- ✅ Users can export safely
- ✅ Clear communication about dual retention (12-month accounts + 90-day incidents)
- ✅ Protected against data loss (differential backup)
- ✅ Legal protection (prove user exported)
- ✅ Subscription management (auto-renewal tracking)

**What you don't have yet** (add later):
- ⏳ Automated deletion warnings (do manually during beta)
- ⏳ Automated deletion job (do manually during beta)
- ⏳ Automated subscription renewal (do manually during beta)
- ⏳ Access audit logs (add in Month 1)

---

## 🧪 Beta Launch Strategy

### Option: Launch Beta Without Auto-Delete

**Rationale**: Get real user feedback before automating deletion

**Beta Period**: 60 days (safely within 90-day window)

**During Beta**:
1. ✅ All critical features implemented (checksums, export, etc.)
2. ✅ Manual warnings to beta users about 90-day limit
3. ✅ Manual deletion at end of beta (if needed)
4. ✅ Collect feedback on export experience
5. ⏳ Auto-delete job not yet running

**Post-Beta** (Before public launch):
1. ✅ Implement auto-delete job based on beta learnings
2. ✅ Implement automated warning emails
3. ✅ Add access audit logs

**Benefit**: Learn from real usage before automating

---

## 📊 Cost Breakdown

### Pre-Launch Critical (Must Have)
| Feature | Hours | Cost @ $100/hr | Notes |
|---------|-------|----------------|-------|
| Checksums | 8 | $800 | No change |
| Export package | 16 | $1,600 | No change |
| Retention & Subscription tracking | 4 | $400 | +2 hours (dual retention) |
| User communication | 5 | $500 | +1 hour (dual retention) |
| Differential backup | 10 | $1,000 | +2 hours (dual retention) |
| Export logging | 2 | $200 | No change |
| **Subtotal** | **45** | **$4,500** | +5 hours from original |

### Pre-Launch Important (Should Have)
| Feature | Hours | Cost @ $100/hr | Notes |
|---------|-------|----------------|-------|
| Deletion warnings | 8 | $800 | +2 hours (subscription warnings) |
| Auto-delete job | 6 | $600 | +2 hours (subscription renewal) |
| Access logs | 8 | $800 | No change |
| **Subtotal** | **22** | **$2,200** | +4 hours from original |

### Total Pre-Launch Investment
**67 hours = $6,700**

**Note**: +9 hours from original estimate to handle dual retention model (12-month subscriptions + 90-day incidents)

### Ongoing Costs
- AWS S3 backup storage: ~$50/month
- Email service (warnings): ~$10/month
- Maintenance: ~2 hours/month = $200/month
- **Total**: ~$260/month

---

## ✅ Implementation Checklist

### Week 1: Core Features
- [ ] Add `original_checksum_sha256` column to `user_documents`
- [ ] Add `current_checksum_sha256` column to `user_documents`
- [ ] Update `imageProcessorV2.js` to calculate checksums
- [ ] Add `retention_until` default to `incident_reports` (90 days)
- [ ] Add subscription tracking columns to `user_signup` (12 months)
- [ ] Add `associated_with` and `associated_id` to `user_documents`
- [ ] Create incident retention trigger function
- [ ] Create subscription tracking trigger function
- [ ] Create document retention trigger function
- [ ] Build export package API endpoint
- [ ] Create `export_log` table
- [ ] Add export button to incident detail page
- [ ] Generate ZIP with images + PDF + checksums
- [ ] Test export functionality end-to-end

### Week 2: Safety & Communication
- [ ] Add subscription terms acceptance during signup
- [ ] Add subscription status dashboard widget
- [ ] Add 90-day policy acceptance to first incident
- [ ] Add incident retention countdown to dashboard
- [ ] Update Terms of Service (dual retention sections)
- [ ] Set up AWS S3 buckets for backups (separate accounts/incidents)
- [ ] Create account backup script (`scripts/backup-accounts-to-s3.js`)
- [ ] Create incident backup script (`scripts/backup-incidents-to-s3.js`)
- [ ] Create backup cleanup script (`scripts/cleanup-old-backups.js`)
- [ ] Schedule daily backup cron jobs
- [ ] Test backup/restore process for both data types
- [ ] Create email templates (4 incident deletion warnings)
- [ ] Create email templates (4 subscription expiry warnings)
- [ ] Create incident deletion warning script
- [ ] Create subscription warning script
- [ ] Create incident auto-delete script
- [ ] Create account auto-delete script
- [ ] Create subscription renewal script
- [ ] Test all warning emails
- [ ] Test all auto-delete jobs (in staging)

### Week 3: Testing & Launch Prep
- [ ] End-to-end testing - Account creation (signup → subscription → documents)
- [ ] End-to-end testing - Incidents (submit → export → delete)
- [ ] End-to-end testing - Subscription renewal (auto-renewal flow)
- [ ] Load testing (100 concurrent users)
- [ ] Security audit (export permissions, subscription access)
- [ ] Mobile testing (export on phones, subscription management)
- [ ] Documentation (user guide for export, subscription terms)
- [ ] Insurance partner communication (dual retention policy)
- [ ] Beta user invitation emails (with clear retention terms)

---

## 🚨 Critical Success Factors

### 1. Export MUST Be Easy
**Why**: If users can't export, they lose evidence

**Testing**:
- Can user export on mobile? (Big download button)
- Can user export on slow connection? (Resume support?)
- Can user verify checksums? (Clear instructions)
- Can user open ZIP on their device? (Test iOS/Android)

### 2. Warnings MUST Be Clear
**Why**: Legal protection if user doesn't export

**Testing**:
- Is countdown always visible in dashboard?
- Are email warnings getting through? (Not spam)
- Is acceptance checkbox prominent on first incident?
- Does ToS clearly state 90-day policy?

### 3. Backup MUST Work
**Why**: Single point of failure protection

**Testing**:
- Can you restore from backup?
- Are checksums verified during backup?
- Is backup running daily?
- Is old backup being deleted (90-day rolling)?

---

## 📞 Partner Communication

### Insurance Partners
```
Important: Dual Data Retention Policy

[Your Company] provides a subscription-based evidence collection service:

USER ACCOUNT DATA (12 months):
• User profile, vehicle information, and documents
• Retained for duration of 12-month subscription
• Auto-renews unless cancelled

INCIDENT REPORTS (90 days - Temporary):
• Specific incident data and crash photos
• Retained for 90 DAYS ONLY from submission
• Automatically deleted after 90 days

Users are instructed to:
1. Export complete incident package within 90 days
2. Provide exported package to you for claim processing
3. Maintain active subscription during claim period

IMPORTANT: After 90 days, incident data is permanently deleted
from our system for GDPR compliance. User accounts remain active
during their subscription.

Recommendation: Request evidence package from users within
30 days of incident for optimal processing timeline.

Questions? partnerships@yourcompany.com
```

### Beta Users
```
Beta User Important Notice

Thank you for beta testing!

YOUR DATA RETENTION:

ACCOUNT DATA (12 Months):
• Your profile, vehicle info, and documents
• Stored for 12 MONTHS (subscription duration)
• Auto-renews unless you cancel
• Access anytime during subscription

INCIDENT REPORTS (90 Days):
• Each incident stored for 90 DAYS ONLY
• After 90 days, incidents AUTOMATICALLY DELETED
• Your account stays active, but incidents expire
• YOU MUST export incidents before 90-day deadline

IMPORTANT:
✅ Your account remains active (12 months)
⚠️ Your incidents expire individually (90 days each)
📦 Export each incident before its deadline
🔄 We'll send reminders, but it's your responsibility

[EXPORT YOUR INCIDENTS NOW]

During beta, we'll also send manual reminders.

Questions? beta@yourcompany.com
```

---

## 🎯 Launch Decision

### Ready to Launch When:

✅ **Critical Features Complete** (45 hours)
- Checksums on all uploads
- Export functionality working
- Dual retention tracking active (90-day incidents + 12-month accounts)
- Subscription management working
- User communication clear (dual retention messaging)
- Differential backup running daily
- Export logging active

✅ **Testing Complete**
- End-to-end workflow tested (signup → subscription → incidents)
- Subscription renewal flow tested
- Export tested on mobile & desktop
- Differential backup/restore tested
- Load testing passed

✅ **Documentation Complete**
- User guide: How to export incidents
- User guide: Subscription management
- ToS updated: Dual retention policy
- Partner communication sent (updated for dual retention)
- Support team trained on both retention policies

✅ **Monitoring Ready**
- Dashboard for incident retention status
- Dashboard for subscription status
- Alerts for backup failures (both types)
- Tracking export rates
- Tracking subscription renewal rates

---

## 📈 Success Metrics (Post-Launch)

### Track These KPIs

#### Incident Management
1. **Incident Export Rate**: What % of users export before Day 90?
   - Target: >90% (excellent)
   - Warning: <70% (improve UX)

2. **Incident Export Timing**: When do users export?
   - Ideal: Within first 30 days
   - Warning: Mostly in last 5 days

3. **Incident Deletion Complaints**: Do users complain about surprise deletions?
   - Target: 0 complaints
   - Warning: Multiple complaints = improve warnings

#### Subscription Management
4. **Subscription Renewal Rate**: What % of subscriptions auto-renew?
   - Target: >85% (excellent)
   - Warning: <60% (improve subscription value)

5. **Subscription Cancellation Timing**: When do users cancel?
   - Ideal: After 6+ months
   - Warning: Within first month (improve onboarding)

6. **Subscription Reactivation Rate**: Do users return after cancellation?
   - Target: >20% (good)
   - Warning: <10% (improve win-back strategy)

#### System Health
7. **Backup Success**: Are backups working?
   - Target: 100% success rate (both account & incident backups)
   - Alert: Any failures

8. **Differential Backup Coverage**: Are both data types backed up properly?
   - Target: 100% of accounts + 100% of incidents
   - Alert: Any missing backups

#### Partner & User Satisfaction
9. **Insurance Partner Satisfaction**: Are partners getting data in time?
   - Target: Partners happy with 90-day window
   - Warning: Partners request longer retention

10. **User Satisfaction**: Are users happy with subscription model?
    - Target: >4.0/5.0 rating
    - Warning: <3.5/5.0 (review pricing/features)

---

## 🔄 Evolution Strategy

### If Users Request Longer Retention

**Options**:
1. **Premium Tier**: $5/month for 1-year retention
2. **Export + Reimport**: User exports, reimports later (resets 90-day clock)
3. **Partner Integration**: Direct handoff to insurance company storage

**Recommendation**: Start with 90 days, add paid extended retention later if demand exists

---

## ✅ Next Steps

### This Week
1. Review this checklist with your team
2. Decide on timeline (2-3 weeks before launch?)
3. Assign tasks to developers
4. Set up AWS S3 account for backups
5. Draft Terms of Service updates

### Next Week
Start implementation (40-hour critical path)

### Week After Next
Testing and polish

### Launch!
With confidence that core integrity features are solid

---

**You're in perfect position: designing this right from the start, no legacy issues, clean slate.**

Ready to implement whenever you say go! 🚀

---

## 📋 DUAL RETENTION MODEL: Key Differences Summary

This implementation handles **two different retention policies** for different data types:

### USER ACCOUNT DATA (12-Month Retention - Subscription Based)

**Tables Affected:**
- `user_signup` - User profile, vehicle info, emergency contacts
- `user_documents` (where `associated_with='user_signup'`) - Driving license, vehicle photos

**Retention Logic:**
- Stored for 12 months from subscription start date
- Auto-renews unless user cancels
- Only deleted if subscription expires AND auto-renewal is disabled
- Renewal extends retention by another 12 months

**User Experience:**
- Clear subscription terms during signup
- Dashboard shows subscription status and renewal date
- Warnings sent if auto-renewal is disabled (30, 14, 7, 1 days before expiry)
- Account data accessible throughout subscription

**Deletion:**
- Only when subscription expires + no auto-renewal
- User receives advance warnings
- Account and associated documents deleted together

---

### INCIDENT REPORT DATA (90-Day Retention - Temporary Staging)

**Tables Affected:**
- `incident_reports` - All incident details
- `user_documents` (where `associated_with='incident_report'`) - Crash photos, scene images

**Retention Logic:**
- Stored for exactly 90 days from submission date
- Automatically deleted after 90 days (no exceptions)
- Each incident has independent 90-day countdown
- User account remains active, only incidents expire

**User Experience:**
- Mandatory acceptance of 90-day policy on first incident
- Dashboard shows countdown for each incident
- Prominent "EXPORT NOW" button on each incident
- Email warnings at 60, 75, 85, 89 days before deletion
- User responsibility to export before deadline

**Deletion:**
- Automatic at 90 days (soft delete)
- Confirmation email sent
- Incident and associated documents deleted together
- User account remains active (subscription-based)

---

### KEY ARCHITECTURAL DECISIONS

1. **Document Association Tracking:**
   ```sql
   ALTER TABLE user_documents
   ADD COLUMN associated_with TEXT CHECK (associated_with IN ('incident_report', 'user_signup')),
   ADD COLUMN associated_id UUID;
   ```
   This links each document to either a user account (12 months) or an incident (90 days).

2. **Subscription Tracking:**
   ```sql
   ALTER TABLE user_signup
   ADD COLUMN subscription_start_date TIMESTAMP DEFAULT NOW(),
   ADD COLUMN subscription_end_date TIMESTAMP DEFAULT (NOW() + INTERVAL '12 months'),
   ADD COLUMN subscription_status TEXT DEFAULT 'active',
   ADD COLUMN auto_renewal BOOLEAN DEFAULT true;
   ```
   This enables subscription-based retention for user accounts.

3. **Differential Backup Strategy:**
   - Separate S3 paths for accounts vs incidents
   - Different retention periods for backups (12 months vs 90 days)
   - Separate backup scripts for clarity

4. **Differential Deletion Logic:**
   - Separate cron jobs for account deletion vs incident deletion
   - Different warning schedules for each
   - Subscription renewal logic prevents account deletion

5. **User Communication:**
   - Two separate acceptance checkboxes (signup terms + incident policy)
   - Two separate dashboard widgets (subscription status + incident countdown)
   - Two separate email warning systems
   - Clear distinction in all messaging

---

### BENEFITS OF THIS APPROACH

✅ **User-Friendly:** Users don't lose their account data while incidents expire
✅ **GDPR-Compliant:** Automatic deletion of temporary incident data
✅ **Flexible:** Users can export incidents they want to keep long-term
✅ **Revenue Model:** Subscription provides predictable revenue
✅ **Clear Expectations:** Users understand what expires and when
✅ **Legal Protection:** Clear acceptance of different policies
✅ **Cost Efficient:** Only store what's needed for subscription duration

---

### TOTAL IMPLEMENTATION EFFORT

**Critical Features (Must Launch With):** 45 hours ($4,500)
**Important Features (Should Have):** 22 hours ($2,200)
**Total Pre-Launch:** 67 hours ($6,700)

**Additional effort from single retention model:** +9 hours
- Subscription tracking and triggers: +2 hours
- Dual retention UI/communication: +1 hour
- Differential backup system: +2 hours
- Subscription warning emails: +2 hours
- Subscription renewal logic: +2 hours

**Worth it?** Absolutely! This provides:
- Better user experience (account doesn't disappear)
- Predictable revenue (subscription model)
- Clear differentiation between temporary and permanent data
- Proper GDPR compliance for both data types

---

**This is the right architecture for a subscription-based incident collection service. You're designing it correctly from day one! 🎯**
