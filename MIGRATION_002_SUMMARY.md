# Migration 002: Add Missing UI Form Fields

**Date**: 2025-11-02
**Status**: Ready to run
**Impact**: 🚨 CRITICAL - Fixes data loss from UI forms

---

## Problem Discovered

Using the "postbox analogy" analysis, we discovered:

```
USER (UI) → sends 96 fields → SUPABASE (postbox) → PDF picks up
```

**Before Migration**:
- ❌ **77 out of 96 UI fields** had NO Supabase column (80.2%)
- ❌ User data was **LOST** when forms submitted
- ❌ Success rate: **13.5%** (only 13 fields had complete UI → Supabase → PDF flow)

**After Migration**:
- ✅ All 77 missing columns added
- ✅ No data loss
- ✅ Success rate: **~95%+** (90+ fields with complete flow)

---

## What This Migration Adds

### Incident Reports Table (71 columns)

#### 1. Medical Information (19 fields) 🏥
**Critical legal data about injuries**
```sql
medical_ambulance_called           BOOLEAN
medical_attention_needed           BOOLEAN
medical_hospital_name              TEXT
medical_injury_details             TEXT
medical_injury_severity            TEXT
medical_treatment_received         TEXT
medical_symptom_abdominal_bruising BOOLEAN
medical_symptom_abdominal_pain     BOOLEAN
medical_symptom_breathlessness     BOOLEAN
medical_symptom_change_in_vision   BOOLEAN
medical_symptom_chest_pain         BOOLEAN
medical_symptom_dizziness          BOOLEAN
medical_symptom_life_threatening   BOOLEAN
medical_symptom_limb_pain_mobility BOOLEAN
medical_symptom_limb_weakness      BOOLEAN
medical_symptom_loss_of_consciousness BOOLEAN
medical_symptom_none               BOOLEAN
medical_symptom_severe_headache    BOOLEAN
medical_symptom_uncontrolled_bleeding BOOLEAN
```

#### 2. Accident Basic Info (2 fields) 📅
```sql
accident_date  DATE
accident_time  TIME
```

#### 3. Road Conditions (6 fields - checkboxes) 🛣️
```sql
road_condition_dry           BOOLEAN
road_condition_wet           BOOLEAN
road_condition_icy           BOOLEAN
road_condition_snow_covered  BOOLEAN
road_condition_loose_surface BOOLEAN
road_condition_other         BOOLEAN
```

#### 4. Road Markings (3 fields - radio buttons) 🚦
```sql
road_markings_visible_yes        BOOLEAN
road_markings_visible_partially  BOOLEAN
road_markings_visible_no         BOOLEAN
```
**Constraint**: Only one can be selected (radio button behavior)

#### 5. Road Type (7 fields - radio buttons) 🛤️
```sql
road_type_motorway       BOOLEAN
road_type_a_road         BOOLEAN
road_type_b_road         BOOLEAN
road_type_urban_street   BOOLEAN
road_type_rural_road     BOOLEAN
road_type_car_park       BOOLEAN
road_type_other          BOOLEAN
```
**Constraint**: Only one can be selected

#### 6. Traffic Conditions (4 fields - radio buttons) 🚗
```sql
traffic_conditions_no_traffic  BOOLEAN
traffic_conditions_light       BOOLEAN
traffic_conditions_moderate    BOOLEAN
traffic_conditions_heavy       BOOLEAN
```
**Constraint**: Only one can be selected

#### 7. Weather Conditions (6 fields - checkboxes) ⛅
```sql
weather_clear             BOOLEAN
weather_cloudy            BOOLEAN
weather_bright_sunlight   BOOLEAN
weather_ice               BOOLEAN
weather_thunder_lightning BOOLEAN
weather_other             BOOLEAN
```

#### 8. Visibility (1 field) 👁️
```sql
visibility_severely_restricted  BOOLEAN
```

#### 9. Location & Context (6 fields) 📍
```sql
location            TEXT  -- General location description
what3words          TEXT  -- What3words code (e.g., ///filled.count.soap)
nearestLandmark     TEXT  -- Nearest landmark
additionalHazards   TEXT  -- Additional hazards present
specialConditions   TEXT  -- Special road conditions
visibilityFactors   TEXT  -- Factors affecting visibility
```

#### 10. Junction/Intersection Details (4 fields) 🔀
```sql
junctionType        TEXT  -- T-junction, roundabout, crossroads, etc.
junctionControl     TEXT  -- Traffic lights, signs, none
trafficLightStatus  TEXT  -- Red, amber, green, not working
userManoeuvre       TEXT  -- What user was doing (turning, straight, etc.)
```

#### 11. Vehicle & Damage (7 fields) 🚙
```sql
your_speed          TEXT     -- User-estimated speed
impact_point        TEXT     -- Point of impact on vehicle
usual_vehicle       BOOLEAN  -- Driving usual vehicle?
vehicle_driveable   BOOLEAN  -- Was vehicle driveable?
no_damage           BOOLEAN  -- No damage checkbox
no_visible_damage   BOOLEAN  -- No visible damage checkbox
seatbelts_worn      BOOLEAN  -- Were seatbelts worn?
```

#### 12. Recovery Details (3 fields) 🚛
```sql
recovery_location  TEXT
recovery_phone     TEXT
recovery_notes     TEXT
```

#### 13. Police & Witnesses (2 fields) 👮
```sql
police_attended     BOOLEAN
witnesses_present   BOOLEAN
```

#### 14. Final Check (1 field) 💭
```sql
final_feeling  TEXT  -- User final thoughts after form
```

### Other Vehicle Table (6 columns)

```sql
other_driver_name         TEXT
other_driver_phone        TEXT
other_driver_email        TEXT
other_driver_license      TEXT
other_license_plate       TEXT
other_point_of_impact     TEXT
```

---

## Performance Optimizations

The migration includes indexes on frequently searched columns:

```sql
-- Date/time searches
idx_incident_reports_accident_date
idx_incident_reports_accident_time

-- Location
idx_incident_reports_what3words

-- Medical priority (partial indexes)
idx_incident_reports_medical_attention (WHERE medical_attention_needed = TRUE)
idx_incident_reports_ambulance_called (WHERE medical_ambulance_called = TRUE)

-- Legal significance
idx_incident_reports_police_attended (WHERE police_attended = TRUE)
```

---

## Data Type Decisions

| Field Type | SQL Type | Reason |
|------------|----------|--------|
| Checkboxes | `BOOLEAN DEFAULT FALSE` | Can select multiple, default unchecked |
| Radio buttons | `BOOLEAN DEFAULT FALSE` + CHECK constraint | Only one selected, enforced at DB level |
| Text inputs | `TEXT` | Variable length, no arbitrary limits |
| Date | `DATE` | Proper date type for querying |
| Time | `TIME` | Proper time type for querying |

---

## How to Run This Migration

### Option 1: Supabase Dashboard (Recommended for development)

1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of `supabase/migrations/002_add_missing_ui_fields.sql`
3. Paste and click "Run"
4. Verify: Should see "Success. No rows returned"

### Option 2: Supabase CLI (Recommended for production)

```bash
# If you have Supabase CLI installed
supabase db push

# Or run specific migration
psql $DATABASE_URL -f supabase/migrations/002_add_missing_ui_fields.sql
```

### Option 3: Direct SQL (Development only)

```bash
# Using psql
psql -h <host> -U <user> -d <database> -f supabase/migrations/002_add_missing_ui_fields.sql
```

---

## Verification

After running the migration, verify it worked:

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

-- Quick count of all new columns (should be 77)
SELECT COUNT(*)
FROM information_schema.columns
WHERE (
  (table_name = 'incident_reports' AND column_name IN (
    'medical_ambulance_called', 'accident_date', 'road_condition_dry',
    'road_markings_visible_yes', 'road_type_motorway', 'traffic_conditions_no_traffic',
    'weather_clear', 'visibility_severely_restricted', 'location', 'junctionType',
    'your_speed', 'recovery_location', 'police_attended', 'final_feeling'
    -- ... truncated for brevity, see full list in migration file
  ))
  OR
  (table_name = 'incident_other_vehicles' AND column_name IN (
    'other_driver_name', 'other_driver_phone', 'other_driver_email',
    'other_driver_license', 'other_license_plate', 'other_point_of_impact'
  ))
);
```

---

## Impact on Existing Data

✅ **Safe for existing data**:
- All columns added with `IF NOT EXISTS` (idempotent)
- All new columns nullable or have defaults
- No data loss
- No breaking changes
- Existing rows will have NULL or FALSE for new columns

---

## Next Steps After Migration

1. ✅ **Run migration** (add columns to Supabase)
2. ⏸️ **Update pdfGenerator.js** (map new columns to PDF fields)
3. ⏸️ **Re-run postbox validation** (verify success rate improved)
4. ⏸️ **Test with real data** (submit form, check PDF)

---

## Rollback (If Needed)

If you need to undo this migration:

```sql
BEGIN;

-- Drop incident_reports columns (71 columns)
ALTER TABLE incident_reports
DROP COLUMN IF EXISTS medical_ambulance_called,
DROP COLUMN IF EXISTS medical_attention_needed,
DROP COLUMN IF EXISTS medical_hospital_name,
DROP COLUMN IF EXISTS medical_injury_details,
DROP COLUMN IF EXISTS medical_injury_severity,
DROP COLUMN IF EXISTS medical_symptom_abdominal_bruising,
DROP COLUMN IF EXISTS medical_symptom_abdominal_pain,
DROP COLUMN IF EXISTS medical_symptom_breathlessness,
DROP COLUMN IF EXISTS medical_symptom_change_in_vision,
DROP COLUMN IF EXISTS medical_symptom_chest_pain,
DROP COLUMN IF EXISTS medical_symptom_dizziness,
DROP COLUMN IF EXISTS medical_symptom_life_threatening,
DROP COLUMN IF EXISTS medical_symptom_limb_pain_mobility,
DROP COLUMN IF EXISTS medical_symptom_limb_weakness,
DROP COLUMN IF EXISTS medical_symptom_loss_of_consciousness,
DROP COLUMN IF EXISTS medical_symptom_none,
DROP COLUMN IF EXISTS medical_symptom_severe_headache,
DROP COLUMN IF EXISTS medical_symptom_uncontrolled_bleeding,
DROP COLUMN IF EXISTS medical_treatment_received,
DROP COLUMN IF EXISTS accident_date,
DROP COLUMN IF EXISTS accident_time,
DROP COLUMN IF EXISTS road_condition_dry,
DROP COLUMN IF EXISTS road_condition_wet,
DROP COLUMN IF EXISTS road_condition_icy,
DROP COLUMN IF EXISTS road_condition_snow_covered,
DROP COLUMN IF EXISTS road_condition_loose_surface,
DROP COLUMN IF EXISTS road_condition_other,
DROP COLUMN IF EXISTS road_markings_visible_yes,
DROP COLUMN IF EXISTS road_markings_visible_partially,
DROP COLUMN IF EXISTS road_markings_visible_no,
DROP COLUMN IF EXISTS road_type_motorway,
DROP COLUMN IF EXISTS road_type_a_road,
DROP COLUMN IF EXISTS road_type_b_road,
DROP COLUMN IF EXISTS road_type_urban_street,
DROP COLUMN IF EXISTS road_type_rural_road,
DROP COLUMN IF EXISTS road_type_car_park,
DROP COLUMN IF EXISTS road_type_other,
DROP COLUMN IF EXISTS traffic_conditions_no_traffic,
DROP COLUMN IF EXISTS traffic_conditions_light,
DROP COLUMN IF EXISTS traffic_conditions_moderate,
DROP COLUMN IF EXISTS traffic_conditions_heavy,
DROP COLUMN IF EXISTS weather_clear,
DROP COLUMN IF EXISTS weather_cloudy,
DROP COLUMN IF EXISTS weather_bright_sunlight,
DROP COLUMN IF EXISTS weather_ice,
DROP COLUMN IF EXISTS weather_thunder_lightning,
DROP COLUMN IF EXISTS weather_other,
DROP COLUMN IF EXISTS visibility_severely_restricted,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS what3words,
DROP COLUMN IF EXISTS nearestLandmark,
DROP COLUMN IF EXISTS additionalHazards,
DROP COLUMN IF EXISTS specialConditions,
DROP COLUMN IF EXISTS visibilityFactors,
DROP COLUMN IF EXISTS junctionType,
DROP COLUMN IF EXISTS junctionControl,
DROP COLUMN IF EXISTS trafficLightStatus,
DROP COLUMN IF EXISTS userManoeuvre,
DROP COLUMN IF EXISTS your_speed,
DROP COLUMN IF EXISTS impact_point,
DROP COLUMN IF EXISTS usual_vehicle,
DROP COLUMN IF EXISTS vehicle_driveable,
DROP COLUMN IF EXISTS no_damage,
DROP COLUMN IF EXISTS no_visible_damage,
DROP COLUMN IF EXISTS seatbelts_worn,
DROP COLUMN IF EXISTS recovery_location,
DROP COLUMN IF EXISTS recovery_phone,
DROP COLUMN IF EXISTS recovery_notes,
DROP COLUMN IF EXISTS police_attended,
DROP COLUMN IF EXISTS witnesses_present,
DROP COLUMN IF EXISTS final_feeling;

-- Drop incident_other_vehicles columns (6 columns)
ALTER TABLE incident_other_vehicles
DROP COLUMN IF EXISTS other_driver_name,
DROP COLUMN IF EXISTS other_driver_phone,
DROP COLUMN IF EXISTS other_driver_email,
DROP COLUMN IF EXISTS other_driver_license,
DROP COLUMN IF EXISTS other_license_plate,
DROP COLUMN IF EXISTS other_point_of_impact;

COMMIT;
```

---

## Summary

**Migration File**: `supabase/migrations/002_add_missing_ui_fields.sql`

**Columns Added**: 77 total
- `incident_reports`: 71 columns
- `incident_other_vehicles`: 6 columns

**Expected Result**:
- ✅ UI → Supabase success: 19.8% → **100%** (all 96 fields now have columns)
- ✅ UI → Supabase → PDF success: 13.5% → **~95%+** (after mapping update)
- ✅ Zero data loss from form submissions
- ✅ Complete medical injury tracking
- ✅ Complete accident condition data (road, weather, traffic, visibility)

**Status**: Ready to run in development environment

---

**Next**: Run migration, then update `pdfGenerator.js` to map these new columns to PDF fields.
