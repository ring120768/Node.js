# incident_witnesses Schema Fix Instructions

## Current Situation

The `incident_witnesses` table exists in your Supabase database but uses an **older schema** with:
- ❌ `incident_id` (old column name)
- ❌ Missing `witness_number` column
- ❌ May be missing other columns

**Temporary Fix:** The code has been updated to work with the current schema (`incident_id`).

---

## Option 1: Manual Schema Update (Recommended for Production)

Execute this SQL in your **Supabase SQL Editor**:

### Steps:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the SQL below
5. Click **Run**

### SQL Migration:

```sql
-- Fix incident_witnesses table schema
-- Renames incident_id to incident_report_id and adds missing columns

DO $$
BEGIN
  -- 1. Rename incident_id to incident_report_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_witnesses'
    AND column_name = 'incident_id'
  ) THEN
    -- Drop old foreign key
    ALTER TABLE public.incident_witnesses
    DROP CONSTRAINT IF EXISTS incident_witnesses_incident_id_fkey;

    -- Rename column
    ALTER TABLE public.incident_witnesses
    RENAME COLUMN incident_id TO incident_report_id;

    -- Add new foreign key
    ALTER TABLE public.incident_witnesses
    ADD CONSTRAINT incident_witnesses_incident_report_id_fkey
    FOREIGN KEY (incident_report_id)
    REFERENCES public.incident_reports(id)
    ON DELETE CASCADE;

    RAISE NOTICE '✅ Renamed incident_id to incident_report_id';
  END IF;

  -- 2. Add witness_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_witnesses'
    AND column_name = 'witness_number'
  ) THEN
    ALTER TABLE public.incident_witnesses
    ADD COLUMN witness_number INTEGER NOT NULL DEFAULT 1;

    RAISE NOTICE '✅ Added witness_number column';
  END IF;

  -- 3. Add witness_address column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_witnesses'
    AND column_name = 'witness_address'
  ) THEN
    ALTER TABLE public.incident_witnesses
    ADD COLUMN witness_address TEXT;

    RAISE NOTICE '✅ Added witness_address column';
  END IF;

  -- 4. Add witness_email column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incident_witnesses'
    AND column_name = 'witness_email'
  ) THEN
    ALTER TABLE public.incident_witnesses
    ADD COLUMN witness_email TEXT;

    RAISE NOTICE '✅ Added witness_email column';
  END IF;

  -- 5. Update indexes
  DROP INDEX IF EXISTS idx_incident_witnesses_incident_id;

  CREATE INDEX IF NOT EXISTS idx_incident_witnesses_incident_report_id
  ON public.incident_witnesses(incident_report_id);

  CREATE INDEX IF NOT EXISTS idx_incident_witnesses_incident_witness_number
  ON public.incident_witnesses(incident_report_id, witness_number);

  RAISE NOTICE '✅ Indexes updated';
  RAISE NOTICE '✅ Schema migration complete!';
END $$;
```

---

## Option 2: Recreate Table (Clean Slate)

If you prefer to start fresh:

### Steps:

1. **Backup any existing data** (if any):
```sql
-- Check if there's any data
SELECT * FROM incident_witnesses;

-- If there is data, back it up first
-- (Copy the results somewhere safe)
```

2. **Drop the old table:**
```sql
DROP TABLE IF EXISTS public.incident_witnesses CASCADE;
```

3. **Run the new migration:**
Execute the SQL from: `supabase/migrations/20251104000000_create_incident_witnesses_table.sql`

---

## After Running the Migration

Once you've executed the schema fix, **update the code** to use the new column names:

### 1. Update `lib/dataFetcher.js`:

Change line 79:
```javascript
.eq('incident_id', latestIncidentId)  // OLD
```
To:
```javascript
.eq('incident_report_id', latestIncidentId)  // NEW
```

Change line 81:
```javascript
.order('created_at', { ascending: true });  // OLD
```
To:
```javascript
.order('witness_number', { ascending: true });  // NEW
```

### 2. Update `src/controllers/incidentForm.controller.js`:

Change lines 276 and 291:
```javascript
incident_id: incident.id,  // OLD
```
To:
```javascript
incident_report_id: incident.id,  // NEW
```

Add back `witness_number` field:
```javascript
// After line 277, add:
witness_number: 1,  // For primary witness

// After line 292, add:
witness_number: index + 2,  // For additional witnesses
```

---

## Verification

After applying the fix, verify the schema:

```sql
-- Check all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'incident_witnesses'
ORDER BY ordinal_position;

-- Expected columns:
-- id                    | uuid      | NO
-- incident_report_id    | uuid      | NO  ✅ (was incident_id)
-- create_user_id        | uuid      | NO
-- witness_number        | integer   | NO  ✅ (new)
-- witness_name          | text      | NO
-- witness_phone         | text      | YES
-- witness_email         | text      | YES ✅ (new)
-- witness_address       | text      | YES ✅ (new)
-- witness_statement     | text      | NO
-- created_at            | timestamp | NO
-- updated_at            | timestamp | NO
```

---

## Current Status

✅ **Code is functional** - Updated to work with current schema (`incident_id`)
⚠️  **Schema needs update** - When ready, run migration to rename to `incident_report_id`
⚠️  **witness_number missing** - Currently ordering by `created_at` instead
⚠️  **witness_address may be missing** - Migration will add it

---

## Why This Happened

The `incident_witnesses` table was created with an older schema before our new migration was written. The migration file tried to create the table again, which caused the "relation already exists" error.

---

## Questions?

If you encounter any issues running the migration:
1. Check Supabase dashboard for error messages
2. Verify you have proper permissions
3. Contact support if needed

**Migration file location:** `supabase/migrations/20251104000002_fix_incident_witnesses_schema.sql`
