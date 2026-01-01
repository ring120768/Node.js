# Deployment Guide: Migration 033 + PDF Fix

**Date:** 2026-01-01
**Purpose:** Fix PDF delivery bug - Add missing `incident_id` column and fix error handling

---

## Overview

This deployment addresses the root cause of PDF email failures:

1. **Missing Database Column:** The `incident_id` column doesn't exist in `completed_incident_forms` table
2. **Silent Error Handling:** Code was catching database errors and returning fallback objects instead of throwing

**Result:** Queue shows "completed" but NO database record exists and NO email sent.

---

## Step 1: Apply Migration 033 (Manual)

### 1.1 Open Supabase Dashboard

1. Navigate to: https://supabase.com/dashboard
2. Select your project: **Car Crash Lawyer AI**
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### 1.2 Copy Migration SQL

Copy the SQL below and paste into the SQL Editor:

```sql
-- Migration 033: Add incident_id to completed_incident_forms
-- Created: 2026-01-01
-- Purpose: Fix PDF delivery bug - store incident_id for traceability

BEGIN;

-- Add incident_id column
ALTER TABLE public.completed_incident_forms
  ADD COLUMN IF NOT EXISTS incident_id UUID NULL;

-- Add foreign key constraint
ALTER TABLE public.completed_incident_forms
  ADD CONSTRAINT fk_completed_forms_incident_id
  FOREIGN KEY (incident_id)
  REFERENCES public.incident_reports(id)
  ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_completed_forms_incident_id
  ON public.completed_incident_forms(incident_id);

-- Add comment
COMMENT ON COLUMN public.completed_incident_forms.incident_id IS
  'References the incident_reports record this PDF was generated for. Required for linking completed forms to incidents.';

COMMIT;
```

### 1.3 Execute Migration

1. Click **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. Check for success message: "Success. No rows returned"
3. If you see any errors, **STOP** and report them

### 1.4 Verify Migration

Run this verification query in a **new SQL Editor tab**:

```sql
-- Verify incident_id column exists
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'completed_incident_forms'
  AND column_name = 'incident_id';
```

**Expected Result:**
```
column_name  | data_type | is_nullable
-------------|-----------|------------
incident_id  | uuid      | YES
```

If you see this row, migration succeeded ✅

---

## Step 2: Commit Code Changes

### 2.1 Review Changed Files

```bash
git status
```

**Expected changes:**
- Modified: `src/controllers/pdf.controller.js` (error handling fix)
- New: `migrations/033_add_incident_id_to_completed_forms.sql`
- New: `migrations/033_add_incident_id_to_completed_forms_rollback.sql`
- New: `scripts/apply-migration-033.js`
- New: `scripts/cleanup-test-user.js`
- New: `investigate-missing-pdf-email.js`
- New: `DEPLOYMENT-GUIDE-MIGRATION-033.md`

### 2.2 Commit Changes

```bash
git add src/controllers/pdf.controller.js
git add migrations/033_add_incident_id_to_completed_forms.sql
git add migrations/033_add_incident_id_to_completed_forms_rollback.sql
git add scripts/apply-migration-033.js
git add scripts/cleanup-test-user.js
git add investigate-missing-pdf-email.js
git add DEPLOYMENT-GUIDE-MIGRATION-033.md

git commit -m "fix: add missing incident_id column and fix silent error handling

- Add migration 033 to create incident_id column in completed_incident_forms
- Fix storeCompletedForm to throw errors instead of returning fallbacks
- Add enhanced diagnostic logging with full error details
- Create investigation and cleanup scripts
- Fixes PDF email delivery failure (queue completed but no record/email)"
```

### 2.3 Push to GitHub

```bash
git push origin main
```

---

## Step 3: Deploy to Railway

### 3.1 Verify Railway Deployment

Railway automatically deploys when you push to `main` branch.

**Check deployment status:**
1. Open Railway dashboard: https://railway.app
2. Select **Car Crash Lawyer AI** project
3. Click on **web** service
4. Check **Deployments** tab for latest deployment
5. Wait for status to show **Active** (usually 2-3 minutes)

### 3.2 Check Railway Logs

Once deployment is **Active**, check logs for startup errors:

```bash
railway logs
```

**Expected logs:**
```
✅ Server started on port 5000
✅ Supabase client initialized
✅ Database connection verified
```

**Stop if you see:**
- Any error messages during startup
- Database connection failures
- Missing environment variables

---

## Step 4: Test PDF Generation

### 4.1 Run Full User Test

1. Open your application: https://your-app.railway.app
2. Use test user: Sarah Gilbert (sarahlgilbert70@gmail.com)
3. Complete full incident form (all 12 pages)
4. Submit declaration page
5. **Wait 2-3 minutes** for PDF generation

### 4.2 Check Expected Emails

User should receive **3 emails:**
1. ✅ Images uploaded confirmation
2. ✅ 90-day data retention notice
3. ✅ **PDF completed with attachment** ← This was failing before

Admin/Accounts should receive:
4. ✅ PDF notification email

### 4.3 Verify Database Records

Run this query in Supabase SQL Editor:

```sql
-- Check latest PDF generation for Sarah Gilbert
SELECT
  cif.id,
  cif.incident_id,
  cif.pdf_storage_path,
  cif.sent_to_user,
  cif.sent_to_accounts,
  cif.email_status,
  cif.created_at,
  ir.pdf_sent_at
FROM completed_incident_forms cif
LEFT JOIN incident_reports ir ON cif.incident_id = ir.id
WHERE cif.create_user_id = '30d82d89-42d5-406a-9b7d-83345d972f61'
ORDER BY cif.created_at DESC
LIMIT 1;
```

**Expected Results:**
```
id                  | [UUID]
incident_id         | [UUID] ← Should NOT be NULL anymore!
pdf_storage_path    | pdfs/[filename].pdf
sent_to_user        | true
sent_to_accounts    | true
email_status        | {"user": "sent", "accounts": "sent"}
created_at          | [timestamp]
pdf_sent_at         | [timestamp] ← Should NOT be NULL anymore!
```

### 4.4 Check PDF Queue Status

```sql
-- Check PDF generation queue
SELECT
  id,
  status,
  attempts,
  last_error,
  created_at,
  updated_at
FROM pdf_generation_queue
WHERE create_user_id = '30d82d89-42d5-406a-9b7d-83345d972f61'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
```
status      | completed
attempts    | 1
last_error  | NULL
```

---

## Step 5: Verify Error Handling

### 5.1 Check Railway Logs for Enhanced Logging

If PDF generation succeeds, you should see:

```
✅ Completed form stored successfully
   formId: [UUID]
   userId: 30d82d89-42d5-406a-9b7d-83345d972f61
   incidentId: [UUID]
   storagePath: pdfs/[filename].pdf
```

### 5.2 Test Error Notification (Optional)

To verify admin notifications work if errors occur:

1. Temporarily break the database connection in Railway (set invalid `SUPABASE_URL`)
2. Trigger PDF generation
3. Check logs for: `🚨 CRITICAL: Database insert failed`
4. Verify admin email notification was sent
5. **IMPORTANT:** Restore correct `SUPABASE_URL` immediately

---

## Step 6: Success Criteria

✅ Migration 033 applied successfully
✅ Code deployed to Railway without errors
✅ User receives PDF email with attachment
✅ Admin/accounts receive notification
✅ `completed_incident_forms` record created with valid `incident_id`
✅ `incident_reports.pdf_sent_at` timestamp set
✅ No errors in Railway logs

---

## Rollback Procedure (If Needed)

### If Migration 033 Causes Issues

**Step 1:** Run rollback SQL in Supabase Dashboard:

```sql
-- Migration 033 Rollback: Remove incident_id from completed_incident_forms
-- Created: 2026-01-01

BEGIN;

-- Drop index
DROP INDEX IF EXISTS public.idx_completed_forms_incident_id;

-- Drop foreign key constraint
ALTER TABLE public.completed_incident_forms
  DROP CONSTRAINT IF EXISTS fk_completed_forms_incident_id;

-- Drop column
ALTER TABLE public.completed_incident_forms
  DROP COLUMN IF EXISTS incident_id;

COMMIT;
```

**Step 2:** Revert code changes:

```bash
git revert HEAD
git push origin main
```

**Step 3:** Wait for Railway to deploy previous version

---

## Troubleshooting

### Issue: Migration fails with "column already exists"

**Cause:** Migration was already applied manually
**Solution:** This is fine! Migration uses `IF NOT EXISTS` for safety. Continue to Step 2.

### Issue: Railway deployment fails

**Cause:** Syntax error in pdf.controller.js
**Solution:**
1. Check Railway logs for specific error
2. Fix syntax error locally
3. Commit and push again

### Issue: PDF email still not sent

**Cause:** Check these in order:

1. **Railway logs** - Look for `🚨 CRITICAL` error messages
2. **completed_incident_forms** - Does record exist? Is `incident_id` NULL?
3. **incident_reports** - Is `pdf_sent_at` NULL?
4. **email_retry_queue** - Are there failed email attempts?

**Report the specific failure to investigate further.**

### Issue: "Function exec_sql does not exist" when running apply script

**Cause:** Supabase doesn't have the `exec_sql` RPC function
**Solution:** This is expected! Use manual migration via Supabase Dashboard (Step 1)

---

## Support

If you encounter issues during deployment:

1. **Check Railway logs first:** `railway logs`
2. **Run investigation script:** `node investigate-missing-pdf-email.js`
3. **Check Supabase logs:** Dashboard → Logs → Database
4. **Report with:**
   - Exact error message
   - Timestamp of failure
   - Railway deployment ID
   - User ID being tested

---

## Migration History

- **Migration 032:** PDF send guard columns (pdf_sent_at, pdf_send_in_progress) - ✅ Applied
- **Migration 033:** Add incident_id column and FK constraint - 🔄 Applying now

---

**Last Updated:** 2026-01-01
**Author:** Claude Code
**Status:** Ready for deployment
