# Page 5 - SQL Migration for incident_reports Table

**Date**: 2025-11-03
**Source**: `/Users/ianring/Downloads/Car Crash Lawyer App  UI fields proposed page 5 .csv` (Column H)
**Purpose**: Add Page 5 vehicle details fields to `incident_reports` table

---

## Summary

**Fields to Add**: 16 new columns
**Table**: `incident_reports`
**Source CSV Column**: H ("page 5 proposed html.")

---

## SQL Migration Script

```sql
-- ============================================================================
-- Page 5 Vehicle Details Migration
-- Source: Car Crash Lawyer App UI fields proposed page 5.csv (Column H)
-- ============================================================================

-- Add columns to incident_reports table
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Usual Vehicle Question
-- HTML fields: usual_vehicle_yes, usual_vehicle_no (2 checkboxes, 1 database field)
-- Values: 'yes' or 'no'
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS usual_vehicle TEXT;

COMMENT ON COLUMN incident_reports.usual_vehicle IS
'Page 5 - Were you driving your usual vehicle? Values: yes, no';

-- 2. DVLA Lookup - License Plate Input
-- HTML field: dvla_lookup_reg
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS dvla_lookup_reg TEXT;

COMMENT ON COLUMN incident_reports.dvla_lookup_reg IS
'Page 5 - UK vehicle license plate for DVLA lookup (e.g., AB12 CDE)';

-- 3. DVLA Lookup - Vehicle Make
-- HTML field: dvla_vehicle_lookup_make
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_make TEXT;

COMMENT ON COLUMN incident_reports.dvla_vehicle_lookup_make IS
'Page 5 - Vehicle make from DVLA API or manual entry (e.g., FORD, BMW)';

-- 4. DVLA Lookup - Vehicle Model
-- HTML field: dvla_vehicle_lookup_model
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_model TEXT;

COMMENT ON COLUMN incident_reports.dvla_vehicle_lookup_model IS
'Page 5 - Vehicle model from DVLA API or manual entry (e.g., Focus, 3 Series)';

-- 5. DVLA Lookup - Vehicle Colour
-- HTML field: dvla_vehicle_lookup_color
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_color TEXT;

COMMENT ON COLUMN incident_reports.dvla_vehicle_lookup_color IS
'Page 5 - Vehicle colour from DVLA API or manual entry (e.g., Blue, Silver)';

-- 6. DVLA Lookup - Vehicle Year
-- HTML field: dvla_vehicle_lookup_year
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_year TEXT;

COMMENT ON COLUMN incident_reports.dvla_vehicle_lookup_year IS
'Page 5 - Vehicle year from DVLA API or manual entry (e.g., 2020)';

-- 7. DVLA Lookup - Fuel Type
-- HTML field: dvla_vehicle_lookup_fuel_type
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_fuel_type TEXT;

COMMENT ON COLUMN incident_reports.dvla_vehicle_lookup_fuel_type IS
'Page 5 - Fuel type from DVLA API or manual entry (e.g., Petrol, Diesel, Electric)';

-- 8. DVLA Lookup - MOT Status
-- HTML field: dvla_vehicle_lookup_mot_status
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_mot_status TEXT;

COMMENT ON COLUMN incident_reports.dvla_vehicle_lookup_mot_status IS
'Page 5 - MOT status from DVLA API or manual entry (e.g., Valid, Expired)';

-- 9. DVLA Lookup - MOT Expiry
-- HTML field: dvla_vehicle_lookup_mot_expiry
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_mot_expiry TEXT;

COMMENT ON COLUMN incident_reports.dvla_vehicle_lookup_mot_expiry IS
'Page 5 - MOT expiry date from DVLA API or manual entry (e.g., 2025-06-15)';

-- 10. DVLA Lookup - Tax Status
-- HTML field: dvla_vehicle_lookup_tax_status
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_tax_status TEXT;

COMMENT ON COLUMN incident_reports.dvla_vehicle_lookup_tax_status IS
'Page 5 - Tax status from DVLA API or manual entry (e.g., Taxed, SORN)';

-- 11. DVLA Lookup - Tax Due Date
-- HTML field: dvla_vehicle_lookup_tax_due_date
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_tax_due_date TEXT;

COMMENT ON COLUMN incident_reports.dvla_vehicle_lookup_tax_due_date IS
'Page 5 - Tax due date from DVLA API or manual entry (e.g., 2025-03-01)';

-- 12. DVLA Lookup - Insurance Status
-- HTML field: dvla_vehicle_lookup_insurance_status
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS dvla_vehicle_lookup_insurance_status TEXT;

COMMENT ON COLUMN incident_reports.dvla_vehicle_lookup_insurance_status IS
'Page 5 - Insurance status from DVLA API or manual entry (e.g., Insured, Not insured)';

-- 13. No Damage Checkbox
-- HTML field: no_damage (implied from context, not in column H but exists in HTML)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS no_damage BOOLEAN DEFAULT false;

COMMENT ON COLUMN incident_reports.no_damage IS
'Page 5 - My vehicle has no visible damage (hides damage section if true)';

-- 14. Damage Description
-- HTML field: damage_to_your_vehicle (appears twice in CSV, rows 15 & 26)
-- Note: CSV has space "damage_to your_vehicle" but should be underscores
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS damage_to_your_vehicle TEXT;

COMMENT ON COLUMN incident_reports.damage_to_your_vehicle IS
'Page 5 - User narrative description of vehicle damage';

-- 15. Point of Impact (Array)
-- HTML fields: front, front_driver, front_passenger, driver_side, passenger_side,
--              rear_driver, rear_passenger, rear, roof, undercarriage
-- These are VALUES stored in a TEXT[] array, not separate columns
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS impact_point TEXT[];

COMMENT ON COLUMN incident_reports.impact_point IS
'Page 5 - Array of impact points: front, front_driver, front_passenger, driver_side, passenger_side, rear_driver, rear_passenger, rear, roof, undercarriage';

-- 16. Vehicle Driveability
-- HTML fields: vehicle_driveable, vehicle_needed_to_be_towed, unsure_did_not_attempt
-- These are VALUES for one field, not separate columns
-- Values: 'yes' (driveable), 'no' (towed), 'unsure' (did not attempt)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS vehicle_driveable TEXT;

COMMENT ON COLUMN incident_reports.vehicle_driveable IS
'Page 5 - Was vehicle driveable? Values: yes (drove away), no (towed), unsure (did not attempt)';

COMMIT;
```

---

## Field Mapping Explanation

### Multi-Value Fields (Column H shows VALUES, not separate columns)

| Column H Values | Database Column | Data Type | Explanation |
|----------------|-----------------|-----------|-------------|
| `usual_vehicle_yes`, `usual_vehicle_no` | `usual_vehicle` | TEXT | Two HTML checkboxes, one DB column storing "yes" or "no" |
| `front`, `front_driver`, `front_passenger`, `driver_side`, `passenger_side`, `rear_driver`, `rear_passenger`, `rear`, `roof`, `undercarriage` | `impact_point` | TEXT[] | Ten HTML checkboxes, one DB array column |
| `vehicle_driveable`, `vehicle_needed_to_be_towed`, `unsure_did_not_attempt` | `vehicle_driveable` | TEXT | Three HTML checkboxes, one DB column storing "yes", "no", or "unsure" |

### Single-Value Fields (1:1 mapping)

| Column H Field | Database Column | Data Type |
|---------------|-----------------|-----------|
| `dvla_lookup_reg` | `dvla_lookup_reg` | TEXT |
| `dvla_vehicle_lookup_make` | `dvla_vehicle_lookup_make` | TEXT |
| `dvla_vehicle_lookup_model` | `dvla_vehicle_lookup_model` | TEXT |
| `dvla_vehicle_lookup_color` | `dvla_vehicle_lookup_color` | TEXT |
| `dvla_vehicle_lookup_year` | `dvla_vehicle_lookup_year` | TEXT |
| `dvla_vehicle_lookup_fuel_type` | `dvla_vehicle_lookup_fuel_type` | TEXT |
| `dvla_vehicle_lookup_mot_status` | `dvla_vehicle_lookup_mot_status` | TEXT |
| `dvla_vehicle_lookup_mot_expiry` | `dvla_vehicle_lookup_mot_expiry` | TEXT |
| `dvla_vehicle_lookup_tax_status` | `dvla_vehicle_lookup_tax_status` | TEXT |
| `dvla_vehicle_lookup_tax_due_date` | `dvla_vehicle_lookup_tax_due_date` | TEXT |
| `dvla_vehicle_lookup_insurance_status` | `dvla_vehicle_lookup_insurance_status` | TEXT |
| `damage_to_your_vehicle` | `damage_to_your_vehicle` | TEXT |

---

## Verification Query

After running the migration, verify all columns exist:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'incident_reports'
  AND column_name IN (
    'usual_vehicle',
    'dvla_lookup_reg',
    'dvla_vehicle_lookup_make',
    'dvla_vehicle_lookup_model',
    'dvla_vehicle_lookup_color',
    'dvla_vehicle_lookup_year',
    'dvla_vehicle_lookup_fuel_type',
    'dvla_vehicle_lookup_mot_status',
    'dvla_vehicle_lookup_mot_expiry',
    'dvla_vehicle_lookup_tax_status',
    'dvla_vehicle_lookup_tax_due_date',
    'dvla_vehicle_lookup_insurance_status',
    'no_damage',
    'damage_to_your_vehicle',
    'impact_point',
    'vehicle_driveable'
  )
ORDER BY column_name;
```

Expected result: **16 rows** (all new columns)

---

## Sample Data Insert

Test the schema with sample data:

```sql
INSERT INTO incident_reports (
  create_user_id,
  usual_vehicle,
  dvla_lookup_reg,
  dvla_vehicle_lookup_make,
  dvla_vehicle_lookup_model,
  dvla_vehicle_lookup_color,
  dvla_vehicle_lookup_year,
  dvla_vehicle_lookup_fuel_type,
  dvla_vehicle_lookup_mot_status,
  dvla_vehicle_lookup_mot_expiry,
  dvla_vehicle_lookup_tax_status,
  dvla_vehicle_lookup_tax_due_date,
  dvla_vehicle_lookup_insurance_status,
  no_damage,
  impact_point,
  damage_to_your_vehicle,
  vehicle_driveable
) VALUES (
  'your-user-uuid-here',
  'no',  -- Not usual vehicle (e.g., rental car)
  'AB12 CDE',
  'FORD',
  'Focus',
  'Blue',
  '2020',
  'Petrol',
  'Valid',
  '2025-06-15',
  'Taxed',
  '2025-03-01',
  'Insured',
  false,  -- Has damage
  ARRAY['front_passenger', 'passenger_side'],  -- Impact points array
  'Large dent on passenger door, bumper cracked',
  'yes'  -- Driveable (drove away)
);
```

---

## Notes

1. **CSV Column H Issue**: The CSV has `damage_to your_vehicle` with a space. SQL uses underscore: `damage_to_your_vehicle`

2. **Array Handling**: The 10 impact point values (`front`, `rear`, etc.) are stored in a **single array column** (`impact_point TEXT[]`), not 10 separate columns.

3. **Checkbox Values**: HTML checkboxes with different IDs but same `name` attribute map to a single database column storing the checked value.

4. **Data Type Choices**:
   - `TEXT` for all DVLA fields (flexible, handles various formats)
   - `TEXT[]` for `impact_point` (PostgreSQL array)
   - `BOOLEAN` for `no_damage` (true/false checkbox)
   - `TEXT` for `usual_vehicle` and `vehicle_driveable` (changed from BOOLEAN to support 'yes'/'no'/'unsure' in Migration 008)

5. **RLS Policies**: Existing RLS policies on `incident_reports` will apply to these new columns automatically.

---

## Rollback (if needed)

```sql
BEGIN;

ALTER TABLE incident_reports DROP COLUMN IF EXISTS usual_vehicle;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_lookup_reg;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_lookup_make;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_lookup_model;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_lookup_color;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_lookup_year;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_lookup_fuel_type;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_lookup_mot_status;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_lookup_mot_expiry;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_lookup_tax_status;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_lookup_tax_due_date;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS dvla_vehicle_lookup_insurance_status;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS no_damage;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS damage_to_your_vehicle;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS impact_point;
ALTER TABLE incident_reports DROP COLUMN IF EXISTS vehicle_driveable;

COMMIT;
```

---

**Status**: Ready to run in Supabase SQL Editor
**Migration Safe**: Uses `IF NOT EXISTS` - safe to run multiple times
**Next Step**: Copy SQL to Supabase, run migration, verify with SELECT query

**Last Updated**: 2025-11-03
