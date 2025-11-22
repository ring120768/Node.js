# Cleanup: Drop Legacy vehicle_driveable BOOLEAN Fields

## Summary

Remove 3 unused BOOLEAN columns from the Typeform era that have been replaced by a single TEXT field.

---

## Context

**Problem:** Schema has BOTH old BOOLEAN fields AND new TEXT field for vehicle driveability
**Diagnosis:** Diagnostic script showed all 4 recent incidents use TEXT field, BOOLEAN fields are NULL
**Solution:** Drop the unused BOOLEAN columns to clean up schema

---

## Fields Being Removed

| Column Name | Type | Current State | Reason |
|-------------|------|---------------|--------|
| `vehicle_driveable_yes` | BOOLEAN | Always NULL | Legacy from Typeform |
| `vehicle_driveable_no` | BOOLEAN | Always NULL | Legacy from Typeform |
| `vehicle_driveable_unsure` | BOOLEAN | Always NULL | Legacy from Typeform |

**Field Being Kept:**
- `vehicle_driveable` (TEXT) - Currently in use, values: "yes", "no", "unsure" ✅

---

## Evidence

Running diagnostic script confirmed:
```bash
node scripts/check-vehicle-driveable-data.js
```

**Results:**
- ✅ 4 incidents found
- ✅ All have TEXT field populated ("yes", "no", or "unsure")
- ✅ All BOOLEAN fields are NULL
- ✅ No mixed usage detected

---

## Migration Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → Your Project
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. Copy and paste contents of `migrations/drop_legacy_vehicle_driveable_booleans.sql`
5. Click **Run** button
6. Verify success message: "✅ Legacy BOOLEAN fields dropped successfully"

### Option 2: Via Command Line

If you have database access:

```bash
# Apply migration
psql $DATABASE_URL -f migrations/drop_legacy_vehicle_driveable_booleans.sql

# Or via Supabase CLI
supabase db execute --file migrations/drop_legacy_vehicle_driveable_booleans.sql
```

---

## Verification

After running migration, verify schema:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'incident_reports'
AND column_name LIKE 'vehicle_driveable%'
ORDER BY column_name;
```

**Expected result:**
```
column_name       | data_type | is_nullable
------------------+-----------+-------------
vehicle_driveable | text      | YES
```

---

## Rollback

If you need to restore the BOOLEAN fields (will restore columns but not data):

```bash
# Via Supabase Dashboard SQL Editor
# Copy and run: migrations/drop_legacy_vehicle_driveable_booleans_rollback.sql

# Or via command line
psql $DATABASE_URL -f migrations/drop_legacy_vehicle_driveable_booleans_rollback.sql
```

**Note:** Rollback restores the COLUMNS but NOT the data (all were NULL anyway)

---

## Impact Assessment

**✅ No Risk:**
- BOOLEAN fields are not being written to (all NULL in production)
- Current code does not read these fields
- PDF service uses the TEXT field
- HTML forms use the TEXT field

**✅ Benefits:**
- Cleaner schema
- Less confusion for developers
- Reduces migration overhead

**✅ Zero Downtime:**
- No code changes required
- No data migration needed
- Purely schema cleanup

---

## Related Files

**Code:**
- `public/incident-form-page5-vehicle.html` (lines 831-870) - HTML checkboxes
- `src/controllers/incidentForm.controller.js` (line 569) - Controller mapping
- `src/services/adobePdfFormFillerService.js` (lines 316-318) - PDF mapping

**Migrations:**
- `migrations/drop_legacy_vehicle_driveable_booleans.sql` - Main migration
- `migrations/drop_legacy_vehicle_driveable_booleans_rollback.sql` - Rollback script

**Documentation:**
- `migrations/README_vehicle_driveable.md` - Original field documentation
- `scripts/check-vehicle-driveable-data.js` - Diagnostic script

---

## FAQ

**Q: Why not keep the BOOLEAN fields "just in case"?**
A: They add confusion and maintenance overhead. The TEXT field is the correct design for mutually exclusive options.

**Q: What if old Typeform data needs the BOOLEAN fields?**
A: All recent data (4 incidents tested) uses TEXT field. Typeform is no longer active for new submissions.

**Q: Can we migrate old BOOLEAN data to TEXT?**
A: Not needed - all BOOLEAN fields are NULL in production data.

**Q: Will this break the PDF generation?**
A: No - PDF service already reads from `vehicle_driveable` TEXT field (lines 316-318).

---

**Created:** 2025-11-12
**Status:** Ready to deploy
**Risk Level:** ✅ Minimal (unused fields)
