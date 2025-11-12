# Adding vehicle_driveable Field to Supabase

## Quick Check

First, verify if the field already exists:

```bash
node scripts/check-vehicle-driveable-field.js
```

## If Field is Missing

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → Your Project
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. Copy and paste contents of `migrations/add_vehicle_driveable_if_missing.sql`
5. Click **Run** button

### Option 2: Via Command Line

If you have direct database access:

```bash
psql $DATABASE_URL -f migrations/add_vehicle_driveable_if_missing.sql
```

Or via Supabase CLI:

```bash
supabase db execute --file migrations/add_vehicle_driveable_if_missing.sql
```

## Field Details

- **Column Name:** `vehicle_driveable`
- **Data Type:** `TEXT`
- **Nullable:** Yes (default: `NULL`)
- **Allowed Values:**
  - `"yes"` - Vehicle was driveable
  - `"no"` - Vehicle needed to be towed
  - `"unsure"` - User unsure or didn't attempt

## UI Mapping (Page 5)

**Form Field:** `incident-form-page5-vehicle.html` (lines 831-870)

**HTML Inputs:**
- Checkbox ID: `driveable-yes` → Value: `"yes"`
- Checkbox ID: `driveable-no` → Value: `"no"`
- Checkbox ID: `driveable-unsure` → Value: `"unsure"`

**JavaScript Handler:**
- Uses `exclusiveCheck()` for mutually exclusive selection
- Field name: `vehicle_driveable`

## Controller Mapping

The field should be handled in:
- `src/controllers/incidentForm.controller.js`
- Saved to `incident_reports` table

## Rollback

If you need to remove the field:

```bash
# Via Supabase Dashboard SQL Editor
# Copy and run: migrations/add_vehicle_driveable_if_missing_rollback.sql

# Or via command line
psql $DATABASE_URL -f migrations/add_vehicle_driveable_if_missing_rollback.sql
```

## Verification Query

After running the migration, verify with:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'incident_reports'
AND column_name = 'vehicle_driveable';
```

Expected result:
```
column_name       | data_type | is_nullable | column_default
------------------+-----------+-------------+----------------
vehicle_driveable | text      | YES         | NULL
```

## Notes

- This migration is **idempotent** (safe to run multiple times)
- Uses `ADD COLUMN IF NOT EXISTS` to prevent errors if field already exists
- The field should have been added in migration `020_add_page5_fields.sql` originally
- If that migration wasn't run, this standalone script will add it
