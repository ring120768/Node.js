# Database Migration Instructions

## Issue
Users are getting 500 errors when trying to save personal statements and proceed to declaration page.

**Error**: `Could not find the 'narrative_text' column of 'ai_transcription' in the schema cache`

## Root Cause
The `ai_transcription` table is missing three columns that the application code expects:
- `transcript_text` - Main personal statement text
- `narrative_text` - AI-generated narrative version
- `voice_transcription` - Raw Whisper transcription

## Solution: Execute Migration

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/obrztlhdqlhjnfncybsc/editor
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"** button

### Step 2: Execute Migration SQL

Copy the entire contents of `migrations/add_ai_transcription_columns.sql` and paste into the SQL editor.

**OR** copy this SQL directly:

```sql
-- Migration: Add missing columns to ai_transcription table
-- Date: 2025-11-11
-- Purpose: Fix schema mismatch causing save errors

BEGIN;

-- Add transcript_text column (main personal statement)
ALTER TABLE ai_transcription
ADD COLUMN IF NOT EXISTS transcript_text TEXT;

COMMENT ON COLUMN ai_transcription.transcript_text IS
'Main personal statement text entered or transcribed by user';

-- Add narrative_text column (optional AI-generated narrative)
ALTER TABLE ai_transcription
ADD COLUMN IF NOT EXISTS narrative_text TEXT;

COMMENT ON COLUMN ai_transcription.narrative_text IS
'AI-generated narrative version of the personal statement';

-- Add voice_transcription column (raw voice transcription)
ALTER TABLE ai_transcription
ADD COLUMN IF NOT EXISTS voice_transcription TEXT;

COMMENT ON COLUMN ai_transcription.voice_transcription IS
'Raw voice transcription from OpenAI Whisper API';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Added transcript_text, narrative_text, voice_transcription columns to ai_transcription table';
END $$;

COMMIT;

-- Verify columns were added
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'ai_transcription'
    AND column_name IN ('transcript_text', 'narrative_text', 'voice_transcription');

  IF col_count = 3 THEN
    RAISE NOTICE '✅ Verification passed: All 3 columns exist';
  ELSE
    RAISE WARNING '⚠️  Verification failed: Expected 3 columns, found %', col_count;
  END IF;
END $$;
```

### Step 3: Run the Query

Click the **"Run"** button (or press `Cmd/Ctrl + Enter`)

### Step 4: Verify Success

You should see messages in the output panel:
- `Migration complete: Added transcript_text, narrative_text, voice_transcription columns to ai_transcription table`
- `✅ Verification passed: All 3 columns exist`

### Step 5: Test Locally

Run the verification script to confirm everything works:

```bash
node scripts/verify-ai-transcription-migration.js
```

Expected output:
```
🔍 Verifying ai_transcription migration...

Test 1: Attempting to select new columns...
✅ All three columns exist and are queryable

Test 2: Testing insert with new columns...
✅ Insert test successful

Test 3: Cleaning up test record...
✅ Test record cleaned up

═══════════════════════════════════════════
🎉 MIGRATION VERIFIED SUCCESSFULLY
═══════════════════════════════════════════

All three columns added:
  ✓ transcript_text
  ✓ narrative_text
  ✓ voice_transcription

The save-statement endpoint should now work correctly.
Users can proceed to the declaration page.
```

## What This Fixes

After executing this migration:

✅ Users can save personal statements without 500 errors
✅ "Proceed to Declaration" button works correctly
✅ Data is properly stored in the database
✅ No more schema cache errors

## Rollback (If Needed)

If you need to reverse this migration for any reason:

```sql
BEGIN;

ALTER TABLE ai_transcription DROP COLUMN IF EXISTS transcript_text;
ALTER TABLE ai_transcription DROP COLUMN IF EXISTS narrative_text;
ALTER TABLE ai_transcription DROP COLUMN IF EXISTS voice_transcription;

COMMIT;
```

**Note**: Only run rollback if absolutely necessary, as it will delete any data stored in these columns.

## Next Steps

Once migration is complete and verified:

1. Test the save functionality on the transcription-status page
2. Verify users can navigate to declaration.html
3. Check that no 500 errors appear in browser console
4. Consider committing the migration file to Git for production deployment

---

**Created**: 2025-11-11
**Priority**: HIGH - Blocking user workflow
**Estimated Time**: 2-3 minutes to execute
