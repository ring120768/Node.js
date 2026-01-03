# Deployment Guide: Migration 034 - GDPR Compliance Fix

**Date:** 2026-01-03
**Purpose:** Add missing `deleted_at` columns for GDPR compliance (Right to Erasure)

---

## Overview

GDPR compliance audit found 3 tables missing soft delete capability:

1. **`incident_other_vehicles`** - No deleted_at column (GDPR violation)
2. **`temp_uploads`** - No deleted_at column (GDPR violation)
3. **`pdf_generation_queue`** - No deleted_at column (GDPR violation)

**Impact:** Without soft delete, these tables cannot comply with GDPR Right to Erasure requirements.

**Solution:** Add `deleted_at TIMESTAMPTZ NULL` column to all three tables.

---

## Step 1: Apply Migration 034 (Manual)

### 1.1 Open Supabase Dashboard

1. Navigate to: https://supabase.com/dashboard
2. Select your project: **Car Crash Lawyer AI**
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### 1.2 Copy Migration SQL

Copy the SQL below and paste into the SQL Editor:

```sql
-- Migration 034: Add deleted_at to GDPR-non-compliant tables
-- Created: 2026-01-03
-- Purpose: GDPR compliance - add soft delete to incident_other_vehicles, temp_uploads, pdf_generation_queue

BEGIN;

-- Add deleted_at to incident_other_vehicles
ALTER TABLE public.incident_other_vehicles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.incident_other_vehicles.deleted_at IS
  'Soft delete timestamp for GDPR compliance (Right to Erasure). NULL = active record.';

-- Add deleted_at to temp_uploads
ALTER TABLE public.temp_uploads
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.temp_uploads.deleted_at IS
  'Soft delete timestamp for GDPR compliance (Right to Erasure). NULL = active record.';

-- Add deleted_at to pdf_generation_queue
ALTER TABLE public.pdf_generation_queue
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.pdf_generation_queue.deleted_at IS
  'Soft delete timestamp for GDPR compliance (Right to Erasure). NULL = active record.';

COMMIT;
```

### 1.3 Execute Migration

1. Click **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. Check for success message: "Success. No rows returned"
3. If you see any errors, **STOP** and report them

### 1.4 Verify Migration

Run this verification query in a **new SQL Editor tab**:

```sql
-- Verify deleted_at columns exist
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('incident_other_vehicles', 'temp_uploads', 'pdf_generation_queue')
  AND column_name = 'deleted_at'
ORDER BY table_name;
```

**Expected Result:**
```
table_name                | column_name | data_type                   | is_nullable
--------------------------|-------------|-----------------------------|-----------
incident_other_vehicles   | deleted_at  | timestamp with time zone    | YES
pdf_generation_queue      | deleted_at  | timestamp with time zone    | YES
temp_uploads              | deleted_at  | timestamp with time zone    | YES
```

If you see all 3 rows, migration succeeded ✅

---

## Step 2: Verify GDPR Compliance

Run the GDPR compliance verification script:

```bash
node scripts/verify-gdpr-compliance.js
```

**Expected Output:**
```
✅ Passed Checks: 19
❌ Failed Checks: 0

✅ GDPR COMPLIANCE STATUS: GOOD

All critical tables have required GDPR mechanisms.
```

---

## Step 3: Update Code (Optional)

The existing soft delete pattern in the codebase already supports `deleted_at` columns. No code changes are required for basic functionality.

**However**, if you want to implement soft delete for these tables, update the relevant services:

### incident_other_vehicles

**File:** `src/controllers/incidentForm.controller.js` or wherever vehicles are deleted

**Current pattern (hard delete):**
```javascript
await supabase
  .from('incident_other_vehicles')
  .delete()
  .eq('id', vehicleId);
```

**GDPR-compliant pattern (soft delete):**
```javascript
await supabase
  .from('incident_other_vehicles')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', vehicleId);

// When querying, exclude soft-deleted
await supabase
  .from('incident_other_vehicles')
  .select('*')
  .is('deleted_at', null);
```

### temp_uploads

**File:** `src/services/cronManager.js` (cleanup job)

**Note:** `temp_uploads` already has TTL-based deletion via cron job. Soft delete is now available for GDPR compliance if needed (e.g., user requests early deletion).

### pdf_generation_queue

**File:** `src/services/pdfQueueService.js`

**Note:** Queue records can now be soft-deleted for GDPR compliance. Previously, failed queue items were kept indefinitely.

---

## Step 4: Test Soft Delete

### 4.1 Test incident_other_vehicles

```sql
-- Insert test record
INSERT INTO incident_other_vehicles (id, incident_id, registration)
VALUES (gen_random_uuid(), gen_random_uuid(), 'TEST123');

-- Soft delete
UPDATE incident_other_vehicles
SET deleted_at = NOW()
WHERE registration = 'TEST123';

-- Verify soft delete
SELECT registration, deleted_at
FROM incident_other_vehicles
WHERE registration = 'TEST123';
-- Should show deleted_at with timestamp

-- Clean up
DELETE FROM incident_other_vehicles WHERE registration = 'TEST123';
```

### 4.2 Re-run GDPR Compliance Check

```bash
node scripts/verify-gdpr-compliance.js
```

Should now show **0 failed checks** ✅

---

## Step 5: Commit Changes

```bash
git add migrations/034_add_deleted_at_to_missing_tables.sql
git add migrations/034_add_deleted_at_to_missing_tables_rollback.sql
git add scripts/verify-gdpr-compliance.js
git add DEPLOYMENT-GUIDE-MIGRATION-034.md

git commit -m "feat: add GDPR compliance - soft delete to missing tables

- Add migration 034 for deleted_at columns
- Fix GDPR violations in incident_other_vehicles, temp_uploads, pdf_generation_queue
- Create GDPR compliance verification script
- All tables now have Right to Erasure capability"

git push origin main
```

---

## Rollback Procedure (If Needed)

### If Migration 034 Causes Issues

**Step 1:** Run rollback SQL in Supabase Dashboard:

```sql
-- Migration 034 Rollback: Remove deleted_at from tables
-- Created: 2026-01-03

BEGIN;

-- Remove deleted_at from incident_other_vehicles
ALTER TABLE public.incident_other_vehicles
  DROP COLUMN IF EXISTS deleted_at;

-- Remove deleted_at from temp_uploads
ALTER TABLE public.temp_uploads
  DROP COLUMN IF EXISTS deleted_at;

-- Remove deleted_at from pdf_generation_queue
ALTER TABLE public.pdf_generation_queue
  DROP COLUMN IF EXISTS deleted_at;

COMMIT;
```

**Step 2:** Verify rollback:

```bash
node scripts/verify-gdpr-compliance.js
```

Should show 3 failed checks (back to original state).

---

## Success Criteria

✅ Migration 034 applied successfully
✅ All 3 tables have `deleted_at` column
✅ GDPR compliance script shows 0 failures
✅ Code committed and pushed to GitHub
✅ Documentation updated

---

## GDPR Compliance Summary

After Migration 034, all critical tables now support:

| GDPR Right | Implementation | Status |
|------------|----------------|--------|
| Right to Access | API endpoints: `/api/profile`, `/api/incident-reports` | ✅ |
| Right to Erasure | `deleted_at` column on all tables | ✅ |
| Right to Portability | `/api/gdpr/export` endpoint | ✅ |
| Data Minimization | Only collect necessary data | ✅ |
| Access Control | Row Level Security (RLS) policies | ⚠️ Verify in Dashboard |
| Data Retention | 90-day policy with automated deletion | ✅ |
| Consent Management | Privacy policy acceptance at signup | ✅ |
| Audit Trail | `created_at`, `updated_at` timestamps | ✅ |

---

## Next Steps

### Manual Verification Required:

1. **Verify RLS Policies** in Supabase Dashboard:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```
   All tables should have `rowsecurity = true`

2. **Test GDPR Endpoints:**
   - `/api/gdpr/export` - User data export
   - `/api/gdpr/delete-account` - Account deletion

3. **Review Privacy Policy:**
   - Ensure policy reflects 90-day retention
   - Document soft delete mechanism
   - Update last modified date

4. **Test Soft Delete Flow:**
   - Create test data in all 3 tables
   - Soft delete records
   - Verify queries exclude deleted records
   - Test permanent deletion (cron cleanup)

---

**Last Updated:** 2026-01-03
**Author:** Claude Code
**Status:** Ready for deployment
**Migration Version:** 034
