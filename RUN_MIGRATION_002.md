# How to Run Migration 002

## Quick Start (Recommended)

### Option 1: Supabase Dashboard (Easiest - 2 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Click **SQL Editor** in left sidebar

2. **Copy Migration SQL**
   - Open file: `supabase/migrations/002_add_missing_ui_fields.sql`
   - Copy entire contents (Ctrl+A, Ctrl+C)

3. **Run Migration**
   - Paste into SQL Editor
   - Click **Run** (or Ctrl+Enter)
   - You should see: `Success. No rows returned`

4. **Verify**
   ```bash
   node scripts/validate-postbox.js
   ```
   - Success rate should jump from **13.5%** → **~95%+**

---

### Option 2: Supabase CLI (If installed)

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link

# Run migration
supabase db push
```

---

### Option 3: psql (If you have direct database access)

```bash
# Set your database connection string
export DATABASE_URL="postgresql://user:pass@host:5432/database"

# Run migration
psql $DATABASE_URL -f supabase/migrations/002_add_missing_ui_fields.sql
```

---

## What This Migration Does

Adds **77 missing columns** that fix the "broken postbox addresses":

- **Before**: UI sends data → 🚫 **DATA LOST** (no database column)
- **After**: UI sends data → ✅ **Stored in Supabase** → ✅ **Appears in PDF**

### Breakdown

| Table | Columns Added | Description |
|-------|--------------|-------------|
| `incident_reports` | 71 | Medical info, road conditions, weather, location, etc. |
| `incident_other_vehicles` | 6 | Other driver contact details, license, impact point |
| **Total** | **77** | Complete UI → Supabase → PDF flow |

---

## Expected Impact

### Before Migration (Current State)
```
📊 UI → Supabase Success Rate: 19.8% (19/96 fields)
📊 UI → Supabase → PDF Success Rate: 13.5% (13/96 fields)
🚨 77 out of 96 UI fields have NO database column
🚨 Medical data (19 fields) being LOST
🚨 Road/weather conditions being LOST
```

### After Migration (Expected State)
```
✅ UI → Supabase Success Rate: 100% (96/96 fields)
✅ UI → Supabase → PDF Success Rate: ~95%+ (90+/96 fields)
✅ Zero data loss from form submissions
✅ Medical injury data fully captured
✅ Complete road/weather/traffic data
```

---

## Verification

After running the migration, verify it worked:

### Quick Check
```bash
node scripts/validate-postbox.js
```

Look for:
- ✅ **Gap 1 (UI → Supabase)**: Should show `0 fields` instead of `77 fields`
- ✅ **Success Rate**: Should show `~95%+` instead of `13.5%`

### Detailed SQL Check
```sql
-- Check medical columns were added (should return 19 rows)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'incident_reports'
AND column_name LIKE 'medical_%'
ORDER BY column_name;

-- Check other vehicle columns (should return 6 rows)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'incident_other_vehicles'
AND column_name LIKE 'other_%'
ORDER BY column_name;
```

---

## Rollback (If Needed)

If something goes wrong, you can undo this migration:

```sql
BEGIN;

-- Drop all 77 columns (see MIGRATION_002_SUMMARY.md for full script)
ALTER TABLE incident_reports
DROP COLUMN IF EXISTS medical_ambulance_called,
DROP COLUMN IF EXISTS medical_attention_needed,
-- ... (all 71 columns)

ALTER TABLE incident_other_vehicles
DROP COLUMN IF EXISTS other_driver_name,
-- ... (all 6 columns)

COMMIT;
```

**Full rollback script**: See `MIGRATION_002_SUMMARY.md` → Rollback section

---

## Safe to Re-Run?

✅ **Yes!** This migration uses `IF NOT EXISTS` everywhere.

- If columns already exist, they are skipped
- No data loss if run multiple times
- Idempotent (safe to retry)

---

## Next Steps

1. ✅ **Run this migration** (use Option 1, 2, or 3 above)
2. ✅ **Verify with postbox validation** (`node scripts/validate-postbox.js`)
3. ✅ **Test with real form submission** (submit test form, check PDF)
4. ✅ **Monitor for data loss** (should be zero now)

---

**Questions?** Check `MIGRATION_002_SUMMARY.md` for full technical details.
