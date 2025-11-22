# ⚠️ MANUAL MIGRATION REQUIRED FOR PAGE 12

## Status
Page 12 (Final Medical Check) fields are mapped in the controller but **database columns do not exist yet**.

## Required Action
Run the following migration manually in the Supabase SQL Editor:

**File**: `migrations/026_add_page12_final_medical_check_fields.sql`

```sql
-- Add Page 12 fields to incident_reports table
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS final_feeling TEXT,
  ADD COLUMN IF NOT EXISTS form_completed_at TIMESTAMPTZ DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN incident_reports.final_feeling IS 'How the user is feeling at the end of the form (Page 12)';
COMMENT ON COLUMN incident_reports.form_completed_at IS 'Timestamp when the user completed the entire incident form (Page 12)';
```

## Fields Added
1. **final_feeling** (TEXT) - User's condition at form completion
   - Possible values: `fine`, `shaken`, `minor_pain`, `significant_pain`, `emergency`

2. **form_completed_at** (TIMESTAMPTZ) - When the user completed the entire form

## Why Manual?
Claude Code does not have permission to execute DDL (Data Definition Language) statements via the Supabase MCP or RPC functions.

## Controller Mapping
✅ Controller already updated to handle these fields:
- File: `src/controllers/incidentForm.controller.js` (lines 634-636)
- Maps `page12.final_feeling` → `final_feeling`
- Maps `page12.completed_at` → `form_completed_at`

## Test Script
📝 Test script created: `scripts/test-page12-fields.js`

Run after migration:
```bash
node scripts/test-page12-fields.js
```

Expected result: ✅ 2/2 fields validated

## Rollback
If needed, run: `migrations/026_add_page12_final_medical_check_fields_rollback.sql`

---

**Date Created**: 2025-11-07
**Status**: PENDING MANUAL EXECUTION
