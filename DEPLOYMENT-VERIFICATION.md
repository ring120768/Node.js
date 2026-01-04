# PDF Delivery Bug Fixes - Deployment Verification

**Deployed:** 1 January 2026
**Commit:** 32266cd
**Branch:** main → Railway production

---

## 🚀 What Was Deployed

### Critical Bug Fixes
1. **Missing incident_id** - Now properly extracted and stored in `completed_incident_forms`
2. **Enhanced storage error logging** - Detailed diagnostics for Supabase storage failures
3. **System health check** - Logs service configuration at PDF generation start

### Security Enhancements
4. **Email verification** - Prevents wrong-user delivery by preferring auth email
5. **Duplicate send prevention** - Database locking to prevent duplicate PDF sends

### Supporting Changes
- Database migration 032: PDF send guard columns
- Diagnostic scripts: Storage upload test, incident investigation
- Documentation: Bug analysis and fix documentation

---

## 📋 Pre-Flight Checklist

### 1. Apply Database Migration

**IMPORTANT:** Run migration 032 in production Supabase before triggering PDF generation.

```bash
# Option A: Via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/[your-project]/editor
2. Open SQL Editor
3. Copy contents of migrations/032_add_pdf_send_guard_to_incident_reports.sql
4. Execute query
5. Verify columns added:
   - incident_reports.pdf_sent_at
   - incident_reports.pdf_send_in_progress
   - incident_reports.pdf_send_started_at

# Option B: Via Railway CLI (if Supabase credentials available)
railway run node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { error } = await supabase.rpc('exec_sql', {
    sql: \`
      ALTER TABLE public.incident_reports
        ADD COLUMN IF NOT EXISTS pdf_sent_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS pdf_send_in_progress BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS pdf_send_started_at TIMESTAMPTZ NULL;
    \`
  });

  if (error) {
    console.error('❌ Migration failed:', error.message);
  } else {
    console.log('✅ Migration 032 applied successfully');
  }
})();
"
```

**Rollback (if needed):**
```sql
-- Use migrations/032_add_pdf_send_guard_to_incident_reports_rollback.sql
ALTER TABLE public.incident_reports
  DROP COLUMN IF EXISTS pdf_send_started_at,
  DROP COLUMN IF EXISTS pdf_send_in_progress,
  DROP COLUMN IF EXISTS pdf_sent_at;
```

### 2. Verify Railway Environment Variables

Ensure these match your local `.env`:

```bash
railway variables

# Required variables:
✅ SUPABASE_URL=https://xxx.supabase.co
✅ SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
✅ SUPABASE_ANON_KEY=eyJhbGc...
✅ OPENAI_API_KEY=sk-...

# Optional (graceful fallback):
⚠️  PDF_SERVICES_CLIENT_ID=xxx
⚠️  PDF_SERVICES_CLIENT_SECRET=xxx
⚠️  RESEND_API_KEY=re_...
```

### 3. Check Railway Deployment Status

```bash
railway status

# Expected output:
# ✅ Service: car-crash-lawyer-ai
# ✅ Environment: production
# ✅ Deployment: 32266cd (active)
# ✅ Health: Healthy
```

---

## 🧪 Verification Testing

### Test 1: Storage Configuration Verification

**Local test (already passed):**
```bash
node scripts/test-storage-upload.js

# Expected output:
# ✅ SUPABASE_URL: Set
# ✅ SUPABASE_SERVICE_ROLE_KEY: Set
# ✅ Bucket 'generated_reports': EXISTS
# ✅ Upload successful
# ✅ Signed URL generated
# ✅ Test file deleted
```

### Test 2: PDF Generation with Enhanced Logging

**Trigger a test PDF generation:**

```bash
# Option A: Via existing test script
node test-form-filling.js 30d82d89-42d5-406a-9b7d-83345d972f61

# Option B: Via API endpoint (if Railway URL known)
curl -X POST https://[railway-url]/api/pdf/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [auth-token]" \
  -d '{"create_user_id": "30d82d89-42d5-406a-9b7d-83345d972f61"}'
```

**Expected behaviour:**
1. PDF generation starts
2. System health check logs appear in Railway logs
3. PDF fills successfully (213 fields, 18 pages)
4. Storage upload succeeds → `storage_path` populated
5. Email sends successfully → `email_sent: true`
6. Database record has all 4 critical fields populated

### Test 3: Verify Database Record

**Check the `completed_incident_forms` record:**

```javascript
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data } = await supabase
    .from('completed_incident_forms')
    .select('id, incident_id, storage_path, email_sent, created_at')
    .eq('create_user_id', '30d82d89-42d5-406a-9b7d-83345d972f61')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Latest PDF record:');
  console.log('  ID:', data.id);
  console.log('  incident_id:', data.incident_id || '❌ NULL');
  console.log('  storage_path:', data.storage_path || '❌ NULL');
  console.log('  email_sent:', data.email_sent ? '✅ true' : '❌ false');
  console.log('  created_at:', data.created_at);

  // Validation
  const allFieldsPopulated = data.incident_id && data.storage_path && data.email_sent;

  if (allFieldsPopulated) {
    console.log('\\n✅ SUCCESS: All critical fields populated!');
  } else {
    console.log('\\n❌ FAILURE: Missing fields detected');
    console.log('   incident_id:', !!data.incident_id);
    console.log('   storage_path:', !!data.storage_path);
    console.log('   email_sent:', data.email_sent);
  }
})();
"
```

**Success criteria:**
```
✅ incident_id: [UUID] (not NULL)
✅ storage_path: generated_reports/[path].pdf (not NULL)
✅ email_sent: true
✅ created_at: [recent timestamp]
```

---

## 📊 Monitoring Enhanced Logging

### What to Look For in Railway Logs

**1. System Health Check (at PDF generation start):**
```
🔧 PDF Generation System Health Check
  Supabase configured: true
  Storage available: true
  Email service ready: true
  PDF service ready: true
  Admin email: admin@carcrashlawyerai.com
  SMTP configured: true
```

**2. Storage Upload Success:**
```
✅ PDF uploaded to storage: generated_reports/[timestamp]-[uuid].pdf
   Size: 3088.90 KB
   Public URL: [signed-url]
```

**3. Storage Upload Failure (if it occurs):**
```
🚨 CRITICAL: PDF storage upload failed
   error: [error message]
   errorCode: [status code]
   userId: 30d82d89-42d5-406a-9b7d-83345d972f61
   fileName: generated_reports/[filename].pdf
   fileSize: 3088.9 KB
   bucket: generated_reports
   timestamp: 2026-01-01T12:00:00.000Z
```

**4. Email Mismatch Detection:**
```
🚨 EMAIL MISMATCH DETECTED - Potential data corruption
   userId: [uuid]
   userSignupEmail: wrong@example.com
   authEmail: correct@example.com
   action: Using authenticated email (safer)
```

**5. Duplicate Send Prevention:**
```
⚠️  PDF send already in progress - skipping duplicate send
   userId: [uuid]
   incidentId: [uuid]
   reason: in_progress
```

### Railway Logs Commands

```bash
# Real-time logs
railway logs --tail

# Filter for PDF-related logs
railway logs --tail | grep "PDF"

# Filter for CRITICAL errors
railway logs --tail | grep "CRITICAL"

# Filter for specific user
railway logs --tail | grep "30d82d89-42d5-406a-9b7d-83345d972f61"

# Export logs to file
railway logs > production-logs-$(date +%Y%m%d-%H%M%S).json
```

---

## 🔍 Troubleshooting

### Issue: Migration Fails

**Symptoms:** Column already exists error

**Solution:**
```sql
-- Migration is idempotent (IF NOT EXISTS), safe to re-run
-- If it fails, check if columns already exist:
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'incident_reports'
  AND column_name IN ('pdf_sent_at', 'pdf_send_in_progress', 'pdf_send_started_at');
```

### Issue: Storage Upload Still Fails

**Check Railway environment variables:**
```bash
railway variables | grep SUPABASE

# Verify values match your local .env
# Common mistakes:
# - Using anon key instead of service role key
# - Incorrect SUPABASE_URL (missing https:// or trailing slash)
# - Expired or rotated service role key
```

**Test storage from Railway:**
```bash
railway run node scripts/test-storage-upload.js

# This will test storage in the actual Railway environment
# Look for specific error messages
```

### Issue: Email Not Sending

**Check email configuration:**
```bash
railway variables | grep -E "(RESEND|SMTP)"

# Verify:
# - RESEND_API_KEY is set and valid
# - RESEND_FROM_EMAIL is verified in Resend dashboard
# - No domain verification issues
```

**Test email sending:**
```bash
railway run node -e "
const { sendEmail } = require('./lib/emailService');

sendEmail(
  'admin@carcrashlawyerai.com',
  'Test Email',
  '<h1>Test</h1><p>If you receive this, email works!</p>'
).then(result => {
  console.log('✅ Email sent:', result);
}).catch(error => {
  console.error('❌ Email failed:', error.message);
});
"
```

### Issue: incident_id Still NULL

**This should be impossible with the fix, but if it happens:**

1. Verify `allData` structure contains incident:
   ```javascript
   console.log('currentIncident:', allData.currentIncident);
   console.log('incident:', allData.incident);
   ```

2. Check if incident_reports record exists:
   ```sql
   SELECT id FROM incident_reports
   WHERE create_user_id = '30d82d89-42d5-406a-9b7d-83345d972f61'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. If incident doesn't exist, PDF generation shouldn't proceed
   (would indicate data integrity issue)

---

## 📈 Success Metrics

After deployment and testing, you should see:

### Database Records
```
Before (Dec 30th failures):
  10 records with:
  ❌ incident_id: NULL
  ❌ storage_path: NULL
  ❌ email_sent: false
  ❌ error_message: NULL

After (New attempts):
  All records with:
  ✅ incident_id: [UUID]
  ✅ storage_path: generated_reports/[path].pdf
  ✅ email_sent: true
  ✅ error_message: NULL (or detailed error if failure)
```

### Railway Logs
```
Before:
  ❌ No ERROR level logs (silent failures)
  ❌ No storage diagnostics
  ❌ No health check logging

After:
  ✅ System health check at PDF generation start
  ✅ Detailed storage error logging (if failures occur)
  ✅ Email verification logging
  ✅ Duplicate send prevention logging
```

### User Experience
```
Before:
  ❌ User never receives PDF email
  ❌ Admin never notified of failure
  ❌ No way to diagnose issue

After:
  ✅ User receives PDF email within 2 minutes
  ✅ Admin alerted if any step fails
  ✅ Detailed diagnostics in Railway logs
  ✅ Graceful handling of duplicate requests
```

---

## 🗄️ Cleanup Old Failed Records (Optional)

After verifying new PDFs work correctly, clean up the 10 failed records from Dec 30th:

```javascript
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // List failed records
  const { data: failed } = await supabase
    .from('completed_incident_forms')
    .select('id, created_at, incident_id, storage_path')
    .eq('create_user_id', '30d82d89-42d5-406a-9b7d-83345d972f61')
    .is('incident_id', null)
    .is('storage_path', null);

  console.log(\`Found \${failed.length} failed records from Dec 30th:\\n\`);
  failed.forEach((record, i) => {
    console.log(\`\${i + 1}. ID: \${record.id}\`);
    console.log(\`   Created: \${new Date(record.created_at).toLocaleString('en-GB')}\`);
  });

  console.log('\\n⚠️  To delete these records, run:');
  console.log('DELETE FROM completed_incident_forms WHERE incident_id IS NULL AND storage_path IS NULL;');

  // Uncomment to actually delete:
  // const { error } = await supabase
  //   .from('completed_incident_forms')
  //   .delete()
  //   .is('incident_id', null)
  //   .is('storage_path', null);
  //
  // console.log(error ? '❌ Delete failed' : '✅ Cleanup complete');
})();
"
```

---

## 📞 Support

If issues persist after deployment:

1. **Check Railway logs** for CRITICAL errors with detailed diagnostics
2. **Verify environment variables** match local working configuration
3. **Test storage** using `railway run node scripts/test-storage-upload.js`
4. **Check database migration** was applied successfully
5. **Review incident investigation** using `node investigate-pdf-failure.js`

**Key Files:**
- Bug documentation: `fix-pdf-delivery-bugs.patch`
- Storage test: `scripts/test-storage-upload.js`
- Incident investigation: `investigate-pdf-failure.js`
- Controller changes: `src/controllers/pdf.controller.js`

---

**Deployment Complete:** ✅
**Migration Required:** ⚠️ Run migration 032 before testing
**Next Action:** Verify with test PDF generation
**Expected Result:** All 4 critical fields populated + enhanced logging active

