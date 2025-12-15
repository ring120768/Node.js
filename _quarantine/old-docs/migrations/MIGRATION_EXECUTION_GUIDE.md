# Migration Execution Guide - Run Corrective Migrations 002-005

## Quick Start (2 Minutes)

### Step 1: Open Supabase SQL Editor
1. Navigate to: https://supabase.com/dashboard/project/kctlcmbjmhcfoobmkfrs/sql
2. Click **"New Query"** button (top right)

### Step 2: Paste and Run
1. Copy the entire contents of: `migrations/fix-existing-schema-002-005.sql`
2. Paste into the SQL Editor
3. Click the green **"Run"** button (or press Cmd+Enter)

### Step 3: Verify Success
You should see in the Messages tab:
```
▶ Starting Migration 002: Fix visibility column typo
✅ Fixed typo: visibility_streets_ → visibility_street_lights
✅ Migration 002 complete

▶ Checking Migration 003: your_speed column
⏭️  Migration 003 already applied: your_speed exists

▶ Starting Migration 004: Fix road_type_private column
✅ Renamed: road_type_private → road_type_private_road
✅ Migration 004 complete

▶ Starting Migration 005: Add user_documents columns
✅ Migration 005 complete: incident_report_id and download_url columns added

═══════════════════════════════════════════════════════════
VERIFICATION: Checking all migrations...
═══════════════════════════════════════════════════════════

incident_reports:
  ✅ visibility_street_lights
  ✅ your_speed
  ✅ road_type_private_road

user_documents:
  ✅ incident_report_id
  ✅ download_url

🎉 SUCCESS: All 5 columns verified!
═══════════════════════════════════════════════════════════
```

---

## What This Migration Does

### Migration 002: Fix Visibility Column Typo
- **Renames:** `visibility_streets_` → `visibility_street_lights`
- **Purpose:** Fixes typo in database to match HTML form field
- **Impact:** No data loss, just column rename

### Migration 003: Your Speed Column (Already Applied)
- **Status:** Column already exists, migration skips
- **Verification:** Confirms `your_speed` column present

### Migration 004: Rename Road Type Column
- **Renames:** `road_type_private` → `road_type_private_road`
- **Purpose:** UK legal specificity (private road vs generic "private")
- **Impact:** No data loss, just column rename

### Migration 005: Add Image Storage Columns ⭐ **KEY MIGRATION**
- **Adds to `user_documents` table:**
  - `incident_report_id UUID` - Links photos to incident reports
  - `download_url TEXT` - Permanent API URL for retrieving photos
- **Creates indexes:**
  - `idx_user_documents_incident_report` - Fast lookups by incident
  - `idx_user_documents_user_incident` - Fast lookups by user + incident
- **Purpose:** Enables permanent image storage with downloadable URLs

---

## Safety Features

✅ **Idempotent:** Safe to run multiple times
✅ **Defensive Checks:** Uses `IF EXISTS` / `IF NOT EXISTS`
✅ **Built-in Verification:** Confirms all changes at end
✅ **Wrapped in Transaction:** Commits only if everything succeeds
✅ **Clear Logging:** Shows exactly what happened

---

## If Something Goes Wrong

### Error: "relation X already exists"
- **Cause:** Migration already partially applied
- **Action:** This is fine! The migration will skip existing items and continue

### Error: "column X does not exist"
- **Cause:** Database state different than expected
- **Action:** Send me the full error message and I'll create a new corrective migration

### Error: "permission denied"
- **Cause:** Insufficient database permissions
- **Action:** Make sure you're logged in as the project owner in Supabase Dashboard

---

## After Successful Migration

Once you see **"🎉 SUCCESS: All 5 columns verified!"**, you're ready for:

1. ✅ **LocationPhotoService implementation** - Moves temp photos to permanent storage
2. ✅ **Download endpoint** - `/api/user-documents/:id/download`
3. ✅ **Page controllers** - Pages Two, Three, Four backend mapping
4. ✅ **PDF integration** - Photos included in generated incident reports

---

## Alternative: Command Line Verification

After running the migration, you can verify from Node.js:

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Check a sample column
  const { data, error } = await supabase
    .from('incident_reports')
    .select('visibility_street_lights')
    .limit(1);

  if (error && error.message.includes('column \"visibility_street_lights\" does not exist')) {
    console.log('❌ Migration 002 NOT applied');
  } else {
    console.log('✅ Migration 002 applied successfully');
  }
})();
"
```

---

## Rollback (If Needed)

If you need to undo these changes, rollback files are available:
- `migrations/002_rename_visibility_column_rollback.sql`
- `migrations/003_add_your_speed_column_rollback.sql`
- `migrations/004_rename_road_type_column_rollback.sql`
- `migrations/005_add_user_documents_columns_rollback.sql`

**⚠️ WARNING:** Rollback will rename columns back to original names. Only do this if you need to revert!

---

## Next Steps After Migration

1. Run the migration in Supabase SQL Editor
2. Confirm you see the success message
3. Reply with "migration complete" or paste the output
4. I'll proceed with implementing LocationPhotoService

---

**Migration File Location:** `/Users/ianring/Node.js/migrations/fix-existing-schema-002-005.sql`

**Last Updated:** 2025-11-03
