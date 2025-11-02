# Database Migrations

This directory contains SQL migration scripts for the Car Crash Lawyer AI database schema.

## Overview

Migrations are numbered sequentially and should be run in order:
- `001_add_new_pdf_fields.sql` - Adds fields for revised PDF (207 fields)
- `001_add_new_pdf_fields_rollback.sql` - Rollback for migration 001

## Migration 001: Add New PDF Fields

**Date**: 2025-11-02
**Purpose**: Add database support for revised incident report PDF with 207 fields

### Changes

**incident_reports** (+38 columns):
- Medical fields (5): ambulance_called, hospital_name, injury_severity, treatment_received, medical_follow_up_needed
- DVLA lookup (10): dvla_lookup_reg, dvla_vehicle_make/model/color/year/fuel_type, dvla_mot_status/expiry, dvla_tax_status/due_date
- Weather (7): weather_drizzle, weather_raining, weather_hail, weather_windy, weather_thunder, weather_slush_road, weather_loose_surface
- Traffic (4): traffic_heavy, traffic_moderate, traffic_light, traffic_none
- Road markings (3): road_markings_yes, road_markings_partial, road_markings_no
- Visibility (3): visibility_good, visibility_poor, visibility_very_poor

**incident_other_vehicles** (+9 columns):
- DVLA results (6): dvla_mot_status/expiry, dvla_tax_status/due_date, dvla_insurance_status, dvla_export_marker
- Insurance (3): insurance_company, insurance_policy_number, insurance_policy_holder

**incident_witnesses** (+4 columns):
- Witness #2 (4): witness_2_name, witness_2_mobile, witness_2_email, witness_2_statement

**Total**: 51 new columns

### Constraints Added

1. **check_single_traffic_condition** - Only one traffic level can be selected
2. **check_single_visibility** - Only one visibility level can be selected
3. **check_single_road_marking** - Only one road marking status can be selected
4. **check_mot_date_future** - MOT dates must be after 2000-01-01

### Indexes Added

1. **idx_incident_reports_dvla_reg** - Speed up DVLA lookup queries
2. **idx_other_vehicles_export** - Find exported vehicles quickly
3. **idx_incident_reports_mot_expiry** - MOT expiry date queries
4. **idx_incident_reports_tax_due** - Tax due date queries

---

## Running Migrations

### Prerequisites

1. **Backup your database** before running any migration
2. Have database admin credentials ready
3. Review the migration SQL to understand changes

### Option 1: Supabase Dashboard (Recommended for Production)

1. Log in to Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to **SQL Editor**
4. Copy contents of `001_add_new_pdf_fields.sql`
5. Paste into editor and click **Run**
6. Verify output shows "Migration complete!"

### Option 2: Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migration
supabase db push

# Or run directly
psql $DATABASE_URL -f migrations/001_add_new_pdf_fields.sql
```

### Option 3: PostgreSQL Client (psql)

```bash
# From project root
psql $DATABASE_URL -f migrations/001_add_new_pdf_fields.sql

# Or connect first, then run
psql $DATABASE_URL
\i migrations/001_add_new_pdf_fields.sql
```

### Option 4: Node.js Script

```bash
# Use the test script to apply migration
node scripts/test-migration.js
```

---

## Verifying Migration

After running the migration, verify it succeeded:

```bash
# Run verification script
node scripts/verify-migration.js
```

**Manual verification in Supabase:**

1. Go to **Table Editor** in Supabase Dashboard
2. Select `incident_reports` table
3. Scroll right to see new columns
4. Check `incident_other_vehicles` and `incident_witnesses` tables

**Expected columns to exist:**
- incident_reports: ambulance_called, hospital_name, dvla_lookup_reg, etc.
- incident_other_vehicles: dvla_mot_status, insurance_company, etc.
- incident_witnesses: witness_2_name, witness_2_mobile, etc.

---

## Rolling Back Migration

**⚠️ WARNING**: Rollback will **DELETE DATA** in the affected columns!

### Prerequisites

1. **Backup database** before rollback
2. Confirm you want to lose data in new columns
3. Notify users if in production

### Rollback Steps

```bash
# Option 1: Supabase Dashboard
# Copy 001_add_new_pdf_fields_rollback.sql
# Paste in SQL Editor → Run

# Option 2: psql
psql $DATABASE_URL -f migrations/001_add_new_pdf_fields_rollback.sql

# Option 3: Node.js script
node scripts/rollback-migration.js
```

### Verify Rollback

```bash
# Check that columns are removed
node scripts/verify-migration.js --check-rollback
```

---

## Migration Status Tracking

To track which migrations have been applied, create a migrations table:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  rolled_back_at TIMESTAMPTZ,
  notes TEXT
);

-- Record migration 001
INSERT INTO schema_migrations (migration_name, notes)
VALUES ('001_add_new_pdf_fields', 'Added 51 new columns for revised PDF (207 fields)');
```

---

## Troubleshooting

### Error: Column already exists

**Cause**: Migration script uses `IF NOT EXISTS`, so this is safe to ignore.

**Solution**: The script is idempotent - safe to run multiple times.

### Error: Permission denied

**Cause**: Missing database permissions.

**Solution**: Use service role key or database admin credentials.

```javascript
// In Node.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role, not anon key
);
```

### Error: Constraint violation

**Cause**: Existing data violates new constraints.

**Solution**: Clean data before applying constraints:

```sql
-- Example: Fix multiple traffic conditions selected
UPDATE incident_reports
SET traffic_moderate = FALSE, traffic_light = FALSE
WHERE traffic_heavy = TRUE
  AND (traffic_moderate = TRUE OR traffic_light = TRUE);
```

### Error: Rollback fails

**Cause**: Foreign key constraints or dependencies.

**Solution**: Drop dependent objects first, or use CASCADE:

```sql
ALTER TABLE incident_reports DROP COLUMN ambulance_called CASCADE;
```

---

## Best Practices

### Before Migration

1. ✅ **Backup database** (full dump)
2. ✅ **Test on development** environment first
3. ✅ **Review migration SQL** line by line
4. ✅ **Schedule maintenance window** (production)
5. ✅ **Notify users** of downtime if needed

### During Migration

1. ✅ **Monitor execution** for errors
2. ✅ **Save output logs**
3. ✅ **Check duration** (should be <30 seconds for this migration)

### After Migration

1. ✅ **Verify columns exist** in all 3 tables
2. ✅ **Test application** functionality
3. ✅ **Run verification script**
4. ✅ **Update documentation**
5. ✅ **Monitor error logs** for 24 hours

---

## Performance Impact

**Expected impact**: Minimal

- Adding columns is a fast operation (metadata change)
- No data migration required (new columns start NULL)
- Indexes created CONCURRENTLY if supported
- No table locks on Supabase (uses PostgreSQL 15+)

**Estimated duration**: 10-30 seconds

**Downtime**: None (columns added while system running)

---

## Future Migrations

When creating new migrations:

1. Number sequentially: `002_description.sql`
2. Create rollback script: `002_description_rollback.sql`
3. Update this README with changes
4. Test on development first
5. Document in CHANGELOG.md

---

## Reference

**Source PDF**: Car-Crash-Lawyer-AI-incident-report 02112025.pdf
**Field count**: 207 editable form fields
**Documentation**: See COMPREHENSIVE_PDF_FIELD_MAPPING.md
**CSV mapping**: See MASTER_PDF_FIELD_LIST_207_FIELDS.csv

**Created**: 2025-11-02
**Author**: Claude Code
**Version**: 1.0
